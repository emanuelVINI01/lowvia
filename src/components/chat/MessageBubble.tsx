import React, { memo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Message } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, RotateCcw, AlertTriangle, Copy, Check } from 'lucide-react';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'highlight.js/styles/base16/snazzy.css';
import 'katex/dist/katex.min.css';

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

  const handleCopy = async () => {
    if (!message.content) return;
    try {
      // Remove tool call XML blocks from the copied text to give the user clean text
      const textToCopy = message.content.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '').trim();
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Determine thinking display state
  const hasThinking = !!message.thinking;
  const isThinkingPhase = isStreaming && hasThinking && !message.content; // still thinking, no content yet
  const isContentPhase = isStreaming && hasThinking && !!message.content; // thinking done, content streaming
  const isComplete = !isStreaming && hasThinking;

  // Parse tool calls for accordion display
  const toolCalls: any[] = [];
  let displayContent = message.content
    ? message.content.replace(/<tool_call>\s*(\{[\s\S]*?\})\s*<\/tool_call>/g, (match, jsonStr) => {
        try {
          const parsed = JSON.parse(jsonStr);
          toolCalls.push(parsed);
        } catch {
          toolCalls.push({ name: '⚠️ Erro de Sintaxe (JSON Inválido)', arguments: { erro: 'O modelo gerou um JSON malformado e foi instruído a corrigir.' } });
        }
        return ''; // Remove the raw XML from the markdown output
      })
    : '';

  // Hide incomplete tool calls during streaming so raw XML doesn't flash
  if (isStreaming) {
    displayContent = displayContent.replace(/<tool_call>[\s\S]*$/, '');
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`message-bubble ${message.role}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative' }}
    >
      {/* ── Interrupted banner ── */}
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

      {/* ── THINKING: actively streaming thinking phase ── */}
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

      {/* ── THINKING: content started streaming — show collapsed accordion ── */}
      {isContentPhase && (
        <details className="thinking-accordion">
          <summary>
            🧠 Cadeia de pensamento
            <span className="thinking-accordion-chevron">▾</span>
          </summary>
          <div className="thinking-accordion-body">{message.thinking}</div>
        </details>
      )}

      {/* ── THINKING: complete — persistent collapsible accordion ── */}
      {isComplete && (
        <details className="thinking-accordion">
          <summary>
            🧠 Cadeia de pensamento
            <span className="thinking-accordion-chevron">▾</span>
          </summary>
          <div className="thinking-accordion-body">{message.thinking}</div>
        </details>
      )}

      {/* ── TOOLS: Collapsible accordion for each tool call ── */}
      {toolCalls.map((tool, idx) => (
        <details key={idx} className="thinking-accordion">
          <summary style={{ color: 'var(--text-primary)' }}>
            🔧 Ferramenta Invocada: {tool.name}
            <span className="thinking-accordion-chevron">▾</span>
          </summary>
          <div className="thinking-accordion-body">
            <pre style={{ margin: 0, background: 'transparent', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>
              <code>{JSON.stringify(tool.arguments, null, 2)}</code>
            </pre>
          </div>
        </details>
      ))}

      {/* ── Main content ── */}
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

      {/* ── Footer ── */}
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
        <div style={{
          fontSize: '0.7rem',
          color: message.role === 'user' ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)',
        }}>
          {message.timestamp}
        </div>
      </div>
    </motion.div>
  );
});

export default MessageBubble;
