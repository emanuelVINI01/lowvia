import React, { useRef, useState, useEffect } from 'react';
import { Zap, BrainCircuit } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ChatInputProps {
  input: string;
  setInput: (val: string) => void;
  handleSendMessage: (e?: React.FormEvent) => void;
  isGenerating: boolean;
  abortGeneration?: () => void;
  isThinkingMode: boolean;
  setIsThinkingMode: (val: boolean) => void;
  supportsThinking: boolean;
}

const SLASH_COMMANDS = [
  { id: 'deep-research', label: '/deep-research', desc: 'Perform a deep web research', lang: 'en' },
  { id: 'pesquisa-profunda', label: '/pesquisa-profunda', desc: 'Realizar pesquisa profunda na web', lang: 'pt' },
  { id: 'code', label: '/code', desc: 'Focus strictly on coding and development', lang: 'en' },
  { id: 'codigo', label: '/codigo', desc: 'Focar em programação e código puro', lang: 'pt' },
  { id: 'model', label: '/model ', desc: 'Change the active AI model (e.g. /model qwen)', lang: 'all' },
];

export default function ChatInput({
  input,
  setInput,
  handleSendMessage,
  isGenerating,
  abortGeneration,
  isThinkingMode,
  setIsThinkingMode,
  supportsThinking,
}: ChatInputProps) {
  const { t, i18n } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showCommands, setShowCommands] = useState(false);
  const [filteredCommands, setFilteredCommands] = useState(SLASH_COMMANDS);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    
    if (val.startsWith('/')) {
      const searchStr = val.toLowerCase();
      const currentLang = i18n.language.startsWith('pt') ? 'pt' : 'en';
      const filtered = SLASH_COMMANDS.filter(c => 
        (c.lang === 'all' || c.lang === currentLang) && c.label.toLowerCase().includes(searchStr)
      );
      setFilteredCommands(filtered);
      setShowCommands(filtered.length > 0);
      setSelectedCommandIndex(0);
    } else {
      setShowCommands(false);
    }

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const applyCommand = (commandLabel: string) => {
    setInput(commandLabel);
    setShowCommands(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showCommands) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCommandIndex(prev => (prev < filteredCommands.length - 1 ? prev + 1 : prev));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCommandIndex(prev => (prev > 0 ? prev - 1 : 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applyCommand(filteredCommands[selectedCommandIndex].label);
        return;
      }
      if (e.key === 'Escape') {
        setShowCommands(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      setShowCommands(false);
      handleSendMessage();
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(e);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  return (
    <div style={{ position: 'relative' }}>
      {showCommands && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: 0,
          right: 0,
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          marginBottom: '8px',
          overflow: 'hidden',
          zIndex: 10,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          {filteredCommands.map((cmd, idx) => (
            <div
              key={cmd.id}
              onClick={() => applyCommand(cmd.label)}
              onMouseEnter={() => setSelectedCommandIndex(idx)}
              style={{
                padding: '10px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                backgroundColor: idx === selectedCommandIndex ? 'var(--bg-tertiary)' : 'transparent',
                transition: 'background 0.1s'
              }}
            >
              <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{cmd.label}</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{cmd.desc}</span>
            </div>
          ))}
        </div>
      )}
      <form className="input-area" onSubmit={onSubmit}>
        <div className="chat-input-wrapper" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
          <textarea
            ref={textareaRef}
            className="chat-textarea"
            placeholder={t('chat.placeholder')}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          {isGenerating && abortGeneration ? (
            <button
              type="button"
              className="send-button"
              onClick={abortGeneration}
              style={{ height: '40px', alignSelf: 'flex-end', marginBottom: '8px', background: '#e53935', borderColor: '#e53935' }}
              title="Parar Geração"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              </svg>
            </button>
          ) : (
            <button
              type="submit"
              className="send-button"
              disabled={!input.trim()}
              style={{ height: '40px', alignSelf: 'flex-end', marginBottom: '8px' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button
            type="button"
            className={`toggle-btn ${!isThinkingMode ? 'active' : ''}`}
            onClick={() => setIsThinkingMode(false)}
          >
            <Zap size={14} /> {t('chat.instant')}
          </button>
          {/* Only show Thinking toggle if the model supports it */}
          {supportsThinking && (
            <button
              type="button"
              className={`toggle-btn ${isThinkingMode ? 'active' : ''}`}
              onClick={() => setIsThinkingMode(true)}
            >
              <BrainCircuit size={14} /> {t('chat.thinking')}
            </button>
          )}
        </div>
      </div>
    </form>
    </div>
  );
}
