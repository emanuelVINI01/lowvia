import React from 'react';
import { Plus, MessageSquare } from 'lucide-react';
import { ChatSession } from '../../types';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '../../store/hooks';
import { toggleResearchSidebar } from '../../store/slices/researchSlice';
import { Search } from 'lucide-react';

interface ChatSidebarProps {
  chats: ChatSession[];
  activeChatId: string | null;
  setActiveChatId: (id: string) => void;
  createNewChat: () => void;
}

export default function ChatSidebar({ chats, activeChatId, setActiveChatId, createNewChat }: ChatSidebarProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  return (
    <div className="chat-sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button className="new-chat-btn" onClick={createNewChat} style={{ flex: 1 }}>
          <Plus size={16} /> {t('chat.newChat')}
        </button>
        <button className="new-chat-btn" onClick={() => dispatch(toggleResearchSidebar())} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0 12px' }} title="Deep Research">
          <Search size={16} />
        </button>
      </div>
      <div className="chat-list">
        {chats.map(chat => (
          <div 
            key={chat.id} 
            className={`chat-item ${chat.id === activeChatId ? 'active' : ''}`}
            onClick={() => setActiveChatId(chat.id)}
            style={{ position: 'relative', overflow: 'hidden' }}
          >
            {chat.id === activeChatId && (
              <motion.div 
                layoutId="active-chat-highlight"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(99, 102, 241, 0.15)',
                  borderRadius: '6px',
                  zIndex: 0
                }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', zIndex: 1, position: 'relative', width: '100%' }}>
              <MessageSquare size={16} style={{ flexShrink: 0 }} />
              <span className="chat-title">{chat.title}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
