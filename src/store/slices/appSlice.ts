import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AIModel, DevStats } from '../../types';

interface AppState {
  activeTab: 'chat' | 'models' | 'settings';
  isProviderOnline: boolean;
  isCheckingStatus: boolean;
  models: AIModel[];
  modelCapabilities: string[];
  devStats: DevStats | null;
  input: string;
}

const initialState: AppState = {
  activeTab: 'chat',
  isProviderOnline: false,
  isCheckingStatus: true,
  models: [],
  modelCapabilities: [],
  devStats: null,
  input: '',
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setActiveTab(state, action: PayloadAction<'chat' | 'models' | 'settings'>) {
      state.activeTab = action.payload;
    },
    setIsProviderOnline(state, action: PayloadAction<boolean>) {
      state.isProviderOnline = action.payload;
    },
    setIsCheckingStatus(state, action: PayloadAction<boolean>) {
      state.isCheckingStatus = action.payload;
    },
    setModels(state, action: PayloadAction<AIModel[]>) {
      state.models = action.payload;
    },
    setModelCapabilities(state, action: PayloadAction<string[]>) {
      state.modelCapabilities = action.payload;
    },
    setDevStats(state, action: PayloadAction<DevStats | null>) {
      state.devStats = action.payload;
    },
    setInput(state, action: PayloadAction<string>) {
      state.input = action.payload;
    }
  },
});

export const {
  setActiveTab,
  setIsProviderOnline,
  setIsCheckingStatus,
  setModels,
  setModelCapabilities,
  setDevStats,
  setInput
} = appSlice.actions;

export default appSlice.reducer;
