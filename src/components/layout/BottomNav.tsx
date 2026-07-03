import React from 'react';
import { LayoutGrid, MessageCircle, Settings } from 'lucide-react';
import { cn } from '../../utils/cn';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface BottomNavProps {
  activeTab: 'chat' | 'models' | 'settings';
  onTabChange: (tab: 'chat' | 'models' | 'settings') => void;
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const { t } = useTranslation();

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-grid">
        {/* Left Item: Models */}
        <button
          className={cn('bottom-nav-item', activeTab === 'models' && 'active')}
          onClick={() => onTabChange('models')}
          aria-current={activeTab === 'models' ? 'page' : undefined}
          aria-label={t('nav.models')}
        >
          <span className="bottom-nav-icon">
            <LayoutGrid size={20} strokeWidth={2.2} />
          </span>
          <span className="bottom-nav-label">{t('nav.models')}</span>
          {activeTab === 'models' && (
            <motion.span 
              layoutId="active-tab-nav"
              className="bottom-nav-glow-line" 
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
        </button>

        {/* Center Item: Chat (Elevated Action Button) */}
        <button
          className={cn('bottom-nav-item bottom-nav-center-wrapper', activeTab === 'chat' && 'active')}
          onClick={() => onTabChange('chat')}
          aria-current={activeTab === 'chat' ? 'page' : undefined}
          aria-label={t('nav.chat')}
        >
          <div className={cn('bottom-nav-center-btn', activeTab === 'chat' && 'active')}>
            <MessageCircle size={24} strokeWidth={2.2} />
          </div>
          <span className="bottom-nav-label center-label">{t('nav.chat')}</span>
        </button>

        {/* Right Item: Settings */}
        <button
          className={cn('bottom-nav-item', activeTab === 'settings' && 'active')}
          onClick={() => onTabChange('settings')}
          aria-current={activeTab === 'settings' ? 'page' : undefined}
          aria-label={t('nav.settings')}
        >
          <span className="bottom-nav-icon">
            <Settings size={20} strokeWidth={2.2} />
          </span>
          <span className="bottom-nav-label">{t('nav.settings')}</span>
          {activeTab === 'settings' && (
            <motion.span 
              layoutId="active-tab-nav"
              className="bottom-nav-glow-line" 
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
        </button>
      </div>
    </nav>
  );
}
