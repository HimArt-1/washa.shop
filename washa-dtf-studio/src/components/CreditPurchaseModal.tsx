// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — نافذة شراء حصص WASHA AI
//  تعرض الحزم وحالة إتاحة الدفع دون إنشاء عملية عبر بوابة معطلة.
// ═══════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, Sparkles, Loader2, Check, Clock, Ban } from 'lucide-react';
import { useCredits } from '../context/CreditsContext';
import {
  fetchCreditPackages,
  startCreditCheckout,
  type CreditPackage,
} from '../services/creditsService';
import { cn } from '../lib/utils';

export default function CreditPurchaseModal() {
  const { purchaseOpen, closePurchase, status, noticeReason } = useCredits();
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [checkoutEnabled, setCheckoutEnabled] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobile, setMobile] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const modalPanelRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const canPurchase = status?.canPurchase === true;
  const isBlocked = noticeReason === 'blocked';
  const showPurchase = canPurchase && !isBlocked;

  const dismiss = useCallback(() => {
    if (!submitting) closePurchase();
  }, [closePurchase, submitting]);

  useEffect(() => {
    if (!purchaseOpen || !showPurchase) return;
    const controller = new AbortController();
    setLoadingPackages(true);
    setError(null);
    void fetchCreditPackages(controller.signal).then((catalog) => {
      if (controller.signal.aborted) return;
      const list = catalog.packages;
      setPackages(list);
      setCheckoutEnabled(catalog.checkoutEnabled);
      setSelectedId((prev) => prev ?? list.find((p) => p.popular)?.id ?? list[0]?.id ?? null);
      setLoadingPackages(false);
    });
    return () => controller.abort();
  }, [purchaseOpen, showPurchase]);

  useEffect(() => {
    if (!purchaseOpen) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') dismiss();
      if (e.key === 'Tab') {
        const focusable = Array.from(modalPanelRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? []);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [purchaseOpen, dismiss]);

  async function handleCheckout() {
    if (!selectedId || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const data = await startCreditCheckout(selectedId, mobile.trim() || undefined);
      // تحويل إلى بوابة الدفع
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر بدء عملية الدفع');
      setSubmitting(false);
    }
  }

  const selected = packages.find((p) => p.id === selectedId) ?? null;

  return (
    <AnimatePresence>
      {purchaseOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-zinc-950/80 p-0 backdrop-blur-md sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) dismiss();
          }}
          dir="rtl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="credit-purchase-title"
        >
          <motion.div
            ref={modalPanelRef}
            className="relative w-full max-w-2xl overflow-hidden rounded-t-[32px] border border-white/10 bg-washa-surface shadow-[0_28px_90px_-28px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(255,255,255,0.06)] sm:rounded-[32px]"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-washa-border/40 px-5 py-5 sm:px-7 sm:py-6">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-2xl',
                    isBlocked ? 'bg-red-500/10 text-red-300' : 'bg-washa-gold/10 text-washa-gold'
                  )}
                >
                  {isBlocked ? <Ban className="h-5 w-5" /> : noticeReason === 'exhausted' && !showPurchase ? <Clock className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                </div>
                <div>
                  <div className="mb-1 flex items-center gap-2 text-[10px] font-bold tracking-[0.16em] text-washa-gold">
                    <span className="h-1.5 w-1.5 rounded-full bg-washa-gold" /> WASHA AI CREDITS
                  </div>
                  <h2 id="credit-purchase-title" className="text-xl font-black tracking-tight text-washa-text sm:text-2xl">
                    {isBlocked ? 'التوليد غير متاح' : noticeReason === 'exhausted' ? status?.audience === 'guest' ? 'انتهت التجربة المجانية' : 'نفدت حصتك اليومية' : 'شراء حصص توليد'}
                  </h2>
                  <p className="text-xs text-washa-text-sec">
                    {isBlocked
                      ? 'لحسابك حالياً'
                      : showPurchase
                        ? status && status.paidBalance > 0
                          ? `رصيدك الحالي: ${status.paidBalance} حصة`
                          : 'أضف رصيداً لمواصلة التوليد بلا انتظار'
                        : status?.audience === 'guest' ? 'سجّل الدخول للمتابعة وحفظ أعمالك' : 'تتجدد حصتك المجانية في النافذة التالية'}
                  </p>
                </div>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  dismiss();
                }}
                className="rounded-lg p-1.5 text-washa-text-faint transition-colors hover:bg-washa-border/30 hover:text-washa-text"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[68vh] overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
              {!showPurchase ? (
                <div className="flex flex-col items-center gap-4 py-6 text-center">
                  <div
                    className={cn(
                      'flex h-16 w-16 items-center justify-center rounded-full',
                      isBlocked ? 'bg-red-500/10 text-red-300' : 'bg-washa-gold/10 text-washa-gold'
                    )}
                  >
                    {isBlocked ? <Ban className="h-8 w-8" /> : <Clock className="h-8 w-8" />}
                  </div>
                  <p className="max-w-xs text-sm leading-7 text-washa-text-sec">
                    {isBlocked
                      ? 'توليد وشّى AI غير متاح لحسابك حالياً. تواصل مع الدعم إن كنت تعتقد أن هذا خطأ.'
                      : status?.audience === 'guest'
                        ? 'انتهت حصتك التجريبية. سجّل الدخول للوصول إلى حصة المشترك وحفظ أعمالك في حسابك.'
                      : 'استهلكت كامل حصتك المجانية لهذا اليوم. تتجدد تلقائياً في نافذة الاستخدام التالية.'}
                  </p>
                </div>
              ) : loadingPackages ? (
                <div className="grid gap-3 py-2 sm:grid-cols-2" aria-label="جارٍ تحميل الباقات">
                  {[0, 1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-[22px] border border-washa-border/30 bg-washa-bg/40" />)}
                </div>
              ) : packages.length === 0 ? (
                <p className="py-10 text-center text-sm text-washa-text-sec">لا توجد باقات متاحة حالياً.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {noticeReason === 'exhausted' && (
                    <div className="mb-1 flex items-center gap-2.5 rounded-2xl border border-washa-gold/20 bg-washa-gold/5 px-4 py-3 text-xs leading-6 text-washa-text-sec sm:col-span-2">
                      <Sparkles className="h-4 w-4 shrink-0 text-washa-gold" />
                      <span>انتهت حصتك المجانية لليوم. اختر باقة لمواصلة التوليد فوراً، أو انتظر تجديدها غدًا.</span>
                    </div>
                  )}
                  {packages.map((pkg) => {
                    const active = pkg.id === selectedId;
                    return (
                      <button
                        type="button"
                        key={pkg.id}
                        onClick={() => setSelectedId(pkg.id)}
                        className={cn(
                          'relative min-h-28 overflow-visible rounded-[22px] border p-4 text-right transition-all duration-300 active:scale-[0.98]',
                          active
                            ? 'border-washa-gold/70 bg-washa-gold/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                            : 'border-washa-border/50 bg-washa-bg/35 hover:-translate-y-0.5 hover:border-washa-gold/35'
                        )}
                      >
                        {pkg.popular && (
                          <span className="absolute -top-2 right-4 rounded-full bg-washa-gold px-2 py-0.5 text-[10px] font-bold text-washa-bg">
                            الأكثر رواجاً
                          </span>
                        )}
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-black text-washa-text">{pkg.label}</div>
                            <div className="mt-1 text-xs text-washa-text-sec">{pkg.credits} حصة توليد</div>
                          </div>
                          <div
                            className={cn(
                              'flex h-6 w-6 items-center justify-center rounded-full border transition-colors',
                              active ? 'border-washa-gold bg-washa-gold text-washa-bg' : 'border-washa-border'
                            )}
                          >
                            {active && <Check className="h-4 w-4" />}
                          </div>
                        </div>
                        <div className="mt-5 flex items-end justify-between border-t border-washa-border/40 pt-3">
                          <span className="text-[10px] text-washa-text-faint">{(pkg.price / pkg.credits).toFixed(2)} ر.س / حصة</span>
                          <div className="text-left"><span className="text-xl font-black tabular-nums text-washa-gold">{pkg.price}</span><span className="mr-1 text-[10px] text-washa-text-faint">ر.س</span></div>
                        </div>
                      </button>
                    );
                  })}

                  {/* Optional mobile — used if the account has no phone on file */}
                  {checkoutEnabled && <div className="mt-1 sm:col-span-2">
                    <label className="mb-1 block text-xs text-washa-text-sec">
                      رقم الجوال (اختياري — للفاتورة)
                    </label>
                    <input
                      type="tel"
                      inputMode="tel"
                      dir="ltr"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="05xxxxxxxx"
                      className="w-full rounded-xl border border-washa-border/50 bg-washa-bg/50 px-3 py-2.5 text-right text-sm text-washa-text placeholder:text-washa-text-faint focus:border-washa-gold/50 focus:outline-none"
                    />
                  </div>}
                  {!checkoutEnabled && (
                    <div className="rounded-2xl border border-washa-border/50 bg-washa-bg/45 px-4 py-3 sm:col-span-2">
                      <div className="flex items-center justify-between gap-3">
                        <div><p className="text-sm font-bold text-washa-text">الدفع الإلكتروني قيد التطوير</p><p className="mt-1 text-xs leading-5 text-washa-text-sec">يمكنك استعراض الباقات الآن، وسيُفعّل الشراء بعد اكتمال بوابة الدفع الجديدة.</p></div>
                        <span className="shrink-0 rounded-full border border-washa-gold/20 bg-washa-gold/10 px-2.5 py-1 text-[10px] font-bold text-washa-gold">قريبًا</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-center text-sm text-red-300">
                  {error}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-washa-border/40 px-5 py-4 sm:px-7 sm:py-5">
              {showPurchase ? (
                <>
                  <button
                    type="button"
                    onClick={handleCheckout}
                    disabled={!selected || submitting || !checkoutEnabled}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-washa-gold py-3.5 font-bold text-washa-bg transition-all duration-300 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        جارٍ التحويل للدفع…
                      </>
                    ) : !checkoutEnabled ? (
                      'الدفع الإلكتروني قيد التطوير'
                    ) : selected ? (
                      <>الدفع — {selected.price} ريال مقابل {selected.credits} حصة</>
                    ) : (
                      'اختر باقة'
                    )}
                  </button>
                  <p className="mt-2.5 text-center text-[11px] text-washa-text-faint">
                    {checkoutEnabled ? 'سيتم تحويلك إلى صفحة دفع آمنة لإكمال العملية.' : 'لن تُنشأ أي فاتورة أو عملية دفع إلى أن تُفعّل البوابة الجديدة.'}
                  </p>
                </>
              ) : (
                status?.audience === 'guest' && !isBlocked ? (
                  <a href="/sign-in?redirect_url=/design/washa-ai/app" className="flex w-full items-center justify-center rounded-2xl bg-washa-gold py-3.5 font-bold text-washa-bg transition hover:brightness-105 active:scale-[0.98]">تسجيل الدخول والمتابعة</a>
                ) : (
                  <button type="button" onClick={dismiss} className="w-full rounded-2xl border border-washa-border/50 py-3.5 font-bold text-washa-text transition-colors hover:bg-washa-border/20">حسنًا</button>
                )
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
