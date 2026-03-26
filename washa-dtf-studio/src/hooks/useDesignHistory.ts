import { useState, useEffect, useCallback } from 'react';
import { DesignHistoryItem } from '../types';

const STORAGE_KEY = 'washa-design-history';
const MAX_ITEMS = 20;

export function useDesignHistory() {
  const [history, setHistory] = useState<DesignHistoryItem[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to load design history:', e);
    }
  }, []);

  // Persist to localStorage
  const persist = useCallback((items: DesignHistoryItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to save design history:', e);
    }
  }, []);

  const saveDesign = useCallback(
    (item: Omit<DesignHistoryItem, 'id' | 'createdAt'>) => {
      const newItem: DesignHistoryItem = {
        ...item,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };

      setHistory(prev => {
        const updated = [newItem, ...prev].slice(0, MAX_ITEMS);
        persist(updated);
        return updated;
      });

      return newItem.id;
    },
    [persist]
  );

  const deleteDesign = useCallback(
    (id: string) => {
      setHistory(prev => {
        const updated = prev.filter(item => item.id !== id);
        persist(updated);
        return updated;
      });
    },
    [persist]
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    history,
    saveDesign,
    deleteDesign,
    clearHistory,
  };
}
