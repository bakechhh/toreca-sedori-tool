import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import {
  Settings,
  CardJudgment,
  Platform,
  OtherCostPreset,
  DEFAULT_SETTINGS,
  generateId,
} from './types';
import {
  loadSettings,
  saveSettings,
  loadHistory,
  saveHistory,
  addToHistory as addToHistoryStorage,
  removeFromHistory as removeFromHistoryStorage,
  loadCurrentWorkerId,
  saveCurrentWorkerId,
} from './storage';
import {
  Worker,
  getWorkers,
  addWorker as addWorkerToSupabase,
  deleteWorker as deleteWorkerFromSupabase,
  isSupabaseEnabled,
} from './supabase';

// State型
interface AppState {
  settings: Settings;
  history: CardJudgment[];
  isLoading: boolean;
  lastJudgment: CardJudgment | null;
  // 作業者管理
  workers: Worker[];
  currentWorkerId: string | null;
  isSupabaseEnabled: boolean;
}

// Action型
type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SETTINGS'; payload: Settings }
  | { type: 'SET_HISTORY'; payload: CardJudgment[] }
  | { type: 'ADD_PLATFORM'; payload: Platform }
  | { type: 'UPDATE_PLATFORM'; payload: Platform }
  | { type: 'DELETE_PLATFORM'; payload: string }
  | { type: 'SET_DEFAULT_SHIPPING'; payload: number }
  | { type: 'ADD_OTHER_COST_PRESET'; payload: OtherCostPreset }
  | { type: 'UPDATE_OTHER_COST_PRESET'; payload: OtherCostPreset }
  | { type: 'DELETE_OTHER_COST_PRESET'; payload: string }
  | { type: 'SET_MIN_ROI'; payload: number }
  | { type: 'SET_MIN_SALES_COUNT'; payload: number }
  | { type: 'ADD_JUDGMENT'; payload: CardJudgment }
  | { type: 'REMOVE_JUDGMENT'; payload: string }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'SET_LAST_JUDGMENT'; payload: CardJudgment | null }
  // 作業者管理
  | { type: 'SET_WORKERS'; payload: Worker[] }
  | { type: 'ADD_WORKER'; payload: Worker }
  | { type: 'DELETE_WORKER'; payload: string }
  | { type: 'SET_CURRENT_WORKER_ID'; payload: string | null };

// 初期状態
const initialState: AppState = {
  settings: DEFAULT_SETTINGS,
  history: [],
  isLoading: true,
  lastJudgment: null,
  // 作業者管理
  workers: [],
  currentWorkerId: null,
  isSupabaseEnabled: isSupabaseEnabled,
};

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };

    case 'SET_HISTORY':
      return { ...state, history: action.payload };

    case 'ADD_PLATFORM':
      return {
        ...state,
        settings: {
          ...state.settings,
          platforms: [...state.settings.platforms, action.payload],
        },
      };

    case 'UPDATE_PLATFORM':
      return {
        ...state,
        settings: {
          ...state.settings,
          platforms: state.settings.platforms.map((p) =>
            p.id === action.payload.id ? action.payload : p
          ),
        },
      };

    case 'DELETE_PLATFORM':
      return {
        ...state,
        settings: {
          ...state.settings,
          platforms: state.settings.platforms.filter((p) => p.id !== action.payload),
        },
      };

    case 'SET_DEFAULT_SHIPPING':
      return {
        ...state,
        settings: {
          ...state.settings,
          defaultShippingCost: action.payload,
        },
      };

    case 'ADD_OTHER_COST_PRESET':
      return {
        ...state,
        settings: {
          ...state.settings,
          otherCostPresets: [...state.settings.otherCostPresets, action.payload],
        },
      };

    case 'UPDATE_OTHER_COST_PRESET':
      return {
        ...state,
        settings: {
          ...state.settings,
          otherCostPresets: state.settings.otherCostPresets.map((p) =>
            p.id === action.payload.id ? action.payload : p
          ),
        },
      };

    case 'DELETE_OTHER_COST_PRESET':
      return {
        ...state,
        settings: {
          ...state.settings,
          otherCostPresets: state.settings.otherCostPresets.filter(
            (p) => p.id !== action.payload
          ),
        },
      };

    case 'SET_MIN_ROI':
      return {
        ...state,
        settings: {
          ...state.settings,
          minRoi: action.payload,
        },
      };

    case 'SET_MIN_SALES_COUNT':
      return {
        ...state,
        settings: {
          ...state.settings,
          minSalesCount: action.payload,
        },
      };

    case 'ADD_JUDGMENT':
      return {
        ...state,
        history: [action.payload, ...state.history].slice(0, 100),
        lastJudgment: action.payload,
      };

    case 'REMOVE_JUDGMENT':
      return {
        ...state,
        history: state.history.filter((j) => j.id !== action.payload),
      };

    case 'CLEAR_HISTORY':
      return {
        ...state,
        history: [],
      };

    case 'SET_LAST_JUDGMENT':
      return {
        ...state,
        lastJudgment: action.payload,
      };

    // 作業者管理
    case 'SET_WORKERS':
      return {
        ...state,
        workers: action.payload,
      };

    case 'ADD_WORKER':
      return {
        ...state,
        workers: [...state.workers, action.payload].sort((a, b) => a.name.localeCompare(b.name)),
      };

    case 'DELETE_WORKER':
      return {
        ...state,
        workers: state.workers.filter((w) => w.id !== action.payload),
        currentWorkerId: state.currentWorkerId === action.payload ? null : state.currentWorkerId,
      };

    case 'SET_CURRENT_WORKER_ID':
      return {
        ...state,
        currentWorkerId: action.payload,
      };

    default:
      return state;
  }
}

