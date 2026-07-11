// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — سياق حصص/رصيد WASHA AI
//  يحمل حالة الحصة، يستمع لأحداث التوليد لتحديث الرصيد فوراً،
//  ويفتح نافذة الشراء عند نفاد الحصة.
// ═══════════════════════════════════════════════════════════

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  fetchQuotaStatus,
  type QuotaStatus,
} from '../services/creditsService';
import { QUOTA_CHANGED_EVENT, QUOTA_EXCEEDED_EVENT } from '../services/geminiService';

/** سبب فتح النافذة: نفاد الحصة، أو الفئة ممنوعة، أو فتح يدوي للشراء. */
export type CreditsNoticeReason = 'exhausted' | 'blocked' | null;

interface CreditsContextValue {
  status: QuotaStatus | null;
  loading: boolean;
  purchaseOpen: boolean;
  /** غير null عندما تُفتح النافذة بسبب نفاد/منع (لعرض لافتة مناسبة). */
  noticeReason: CreditsNoticeReason;
  refresh: () => void;
  openPurchase: () => void;
  closePurchase: () => void;
}

const CreditsContext = createContext<CreditsContextValue | null>(null);

export function CreditsProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<QuotaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [noticeReason, setNoticeReason] = useState<CreditsNoticeReason>(null);
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    void fetchQuotaStatus(controller.signal).then((next) => {
      if (controller.signal.aborted) return;
      if (next) setStatus(next);
      setLoading(false);
    });
  }, []);

  const openPurchase = useCallback(() => {
    setNoticeReason(null); // فتح يدوي من الشريحة — شراء صرف بلا لافتة.
    setPurchaseOpen(true);
  }, []);
  const closePurchase = useCallback(() => {
    setPurchaseOpen(false);
    setNoticeReason(null);
  }, []);

  useEffect(() => {
    refresh();
    return () => abortRef.current?.abort();
  }, [refresh]);

  // تحديث فوري بعد كل توليد ناجح (من حدث خدمة التوليد).
  useEffect(() => {
    function onChanged(event: Event) {
      const detail = (event as CustomEvent).detail as { freeRemaining?: number | null; paidBalance?: number | null };
      setStatus((prev) => {
        if (!prev) {
          // لا حالة سابقة — اجلبها كاملة.
          refresh();
          return prev;
        }
        const freeRemaining = typeof detail?.freeRemaining === 'number' ? detail.freeRemaining : prev.freeRemaining;
        const paidBalance = typeof detail?.paidBalance === 'number' ? detail.paidBalance : prev.paidBalance;
        return {
          ...prev,
          freeRemaining,
          freeUsed: Math.max(prev.freeLimit - freeRemaining, 0),
          paidBalance,
        };
      });
    }

    function onExceeded(event: Event) {
      const detail = (event as CustomEvent).detail as {
        reason?: 'exhausted' | 'blocked';
        canPurchase?: boolean;
      };
      const reason: CreditsNoticeReason = detail?.reason === 'blocked' ? 'blocked' : 'exhausted';
      setStatus((prev) => (prev ? { ...prev, freeRemaining: 0, paidBalance: 0 } : prev));
      // نفتح النافذة اللطيفة دائماً — سواء لعرض الشراء أو رسالة «تتجدد غداً».
      setNoticeReason(reason);
      setPurchaseOpen(true);
    }

    window.addEventListener(QUOTA_CHANGED_EVENT, onChanged);
    window.addEventListener(QUOTA_EXCEEDED_EVENT, onExceeded);
    return () => {
      window.removeEventListener(QUOTA_CHANGED_EVENT, onChanged);
      window.removeEventListener(QUOTA_EXCEEDED_EVENT, onExceeded);
    };
  }, [refresh]);

  const value = useMemo<CreditsContextValue>(
    () => ({ status, loading, purchaseOpen, noticeReason, refresh, openPurchase, closePurchase }),
    [status, loading, purchaseOpen, noticeReason, refresh, openPurchase, closePurchase]
  );

  return <CreditsContext.Provider value={value}>{children}</CreditsContext.Provider>;
}

export function useCredits() {
  const ctx = useContext(CreditsContext);
  if (!ctx) {
    throw new Error('useCredits must be used within CreditsProvider');
  }
  return ctx;
}
