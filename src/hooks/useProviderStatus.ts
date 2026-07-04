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
  const { provider, hostUrl, globalModel } = useAppSelector(state => state.settings);
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
      } else if (provider === 'lmstudio') {
        const cleanHost = hostUrl.replace(/\/v1\/?$/, '');
        try {
          const res = await fetch(`${cleanHost}/api/v1/models`);
          if (res.ok) {
            const data = await res.json();
            fetchedModels = (data.models || []).map((m: any) => ({
              id: m.key || m.id,
              name: m.display_name || m.key || m.id,
              size: m.size_bytes,
              provider: 'lmstudio',
              capabilities: {
                vision: m.capabilities?.vision,
                thinking: m.capabilities?.reasoning !== undefined
              }
            }));
          } else throw new Error('Native API failed');
        } catch {
          const fallbackRes = await fetch(`${cleanHost}/v1/models`);
          if (fallbackRes.ok) {
            const data = await fallbackRes.json();
            fetchedModels = (data.data || []).map((m: any) => ({
              id: m.id,
              name: m.id,
              provider: 'lmstudio',
            }));
          } else throw new Error('Fallback API failed');
        }
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
  }, [hostUrl, provider, globalModel, dispatch]);

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
        } else if (provider === 'lmstudio') {
          await fetch(`${cleanHost}/v1/models/unload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: globalModel })
          });
        }
      } catch (e) {
        console.error('Failed to unload previous model', e);
      }
    }

    if (provider === 'lmstudio' && name) {
      try {
        const cleanHost = hostUrl.replace(/\/v1\/?$/, '');
        await fetch(`${cleanHost}/v1/models/load`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            model: name,
            gpu_offload: "max",
            offload_kv_cache_to_gpu: true 
          })
        });
      } catch (e) {
        console.error('Failed to preload model', e);
      }
    }

    dispatch(setGlobalModel(name));
  }, [globalModel, hostUrl, provider, dispatch]);

  useEffect(() => { checkProviderStatus(); }, [hostUrl, provider, checkProviderStatus]);

  useEffect(() => {
    if (!globalModel || !isProviderOnline || provider === 'lmstudio') return;
    fetchModelCapabilities(globalModel);
  }, [globalModel, isProviderOnline, hostUrl, provider, fetchModelCapabilities]);

  const supportsThinking = provider === 'lmstudio' 
    ? true 
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
