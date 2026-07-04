import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ResearchSession, ResearchPlan, ResearchStep } from '../../types';

interface ResearchState {
  sessions: ResearchSession[];
  activeSessionId: string | null;
  isSidebarOpen: boolean;
}

const initialState: ResearchState = {
  sessions: [],
  activeSessionId: null,
  isSidebarOpen: false,
};

const researchSlice = createSlice({
  name: 'research',
  initialState,
  reducers: {
    setResearchSessions(state, action: PayloadAction<ResearchSession[]>) {
      state.sessions = action.payload;
    },
    setActiveResearchSessionId(state, action: PayloadAction<string | null>) {
      state.activeSessionId = action.payload;
    },
    toggleResearchSidebar(state, action: PayloadAction<boolean | undefined>) {
      if (action.payload !== undefined) {
        state.isSidebarOpen = action.payload;
      } else {
        state.isSidebarOpen = !state.isSidebarOpen;
      }
    },
    addResearchSession(state, action: PayloadAction<ResearchSession>) {
      state.sessions.unshift(action.payload);
    },
    updateResearchStatus(state, action: PayloadAction<{ id: string; status: ResearchSession['status'] }>) {
      const session = state.sessions.find(s => s.id === action.payload.id);
      if (session) {
        session.status = action.payload.status;
        session.updatedAt = Date.now();
      }
    },
    setResearchPlan(state, action: PayloadAction<{ id: string; plan: ResearchPlan }>) {
      const session = state.sessions.find(s => s.id === action.payload.id);
      if (session) {
        session.plan = action.payload.plan;
        session.updatedAt = Date.now();
      }
    },
    addResearchStep(state, action: PayloadAction<{ id: string; step: ResearchStep }>) {
      const session = state.sessions.find(s => s.id === action.payload.id);
      if (session) {
        session.steps.push(action.payload.step);
        session.updatedAt = Date.now();
      }
    },
    updateResearchStep(state, action: PayloadAction<{ id: string; stepId: string; updates: Partial<ResearchStep> }>) {
      const session = state.sessions.find(s => s.id === action.payload.id);
      if (session) {
        const step = session.steps.find(st => st.id === action.payload.stepId);
        if (step) {
          Object.assign(step, action.payload.updates);
          session.updatedAt = Date.now();
        }
      }
    },
    setResearchReport(state, action: PayloadAction<{ id: string; report: string }>) {
      const session = state.sessions.find(s => s.id === action.payload.id);
      if (session) {
        session.report = action.payload.report;
        session.status = 'done';
        session.updatedAt = Date.now();
      }
    },
    deleteResearchSession(state, action: PayloadAction<string>) {
      state.sessions = state.sessions.filter(s => s.id !== action.payload);
      if (state.activeSessionId === action.payload) {
        state.activeSessionId = state.sessions.length > 0 ? state.sessions[0].id : null;
      }
    }
  },
});

export const {
  setResearchSessions,
  setActiveResearchSessionId,
  toggleResearchSidebar,
  addResearchSession,
  updateResearchStatus,
  setResearchPlan,
  addResearchStep,
  updateResearchStep,
  setResearchReport,
  deleteResearchSession
} = researchSlice.actions;

export default researchSlice.reducer;
