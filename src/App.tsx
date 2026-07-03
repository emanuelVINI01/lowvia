import React, { useState, useEffect, useRef, useCallback } from 'react';
import BottomNav from './components/layout/BottomNav';
import TopBar from './components/layout/TopBar';
import ChatArea from './components/chat/ChatArea';
import ModelsManager from './components/models/ModelsManager';
import SettingsView from './components/settings/SettingsView';
import { ChatSession, AIModel, ProviderType, Message, DevStats } from './types';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { generateSystemPrompt } from './agent/systemPrompt';
import { availableTools } from './agent/tools';
import { extractToolCalls } from './utils/parser';

const STREAM_KEY = 'ollama_active_stream';

export default function App() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'chat' | 'models' | 'settings'>('chat');
  const [provider, setProvider] = useState<ProviderType>(() => (localStorage.getItem('ai_provider') as ProviderType) || 'ollama');
  const [hostUrl, setHostUrl] = useState<string>(() => {
    const saved = localStorage.getItem('ai_host_url');
    if (saved) return saved;
    return localStorage.getItem('ai_provider') === 'lmstudio' ? 'http://localhost:1234' : 'http://localhost:11434';
  });
  const baseSystemPrompt = 'You are a helpful and intelligent AI desktop assistant.';

  // Provider states
  const [isProviderOnline, setIsProviderOnline] = useState<boolean>(false);
  const [models, setModels] = useState<AIModel[]>([]);
  const [globalModel, setGlobalModel] = useState<string>(() => localStorage.getItem('ai_global_model') || '');
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(true);
  const [modelCapabilities, setModelCapabilities] = useState<string[]>([]);

  // Chat states
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [input, setInput] = useState<string>('');
  const [generatingChats, setGeneratingChats] = useState<string[]>([]);
  const [isThinkingMode, setIsThinkingMode] = useState<boolean>(false);

  // Dev / advanced
  const [devMode, setDevMode] = useState<boolean>(() => localStorage.getItem('dev_mode') === 'true');
  const [devStats, setDevStats] = useState<DevStats | null>(null);
  const [contextLimit, setContextLimit] = useState<number>(() => {
    const saved = localStorage.getItem('context_limit');
    return saved ? Number(saved) : 8192;
  });
  const [batchLimit, setBatchLimit] = useState<number>(() => {
    const saved = localStorage.getItem('batch_limit');
    return saved ? Number(saved) : 2048;
  });

  // Stream abort ref — lets us cancel on unmount
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  // ── Load state on mount ────────────────────────────────────────
  useEffect(() => {
    // Chats
    const savedChats = localStorage.getItem('ai_chats_v1') || localStorage.getItem('ollama_chats_v1');
    let loadedChats: ChatSession[] = [];
    if (savedChats) {
      try { loadedChats = JSON.parse(savedChats); } catch {}
    }

    // Detect interrupted stream from previous session
    const activeStream = localStorage.getItem(STREAM_KEY);
    if (activeStream) {
      try {
        const { chatId, msgIndex } = JSON.parse(activeStream);
        loadedChats = loadedChats.map(c => {
          if (c.id !== chatId) return c;
          const msgs = [...c.messages];
          if (msgs[msgIndex]) msgs[msgIndex] = { ...msgs[msgIndex], interrupted: true };
          return { ...c, messages: msgs };
        });
      } catch {}
      localStorage.removeItem(STREAM_KEY);
    }

    setChats(loadedChats);
    setActiveChatId(loadedChats.length > 0 ? loadedChats[0].id : null);

    // Saved settings
    const savedModel = localStorage.getItem('ai_global_model');
    if (savedModel) setGlobalModel(savedModel);
    const savedHost = localStorage.getItem('ai_host_url');
    if (savedHost) setHostUrl(savedHost);
    const savedContext = localStorage.getItem('context_limit');
    if (savedContext) setContextLimit(Number(savedContext));
    const savedBatch = localStorage.getItem('batch_limit');
    if (savedBatch) setBatchLimit(Number(savedBatch));
  }, []);

  // ── Persist chats ──────────────────────────────────────────────
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (chats.length > 0) localStorage.setItem('ai_chats_v1', JSON.stringify(chats));
    else localStorage.removeItem('ai_chats_v1');
  }, [chats]);

  // ── Persist settings ───────────────────────────────────────────
  useEffect(() => {
    if (globalModel) localStorage.setItem('ai_global_model', globalModel);
    if (provider) localStorage.setItem('ai_provider', provider);
    if (hostUrl) localStorage.setItem('ai_host_url', hostUrl);
  }, [globalModel, provider, hostUrl]);

  // ── Cleanup on unmount (app reload in dev) ─────────────────────
  useEffect(() => {
    return () => { 
      abortControllers.current.forEach(controller => controller.abort()); 
      abortControllers.current.clear();
    };
  }, []);

  // ── Provider connection ──────────────────────────────────────────
  useEffect(() => { checkProviderStatus(); }, [hostUrl, provider]);

  // ── Model capabilities ─────────────────────────────────────────
  useEffect(() => {
    if (!globalModel || !isProviderOnline || provider === 'lmstudio') return;
    fetchModelCapabilities(globalModel);
  }, [globalModel, isProviderOnline, hostUrl, provider]);

  const fetchModelCapabilities = async (modelName: string) => {
    try {
      const res = await fetch(`${hostUrl}/api/show`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName }),
      });
      if (res.ok) {
        const data = await res.json();
        setModelCapabilities(data.capabilities || []);
      }
    } catch {
      setModelCapabilities([]);
    }
  };

  const activeModelObj = models.find(m => m.id === globalModel);
  const supportsThinking = provider === 'lmstudio' 
    ? true // Always allow thinking toggle for LM Studio as it doesn't natively expose this capability yet
    : modelCapabilities.includes('thinking');

  const checkProviderStatus = async () => {
    setIsCheckingStatus(true);
    try {
      let fetchedModels: AIModel[] = [];

      if (provider === 'ollama') {
        const res = await fetch(`${hostUrl}/api/tags`);
        if (res.ok) {
          const data = await res.json();
          fetchedModels = (data.models || []).map((m: any) => ({
            id: m.name,
            name: m.name,
            size: m.size,
            provider: 'ollama',
            details: m.details,
          }));
        } else throw new Error();
      } else if (provider === 'lmstudio') {
        const cleanHost = hostUrl.replace(/\/v1\/?$/, '');
        try {
          // Native LM Studio API for rich metadata
          const res = await fetch(`${cleanHost}/api/v1/models`);
          if (res.ok) {
            const data = await res.json();
            fetchedModels = (data.models || []).map((m: any) => ({
              id: m.key || m.id,
              name: m.display_name || m.key || m.id,
              size: m.size_bytes,
              provider: 'lmstudio',
              capabilities: {
                vision: m.capabilities?.vision,
                thinking: m.capabilities?.reasoning !== undefined
              }
            }));
          } else throw new Error('Native API failed');
        } catch {
          // Fallback to generic OpenAI compat if native fails
          const fallbackRes = await fetch(`${cleanHost}/v1/models`);
          if (fallbackRes.ok) {
            const data = await fallbackRes.json();
            fetchedModels = (data.data || []).map((m: any) => ({
              id: m.id,
              name: m.id,
              provider: 'lmstudio',
            }));
          } else throw new Error('Fallback API failed');
        }
      }

      setModels(fetchedModels);
      setIsProviderOnline(true);
      
      // Select first model if none active, or current is not in list
      const currentExists = fetchedModels.some(m => m.id === globalModel);
      if (fetchedModels.length > 0 && (!globalModel || !currentExists)) {
        setGlobalModel(fetchedModels[0].id);
        localStorage.setItem('ai_global_model', fetchedModels[0].id);
      }
    } catch { 
      setIsProviderOnline(false); 
      setModels([]);
    } finally { 
      setIsCheckingStatus(false); 
    }
  };

  // ── Settings handlers ──────────────────────────────────────────
  const handleProviderChange = (p: ProviderType) => {
    setProvider(p);
    localStorage.setItem('ai_provider', p);
  };
  const handleGlobalModelChange = async (name: string) => {
    // Force unload the previously active model to clear VRAM before loading the new one
    if (globalModel && globalModel !== name) {
      try {
        const cleanHost = hostUrl.replace(/\/v1\/?$/, '');
        if (provider === 'ollama') {
          // Ollama's API for unloading a model
          await fetch(`${cleanHost}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: globalModel, keep_alive: 0 })
          });
        }
      } catch (e) {
        console.error('Failed to unload previous model from VRAM', e);
      }
    }

    setGlobalModel(name);
    localStorage.setItem('ai_global_model', name);
  };
  const handleHostUrlChange = (url: string) => {
    setHostUrl(url);
    localStorage.setItem('ai_host_url', url);
  };
  const handleDevModeChange = (v: boolean) => {
    setDevMode(v);
    localStorage.setItem('dev_mode', String(v));
    if (!v) setDevStats(null);
  };
  const handleContextLimitChange = (v: number) => {
    setContextLimit(v);
    localStorage.setItem('context_limit', String(v));
  };
  const handleBatchLimitChange = (v: number) => {
    setBatchLimit(v);
    localStorage.setItem('batch_limit', String(v));
  };

  // ── Core streaming function ────────────────────────────────────
  // Accepts pre-built chat list so retry/edit can pass modified state without
  // waiting for React's async setState to propagate.
  const sendStream = useCallback(async (
    userText: string,
    targetChatId: string,
    workingChats: ChatSession[],
  ) => {
    setGeneratingChats(prev => [...prev, targetChatId]);
    setDevStats(null);

    // Add empty assistant placeholder
    const assistantTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let assistantMsgIndex = 0;
    setChats(prev => prev.map(c => {
      if (c.id !== targetChatId) return c;
      assistantMsgIndex = c.messages.length;
      return { ...c, messages: [...c.messages, { role: 'assistant', content: '', timestamp: assistantTimestamp }] };
    }));

    // Mark stream as active in localStorage (for crash/reload recovery)
    localStorage.setItem(STREAM_KEY, JSON.stringify({ chatId: targetChatId, msgIndex: assistantMsgIndex }));

    const abort = new AbortController();
    abortControllers.current.set(targetChatId, abort);

    const currentChat = workingChats.find(c => c.id === targetChatId);
    const history = (currentChat?.messages || []).map(m => ({ 
      role: m.role, 
      content: m.hiddenContext ? `${m.content}\n\n${m.hiddenContext}` : m.content 
    }));

    const systemPrompt = generateSystemPrompt(baseSystemPrompt);
    let prompt = systemPrompt;
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
              num_gpu: 999, // Force maximum GPU offload including KV cache
            },
          }),
        });
      } else {
        // LM Studio (OpenAI compat)
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
          }),
        });
      }

      if (!res.ok || !res.body) throw new Error('Bad response');

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
        buffer = lines.pop() ?? ''; // The last piece is either empty (if ended with \n) or incomplete line

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
              // OpenAI format
              accumulated += parsed?.choices?.[0]?.delta?.content ?? '';
              accThinking += parsed?.choices?.[0]?.delta?.reasoning_content ?? '';
            }

            // Fallback: parse <think>…</think> tags embedded in content
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

            setChats(prev => prev.map(c => {
              if (c.id !== targetChatId) return c;
              const msgs = [...c.messages];
              const li = msgs.length - 1;
              if (msgs[li]?.role === 'assistant') {
                msgs[li] = {
                  ...msgs[li],
                  content: displayContent,
                  thinking: displayThinking || undefined,
                };
              }
              return { ...c, messages: msgs, updatedAt: Date.now() };
            }));

            // Dev Stats extraction
            if (devMode) {
              if (provider === 'ollama' && parsed?.done) {
                const evalCount = parsed.eval_count ?? 0;
                const evalDuration = parsed.eval_duration ?? 1;
                setDevStats({
                  tokensPerSecond: evalCount / (evalDuration / 1e9),
                  totalTokens: evalCount,
                  promptTokens: parsed.prompt_eval_count ?? 0,
                  generationMs: Date.now() - startTime,
                });
              } else if (provider === 'lmstudio' && parsed?.usage) {
                const generationMs = Date.now() - startTime;
                const completionTokens = parsed.usage.completion_tokens ?? 0;
                setDevStats({
                  tokensPerSecond: completionTokens > 0 ? completionTokens / (generationMs / 1000) : 0,
                  totalTokens: parsed.usage.total_tokens ?? 0,
                  promptTokens: parsed.usage.prompt_tokens ?? 0,
                  generationMs,
                });
              }
            }
          } catch { /* partial line */ }
        }
      }



      // --- Tool Calling Interception ---
      const extractedTools = extractToolCalls(accumulated);
      if (extractedTools.length > 0) {
        let allToolResultsContent = '';
        
        // Execute all tools concurrently
        const results = await Promise.all(extractedTools.map(async (toolCall) => {
          if (toolCall.name === '_syntax_error') {
            return { 
              name: 'error', 
              result: `CRITICAL ERROR: ${toolCall.arguments.error}. Your previous <tool_call> block contained malformed JSON. You MUST output strictly valid JSON. Please try again.` 
            };
          }

          const tool = availableTools.find(t => t.name === toolCall.name);
          let toolResultText = '';
          if (tool) {
            try {
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

        const toolResultMsg: Message = {
          role: 'user', // We use 'user' role to feed the result back to local models seamlessly
          content: `${allToolResultsContent}Continue answering the user based on these results. Do NOT output <tool_call> again for this specific step.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          toolCall: extractedTools[0], // Keep for legacy types, the bubble extracts its own from content
          toolResult: allToolResultsContent,
        };

        isRecursive = true;
        let updatedForNextStream: ChatSession[] = [];
        setChats(prev => {
          const updated = prev.map(c => {
            if (c.id !== targetChatId) return c;
            return { ...c, messages: [...c.messages, toolResultMsg] };
          });
          updatedForNextStream = updated;
          return updated;
        });
        
        // Re-trigger generation safely outside setState
        setTimeout(() => sendStream('', targetChatId, updatedForNextStream), 50);
      }

      // Stream finished clean — clear the recovery key if not recursive
      if (!isRecursive) {
        localStorage.removeItem(STREAM_KEY);
      }

    } catch (err: any) {
      if (err.name === 'AbortError') {
        // App was closed/reloaded — partial content is already in localStorage via the chats useEffect.
        // The STREAM_KEY is intentionally NOT removed here so the next mount can detect the interruption.
        return;
      }
      // API error — mark message as interrupted + show error content
      setChats(prev => prev.map(c => {
        if (c.id !== targetChatId) return c;
        const msgs = [...c.messages];
        const li = msgs.length - 1;
        if (msgs[li]?.role === 'assistant') {
          msgs[li] = {
            ...msgs[li],
            content: msgs[li].content || t('chat.errorGen').replace('{{url}}', hostUrl).replace('{{model}}', globalModel || 'llama3'),
            interrupted: true,
          };
        }
        return { ...c, messages: msgs };
      }));
      localStorage.removeItem(STREAM_KEY);
    } finally {
      if (!isRecursive) {
        setGeneratingChats(prev => prev.filter(id => id !== targetChatId));
        abortControllers.current.delete(targetChatId);
      }
    }
  }, [hostUrl, globalModel, contextLimit, isThinkingMode, supportsThinking, devMode, t]);

  // ── Generate title for new chat ────────────────────────────────
  const generateChatTitle = async (initialText: string, targetChatId: string) => {
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
        generatedTitle = generatedTitle.replace(/^["']|["']$/g, '');
        if (generatedTitle.length > 35) generatedTitle = generatedTitle.substring(0, 32) + '...';
        
        setChats(prev => prev.map(c => 
          c.id === targetChatId ? { ...c, title: generatedTitle } : c
        ));
      }
    } catch { /* Silent fail, keep default title */ }
  };

  // ── Send (new message) ─────────────────────────────────────────
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const userText = input.trim();
    if (!userText) return;
    if (activeChatId && generatingChats.includes(activeChatId)) return;
    setInput('');

    let displayUserText = userText;
    let hiddenContext = '';

    // Slash Commands Interception
    if (userText.startsWith('/pesquisa-profunda')) {
      displayUserText = userText.replace('/pesquisa-profunda', '').trim() || 'Inicie uma pesquisa profunda sobre as notícias de hoje.';
      hiddenContext = `[DIRETIVA DE SISTEMA PARA ESTE TURNO]: Esta é uma PESQUISA PROFUNDA iniciada pelo usuário. Você ESTÁ ESTRITAMENTE PROIBIDO de responder imediatamente usando apenas o seu conhecimento paramétrico.
Passos obrigatórios:
1. Formule múltiplas queries e use a ferramenta \`search_web\` para encontrar links promissores.
2. AGUARDE os resultados. Não emita outras ferramentas ainda.
3. Dos resultados da busca, analise os URLs mais relevantes.
4. Utilize a ferramenta \`read_url\` passando o URL exato para fazer o scraping completo e ler o conteúdo denso da página. Pode ler mais do que uma se necessário.
5. APENAS APÓS ingerir o conteúdo com o \`read_url\`, elabore a sua resposta final ultra-detalhada com citações inline do link original.`;
    }

    const newMsg: Message = {
      role: 'user', 
      content: displayUserText,
      ...(hiddenContext && { hiddenContext }),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    let targetId = activeChatId;
    let workingChats = [...chats];

    if (!targetId) {
      const newChat: ChatSession = {
        id: Date.now().toString(),
        title: userText.length > 25 ? userText.substring(0, 25) + '...' : userText,
        messages: [newMsg], updatedAt: Date.now(),
      };
      workingChats = [newChat, ...workingChats];
      setChats(workingChats);
      setActiveChatId(newChat.id);
      targetId = newChat.id;
      
      // Fire and forget title generation in the background
      generateChatTitle(userText, targetId);
    } else {
      workingChats = workingChats.map(c =>
        c.id === targetId ? { ...c, messages: [...c.messages, newMsg], updatedAt: Date.now() } : c
      );
      setChats(workingChats);
    }

    await sendStream(userText, targetId, workingChats);
  };

  // ── Retry last assistant message ───────────────────────────────
  const handleRetryMessage = (chatId: string) => {
    if (generatingChats.includes(chatId)) return;
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    // Trim trailing assistant messages and their associated hidden tool results
    const trimmed = [...chat.messages];
    while (trimmed.length && (trimmed[trimmed.length - 1].role === 'assistant' || trimmed[trimmed.length - 1].toolResult)) {
      trimmed.pop();
    }
    if (!trimmed.length) return;

    const lastUserContent = trimmed[trimmed.length - 1].content;
    const updatedChats = chats.map(c => c.id === chatId ? { ...c, messages: trimmed } : c);
    setChats(updatedChats);
    setActiveChatId(chatId);
    sendStream(lastUserContent, chatId, updatedChats);
  };

  // ── Edit user message (put it back in input, trim chat) ────────
  const handleEditMessage = (chatId: string, msgIndex: number) => {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    const content = chat.messages[msgIndex]?.content;
    if (!content) return;

    setChats(prev => prev.map(c =>
      c.id === chatId ? { ...c, messages: c.messages.slice(0, msgIndex) } : c
    ));
    setActiveChatId(chatId);
    setInput(content);
    setActiveTab('chat');
  };

  // ── Derived ────────────────────────────────────────────────────
  const startNewDraftChat = () => setActiveChatId(null);

  return (
    <div id="app" style={{ display: 'flex', width: '100vw', height: '100vh', flexDirection: 'column' }}>
      <main className="main-content">
        <TopBar
          activeTab={activeTab}
          isProviderOnline={isProviderOnline}
          isCheckingStatus={isCheckingStatus}
          checkProviderStatus={checkProviderStatus}
          globalModel={globalModel}
          modelsCount={models.length}
        />

        <div className="page-container" style={{ padding: activeTab === 'chat' ? 0 : undefined, position: 'relative' }}>
          <AnimatePresence mode="wait">
            {activeTab === 'chat' && (
              <motion.div key="chat" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }} style={{ height: '100%', width: '100%' }}>
                <ChatArea
                  chats={chats}
                  activeChatId={activeChatId}
                  setActiveChatId={setActiveChatId}
                  createNewChat={startNewDraftChat}
                  isProviderOnline={isProviderOnline}
                  hostUrl={hostUrl}
                  checkProviderStatus={checkProviderStatus}
                  modelsCount={models.length}
                  setActiveTab={setActiveTab}
                  input={input}
                  setInput={setInput}
                  handleSendMessage={handleSendMessage}
                  isGenerating={activeChatId ? generatingChats.includes(activeChatId) : false}
                  abortGeneration={() => {
                    if (activeChatId) {
                      const controller = abortControllers.current.get(activeChatId);
                      if (controller) controller.abort();
                    }
                  }}
                  isThinkingMode={isThinkingMode}
                  setIsThinkingMode={setIsThinkingMode}
                  supportsThinking={supportsThinking}
                  devMode={devMode}
                  devStats={devStats}
                  onEditMessage={handleEditMessage}
                  onRetryMessage={handleRetryMessage}
                />
              </motion.div>
            )}

            {activeTab === 'models' && (
              <motion.div key="models" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }} style={{ width: '100%', display: 'flex' }}>
                <ModelsManager
                  models={models}
                  checkProviderStatus={checkProviderStatus}
                  globalModel={globalModel}
                  setGlobalModel={handleGlobalModelChange}
                />
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div key="settings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }} style={{ width: '100%', display: 'flex' }}>
                <SettingsView
                  provider={provider}
                  setProvider={handleProviderChange}
                  hostUrl={hostUrl}
                  setHostUrl={handleHostUrlChange}
                  checkProviderStatus={checkProviderStatus}
                  devMode={devMode}
                  setDevMode={handleDevModeChange}
                  contextLimit={contextLimit}
                  setContextLimit={handleContextLimitChange}
                  batchLimit={batchLimit}
                  setBatchLimit={handleBatchLimitChange}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
