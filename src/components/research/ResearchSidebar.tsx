import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { 
  addResearchSession, 
  setActiveResearchSessionId, 
  toggleResearchSidebar,
  deleteResearchSession
} from '../../store/slices/researchSlice';
import { useResearchAgent } from '../../hooks/useResearchAgent';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Clock, CheckCircle2, Loader2, Play, Trash2, ChevronRight, Activity, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default function ResearchSidebar() {
  const dispatch = useAppDispatch();
  const { sessions, activeSessionId, isSidebarOpen } = useAppSelector(state => state.research);
  const { startResearch, abortResearch } = useResearchAgent();
  
  const [queryInput, setQueryInput] = useState('');

  if (!isSidebarOpen) return null;

  const activeSession = sessions.find(s => s.id === activeSessionId);

  const handleStartResearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryInput.trim()) return;

    const newSessionId = Date.now().toString();
    dispatch(addResearchSession({
      id: newSessionId,
      title: queryInput.length > 30 ? queryInput.substring(0, 30) + '...' : queryInput,
      prompt: queryInput,
      steps: [],
      status: 'idle',
      updatedAt: Date.now()
    }));
    dispatch(setActiveResearchSessionId(newSessionId));
    
    // Start agent flow
    // Need to pass sessions state, but useResearchAgent pulls it from Redux inside or we pass it
    // Wait, the hook needs the latest state to find it, or we just pass the new session state manually.
    // Actually, passing the updated array
    startResearch(newSessionId, queryInput, [{
      id: newSessionId,
      title: queryInput,
      prompt: queryInput,
      steps: [],
      status: 'idle',
      updatedAt: Date.now()
    }, ...sessions]);
    
    setQueryInput('');
  };

  return (
    <motion.div 
      initial={{ width: 0, opacity: 0 }} 
      animate={{ width: 350, opacity: 1 }} 
      exit={{ width: 0, opacity: 0 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        borderLeft: '1px solid var(--border-color)',
        background: 'var(--bg-secondary)',
        overflow: 'hidden',
        flexShrink: 0
      }}
    >
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '1.1rem', color: 'var(--accent-indigo)' }}>
          <Search size={18} /> Deep Research
        </h3>
        <button 
          onClick={() => dispatch(toggleResearchSidebar(false))}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        
        {/* Active Session View */}
        {activeSession ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
              <button 
                onClick={() => dispatch(setActiveResearchSessionId(null))}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '12px', fontSize: '0.85rem' }}
              >
                <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }}/> Voltar ao Histórico
              </button>
              <h4 style={{ margin: '0 0 8px 0' }}>{activeSession.title}</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                Status: <span style={{ color: activeSession.status === 'done' ? 'var(--accent-green)' : 'var(--accent-indigo)', textTransform: 'capitalize' }}>
                  {activeSession.status}
                </span>
              </p>
            </div>

            <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
              {/* Plan Section */}
              {activeSession.plan && (
                <div style={{ marginBottom: '24px' }}>
                  <h5 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Activity size={14} /> Plano de Ação
                  </h5>
                  <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 8px 0' }}>{activeSession.plan.summary}</p>
                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      {activeSession.plan.steps.map((step, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>{step}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Execution Steps */}
              {activeSession.steps.length > 0 && (
                <div>
                  <h5 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)' }}>Progresso</h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <AnimatePresence>
                      {activeSession.steps.map(step => (
                        <motion.div 
                          key={step.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'flex-start', 
                            gap: '12px',
                            background: 'var(--bg-primary)',
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            opacity: step.status === 'completed' ? 0.7 : 1
                          }}
                        >
                          <div style={{ marginTop: '2px' }}>
                            {step.status === 'active' ? (
                              <Loader2 size={16} className="spin" style={{ color: 'var(--accent-indigo)' }} />
                            ) : step.status === 'completed' ? (
                              <CheckCircle2 size={16} style={{ color: 'var(--accent-green)' }} />
                            ) : step.status === 'failed' ? (
                              <X size={16} style={{ color: 'var(--accent-red)' }} />
                            ) : (
                              <Clock size={16} style={{ color: 'var(--text-secondary)' }} />
                            )}
                          </div>
                          <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                              {step.type === 'search' ? 'Busca Web' : step.type === 'read' ? 'Leitura de Página' : 'Processamento'}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {step.query || step.url || 'Aguardando...'}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* Final Report Preview or Full (maybe better in main area, but we can show a snippet here) */}
              {activeSession.report && (
                <div style={{ marginTop: '24px' }}>
                  <h5 style={{ margin: '0 0 8px 0', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={16} /> Relatório Finalizado
                  </h5>
                  <div style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem', color: 'var(--text-primary)', overflowWrap: 'anywhere' }}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeHighlight, rehypeKatex]}
                    >
                      {activeSession.report}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>

            {/* Abort button if running */}
            {activeSession.status !== 'done' && activeSession.status !== 'idle' && (
              <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)' }}>
                <button 
                  className="btn btn-secondary" 
                  style={{ width: '100%', borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}
                  onClick={() => abortResearch(activeSession.id)}
                >
                  Interromper Pesquisa
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* New Session Input */}
            <form onSubmit={handleStartResearch} style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: '8px', display: 'block' }}>Nova Pesquisa Profunda</label>
              <textarea 
                value={queryInput}
                onChange={e => setQueryInput(e.target.value)}
                placeholder="O que quer investigar hoje?"
                rows={3}
                style={{ width: '100%', resize: 'none', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '12px' }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleStartResearch(e);
                  }
                }}
              />
              <button type="submit" className="btn btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }} disabled={!queryInput.trim()}>
                <Play size={16} /> Iniciar Agente
              </button>
            </form>

            <div style={{ flex: 1 }}>
              <h5 style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Histórico</h5>
              {sessions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Nenhuma pesquisa anterior
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {sessions.map(s => (
                    <div 
                      key={s.id} 
                      style={{ 
                        background: 'var(--bg-primary)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '8px', 
                        padding: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                      onClick={() => dispatch(setActiveResearchSessionId(s.id))}
                    >
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px' }}>
                          {s.title}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {new Date(s.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); dispatch(deleteResearchSession(s.id)); }}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-red)', opacity: 0.7, cursor: 'pointer', padding: '4px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
