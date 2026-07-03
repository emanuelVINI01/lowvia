import React from 'react';
import { useTranslation } from 'react-i18next';
import { ProviderType } from '../../types';

interface SettingsViewProps {
  provider: ProviderType;
  setProvider: (p: ProviderType) => void;
  hostUrl: string;
  setHostUrl: (url: string) => void;
  checkProviderStatus: () => void;
  devMode: boolean;
  setDevMode: (v: boolean) => void;
  contextLimit: number;
  setContextLimit: (v: number) => void;
  batchLimit: number;
  setBatchLimit: (v: number) => void;
}

export default function SettingsView({
  provider,
  setProvider,
  hostUrl,
  setHostUrl,
  checkProviderStatus,
  devMode,
  setDevMode,
  contextLimit,
  setContextLimit,
  batchLimit,
  setBatchLimit,
}: SettingsViewProps) {
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('app_language', lng);
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', width: '100%' }}>
      {/* Connection */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <h3 className="card-title">{t('settings.configTitle')}</h3>

        <div className="form-group" style={{ marginTop: '20px' }}>
          <label className="form-label">{t('settings.providerLabel') || 'AI Provider'}</label>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            {/* Ollama Card */}
            <div 
              onClick={() => {
                setProvider('ollama');
                setHostUrl('http://localhost:11434');
              }}
              style={{
                flex: 1,
                padding: '16px',
                borderRadius: '8px',
                border: `2px solid ${provider === 'ollama' ? 'var(--accent-indigo)' : 'var(--border-color)'}`,
                backgroundColor: provider === 'ollama' ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-tertiary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ fontWeight: 600, color: provider === 'ollama' ? 'var(--accent-indigo)' : 'var(--text-primary)' }}>
                Ollama
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Local models via Ollama Engine
              </div>
            </div>
            
            {/* LM Studio Card */}
            <div 
              onClick={() => {
                setProvider('lmstudio');
                setHostUrl('http://localhost:1234');
              }}
              style={{
                flex: 1,
                padding: '16px',
                borderRadius: '8px',
                border: `2px solid ${provider === 'lmstudio' ? 'var(--accent-indigo)' : 'var(--border-color)'}`,
                backgroundColor: provider === 'lmstudio' ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-tertiary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ fontWeight: 600, color: provider === 'lmstudio' ? 'var(--accent-indigo)' : 'var(--text-primary)' }}>
                LM Studio
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                OpenAI compatible local server
              </div>
            </div>
          </div>
        </div>

        <div className="form-group" style={{ marginTop: '20px' }}>
          <label className="form-label">{t('settings.hostLabel')}</label>
          <input
            type="text"
            className="form-input"
            value={hostUrl}
            onChange={(e) => setHostUrl(e.target.value)}
            placeholder="http://localhost:11434"
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {t('settings.hostDesc')}
          </span>
        </div>

        <div className="form-group" style={{ marginTop: '20px' }}>
          <label className="form-label">{t('settings.language')}</label>
          <select
            className="form-select"
            value={i18n.language}
            onChange={(e) => changeLanguage(e.target.value)}
          >
            <option value="pt">Português (BR)</option>
            <option value="en">English (US)</option>
          </select>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {t('settings.languageDesc')}
          </span>
        </div>
      </div>

      {/* Advanced */}
      <div className="card">
        <h3 className="card-title" style={{ color: 'var(--text-secondary)' }}>
          ⚙️ {t('settings.advancedTitle')}
        </h3>

        {/* Dev Mode toggle */}
        <div
          className="form-group"
          style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div>
            <label className="form-label" style={{ marginBottom: '2px' }}>{t('settings.devMode')}</label>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{t('settings.devModeDesc')}</p>
          </div>
          <button
            onClick={() => setDevMode(!devMode)}
            style={{
              width: '44px',
              height: '24px',
              borderRadius: '99px',
              border: 'none',
              background: devMode ? 'var(--accent-indigo)' : 'var(--bg-tertiary)',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 0.2s ease',
              flexShrink: 0,
            }}
          >
            <span style={{
              position: 'absolute',
              top: '3px',
              left: devMode ? '22px' : '3px',
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: '#fff',
              transition: 'left 0.2s ease',
              boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
            }} />
          </button>
        </div>

        {/* Context Limit */}
        <div className="form-group" style={{ marginTop: '20px' }}>
          <label className="form-label">{t('settings.contextLimit')}</label>
          <input
            type="number"
            className="form-input"
            min={0}
            step={512}
            value={contextLimit}
            onChange={(e) => setContextLimit(Number(e.target.value))}
            placeholder={t('settings.contextPlaceholder')}
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {t('settings.contextLimitDesc')}
          </span>
        </div>

        {/* Batch Size (num_batch) */}
        <div className="form-group" style={{ marginTop: '20px' }}>
          <label className="form-label">{t('settings.batchLimit')}</label>
          <input
            type="number"
            className="form-input"
            min={1}
            step={256}
            value={batchLimit}
            onChange={(e) => setBatchLimit(Number(e.target.value))}
            placeholder="Ex: 2048"
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {t('settings.batchLimitDesc')}
          </span>
        </div>
      </div>
    </div>
  );
}
