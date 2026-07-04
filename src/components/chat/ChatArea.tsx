import React, { useRef, useEffect, useState } from 'react';
import ChatSidebar from './ChatSidebar';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import DevStatsBar from './DevStatsBar';
import { ChatSession, DevStats } from '../../types';
import { useTranslation } from 'react-i18next';

interface ChatAreaProps {
  chats: ChatSession[];
  activeChatId: string | null;
  setActiveChatId: (id: string) => void;
  createNewChat: (updateState: boolean) => void;
  isProviderOnline: boolean;
  hostUrl: string;
  checkProviderStatus: () => void;
  modelsCount: number;
  setActiveTab: (tab: 'chat' | 'models' | 'settings') => void;
  input: string;
  setInput: (val: string) => void;
  handleSendMessage: (e?: React.FormEvent) => void;
  isGenerating: boolean;
  abortGeneration?: () => void;
  isThinkingMode: boolean;
  setIsThinkingMode: (val: boolean) => void;
  supportsThinking: boolean;
  devMode: boolean;
  devStats: DevStats | null;
  onEditMessage: (chatId: string, msgIndex: number) => void;
  onRetryMessage: (chatId: string) => void;
}

export default function ChatArea(props: ChatAreaProps) {
  const { t } = useTranslation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showRawHistory, setShowRawHistory] = useState(false);
  const activeChat = props.chats.find(c => c.id === props.activeChatId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat?.messages, props.isGenerating]);

  // Pre-process messages to combine consecutive assistant turns (including tool interactions)
  const displayMessages: (import('../../types').Message & { originalIndexes: number[] })[] = [];
  if (activeChat) {
    activeChat.messages.forEach((msg, index) => {
      if (msg.toolResult) return; // Hide internal tool result injections

      if (msg.role === 'assistant' && displayMessages.length > 0) {
        const last = displayMessages[displayMessages.length - 1];
        if (last.role === 'assistant') {
          // Merge this assistant message into the previous one
          last.content = (last.content + '\n\n' + msg.content).trim();
          if (msg.thinking) {
            last.thinking = (last.thinking ? last.thinking + '\n\n' : '') + msg.thinking;
          }
          last.interrupted = last.interrupted || msg.interrupted;
          last.originalIndexes.push(index);
          return;
        }
      }
      displayMessages.push({ ...msg, originalIndexes: [index] });
    });
  }

  return (
    <div className="chat-layout" style={{ display: 'flex', height: '100%', width: '100%' }}>
      <ChatSidebar
        chats={props.chats}
        activeChatId={props.activeChatId}
        setActiveChatId={props.setActiveChatId}
        createNewChat={() => props.createNewChat(true)}
      />

      <div className="chat-main">
        {!props.isProviderOnline ? (
          <div className="card" style={{ margin: 'auto', marginTop: '40px', textAlign: 'center', borderColor: 'var(--accent-red)', maxWidth: '400px' }}>
            <h3 style={{ color: 'var(--accent-red)', marginBottom: '12px' }}>{t('chat.offlineTitle')}</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
              {t('chat.offlineDesc').replace('{{url}}', props.hostUrl)}
            </p>
            <button className="btn btn-primary" onClick={props.checkProviderStatus}>
              {t('chat.retryBtn')}
            </button>
          </div>
        ) : props.modelsCount === 0 ? (
          <div className="card" style={{ margin: 'auto', marginTop: '40px', textAlign: 'center', maxWidth: '400px' }}>
            <h3>{t('chat.noModelsTitle')}</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>{t('chat.noModelsDesc')}</p>
            <button className="btn btn-primary" onClick={() => props.setActiveTab('models')}>
              {t('chat.pullModelBtn')}
            </button>
          </div>
        ) : (
          <>
            {props.devMode && activeChat && (
              <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(99, 102, 241, 0.1)', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ padding: '8px 20px', color: 'var(--accent-indigo)', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 500 }}>Developer Mode Active</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => setShowRawHistory(!showRawHistory)}
                      style={{ background: showRawHistory ? 'var(--accent-indigo)' : 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: showRawHistory ? 'white' : 'var(--text-primary)', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      👁️ {showRawHistory ? 'Esconder JSON' : 'Ver JSON Vivo'}
                    </button>
                    <button 
                      onClick={() => {
                        const historyText = JSON.stringify(activeChat.messages, null, 2);
                        navigator.clipboard.writeText(historyText);
                        alert('Histórico bruto (raw) copiado para a área de transferência!');
                      }}
                      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      📋 Copiar
                    </button>
                  </div>
                </div>
                {showRawHistory && (
                  <div style={{ padding: '0 20px 10px 20px' }}>
                    <pre style={{ margin: 0, padding: '10px', background: '#111', color: '#0f0', fontSize: '0.75rem', borderRadius: '6px', maxHeight: '300px', overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {JSON.stringify(activeChat.messages, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
            <div className="messages-list">
              {displayMessages.map((group, groupIdx) => {
                const isLastInOriginal = group.originalIndexes.includes(activeChat.messages.length - 1);
                const isStreamingThis = props.isGenerating && isLastInOriginal && group.role === 'assistant';
                const primaryIndex = group.originalIndexes[0];
                return (
                  <MessageBubble
                    key={groupIdx}
                    message={group}
                    isStreaming={isStreamingThis}
                    onEdit={group.role === 'user' ? () => props.onEditMessage(activeChat.id, primaryIndex) : undefined}
                    onRetry={group.role === 'assistant' && !props.isGenerating ? () => props.onRetryMessage(activeChat.id) : undefined}
                  />
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {props.devMode && (
              <DevStatsBar stats={props.devStats} isGenerating={props.isGenerating} />
            )}

            <ChatInput
              input={props.input}
              setInput={props.setInput}
              handleSendMessage={props.handleSendMessage}
              isGenerating={props.isGenerating}
              abortGeneration={props.abortGeneration}
              isThinkingMode={props.isThinkingMode}
              setIsThinkingMode={props.setIsThinkingMode}
              supportsThinking={props.supportsThinking}
            />
          </>
        )}
      </div>
    </div>
  );
}
