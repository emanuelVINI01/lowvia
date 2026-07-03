import React, { useRef, useEffect } from 'react';
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
  const activeChat = props.chats.find(c => c.id === props.activeChatId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat?.messages, props.isGenerating]);

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
            <div className="messages-list">
              {activeChat && activeChat.messages
                .filter(msg => !msg.toolResult) // Hide internal tool result injections
                .map((msg, index) => {
                const isLast = index === activeChat.messages.length - 1;
                const isStreamingThis = props.isGenerating && isLast && msg.role === 'assistant';
                return (
                  <MessageBubble
                    key={index}
                    message={msg}
                    isStreaming={isStreamingThis}
                    onEdit={msg.role === 'user' ? () => props.onEditMessage(activeChat.id, index) : undefined}
                    onRetry={msg.role === 'assistant' && !props.isGenerating ? () => props.onRetryMessage(activeChat.id) : undefined}
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
