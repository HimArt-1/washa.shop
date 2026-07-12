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
export type GenerationCreditCheckResult =
  | { allowed: true }
  | { allowed: false; reason: CreditsNoticeReason | 'unavailable' };

interface CreditsContextValue {
  status: QuotaStatus | null;
  loading: boolean;
  purchaseOpen: boolean;
  /** غير null عندما تُفتح النافذة بسبب نفاد/منع (لعرض لافتة مناسبة). */
  noticeReason: CreditsNoticeReason;
  refresh: () => void;
  requestGenerationAccess: (expectedAuthenticated?: boolean) => Promise<GenerationCreditCheckResult>;
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

  const requestGenerationAccess = useCallback(async (expectedAuthenticated = false): Promise<GenerationCreditCheckResult> => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    const next = await fetchQuotaStatus(controller.signal, expectedAuthenticated);
    if (controller.signal.aborted) {
      return { allowed: false, reason: 'unavailable' };
    }

    // Never let a transient public resolution replace an authenticated user's
    // role/balance and trigger a false guest sign-in prompt.
    if (expectedAuthenticated && next?.audience === 'guest') {
      setLoading(false);
      return { allowed: false, reason: 'unavailable' };
    }

    if (next) setStatus(next);
    setLoading(false);

    if (!next) {
      return { allowed: false, reason: 'unavailable' };
    }

    if (next.unlimited || (!next.blocked && next.freeRemaining + next.paidBalance > 0)) {
      return { allowed: true };
    }

    const reason: CreditsNoticeReason = next.blocked ? 'blocked' : 'exhausted';
    setNoticeReason(reason);
    setPurchaseOpen(true);

    return { allowed: false, reason };
  }, []);

  useEffect(() => {
    refresh();
    return () => abortRef.current?.abort();
  }, [refresh]);

  // تحديث فوري بعد كل توليد ناجح (من حدث خدمة التوليد).
  useEffect(() => {
    function onChanged(event: Event) {
      const detail = (event as CustomEvent).detail as { freeRemaining?: number | null; paidBalance?: number | null; guest?: boolean };
      setStatus((prev) => {
        if (!prev) {
          // لا حالة سابقة — اجلبها كاملة.
          if (detail?.guest) {
            const freeRemaining = typeof detail.freeRemaining === 'number' ? detail.freeRemaining : 0;
            return {
              audience: 'guest',
              guest: true,
              unlimited: false,
              blocked: false,
              freeLimit: freeRemaining + 1,
              freeUsed: 1,
              freeRemaining,
              paidBalance: 0,
              canPurchase: false,
            };
          }
          refresh();
          return prev;
        }
        const freeRemaining = typeof detail?.freeRemaining === 'number' ? detail.freeRemaining : prev.freeRemaining;
        const paidBalance = typeof detail?.paidBalance === 'number' ? detail.paidBalance : prev.paidBalance;
        return {
          ...prev,
          guest: detail?.guest === true || prev.guest,
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
        paidBalance?: number;
        guest?: boolean;
      };
      const reason: CreditsNoticeReason = detail?.reason === 'blocked' ? 'blocked' : 'exhausted';
      const canPurchase = detail?.canPurchase === true;
      const paidBalance = typeof detail?.paidBalance === 'number' ? detail.paidBalance : 0;

      // نعتمد قيمة الـ403 الموثوقة (canPurchase) حتى لو لم يكتمل نداء /quota-status بعد.
      setStatus((prev) => {
        const base: QuotaStatus = prev ?? {
          audience: detail?.guest === true ? 'guest' : 'subscriber',
          unlimited: false,
          blocked: false,
          freeLimit: 0,
          freeUsed: 0,
          freeRemaining: 0,
          paidBalance: 0,
          canPurchase: false,
          guest: detail?.guest === true,
        };
        return {
          ...base,
          blocked: reason === 'blocked',
          freeRemaining: 0,
          paidBalance,
          canPurchase,
          guest: detail?.guest === true || base.guest,
        };
      });

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
    () => ({
      status,
      loading,
      purchaseOpen,
      noticeReason,
      refresh,
      requestGenerationAccess,
      openPurchase,
      closePurchase,
    }),
    [status, loading, purchaseOpen, noticeReason, refresh, requestGenerationAccess, openPurchase, closePurchase]
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
