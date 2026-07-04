import React from 'react';
import { useTranslation } from 'react-i18next';
import logo from '../../assets/logo.png';

interface TopBarProps {
  activeTab: 'chat' | 'models' | 'settings';
  isProviderOnline: boolean;
  isCheckingStatus: boolean;
  checkProviderStatus: () => void;
  globalModel: string;
  modelsCount: number;
}

export default function TopBar({ 
  activeTab, 
  isProviderOnline, 
  isCheckingStatus, 
  checkProviderStatus, 
  globalModel, 
  modelsCount 
}: TopBarProps) {
  const { t } = useTranslation();

  return (
    <header className="top-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img src={logo} alt="Lowvia Logo" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
        <h1 className="view-title">
          {activeTab === 'chat' && t('nav.chat')}
          {activeTab === 'models' && t('nav.models')}
          {activeTab === 'settings' && t('nav.settings')}
        </h1>
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        {activeTab === 'chat' && globalModel && (
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginRight: '16px' }}>
            {globalModel}
          </div>
        )}

        <div 
          className="connection-pill"
          onClick={checkProviderStatus}
          style={{ cursor: isCheckingStatus ? 'default' : 'pointer' }}
          title={t('topbar.ollamaStatus')}
        >
          <div className={`status-indicator ${isProviderOnline ? 'online' : 'offline'} ${isCheckingStatus ? 'pulse' : ''}`} />
          <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
            {isCheckingStatus ? t('topbar.checking') : (isProviderOnline ? t('topbar.connected') : t('topbar.offline'))}
          </span>
        </div>

        {isProviderOnline && modelsCount > 0 && activeTab !== 'models' && (
          <div className="connection-pill">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="m9 12 2 2 4-4"></path>
            </svg>
            <span>{t('topbar.models')}: <strong>{globalModel || 'None'}</strong></span>
          </div>
        )}
      </div>
    </header>
  );
}
