import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";

export type PracticeMode =
  | "interview"
  | "pitch"
  | "presentation"
  | "class"
  | "elevator"
  | "custom";
export type WebsocketStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";
export type WebcamRuntimeStatus =
  | "unsupported"
  | "inactive"
  | "starting"
  | "active"
  | "error";
export type MicrophoneRuntimeStatus =
  | "unsupported"
  | "inactive"
  | "starting"
  | "active"
  | "error";
export type AudioStreamingStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "streaming"
  | "reconnecting"
  | "closed"
  | "error";

export type SelectedPracticePrompt = {
  text: string;
  source: "resume_question" | "manual";
  resumeId?: string | null;
  resumeLabel?: string | null;
  questionId?: string | null;
  category?: string | null;
  difficulty?: string | null;
  questionSource?: "resume" | "general" | "mock" | null;
  groundedIn?: string[];
  resumeChunkIds?: string[];
  suggestedAnswerAngle?: string | null;
};

type AppState = {
  activeMode: PracticeMode;
  isPracticeActive: boolean;
  websocketStatus: WebsocketStatus;
  webcamStatus: WebcamRuntimeStatus;
  microphoneStatus: MicrophoneRuntimeStatus;
  audioStreamingStatus: AudioStreamingStatus;
  user: User | null;
  session: Session | null;
  isAuthLoading: boolean;
  authError: string | null;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  selectedPrompt: SelectedPracticePrompt | null;
  setActiveMode: (mode: PracticeMode) => void;
  setPracticeActive: (isActive: boolean) => void;
  setWebsocketStatus: (status: WebsocketStatus) => void;
  setWebcamStatus: (status: WebcamRuntimeStatus) => void;
  setMicrophoneStatus: (status: MicrophoneRuntimeStatus) => void;
  setAudioStreamingStatus: (status: AudioStreamingStatus) => void;
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setAuthLoading: (isAuthLoading: boolean) => void;
  setAuthError: (authError: string | null) => void;
  resetAuth: () => void;
  setDemoMode: (isDemoMode: boolean) => void;
  setSelectedPrompt: (prompt: SelectedPracticePrompt | null) => void;
  clearSelectedPrompt: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  activeMode: "pitch",
  isPracticeActive: false,
  websocketStatus: "idle",
  webcamStatus: "inactive",
  microphoneStatus: "inactive",
  audioStreamingStatus: "idle",
  user: null,
  session: null,
  isAuthLoading: true,
  authError: null,
  isAuthenticated: false,
  isDemoMode: false,
  selectedPrompt: null,
  setActiveMode: (activeMode) => set({ activeMode }),
  setPracticeActive: (isPracticeActive) => set({ isPracticeActive }),
  setWebsocketStatus: (websocketStatus) => set({ websocketStatus }),
  setWebcamStatus: (webcamStatus) => set({ webcamStatus }),
  setMicrophoneStatus: (microphoneStatus) => set({ microphoneStatus }),
  setAudioStreamingStatus: (audioStreamingStatus) =>
    set({ audioStreamingStatus }),
  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
      isAuthenticated: Boolean(session?.user),
      authError: null,
    }),
  setUser: (user) => set({ user, isAuthenticated: Boolean(user) }),
  setAuthLoading: (isAuthLoading) => set({ isAuthLoading }),
  setAuthError: (authError) => set({ authError }),
  resetAuth: () =>
    set({
      user: null,
      session: null,
      isAuthenticated: false,
      authError: null,
      isAuthLoading: false,
    }),
  setDemoMode: (isDemoMode) => set({ isDemoMode }),
  setSelectedPrompt: (selectedPrompt) => set({ selectedPrompt }),
  clearSelectedPrompt: () => set({ selectedPrompt: null }),
}));
