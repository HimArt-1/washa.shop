import { useState, useEffect, useCallback } from 'react';
import { DesignHistoryItem } from '../types';

const STORAGE_KEY = 'washa-design-history';
const MAX_ITEMS = 12;
const HISTORY_ENDPOINT = '/api/washa-dtf-studio/history';

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

function loadLocalHistory() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return sanitizeHistory(parsed as DesignHistoryItem[]);
  } catch (error) {
    console.warn('Failed to load design history:', error);
    return [];
  }
}

function mergeHistoryItems(...groups: DesignHistoryItem[][]) {
  const merged = new Map<string, DesignHistoryItem>();

  groups.flat().forEach(item => {
    if (!item?.id) {
      return;
    }

    const existing = merged.get(item.id);
    if (!existing) {
      merged.set(item.id, item);
      return;
    }

    merged.set(item.id, {
      ...existing,
      ...item,
      thumbnail: item.thumbnail || existing.thumbnail || null,
    });
  });

  return sanitizeHistory(Array.from(merged.values()))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, MAX_ITEMS);
}

async function saveHistoryItemRemotely(item: DesignHistoryItem) {
  const response = await fetch(HISTORY_ENDPOINT, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: item.id,
      garmentType: item.garmentType,
      garmentColor: item.garmentColor,
      style: item.style,
      technique: item.technique,
      palette: item.palette,
      prompt: item.prompt,
      thumbnailDataUrl: item.thumbnail,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `History save failed with ${response.status}`);
  }

  const payload = await response.json();
  return payload?.item as DesignHistoryItem | undefined;
}

export function useDesignHistory() {
  const [history, setHistory] = useState<DesignHistoryItem[]>([]);

  // Persist to localStorage
  const persist = useCallback((items: DesignHistoryItem[]) => {
    return persistWithinQuota(items);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrateHistory() {
      const localItems = loadLocalHistory();
      if (!cancelled && localItems.length > 0) {
        setHistory(localItems);
      }

      try {
        const response = await fetch(HISTORY_ENDPOINT, {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`History request failed with ${response.status}`);
        }

        const payload = await response.json();
        const remoteItems = Array.isArray(payload?.items) ? sanitizeHistory(payload.items as DesignHistoryItem[]) : [];
        const merged = mergeHistoryItems(localItems, remoteItems);

        if (!cancelled) {
          setHistory(persist(merged));
        }

        const remoteIds = new Set(remoteItems.map(item => item.id));
        const unsyncedItems = localItems.filter(item => !remoteIds.has(item.id));

        unsyncedItems.forEach(item => {
          void saveHistoryItemRemotely(item)
            .then(savedItem => {
              if (!savedItem || cancelled) {
                return;
              }
              setHistory(prev => persist(mergeHistoryItems(prev, [savedItem])));
            })
            .catch(error => {
              console.warn('Failed to backfill design history item to Supabase:', error);
            });
        });
      } catch (error) {
        if (localItems.length === 0) {
          console.warn('Failed to load remote design history:', error);
        }
      }
    }

    void hydrateHistory();

    return () => {
      cancelled = true;
    };
  }, [persist]);

  const saveDesign = useCallback(
    (item: Omit<DesignHistoryItem, 'id' | 'createdAt'>) => {
      const newItem: DesignHistoryItem = {
        ...item,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };

      setHistory(prev => persist(mergeHistoryItems([newItem], prev)));

      void saveHistoryItemRemotely(newItem)
        .then(savedItem => {
          if (!savedItem) {
            return;
          }

          setHistory(prev => persist(mergeHistoryItems(prev, [savedItem])));
        })
        .catch(error => {
          console.warn('Failed to sync design history to Supabase:', error);
        });

      return newItem.id;
    },
    [persist]
  );

  const deleteDesign = useCallback(
    (id: string) => {
      const previousSnapshot = history;
      setHistory(prev => persist(prev.filter(item => item.id !== id)));

      void fetch(`${HISTORY_ENDPOINT}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      }).then(response => {
        if (!response.ok) {
          throw new Error(`History delete failed with ${response.status}`);
        }
      }).catch(error => {
        console.warn('Failed to delete design history item remotely:', error);
        setHistory(persist(previousSnapshot));
      });
    },
    [history, persist]
  );

  const clearHistory = useCallback(() => {
    const previousSnapshot = history;
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);

    void fetch(HISTORY_ENDPOINT, {
      method: 'DELETE',
      credentials: 'same-origin',
    }).then(response => {
      if (!response.ok) {
        throw new Error(`History clear failed with ${response.status}`);
      }
    }).catch(error => {
      console.warn('Failed to clear design history remotely:', error);
      setHistory(persist(previousSnapshot));
    });
  }, [history, persist]);

  return {
    history,
    saveDesign,
    deleteDesign,
    clearHistory,
  };
}
