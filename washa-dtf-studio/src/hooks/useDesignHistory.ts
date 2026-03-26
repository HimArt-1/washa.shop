import { useState, useEffect, useCallback } from 'react';
import { DesignHistoryItem } from '../types';

const STORAGE_KEY = 'washa-design-history';
const MAX_ITEMS = 12;

function sanitizeHistory(items: DesignHistoryItem[]) {
  return items.map(item => ({
    ...item,
    prompt: item.prompt.slice(0, 280),
    thumbnail: item.thumbnail || null,
  }));
}

function persistWithinQuota(items: DesignHistoryItem[]) {
  const queue = sanitizeHistory(items).slice(0, MAX_ITEMS);

  while (queue.length > 0) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
      return queue;
    } catch (error) {
      queue.pop();
      if (queue.length === 0) {
        console.warn('Failed to save design history:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }

  return [];
}

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
    return persistWithinQuota(items);
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
        return persist(updated);
      });

      return newItem.id;
    },
    [persist]
  );

  const deleteDesign = useCallback(
    (id: string) => {
      setHistory(prev => {
        const updated = prev.filter(item => item.id !== id);
        return persist(updated);
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
