import React, { useEffect, useRef } from 'react';
import BottomNav from './components/layout/BottomNav';
import TopBar from './components/layout/TopBar';
import ChatArea from './components/chat/ChatArea';
import ModelsManager from './components/models/ModelsManager';
import SettingsView from './components/settings/SettingsView';
import { ChatSession, Message } from './types';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { CommandFactory } from './agent/commands/CommandFactory';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { setActiveTab, setInput } from './store/slices/appSlice';
import { setProvider, setHostUrl, setDevMode, setContextLimit, setBatchLimit, setIsThinkingMode, setOpenRouterApiKey } from './store/slices/settingsSlice';
import { setChats, setActiveChatId, addChat, updateChatMessages } from './store/slices/chatSlice';
import { useProviderStatus } from './hooks/useProviderStatus';
import { useInference } from './hooks/useInference';

const STREAM_KEY = 'ollama_active_stream';

export default function App() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  
  const { activeTab, input, devStats } = useAppSelector(state => state.app);
  const { provider, hostUrl, globalModel, devMode, contextLimit, batchLimit, isThinkingMode, openRouterApiKey } = useAppSelector(state => state.settings);
  const { chats, activeChatId, generatingChats } = useAppSelector(state => state.chat);

  const { models, isProviderOnline, isCheckingStatus, supportsThinking, checkProviderStatus, handleGlobalModelChange } = useProviderStatus();
  const { sendStream, abortGeneration, generateChatTitle } = useInference();

  const isFirstRender = useRef(true);

  // ── Load state on mount ────────────────────────────────────────
  useEffect(() => {
    const savedChats = localStorage.getItem('ai_chats_v1') || localStorage.getItem('ollama_chats_v1');
    let loadedChats: ChatSession[] = [];
    if (savedChats) {
      try { loadedChats = JSON.parse(savedChats); } catch {}
    }

    const activeStream = localStorage.getItem(STREAM_KEY);
    if (activeStream) {
      try {
        const { chatId, msgIndex } = JSON.parse(activeStream);
        loadedChats = loadedChats.map(c => {
          if (c.id !== chatId) return c;
          const msgs = [...c.messages];
          if (msgs[msgIndex]) msgs[msgIndex] = { ...msgs[msgIndex], interrupted: true };
          return { ...c, messages: msgs };
        });
      } catch {}
      localStorage.removeItem(STREAM_KEY);
    }

    dispatch(setChats(loadedChats));
    dispatch(setActiveChatId(loadedChats.length > 0 ? loadedChats[0].id : null));
  }, [dispatch]);

  // ── Persist chats ──────────────────────────────────────────────
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (chats.length > 0) localStorage.setItem('ai_chats_v1', JSON.stringify(chats));
    else localStorage.removeItem('ai_chats_v1');
  }, [chats]);

  // ── Send (new message) ─────────────────────────────────────────
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const userText = input.trim();
    if (!userText) return;
    if (activeChatId && generatingChats.includes(activeChatId)) return;
    dispatch(setInput(''));

    let displayUserText = userText;
    let hiddenContext = '';

    const command = CommandFactory.getCommand(userText);
    if (command) {
      const isPt = i18n.language.startsWith('pt');
      const result = command.execute(userText, {
        isPt,
        t,
        handleGlobalModelChange,
        activeChatId
      });

      displayUserText = result.displayUserText;
      hiddenContext = result.hiddenContext;

      if (result.uiMessage) {
        if (!activeChatId) {
          const newChat: ChatSession = {
            id: Date.now().toString(),
            title: `System Action`,
            messages: [result.uiMessage], updatedAt: Date.now(),
          };
          dispatch(addChat(newChat));
          dispatch(setActiveChatId(newChat.id));
        } else {
          const chat = chats.find(c => c.id === activeChatId);
          if (chat) {
            dispatch(updateChatMessages({
              chatId: activeChatId,
              messages: [...chat.messages, result.uiMessage]
            }));
          }
        }
      }

      if (result.preventSubmission) return;
    }

    const newMsg: Message = {
      role: 'user', 
      content: displayUserText,
      ...(hiddenContext && { hiddenContext }),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    let targetId = activeChatId;
    let workingChats = [...chats];

    if (!targetId) {
      const newChat: ChatSession = {
        id: Date.now().toString(),
        title: userText.length > 25 ? userText.substring(0, 25) + '...' : userText,
        messages: [newMsg], updatedAt: Date.now(),
      };
      workingChats = [newChat, ...workingChats];
      dispatch(setChats(workingChats));
      dispatch(setActiveChatId(newChat.id));
      targetId = newChat.id;
      
      generateChatTitle(userText, targetId);
    } else {
      workingChats = workingChats.map(c =>
        c.id === targetId ? { ...c, messages: [...c.messages, newMsg], updatedAt: Date.now() } : c
      );
      dispatch(setChats(workingChats));
    }

    await sendStream(userText, targetId, workingChats);
  };

  // ── Retry last assistant message ───────────────────────────────
  const handleRetryMessage = (chatId: string) => {
    if (generatingChats.includes(chatId)) return;
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    const trimmed = [...chat.messages];
    while (trimmed.length && (trimmed[trimmed.length - 1].role === 'assistant' || trimmed[trimmed.length - 1].toolResult)) {
      trimmed.pop();
    }
    if (!trimmed.length) return;

    const lastUserContent = trimmed[trimmed.length - 1].content;
    const updatedChats = chats.map(c => c.id === chatId ? { ...c, messages: trimmed } : c);
    dispatch(setChats(updatedChats));
    dispatch(setActiveChatId(chatId));
    sendStream(lastUserContent, chatId, updatedChats);
  };

  // ── Edit user message (put it back in input, trim chat) ────────
  const handleEditMessage = (chatId: string, msgIndex: number) => {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    const content = chat.messages[msgIndex]?.content;
    if (!content) return;

    dispatch(setChats(chats.map(c =>
      c.id === chatId ? { ...c, messages: c.messages.slice(0, msgIndex) } : c
    )));
    dispatch(setActiveChatId(chatId));
    dispatch(setInput(content));
    dispatch(setActiveTab('chat'));
  };

  const startNewDraftChat = () => dispatch(setActiveChatId(null));

  return (
    <div id="app" style={{ display: 'flex', width: '100vw', height: '100vh', flexDirection: 'column' }}>
      <main className="main-content">
        <TopBar
          activeTab={activeTab}
          isProviderOnline={isProviderOnline}
          isCheckingStatus={isCheckingStatus}
          checkProviderStatus={checkProviderStatus}
          globalModel={globalModel}
          modelsCount={models.length}
        />

        <div className="page-container" style={{ padding: activeTab === 'chat' ? 0 : undefined, position: 'relative' }}>
          <AnimatePresence mode="wait">
            {activeTab === 'chat' && (
              <motion.div key="chat" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }} style={{ height: '100%', width: '100%' }}>
                <ChatArea
                  chats={chats}
                  activeChatId={activeChatId}
                  setActiveChatId={(id) => dispatch(setActiveChatId(id))}
                  createNewChat={startNewDraftChat}
                  isProviderOnline={isProviderOnline}
                  hostUrl={hostUrl}
                  checkProviderStatus={checkProviderStatus}
                  modelsCount={models.length}
                  setActiveTab={(tab) => dispatch(setActiveTab(tab))}
                  input={input}
                  setInput={(val) => dispatch(setInput(val))}
                  handleSendMessage={handleSendMessage}
                  isGenerating={activeChatId ? generatingChats.includes(activeChatId) : false}
                  abortGeneration={() => {
                    if (activeChatId) abortGeneration(activeChatId);
                  }}
                  isThinkingMode={isThinkingMode}
                  setIsThinkingMode={(val) => dispatch(setIsThinkingMode(val))}
                  supportsThinking={supportsThinking}
                  devMode={devMode}
                  devStats={devStats}
                  onEditMessage={handleEditMessage}
                  onRetryMessage={handleRetryMessage}
                />
              </motion.div>
            )}

            {activeTab === 'models' && (
              <motion.div key="models" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }} style={{ width: '100%', display: 'flex' }}>
                <ModelsManager
                  models={models}
                  checkProviderStatus={checkProviderStatus}
                  globalModel={globalModel}
                  setGlobalModel={handleGlobalModelChange}
                />
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div key="settings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }} style={{ width: '100%', display: 'flex' }}>
                <SettingsView
                  provider={provider}
                  setProvider={(p) => dispatch(setProvider(p))}
                  hostUrl={hostUrl}
                  setHostUrl={(url) => dispatch(setHostUrl(url))}
                  checkProviderStatus={checkProviderStatus}
                  devMode={devMode}
                  setDevMode={(v) => dispatch(setDevMode(v))}
                  contextLimit={contextLimit}
                  setContextLimit={(v) => dispatch(setContextLimit(v))}
                  batchLimit={batchLimit}
                  setBatchLimit={(v) => dispatch(setBatchLimit(v))}
                  openRouterApiKey={openRouterApiKey}
                  setOpenRouterApiKey={(v) => dispatch(setOpenRouterApiKey(v))}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      <BottomNav activeTab={activeTab} onTabChange={(tab) => dispatch(setActiveTab(tab))} />
    </div>
  );
}
