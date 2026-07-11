// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — نافذة شراء حصص WASHA AI
//  تعرض الحزم، تبدأ الدفع عبر Paylink، ثم تحوّل المستخدم.
// ═══════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
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
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobile, setMobile] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canPurchase = status?.canPurchase === true;
  const isBlocked = noticeReason === 'blocked';
  const showPurchase = canPurchase && !isBlocked;

  useEffect(() => {
    if (!purchaseOpen || !showPurchase) return;
    const controller = new AbortController();
    setLoadingPackages(true);
    setError(null);
    void fetchCreditPackages(controller.signal).then((list) => {
      if (controller.signal.aborted) return;
      setPackages(list);
      setSelectedId((prev) => prev ?? list.find((p) => p.popular)?.id ?? list[0]?.id ?? null);
      setLoadingPackages(false);
    });
    return () => controller.abort();
  }, [purchaseOpen, showPurchase]);

  useEffect(() => {
    if (!purchaseOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !submitting) closePurchase();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [purchaseOpen, submitting, closePurchase]);

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
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !submitting && closePurchase()}
          dir="rtl"
        >
          <motion.div
            className="relative w-full max-w-lg overflow-hidden rounded-t-3xl border border-washa-gold/20 bg-washa-surface shadow-2xl sm:rounded-3xl"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-washa-border/40 p-5">
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
                  <h2 className="text-lg font-bold text-washa-text">
                    {isBlocked ? 'التوليد غير متاح' : noticeReason === 'exhausted' ? 'نفدت حصتك اليومية' : 'شراء حصص توليد'}
                  </h2>
                  <p className="text-xs text-washa-text-sec">
                    {isBlocked
                      ? 'لحسابك حالياً'
                      : showPurchase
                        ? status && status.paidBalance > 0
                          ? `رصيدك الحالي: ${status.paidBalance} حصة`
                          : 'أضف رصيداً لمواصلة التوليد بلا انتظار'
                        : 'تتجدد حصتك المجانية غداً'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => !submitting && closePurchase()}
                className="rounded-lg p-1.5 text-washa-text-faint transition-colors hover:bg-washa-border/30 hover:text-washa-text"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[65vh] overflow-y-auto p-5">
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
                      : 'استهلكت كامل حصتك المجانية لهذا اليوم. تتجدد تلقائياً غدًا — نراك حينها ✨'}
                  </p>
                </div>
              ) : loadingPackages ? (
                <div className="flex items-center justify-center py-12 text-washa-text-sec">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : packages.length === 0 ? (
                <p className="py-10 text-center text-sm text-washa-text-sec">لا توجد باقات متاحة حالياً.</p>
              ) : (
                <div className="grid gap-3">
                  {noticeReason === 'exhausted' && (
                    <div className="mb-1 flex items-center gap-2.5 rounded-xl border border-washa-gold/20 bg-washa-gold/5 px-3.5 py-2.5 text-xs leading-6 text-washa-text-sec">
                      <Sparkles className="h-4 w-4 shrink-0 text-washa-gold" />
                      <span>انتهت حصتك المجانية لليوم. اختر باقة لمواصلة التوليد فوراً، أو انتظر تجديدها غدًا.</span>
                    </div>
                  )}
                  {packages.map((pkg) => {
                    const active = pkg.id === selectedId;
                    return (
                      <button
                        key={pkg.id}
                        onClick={() => setSelectedId(pkg.id)}
                        className={cn(
                          'relative flex items-center justify-between gap-3 rounded-2xl border p-4 text-right transition-all duration-200',
                          active
                            ? 'border-washa-gold bg-washa-gold/10 shadow-[0_0_0_1px_rgba(200,161,90,0.4)]'
                            : 'border-washa-border/50 bg-washa-bg/40 hover:border-washa-gold/40'
                        )}
                      >
                        {pkg.popular && (
                          <span className="absolute -top-2 right-4 rounded-full bg-washa-gold px-2 py-0.5 text-[10px] font-bold text-washa-bg">
                            الأكثر رواجاً
                          </span>
                        )}
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'flex h-6 w-6 items-center justify-center rounded-full border transition-colors',
                              active ? 'border-washa-gold bg-washa-gold text-washa-bg' : 'border-washa-border'
                            )}
                          >
                            {active && <Check className="h-4 w-4" />}
                          </div>
                          <div>
                            <div className="font-bold text-washa-text">{pkg.label}</div>
                            <div className="text-xs text-washa-text-sec">
                              {pkg.credits} حصة توليد
                            </div>
                          </div>
                        </div>
                        <div className="text-left">
                          <div className="text-lg font-extrabold tabular-nums text-washa-gold">{pkg.price}</div>
                          <div className="text-[10px] text-washa-text-faint">ريال</div>
                        </div>
                      </button>
                    );
                  })}

                  {/* Optional mobile — used if the account has no phone on file */}
                  <div className="mt-1">
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
                  </div>
                </div>
              )}

              {error && (
                <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-center text-sm text-red-300">
                  {error}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-washa-border/40 p-5">
              {showPurchase ? (
                <>
                  <button
                    onClick={handleCheckout}
                    disabled={!selected || submitting}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-washa-gold py-3.5 font-bold text-washa-bg transition-all duration-300 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        جارٍ التحويل للدفع…
                      </>
                    ) : selected ? (
                      <>الدفع — {selected.price} ريال مقابل {selected.credits} حصة</>
                    ) : (
                      'اختر باقة'
                    )}
                  </button>
                  <p className="mt-2.5 text-center text-[11px] text-washa-text-faint">
                    دفع آمن عبر Paylink · مدى، فيزا، Apple Pay، STC Pay، تابي، تمارا
                  </p>
                </>
              ) : (
                <button
                  onClick={closePurchase}
                  className="w-full rounded-2xl border border-washa-border/50 py-3.5 font-bold text-washa-text transition-colors hover:bg-washa-border/20"
                >
                  حسنًا
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
