import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { 
  setModels, 
  setIsProviderOnline, 
  setIsCheckingStatus, 
  setModelCapabilities 
} from '../store/slices/appSlice';
import { setGlobalModel } from '../store/slices/settingsSlice';
import { AIModel } from '../types';

export function useProviderStatus() {
  const dispatch = useAppDispatch();
  const { provider, hostUrl, globalModel, openRouterApiKey } = useAppSelector(state => state.settings);
  const { models, isProviderOnline, modelCapabilities, isCheckingStatus } = useAppSelector(state => state.app);

  const fetchModelCapabilities = useCallback(async (modelName: string) => {
    try {
      const res = await fetch(`${hostUrl}/api/show`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName }),
      });
      if (res.ok) {
        const data = await res.json();
        dispatch(setModelCapabilities(data.capabilities || []));
      }
    } catch {
      dispatch(setModelCapabilities([]));
    }
  }, [hostUrl, dispatch]);

  const checkProviderStatus = useCallback(async () => {
    dispatch(setIsCheckingStatus(true));
    try {
      let fetchedModels: AIModel[] = [];

      if (provider === 'ollama') {
        const res = await fetch(`${hostUrl}/api/tags`);
        if (res.ok) {
          const data = await res.json();
          fetchedModels = (data.models || []).map((m: any) => ({
            id: m.name,
            name: m.name,
            size: m.size,
            provider: 'ollama',
            details: m.details,
          }));
        } else throw new Error();
      } else if (provider === 'openrouter') {
        if (!openRouterApiKey) throw new Error('No API key');
        // We do not fetch all models for openrouter by default to avoid huge lists
        // If there's a global model, we add it to the list
        if (globalModel) {
          fetchedModels = [{ id: globalModel, name: globalModel, provider: 'openrouter' }];
        }
        dispatch(setIsProviderOnline(true));
      }

      dispatch(setModels(fetchedModels));
      dispatch(setIsProviderOnline(true));
      
      const currentExists = fetchedModels.some(m => m.id === globalModel);
      if (fetchedModels.length > 0 && (!globalModel || !currentExists)) {
        dispatch(setGlobalModel(fetchedModels[0].id));
      }
    } catch { 
      dispatch(setIsProviderOnline(false)); 
      dispatch(setModels([]));
    } finally { 
      dispatch(setIsCheckingStatus(false)); 
    }
  }, [hostUrl, provider, globalModel, openRouterApiKey, dispatch]);

  const handleGlobalModelChange = useCallback(async (name: string) => {
    if (globalModel && globalModel !== name) {
      try {
        const cleanHost = hostUrl.replace(/\/v1\/?$/, '');
        if (provider === 'ollama') {
          await fetch(`${cleanHost}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: globalModel, keep_alive: 0 })
          });
        }
      } catch (e) {
        console.error('Failed to unload previous model', e);
      }
    }
    dispatch(setGlobalModel(name));
  }, [globalModel, hostUrl, provider, dispatch]);

  useEffect(() => { checkProviderStatus(); }, [hostUrl, provider, checkProviderStatus]);

  useEffect(() => {
    if (!globalModel || !isProviderOnline || provider === 'openrouter') return;
    fetchModelCapabilities(globalModel);
  }, [globalModel, isProviderOnline, hostUrl, provider, fetchModelCapabilities]);

  const supportsThinking = provider === 'openrouter' 
    ? true // By default let's assume it might support it or users can use reasoning models
    : modelCapabilities.includes('thinking');

  return {
    models,
    isProviderOnline,
    isCheckingStatus,
    supportsThinking,
    checkProviderStatus,
    handleGlobalModelChange
  };
}
