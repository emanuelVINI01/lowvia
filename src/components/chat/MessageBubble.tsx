import React, { memo, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Message } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, RotateCcw, AlertTriangle, Copy, Check, Download, FileText, Search, Globe, Cpu, ChevronDown, ChevronRight } from 'lucide-react';
import { downloadGeneratedFile } from '../../agent/tools/generate_file';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'highlight.js/styles/base16/snazzy.css';
import 'katex/dist/katex.min.css';
import { extractToolCalls } from '../../utils/parser';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  onEdit?: () => void;
  onRetry?: () => void;
}

const MessageBubble = memo(function MessageBubble({
  message,
  isStreaming = false,
  onEdit,
  onRetry,
}: MessageBubbleProps) {
  const [hovered, setHovered] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [expandedTools, setExpandedTools] = useState<Record<number, boolean>>({});
  const [progressPercent, setProgressPercent] = useState(0);

  const toggleTool = (idx: number) => {
    setExpandedTools(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleCopy = async () => {
    if (!message.content) return;
    try {
      const textToCopy = message.content.replace(/<(?:tool_call|tool)>[\s\S]*?(?:<\/(?:tool_call|tool)>|<\/?tool_result>|$)/g, '').trim();
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const hasThinking = !!message.thinking;
  const isThinkingPhase = isStreaming && hasThinking && !message.content;
  const isContentPhase = isStreaming && hasThinking && !!message.content;
  const isComplete = !isStreaming && hasThinking;

  // Utilize our robust parser to extract tool calls (both JSON and XML)
  const toolCalls = extractToolCalls(message.content || '');

  let displayContent = message.content ? message.content.replace(/<(?:tool_call|tool)>[\s\S]*?(?:<\/(?:tool_call|tool)>|<\/?tool_result>|$)/g, '') : '';
  displayContent = displayContent.trim();
  displayContent = displayContent.replace(/```\w*\s*```/g, ''); // strip empty code blocks left behind


  let activeToolName = '';
  let activeToolParam = '';
  if (isStreaming) {
    const rawContent = message.content || '';
    const toolMatch = rawContent.match(/<tool_call>\s*(?:<([a-zA-Z0-9_]+)>|{"name":\s*"([^"]+)")/);
    if (toolMatch) {
      activeToolName = toolMatch[1] || toolMatch[2] || 'ferramenta';
      
      if (activeToolName === 'search_web') {
        const queryMatch = rawContent.match(/<queries>([\s\S]*?)(?:<\/queries>|$)/);
        if (queryMatch) {
          try {
            const parsedArray = JSON.parse(queryMatch[1].trim());
            if (Array.isArray(parsedArray) && parsedArray.length > 0) {
              activeToolParam = parsedArray[0];
            }
          } catch {
            activeToolParam = queryMatch[1].replace(/[\[\]"]/g, '').split(',')[0].trim();
          }
        }
      } else if (activeToolName === 'read_url') {
        const urlMatch = rawContent.match(/<url>([\s\S]*?)(?:<\/url>|$)/);
        if (urlMatch) {
          try { 
            const u = new URL(urlMatch[1].trim());
            activeToolParam = u.hostname;
          } catch {
            activeToolParam = urlMatch[1].trim();
          }
        }
      } else if (activeToolName === 'generate_file') {
        const fileMatch = rawContent.match(/<filename>([\s\S]*?)(?:<\/filename>|$)/);
        if (fileMatch) activeToolParam = fileMatch[1].trim();
      }
    }
    displayContent = displayContent.replace(/<tool_call>[\s\S]*$/, '');
  }

  useEffect(() => {
    if (activeToolName && isStreaming) {
      setProgressPercent(0);
      const interval = setInterval(() => {
        setProgressPercent(prev => {
          if (prev >= 95) return prev;
          return prev + Math.max(0.3, (95 - prev) * 0.08);
        });
      }, 100);
      return () => clearInterval(interval);
    } else {
      setProgressPercent(100);
    }
  }, [activeToolName, isStreaming]);

  const renderActiveToolProgress = () => {
    if (!activeToolName) return null;
    
    let statusText = 'Analisando dados...';
    let Icon = Cpu;
    if (activeToolName === 'search_web') {
      statusText = activeToolParam ? `Pesquisando: ${activeToolParam}...` : 'Preparando pesquisa na web...';
      Icon = Search;
    } else if (activeToolName === 'read_url') {
      statusText = activeToolParam ? `Lendo site: ${activeToolParam}` : 'Conectando ao site...';
      Icon = Globe;
    } else if (activeToolName === 'generate_file') {
      statusText = activeToolParam ? `Gerando: ${activeToolParam}...` : 'Gerando documento final...';
      Icon = FileText;
    }

    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        className="active-tool-progress"
        style={{
          marginTop: '12px',
          marginBottom: '12px',
          padding: '14px 18px',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          maxWidth: '450px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <Icon size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
            {statusText}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{Math.round(progressPercent)}%</span>
        </div>
        <div style={{
          width: '100%',
          height: '4px',
          background: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '2px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <motion.div
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.2, ease: 'linear' }}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              background: 'linear-gradient(90deg, rgba(255,255,255,0.2), rgba(255,255,255,0.8))',
              borderRadius: '2px'
            }}
          />
        </div>
      </motion.div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`message-bubble ${message.role} ${!displayContent.trim() && !hasThinking && toolCalls.length === 0 ? 'tool-only-bubble' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative' }}
    >
      {message.interrupted && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'rgba(255, 23, 68, 0.08)',
          border: '1px solid rgba(255,23,68,0.3)',
          borderRadius: '6px', padding: '6px 10px',
          marginBottom: '8px', fontSize: '0.78rem', color: '#ff5f57',
        }}>
          <AlertTriangle size={13} />
          Stream interrompido
          {onRetry && (
            <button onClick={onRetry} style={{
              marginLeft: 'auto', display: 'flex', alignItems: 'center',
              gap: '4px', background: 'rgba(255,95,87,0.15)',
              border: '1px solid rgba(255,95,87,0.3)',
              borderRadius: '4px', padding: '2px 8px',
              color: '#ff5f57', cursor: 'pointer', fontSize: '0.75rem',
            }}>
              <RotateCcw size={11} /> Tentar novamente
            </button>
          )}
        </div>
      )}

      <AnimatePresence>
        {isThinkingPhase && (
          <motion.div
            key="thinking-streaming"
            className="thinking-streaming"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="thinking-streaming-text">{message.thinking}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {(isContentPhase || isComplete) && (
        <details className="thinking-accordion" style={{ marginBottom: '12px' }}>
          <summary>
            🧠 Cadeia de pensamento
            <span className="thinking-accordion-chevron">▾</span>
          </summary>
          <div className="thinking-accordion-body">{message.thinking}</div>
        </details>
      )}

      {/* Completed Tools UI */}
      {toolCalls.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
          {toolCalls.map((tool, idx) => {
            if (tool.name === 'generate_file' && tool.arguments?.filename) {
              return (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px', padding: '12px 16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: 'var(--accent-primary)', padding: '8px', borderRadius: '6px', color: '#fff' }}>
                      <FileText size={20} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{tool.arguments.filename}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Documento Gerado</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => downloadGeneratedFile(tool.arguments.filename, tool.arguments.content || '')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)',
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '6px 12px',
                      fontSize: '0.8rem', cursor: 'pointer', fontWeight: 500,
                      transition: 'background 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  >
                    <Download size={14} /> Baixar
                  </button>
                </div>
              );
            }

            const isExpanded = expandedTools[idx];
            let toolLabel = `Executou ${tool.name}`;
            let ToolIcon = Cpu;
            
            if (tool.name === 'search_web') {
              toolLabel = 'Pesquisou na web';
              ToolIcon = Search;
            } else if (tool.name === 'read_url') {
              toolLabel = 'Leu conteúdo de site';
              ToolIcon = Globe;
            }

            return (
              <div key={idx} style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <button 
                  onClick={() => toggleTool(idx)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ background: 'rgba(34, 197, 94, 0.15)', padding: '4px', borderRadius: '50%' }}>
                      <Check size={12} color="#22c55e" />
                    </div>
                    <ToolIcon size={14} color="var(--text-secondary)" />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{toolLabel}</span>
                  </div>
                  <div style={{ color: 'var(--text-muted)' }}>
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </div>
                </button>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ padding: '0 12px 12px 12px' }}>
                        <pre style={{ 
                          margin: 0, 
                          background: 'rgba(0,0,0,0.2)', 
                          padding: '8px',
                          borderRadius: '6px',
                          color: 'var(--text-muted)', 
                          whiteSpace: 'pre-wrap', 
                          fontSize: '0.75rem',
                          maxHeight: '150px',
                          overflowY: 'auto'
                        }}>
                          <code>{JSON.stringify(tool.arguments, null, 2)}</code>
                        </pre>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* Deep Research Animated Progress Bar */}
      {renderActiveToolProgress()}

      {displayContent.trim() ? (
        <div className={isStreaming && !message.interrupted ? 'stream-cursor' : ''}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeHighlight, rehypeKatex]}
            components={{
              code({ className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return (
                  <code className={match ? `hljs language-${match[1]}` : ''} {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {displayContent}
          </ReactMarkdown>
        </div>
      ) : null}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {message.role === 'user' && onEdit && hovered && (
            <button onClick={onEdit} style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '4px', padding: '2px 8px', cursor: 'pointer',
              color: 'rgba(255,255,255,0.7)', fontSize: '0.72rem',
            }}>
              <Pencil size={11} /> Editar
            </button>
          )}
          {message.role === 'assistant' && !message.interrupted && onRetry && hovered && message.content && !isStreaming && (
            <button onClick={onRetry} style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              background: 'rgba(126,87,194,0.1)', border: '1px solid rgba(126,87,194,0.25)',
              borderRadius: '4px', padding: '2px 8px', cursor: 'pointer',
              color: 'var(--text-secondary)', fontSize: '0.72rem',
              transition: 'all 0.2s ease'
            }}>
              <RotateCcw size={11} /> Regenerar
            </button>
          )}
          {message.role === 'assistant' && hovered && message.content && !isStreaming && (
            <button onClick={handleCopy} style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              background: isCopied ? 'rgba(34,197,94,0.15)' : 'rgba(126,87,194,0.1)', 
              border: isCopied ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(126,87,194,0.25)',
              borderRadius: '4px', padding: '2px 8px', cursor: 'pointer',
              color: isCopied ? '#22c55e' : 'var(--text-secondary)', fontSize: '0.72rem',
              transition: 'all 0.2s ease',
              transform: isCopied ? 'scale(0.95)' : 'scale(1)'
            }}>
              {isCopied ? <Check size={11} /> : <Copy size={11} />} 
              {isCopied ? 'Copiado' : 'Copiar'}
            </button>
          )}
        </div>
        {!(!displayContent.trim() && !hasThinking) && (
          <div style={{
            fontSize: '0.7rem',
            color: message.role === 'user' ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)',
          }}>
            {message.timestamp}
          </div>
        )}
      </div>
    </motion.div>
  );
});

export default MessageBubble;

