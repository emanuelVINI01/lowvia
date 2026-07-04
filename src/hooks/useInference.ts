import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { 
  addGeneratingChat, 
  removeGeneratingChat, 
  updateMessageContent, 
  markMessageInterrupted, 
  updateChatMessages,
  updateChatTitle,
  appendMessage
} from '../store/slices/chatSlice';
import { setDevStats } from '../store/slices/appSlice';
import { Message, ChatSession } from '../types';
import { generateSystemPrompt } from '../agent/systemPrompt';
import { extractToolCalls } from '../utils/parser';
import { availableTools } from '../agent/tools';

const STREAM_KEY = 'ollama_active_stream';

export function useInference() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  // We select what we need from Redux for the stream
  const { hostUrl, globalModel, provider, contextLimit, batchLimit, devMode, isThinkingMode } = useAppSelector(state => state.settings);
  const { modelCapabilities } = useAppSelector(state => state.app);

  const supportsThinking = provider === 'ollama' && modelCapabilities.includes('think');

  const sendStream = useCallback(async (
    userText: string,
    targetChatId: string,
    workingChats: ChatSession[],
  ) => {
    dispatch(addGeneratingChat(targetChatId));
    dispatch(setDevStats(null));

    const assistantTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const currentChat = workingChats.find(c => c.id === targetChatId);
    if (!currentChat) return;

    const assistantMsgIndex = currentChat.messages.length;
    
    // Add empty assistant placeholder safely via appendMessage to preserve Immer proxy tree
    dispatch(appendMessage({ 
      chatId: targetChatId, 
      message: { role: 'assistant' as const, content: '', timestamp: assistantTimestamp } 
    }));

    localStorage.setItem(STREAM_KEY, JSON.stringify({ chatId: targetChatId, msgIndex: assistantMsgIndex }));

    const abort = new AbortController();
    abortControllers.current.set(targetChatId, abort);

    const history = currentChat.messages.map(m => ({ 
      role: m.role, 
      content: m.hiddenContext ? `${m.content}\n\n${m.hiddenContext}` : m.content 
    }));

    const baseSystemPrompt = 'You are a helpful and intelligent AI desktop assistant.';
    let prompt = generateSystemPrompt(baseSystemPrompt);
    if (isThinkingMode && supportsThinking) {
      prompt += '\nThink step-by-step before answering.';
    }

    const startTime = Date.now();
    let isRecursive = false;

    try {
      let res: Response;
      const cleanHost = hostUrl.replace(/\/v1\/?$/, '');

      if (provider === 'ollama') {
        res = await fetch(`${cleanHost}/api/chat`, {
          method: 'POST',
          signal: abort.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: globalModel || 'llama3',
            messages: [{ role: 'system', content: prompt }, ...history],
            stream: true,
            ...(isThinkingMode && supportsThinking ? { think: true } : {}),
            options: {
              num_ctx: contextLimit > 0 ? contextLimit : 8192,
              num_batch: batchLimit > 0 ? batchLimit : 2048,
              num_gpu: 999,
              stop: ['<tool_result>'] 
            },
          }),
        });
      } else {
        res = await fetch(`${cleanHost}/v1/chat/completions`, {
          method: 'POST',
          signal: abort.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: globalModel,
            messages: [{ role: 'system', content: prompt }, ...history],
            stream: true,
            stream_options: { include_usage: true },
            max_tokens: contextLimit > 0 ? contextLimit : undefined,
            stop: ['<tool_result>']
          }),
        });
      }

      if (!res.ok || !res.body) {
        let errText = '';
        try {
          if (res.text) errText = await res.text();
        } catch {}
        throw new Error(`HTTP ${res.status || 'Unknown'} - ${errText || 'Bad response from server'}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let accThinking = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? ''; 

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line) continue;

          let jsonString = line;
          if (provider === 'lmstudio') {
            if (line === 'data: [DONE]') continue;
            if (line.startsWith('data: ')) {
              jsonString = line.replace(/^data: /, '');
            } else {
              continue;
            }
          }

          try {
            const parsed = JSON.parse(jsonString);
            
            if (provider === 'ollama') {
              accumulated += parsed?.message?.content ?? '';
              accThinking += parsed?.message?.thinking ?? '';
            } else {
              accumulated += parsed?.choices?.[0]?.delta?.content ?? '';
              accThinking += parsed?.choices?.[0]?.delta?.reasoning_content ?? '';
            }

            let displayContent = accumulated;
            let displayThinking = accThinking;
            const tagMatch = accumulated.match(/^<think>([\s\S]*?)<\/think>([\s\S]*)$/s);
            if (tagMatch) {
              displayThinking = accThinking || tagMatch[1];
              displayContent = tagMatch[2].trimStart();
            } else if (!accThinking && accumulated.startsWith('<think>') && !accumulated.includes('</think>')) {
              displayThinking = accumulated.replace('<think>', '');
              displayContent = '';
            }

            // Dispatch update message content
            dispatch(updateMessageContent({
              chatId: targetChatId,
              msgIndex: assistantMsgIndex,
              content: displayContent,
              thinking: displayThinking || undefined
            }));

            if (devMode) {
              if (provider === 'ollama' && parsed?.done) {
                const evalCount = parsed.eval_count ?? 0;
                const evalDuration = parsed.eval_duration ?? 1;
                dispatch(setDevStats({
                  tokensPerSecond: evalCount / (evalDuration / 1e9),
                  totalTokens: evalCount,
                  promptTokens: parsed.prompt_eval_count ?? 0,
                  generationMs: Date.now() - startTime,
                }));
              } else if (provider === 'lmstudio' && parsed?.usage) {
                const generationMs = Date.now() - startTime;
                const completionTokens = parsed.usage.completion_tokens ?? 0;
                dispatch(setDevStats({
                  tokensPerSecond: completionTokens > 0 ? completionTokens / (generationMs / 1000) : 0,
                  totalTokens: parsed.usage.total_tokens ?? 0,
                  promptTokens: parsed.usage.prompt_tokens ?? 0,
                  generationMs,
                }));
              }
            }
          } catch { /* partial line */ }
        }
      }

      // --- Tool Calling Interception ---
      const extractedTools = extractToolCalls(accumulated);
      if (extractedTools.length > 0) {
        let allToolResultsContent = '';
        
        const results = await Promise.all(extractedTools.map(async (toolCall) => {
          if (toolCall.name === '_syntax_error') {
            return { 
              name: 'error', 
              result: `CRITICAL ERROR: ${toolCall.arguments.error}. Your previous <tool_call> block was malformed. You MUST output strictly valid XML/JSON matching the expected schema. DO NOT APOLOGIZE. DO NOT EXPLAIN. Just output the corrected <tool_call> block immediately.` 
            };
          }

          const tool = availableTools.find(t => t.name === toolCall.name);
          let toolResultText = '';
          if (tool) {
            try {
              if (tool.schema) {
                const parseResult = tool.schema.safeParse(toolCall.arguments);
                if (!parseResult.success) {
                  const errorMsg = parseResult.error?.issues?.map((err: any) => `- Field '${err.path.join('.')}' is invalid: ${err.message}`).join('\n');
                  return {
                    name: 'error',
                    result: `CRITICAL ERROR: Invalid arguments for tool '${tool.name}'. Schema Validation Failed:\n${errorMsg}\n\nYou MUST correct these parameters. DO NOT APOLOGIZE. DO NOT EXPLAIN. Just output the corrected <tool_call> block immediately.`
                  };
                }
                toolCall.arguments = parseResult.data;
              }
              toolResultText = await tool.execute(toolCall.arguments);
            } catch (e: any) {
              toolResultText = `Error executing tool: ${e.message}`;
            }
          } else {
            toolResultText = `Error: Tool '${toolCall.name}' not found.`;
          }
          return { name: toolCall.name, result: toolResultText };
        }));

        for (const res of results) {
          allToolResultsContent += `<tool_result name="${res.name}">\n${res.result}\n</tool_result>\n\n`;
        }

        const originalPromptMsg = [...currentChat.messages].reverse().find(m => m.role === 'user' && !m.toolResult);
        const isDeepResearch = originalPromptMsg?.hiddenContext?.includes('PESQUISA PROFUNDA');
        
        let toolAlert = `[SYSTEM ALERT]: Tool execution complete. Review the SYSTEM DIRECTIVES from the original prompt. You MUST ensure you complete ALL mandatory steps (e.g., 'read_url' for deep research, 'generate_file' for saving PDFs) BEFORE providing your final answer. If you still have mandatory tools to run, output another <tool_call> now. Only give your final text answer when all tool chains are finished. Do NOT loop indefinitely.`;
        
        if (isDeepResearch) {
          const originalPromptIndex = currentChat.messages.findIndex(m => m === originalPromptMsg);
          const messagesSincePrompt = currentChat.messages.slice(originalPromptIndex + 1);
          const readUrlCount = messagesSincePrompt.filter(m => m.toolCall?.name === 'read_url').length + extractedTools.filter(t => t.name === 'read_url').length;

          if (extractedTools.some(t => t.name === 'search_web')) {
            toolAlert = `[SYSTEM ALERT]: Tool 'search_web' complete. Since this is a DEEP RESEARCH, you are STRICTLY FORBIDDEN from generating the final answer or generating a file right now. You MUST use the 'read_url' tool to read the full content of the most relevant URLs found in the search results. You must read at least 3 different URLs. Output <tool_call><read_url>... now!`;
          } else if (extractedTools.some(t => t.name === 'read_url')) {
            if (readUrlCount < 3) {
              toolAlert = `[SYSTEM ALERT]: Tool 'read_url' complete. You have only read ${readUrlCount} URL(s) so far. Since this is a DEEP RESEARCH task, you MUST read at least 3 different highly relevant URLs to cross-reference information before generating the final file. You are FORBIDDEN from using 'generate_file' yet. Output another <tool_call><read_url>... now to read the next URL!`;
            } else {
              toolAlert = `[SYSTEM ALERT]: Tool 'read_url' complete. You have read ${readUrlCount} URL(s) so far. If you have fulfilled the user's explicit instructions regarding how many pages to read, you MUST now use the 'generate_file' tool to write the final detailed report, synthesizing everything you read. If the user asked you to read MORE pages, you MUST output another <tool_call><read_url>... now! Do not answer directly in text if the user asked for a file.`;
            }
          }
        }

        const toolResultMsg: Message = {
          role: 'user',
          content: `${allToolResultsContent}\n${toolAlert}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          toolCall: extractedTools[0],
          toolResult: allToolResultsContent,
        };

        isRecursive = true;
        // The assistant message content is already updated in Redux via updateMessageContent.
        // We just append the tool result message safely.
        dispatch(appendMessage({ chatId: targetChatId, message: toolResultMsg }));
        
        // Build the next working chat state for the recursive call
        const nextMessages = [...currentChat.messages];
        nextMessages.push({ role: 'assistant' as const, content: accumulated, timestamp: assistantTimestamp });
        nextMessages.push(toolResultMsg);
        
        // Re-trigger generation
        setTimeout(() => sendStream('', targetChatId, [{ ...currentChat, messages: nextMessages }]), 50);
      }

      if (!isRecursive) {
        localStorage.removeItem(STREAM_KEY);
      }

    } catch (err: any) {
      if (err.name === 'AbortError') {
        return;
      }
      
      const providerName = provider === 'lmstudio' ? 'LM Studio' : 'Ollama';
      const errorContent = `**Falha de Conexão: ${providerName}**\n\n- **Servidor:** \`${hostUrl}\`\n- **Modelo:** \`${globalModel || 'Nenhum'}\`\n- **Detalhe:** \`${err.message || 'Erro desconhecido'}\`\n\nPor favor, verifique se o ${providerName} está em execução e acessível.`;
      
      dispatch(updateMessageContent({
        chatId: targetChatId,
        msgIndex: assistantMsgIndex,
        content: errorContent
      }));
      dispatch(markMessageInterrupted({
        chatId: targetChatId,
        msgIndex: assistantMsgIndex
      }));
      localStorage.removeItem(STREAM_KEY);
    } finally {
      if (!isRecursive) {
        dispatch(removeGeneratingChat(targetChatId));
        abortControllers.current.delete(targetChatId);
      }
    }
  }, [hostUrl, globalModel, provider, contextLimit, batchLimit, devMode, isThinkingMode, supportsThinking, t, dispatch]);

  const abortGeneration = useCallback((chatId: string) => {
    abortControllers.current.get(chatId)?.abort();
    abortControllers.current.delete(chatId);
    dispatch(removeGeneratingChat(chatId));
  }, [dispatch]);

  const generateChatTitle = useCallback(async (initialText: string, targetChatId: string) => {
    try {
      const cleanHost = hostUrl.replace(/\/v1\/?$/, '');
      const prompt = `Generate a very short, concise title (maximum 30 characters) for a chat that starts with the following message. Respond ONLY with the title, no quotes, no extra text.\n\nMessage: "${initialText}"`;
      
      let generatedTitle = '';
      
      if (provider === 'ollama') {
        const res = await fetch(`${cleanHost}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: globalModel || 'llama3',
            prompt,
            stream: false,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          generatedTitle = data.response?.trim() || '';
        }
      } else {
        const res = await fetch(`${cleanHost}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: globalModel,
            messages: [{ role: 'user', content: prompt }],
            stream: false,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          generatedTitle = data.choices?.[0]?.message?.content?.trim() || '';
        }
      }
      
      if (generatedTitle) {
        dispatch(updateChatTitle({ chatId: targetChatId, title: generatedTitle }));
      }
    } catch {}
  }, [hostUrl, provider, globalModel, dispatch]);

  return { sendStream, abortGeneration, generateChatTitle };
}
