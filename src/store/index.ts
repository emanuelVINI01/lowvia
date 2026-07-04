import { configureStore } from '@reduxjs/toolkit';
import appReducer from './slices/appSlice';
import chatReducer from './slices/chatSlice';
import settingsReducer from './slices/settingsSlice';
import researchReducer from './slices/researchSlice';

export const store = configureStore({
  reducer: {
    app: appReducer,
    chat: chatReducer,
    settings: settingsReducer,
    research: researchReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
