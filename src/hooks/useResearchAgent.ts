import { useCallback, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { 
  updateResearchStatus, 
  setResearchPlan, 
  addResearchStep, 
  updateResearchStep, 
  setResearchReport 
} from '../store/slices/researchSlice';
import { ResearchSession, ResearchPlan, ResearchStep } from '../types';
import { generateSystemPrompt } from '../agent/systemPrompt';
import { extractToolCalls } from '../utils/parser';
import { availableTools } from '../agent/tools';

const RESEARCH_STREAM_KEY = 'ollama_active_research_stream';

export function useResearchAgent() {
  const dispatch = useAppDispatch();
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  const { hostUrl, globalModel, provider, contextLimit, batchLimit, isThinkingMode, openRouterApiKey } = useAppSelector(state => state.settings);
  const { modelCapabilities } = useAppSelector(state => state.app);
  const supportsThinking = provider === 'ollama' && modelCapabilities.includes('think');

  const startResearch = useCallback(async (
    sessionId: string,
    query: string,
    sessions: ResearchSession[]
  ) => {
    dispatch(updateResearchStatus({ id: sessionId, status: 'planning' }));

    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    const abort = new AbortController();
    abortControllers.current.set(sessionId, abort);

    // Phase 1: Planning
    const planSystemPrompt = `
You are an elite Deep Research Planning Agent.
The user has requested a deep research on the following topic: "${query}".
Your ONLY job right now is to output a comprehensive research plan.
You MUST output your plan strictly as a JSON object, wrapped in a <plan> tag.
Format:
<plan>
{
  "summary": "Brief summary of what you intend to research",
  "steps": [
    "Step 1: Search for X to understand Y",
    "Step 2: Read the top 3 articles about Z",
    "Step 3: Synthesize findings into a final report"
  ]
}
</plan>
DO NOT output anything else. Just the <plan> block.`;

    let plan: ResearchPlan | null = null;
    let accumulatedPlanText = '';

    try {
      const cleanHost = hostUrl.replace(/\/v1\/?$/, '');
      const reqBody: any = {
        model: globalModel || 'llama3',
        messages: [{ role: 'system', content: planSystemPrompt }],
        stream: true,
      };

      if (provider === 'ollama') {
        reqBody.options = { num_ctx: contextLimit > 0 ? contextLimit : 8192 };
        if (isThinkingMode && supportsThinking) reqBody.think = true;
      } else {
        reqBody.max_tokens = contextLimit > 0 ? contextLimit : undefined;
      }

      const res = await fetch(`${cleanHost}${provider === 'ollama' ? '/api/chat' : '/v1/chat/completions'}`, {
        method: 'POST',
        signal: abort.signal,
        headers: { 
          'Content-Type': 'application/json',
          ...(provider === 'openrouter' && openRouterApiKey ? { 'Authorization': `Bearer ${openRouterApiKey}` } : {})
        },
        body: JSON.stringify(reqBody),
      });

      if (!res.ok) throw new Error('Failed to generate plan');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (reader) {
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
            if (provider === 'openrouter') {
              if (line === 'data: [DONE]') continue;
              if (line.startsWith('data: ')) jsonString = line.replace(/^data: /, '');
              else continue;
            }
            try {
              const parsed = JSON.parse(jsonString);
              if (provider === 'ollama') accumulatedPlanText += parsed?.message?.content ?? '';
              else accumulatedPlanText += parsed?.choices?.[0]?.delta?.content ?? '';
            } catch {}
          }
        }
      }

      // Parse the plan
      const planMatch = accumulatedPlanText.match(/<plan>\s*(\{[\s\S]*?\})\s*<\/plan>/);
      if (planMatch) {
        try {
          plan = JSON.parse(planMatch[1]);
          if (plan) {
            dispatch(setResearchPlan({ id: sessionId, plan }));
          }
        } catch {}
      }
      
      if (!plan) {
        // Fallback plan
        plan = { summary: 'Auto-generated plan', steps: ['Search the web', 'Read relevant pages', 'Synthesize report'] };
        dispatch(setResearchPlan({ id: sessionId, plan }));
      }

    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error('Planning phase failed:', e);
      }
      return;
    }

    // Phase 2: Execution (Agent Loop)
    dispatch(updateResearchStatus({ id: sessionId, status: 'researching' }));

    const executionSystemPrompt = generateSystemPrompt(`
You are an elite Deep Research Execution Agent.
Your goal is to execute the following research plan:
${JSON.stringify(plan, null, 2)}

User Topic: "${query}"

[DIRETIVA DE SISTEMA]: Esta é uma PESQUISA PROFUNDA autônoma.
Passos obrigatórios:
1. Formule múltiplas queries e use a ferramenta \`search_web\` para encontrar links.
2. Dos resultados da busca, analise os URLs mais relevantes.
3. Utilize a ferramenta \`read_url\` passando o URL exato para fazer o scraping completo. Leia pelo menos 3 a 5 páginas diferentes para cruzar dados.
4. Quando tiver informação suficiente, escreva o relatório final detalhado em Markdown DIRETAMENTE COMO TEXTO DA SUA RESPOSTA FINAL. NÃO use a ferramenta generate_file a menos que o usuário explicitamente pediu para salvar num arquivo. Apenas responda com o Markdown completo e bem formatado.
`);

    const history: any[] = [{ role: 'user', content: query }];
    
    const executeLoop = async (currentHistory: any[]) => {
      try {
        const cleanHost = hostUrl.replace(/\/v1\/?$/, '');
        const reqBody: any = {
          model: globalModel || 'llama3',
          messages: [{ role: 'system', content: executionSystemPrompt }, ...currentHistory],
          stream: true,
        };

        if (provider === 'ollama') {
          reqBody.options = { num_ctx: contextLimit > 0 ? contextLimit : 8192, stop: ['<tool_result>'] };
          if (isThinkingMode && supportsThinking) reqBody.think = true;
        } else {
          reqBody.max_tokens = contextLimit > 0 ? contextLimit : undefined;
          reqBody.stop = ['<tool_result>'];
        }

        const res = await fetch(`${cleanHost}${provider === 'ollama' ? '/api/chat' : '/v1/chat/completions'}`, {
          method: 'POST',
          signal: abort.signal,
          headers: { 
            'Content-Type': 'application/json',
            ...(provider === 'openrouter' && openRouterApiKey ? { 'Authorization': `Bearer ${openRouterApiKey}` } : {})
          },
          body: JSON.stringify(reqBody),
        });

        if (!res.ok) throw new Error('Execution failed');

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let accumulated = '';

        if (reader) {
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
              if (provider === 'openrouter') {
                if (line === 'data: [DONE]') continue;
                if (line.startsWith('data: ')) jsonString = line.replace(/^data: /, '');
                else continue;
              }
              try {
                const parsed = JSON.parse(jsonString);
                if (provider === 'ollama') accumulated += parsed?.message?.content ?? '';
                else accumulated += parsed?.choices?.[0]?.delta?.content ?? '';
              } catch {}
            }
          }
        }

        const extractedTools = extractToolCalls(accumulated);
        
        if (extractedTools.length > 0) {
          let toolResultsText = '';
          
          for (const toolCall of extractedTools) {
            if (toolCall.name === 'search_web') {
              const stepId = Date.now().toString() + Math.random();
              const queries = toolCall.arguments?.queries ? JSON.stringify(toolCall.arguments.queries) : toolCall.arguments?.query || 'Web Search';
              dispatch(addResearchStep({ id: sessionId, step: { id: stepId, type: 'search', query: queries, status: 'active' } }));
              
              const tool = availableTools.find(t => t.name === toolCall.name);
              let result = '';
              try {
                result = await tool!.execute(toolCall.arguments);
                dispatch(updateResearchStep({ id: sessionId, stepId, updates: { status: 'completed' } }));
              } catch (e: any) {
                result = 'Error';
                dispatch(updateResearchStep({ id: sessionId, stepId, updates: { status: 'failed' } }));
              }
              toolResultsText += `<tool_result name="search_web">\n${result}\n</tool_result>\n\n`;
            } else if (toolCall.name === 'read_url') {
              const stepId = Date.now().toString() + Math.random();
              dispatch(addResearchStep({ id: sessionId, step: { id: stepId, type: 'read', url: toolCall.arguments?.url || 'Reading URL...', status: 'active' } }));
              
              const tool = availableTools.find(t => t.name === toolCall.name);
              let result = '';
              try {
                result = await tool!.execute(toolCall.arguments);
                dispatch(updateResearchStep({ id: sessionId, stepId, updates: { status: 'completed' } }));
              } catch (e: any) {
                result = 'Error';
                dispatch(updateResearchStep({ id: sessionId, stepId, updates: { status: 'failed' } }));
              }
              toolResultsText += `<tool_result name="read_url">\n${result}\n</tool_result>\n\n`;
            } else {
              // Execute other tools normally without specific UI tracking
              const tool = availableTools.find(t => t.name === toolCall.name);
              if (tool) {
                 const result = await tool.execute(toolCall.arguments);
                 toolResultsText += `<tool_result name="${toolCall.name}">\n${result}\n</tool_result>\n\n`;
              }
            }
          }

          // Continue loop
          currentHistory.push({ role: 'assistant', content: accumulated });
          currentHistory.push({ role: 'user', content: toolResultsText });
          await executeLoop(currentHistory);

        } else {
          // No more tools, we have the final report
          dispatch(updateResearchStatus({ id: sessionId, status: 'synthesizing' }));
          
          // Cleanup think tags from final report
          let finalReport = accumulated.replace(/<think>[\s\S]*?<\/think>/, '').trim();
          dispatch(setResearchReport({ id: sessionId, report: finalReport }));
        }

      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.error('Research execution failed:', e);
          dispatch(setResearchReport({ id: sessionId, report: `**Error during research execution:** ${e.message}` }));
        }
      }
    };

    await executeLoop(history);

    abortControllers.current.delete(sessionId);
  }, [dispatch, hostUrl, globalModel, provider, contextLimit, isThinkingMode, supportsThinking, openRouterApiKey]);

  const abortResearch = useCallback((sessionId: string) => {
    abortControllers.current.get(sessionId)?.abort();
    abortControllers.current.delete(sessionId);
  }, []);

  return { startResearch, abortResearch };
}
