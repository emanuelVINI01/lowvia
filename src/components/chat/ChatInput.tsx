import React, { useRef } from 'react';
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
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
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
  );
}
