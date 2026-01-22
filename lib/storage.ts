import AsyncStorage from '@react-native-async-storage/async-storage';
import { Settings, CardJudgment, DEFAULT_SETTINGS } from './types';

const STORAGE_KEYS = {
  SETTINGS: '@toreca_sedori_settings',
  HISTORY: '@toreca_sedori_history',
  CURRENT_WORKER_ID: '@toreca_sedori_current_worker_id',
};

// 設定の読み込み
export async function loadSettings(): Promise<Settings> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (data) {
      return JSON.parse(data);
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Failed to load settings:', error);
    return DEFAULT_SETTINGS;
  }
}

// 設定の保存
export async function saveSettings(settings: Settings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

// 履歴の読み込み
export async function loadHistory(): Promise<CardJudgment[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.HISTORY);
    if (data) {
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Failed to load history:', error);
    return [];
  }
}

// 履歴の保存
export async function saveHistory(history: CardJudgment[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to save history:', error);
  }
}

// 履歴に追加
export async function addToHistory(judgment: CardJudgment): Promise<void> {
  try {
    const history = await loadHistory();
    history.unshift(judgment); // 新しい判定を先頭に追加
    // 最大100件まで保存
    const trimmedHistory = history.slice(0, 100);
    await saveHistory(trimmedHistory);
  } catch (error) {
    console.error('Failed to add to history:', error);
  }
}

// 履歴から削除
export async function removeFromHistory(id: string): Promise<void> {
  try {
    const history = await loadHistory();
    const filteredHistory = history.filter((item) => item.id !== id);
    await saveHistory(filteredHistory);
  } catch (error) {
    console.error('Failed to remove from history:', error);
  }
}

// 履歴をクリア
export async function clearHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.HISTORY);
  } catch (error) {
    console.error('Failed to clear history:', error);
  }
}

// 設定をリセット
export async function resetSettings(): Promise<void> {
  try {
    await saveSettings(DEFAULT_SETTINGS);
  } catch (error) {
    console.error('Failed to reset settings:', error);
  }
}

// 現在の作業者IDを読み込み
export async function loadCurrentWorkerId(): Promise<string | null> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_WORKER_ID);
    return data;
  } catch (error) {
    console.error('Failed to load current worker ID:', error);
    return null;
  }
}

// 現在の作業者IDを保存
export async function saveCurrentWorkerId(workerId: string | null): Promise<void> {
  try {
    if (workerId) {
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_WORKER_ID, workerId);
    } else {
      await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_WORKER_ID);
    }
  } catch (error) {
    console.error('Failed to save current worker ID:', error);
  }
}
