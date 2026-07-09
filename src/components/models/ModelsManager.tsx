import React, { useState } from 'react';
import { AIModel } from '../../types';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { setGlobalModel as setGlobalModelAction } from '../../store/slices/settingsSlice';
import { setModels } from '../../store/slices/appSlice';
import { useTranslation } from 'react-i18next';

interface ModelsManagerProps {
  models: AIModel[];
  checkProviderStatus: () => void;
  globalModel: string;
  setGlobalModel: (model: string) => void;
}

export default function ModelsManager({ models, checkProviderStatus, globalModel, setGlobalModel }: ModelsManagerProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { provider, hostUrl, openRouterApiKey } = useAppSelector(state => state.settings);
  const [orModelInput, setOrModelInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState('');

  const verifyAndAddOpenRouterModel = async () => {
    if (!orModelInput.trim()) return;
    setVerifying(true);
    setVerifyMsg('Verifying...');
    try {
      const res = await fetch(`${hostUrl}/models`, {
        headers: { 'Authorization': `Bearer ${openRouterApiKey}` }
      });
      if (res.ok) {
        const data = await res.json();
        const found = (data.data || []).find((m: any) => m.id === orModelInput.trim());
        if (found) {
          setVerifyMsg('Success! Model added.');
          // Just set it as global model and add to store so UI updates
          dispatch(setModels([{ id: found.id, name: found.name || found.id, provider: 'openrouter' }]));
          setGlobalModel(found.id);
          setOrModelInput('');
        } else {
          setVerifyMsg('Model not found in OpenRouter.');
        }
      } else {
        setVerifyMsg('Failed to check models. Check API key.');
      }
    } catch {
      setVerifyMsg('Error reaching OpenRouter API.');
    }
    setVerifying(false);
  };
  
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
      <div className="grid-2">
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '16px' }}>{t('models.installedTitle')}</h3>
          {models.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>{t('models.noModels')}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {models.map((model) => {
                const isActive = model.id === globalModel;
                return (
                  <div 
                    key={model.id} 
                    onClick={() => setGlobalModel(model.id)}
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      padding: '14px 16px', 
                      background: isActive ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-tertiary)', 
                      borderRadius: '10px', 
                      border: isActive ? '2px solid var(--accent-indigo)' : '1px solid var(--border-color)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    className="model-item-card"
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        {model.name} {isActive && ' 🌟'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {model.provider === 'ollama' 
                          ? <>{t('models.family')}: {model.details?.family || 'N/A'} • {t('models.size')}: {model.details?.parameter_size || 'N/A'}</>
                          : <>{model.provider} Model</>
                        }
                      </div>
                    </div>
                    {model.size !== undefined && (
                      <div style={{ alignSelf: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {formatFileSize(model.size)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card" style={{ height: 'fit-content' }}>
          {provider === 'openrouter' ? (
            <>
              <h3 className="card-title">Add OpenRouter Model</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.95rem', lineHeight: '1.6' }}>
                Type the model ID from OpenRouter (e.g. google/gemini-2.5-pro, anthropic/claude-3.5-sonnet)
              </p>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <input
                  type="text"
                  className="form-input"
                  value={orModelInput}
                  onChange={e => setOrModelInput(e.target.value)}
                  placeholder="Model ID..."
                />
              </div>
              {verifyMsg && <p style={{ fontSize: '0.85rem', marginBottom: '16px', color: verifyMsg.includes('Success') ? 'var(--accent-teal)' : 'var(--text-secondary)' }}>{verifyMsg}</p>}
              <button 
                className="btn btn-primary" 
                onClick={verifyAndAddOpenRouterModel}
                disabled={verifying || !orModelInput.trim()}
              >
                {verifying ? 'Verifying...' : 'Verify & Add Model'}
              </button>
            </>
          ) : (
            <>
              <h3 className="card-title">{t('models.howToPull')}</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.95rem', lineHeight: '1.6' }}>
                {t('models.howToPullDesc')}
              </p>
              <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
                <code style={{ fontFamily: 'JetBrains Mono', color: 'var(--accent-indigo)' }}>
                  ollama pull llama3
                </code>
              </div>
              <button className="btn btn-secondary" onClick={checkProviderStatus}>
                {t('models.refreshBtn')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
