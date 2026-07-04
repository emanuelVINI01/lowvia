import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ProviderType } from '../../types';

interface SettingsState {
  provider: ProviderType;
  hostUrl: string;
  globalModel: string;
  devMode: boolean;
  contextLimit: number;
  batchLimit: number;
  isThinkingMode: boolean;
}

const initialState: SettingsState = {
  provider: (localStorage.getItem('ai_provider') as ProviderType) || 'ollama',
  hostUrl: localStorage.getItem('ai_host_url') || (localStorage.getItem('ai_provider') === 'lmstudio' ? 'http://localhost:1234' : 'http://localhost:11434'),
  globalModel: localStorage.getItem('ai_global_model') || '',
  devMode: localStorage.getItem('dev_mode') === 'true',
  contextLimit: localStorage.getItem('context_limit') ? Number(localStorage.getItem('context_limit')) : 8192,
  batchLimit: localStorage.getItem('batch_limit') ? Number(localStorage.getItem('batch_limit')) : 2048,
  isThinkingMode: false,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setProvider(state, action: PayloadAction<ProviderType>) {
      state.provider = action.payload;
      localStorage.setItem('ai_provider', action.payload);
      if (action.payload === 'lmstudio') {
        if (!state.hostUrl || state.hostUrl.includes('11434')) {
          state.hostUrl = 'http://localhost:1234';
          localStorage.setItem('ai_host_url', 'http://localhost:1234');
        }
      } else {
        if (!state.hostUrl || state.hostUrl.includes('1234')) {
          state.hostUrl = 'http://localhost:11434';
          localStorage.setItem('ai_host_url', 'http://localhost:11434');
        }
      }
    },
    setHostUrl(state, action: PayloadAction<string>) {
      state.hostUrl = action.payload;
      localStorage.setItem('ai_host_url', action.payload);
    },
    setGlobalModel(state, action: PayloadAction<string>) {
      state.globalModel = action.payload;
      localStorage.setItem('ai_global_model', action.payload);
    },
    setDevMode(state, action: PayloadAction<boolean>) {
      state.devMode = action.payload;
      localStorage.setItem('dev_mode', String(action.payload));
    },
    setContextLimit(state, action: PayloadAction<number>) {
      state.contextLimit = action.payload;
      localStorage.setItem('context_limit', String(action.payload));
    },
    setBatchLimit(state, action: PayloadAction<number>) {
      state.batchLimit = action.payload;
      localStorage.setItem('batch_limit', String(action.payload));
    },
    setIsThinkingMode(state, action: PayloadAction<boolean>) {
      state.isThinkingMode = action.payload;
    }
  },
});

export const {
  setProvider,
  setHostUrl,
  setGlobalModel,
  setDevMode,
  setContextLimit,
  setBatchLimit,
  setIsThinkingMode
} = settingsSlice.actions;

export default settingsSlice.reducer;
