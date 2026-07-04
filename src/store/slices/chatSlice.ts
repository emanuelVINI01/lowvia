import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ChatSession, Message } from '../../types';

interface ChatState {
  chats: ChatSession[];
  activeChatId: string | null;
  generatingChats: string[];
}

const initialState: ChatState = {
  chats: [],
  activeChatId: null,
  generatingChats: [],
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setChats(state, action: PayloadAction<ChatSession[]>) {
      state.chats = action.payload;
    },
    setActiveChatId(state, action: PayloadAction<string | null>) {
      state.activeChatId = action.payload;
    },
    addGeneratingChat(state, action: PayloadAction<string>) {
      if (!state.generatingChats.includes(action.payload)) {
        state.generatingChats.push(action.payload);
      }
    },
    removeGeneratingChat(state, action: PayloadAction<string>) {
      state.generatingChats = state.generatingChats.filter(id => id !== action.payload);
    },
    updateChatMessages(state, action: PayloadAction<{ chatId: string; messages: Message[] }>) {
      const chat = state.chats.find(c => c.id === action.payload.chatId);
      if (chat) {
        chat.messages = action.payload.messages;
        chat.updatedAt = Date.now();
      }
    },
    updateMessageContent(state, action: PayloadAction<{ chatId: string; msgIndex: number; content: string; thinking?: string }>) {
      const chat = state.chats.find(c => c.id === action.payload.chatId);
      if (chat && chat.messages[action.payload.msgIndex]) {
        chat.messages[action.payload.msgIndex].content = action.payload.content;
        if (action.payload.thinking !== undefined) {
          chat.messages[action.payload.msgIndex].thinking = action.payload.thinking;
        }
        chat.updatedAt = Date.now();
      }
    },
    markMessageInterrupted(state, action: PayloadAction<{ chatId: string; msgIndex: number }>) {
      const chat = state.chats.find(c => c.id === action.payload.chatId);
      if (chat && chat.messages[action.payload.msgIndex]) {
        chat.messages[action.payload.msgIndex].interrupted = true;
      }
    },
    addChat(state, action: PayloadAction<ChatSession>) {
      state.chats.unshift(action.payload);
    },
    appendMessage(state, action: PayloadAction<{ chatId: string; message: Message }>) {
      const chat = state.chats.find(c => c.id === action.payload.chatId);
      if (chat) {
        chat.messages.push(action.payload.message);
        chat.updatedAt = Date.now();
      }
    },
    updateChatTitle(state, action: PayloadAction<{ chatId: string; title: string }>) {
      const chat = state.chats.find(c => c.id === action.payload.chatId);
      if (chat) {
        chat.title = action.payload.title;
      }
    },
    deleteChat(state, action: PayloadAction<string>) {
      state.chats = state.chats.filter(c => c.id !== action.payload);
      if (state.activeChatId === action.payload) {
        state.activeChatId = state.chats.length > 0 ? state.chats[0].id : null;
      }
    }
  },
});

export const {
  setChats,
  setActiveChatId,
  addGeneratingChat,
  removeGeneratingChat,
  updateChatMessages,
  updateMessageContent,
  markMessageInterrupted,
  addChat,
  appendMessage,
  updateChatTitle,
  deleteChat
} = chatSlice.actions;

export default chatSlice.reducer;