// Context型
interface AppContextType {
  state: AppState;
  // プラットフォーム操作
  addPlatform: (name: string, feeRate: number) => void;
  updatePlatform: (platform: Platform) => void;
  deletePlatform: (id: string) => void;
  // 送料設定
  setDefaultShipping: (amount: number) => void;
  // その他経費プリセット操作
  addOtherCostPreset: (name: string, defaultAmount: number) => void;
  updateOtherCostPreset: (preset: OtherCostPreset) => void;
  deleteOtherCostPreset: (id: string) => void;
  // 判定基準設定
  setMinRoi: (value: number) => void;
  setMinSalesCount: (value: number) => void;
  // 判定履歴操作
  addJudgment: (judgment: CardJudgment) => void;
  removeJudgment: (id: string) => void;
  clearHistory: () => void;
  setLastJudgment: (judgment: CardJudgment | null) => void;
  // 作業者管理
  addWorker: (name: string) => Promise<Worker | null>;
  deleteWorker: (id: string) => Promise<boolean>;
  setCurrentWorkerId: (id: string | null) => void;
  refreshWorkers: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // 初期データ読み込み
  useEffect(() => {
    async function loadData() {
      const [settings, history, currentWorkerId, workers] = await Promise.all([
        loadSettings(),
        loadHistory(),
        loadCurrentWorkerId(),
        getWorkers(),
      ]);
      dispatch({ type: 'SET_SETTINGS', payload: settings });
      dispatch({ type: 'SET_HISTORY', payload: history });
      dispatch({ type: 'SET_WORKERS', payload: workers });
      if (currentWorkerId) {
        dispatch({ type: 'SET_CURRENT_WORKER_ID', payload: currentWorkerId });
      }
      dispatch({ type: 'SET_LOADING', payload: false });
    }
    loadData();
  }, []);

  // 設定変更時に保存
  useEffect(() => {
    if (!state.isLoading) {
      saveSettings(state.settings);
    }
  }, [state.settings, state.isLoading]);

  // プラットフォーム操作
  const addPlatform = (name: string, feeRate: number) => {
    const platform: Platform = {
      id: generateId(),
      name,
      feeRate,
      isDefault: false,
    };
    dispatch({ type: 'ADD_PLATFORM', payload: platform });
  };

  const updatePlatform = (platform: Platform) => {
    dispatch({ type: 'UPDATE_PLATFORM', payload: platform });
  };

  const deletePlatform = (id: string) => {
    dispatch({ type: 'DELETE_PLATFORM', payload: id });
  };

  // 送料設定
  const setDefaultShipping = (amount: number) => {
    dispatch({ type: 'SET_DEFAULT_SHIPPING', payload: amount });
  };

  // その他経費プリセット操作
  const addOtherCostPreset = (name: string, defaultAmount: number) => {
    const preset: OtherCostPreset = {
      id: generateId(),
      name,
      defaultAmount,
    };
    dispatch({ type: 'ADD_OTHER_COST_PRESET', payload: preset });
  };

  const updateOtherCostPreset = (preset: OtherCostPreset) => {
    dispatch({ type: 'UPDATE_OTHER_COST_PRESET', payload: preset });
  };

  const deleteOtherCostPreset = (id: string) => {
    dispatch({ type: 'DELETE_OTHER_COST_PRESET', payload: id });
  };

  // 判定基準設定
  const setMinRoi = (value: number) => {
    dispatch({ type: 'SET_MIN_ROI', payload: value });
  };

  const setMinSalesCount = (value: number) => {
    dispatch({ type: 'SET_MIN_SALES_COUNT', payload: value });
  };

  // 判定履歴操作
  const addJudgment = async (judgment: CardJudgment) => {
    dispatch({ type: 'ADD_JUDGMENT', payload: judgment });
    await addToHistoryStorage(judgment);
  };

  const removeJudgment = async (id: string) => {
    dispatch({ type: 'REMOVE_JUDGMENT', payload: id });
    await removeFromHistoryStorage(id);
  };

  const clearHistory = async () => {
    dispatch({ type: 'CLEAR_HISTORY' });
    await saveHistory([]);
  };

  const setLastJudgment = (judgment: CardJudgment | null) => {
    dispatch({ type: 'SET_LAST_JUDGMENT', payload: judgment });
  };

  // 作業者管理
  const addWorker = async (name: string): Promise<Worker | null> => {
    const worker = await addWorkerToSupabase(name);
    if (worker) {
      dispatch({ type: 'ADD_WORKER', payload: worker });
    }
    return worker;
  };

  const deleteWorker = async (id: string): Promise<boolean> => {
    const success = await deleteWorkerFromSupabase(id);
    if (success) {
      dispatch({ type: 'DELETE_WORKER', payload: id });
    }
    return success;
  };

  const setCurrentWorkerId = (id: string | null) => {
    dispatch({ type: 'SET_CURRENT_WORKER_ID', payload: id });
    saveCurrentWorkerId(id);
  };

  const refreshWorkers = async () => {
    const workers = await getWorkers();
    dispatch({ type: 'SET_WORKERS', payload: workers });
  };

  return (
    <AppContext.Provider
      value={{
        state,
        addPlatform,
        updatePlatform,
        deletePlatform,
        setDefaultShipping,
        addOtherCostPreset,
        updateOtherCostPreset,
        deleteOtherCostPreset,
        setMinRoi,
        setMinSalesCount,
        addJudgment,
        removeJudgment,
        clearHistory,
        setLastJudgment,
        addWorker,
        deleteWorker,
        setCurrentWorkerId,
        refreshWorkers,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

// Hook
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
