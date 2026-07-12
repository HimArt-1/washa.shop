import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, LogIn, ShieldCheck, UserPlus, X } from 'lucide-react';
import { useDesign } from '../context/DesignContext';

export default function AuthGateModal() {
  const dialogRef = useRef<HTMLElement | null>(null);
  const primaryActionRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const {
    authGateIntent,
    authGateNotice,
    closeAuthGate,
    continueAuthentication,
  } = useDesign();
  const isGenerationGate = authGateIntent === 'generate';

  useEffect(() => {
    if (!authGateIntent) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusFrame = window.requestAnimationFrame(() => primaryActionRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeAuthGate();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])')
      ).filter((element) => !element.hasAttribute('hidden'));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener('keydown', onKeyDown);
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    };
  }, [authGateIntent, closeAuthGate]);

  return (
    <AnimatePresence>
      {authGateIntent ? (
        <motion.div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-[#1f1914]/72 p-0 backdrop-blur-sm sm:items-center sm:p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(event) => {
            if (event.target === event.currentTarget) closeAuthGate();
          }}
          role="presentation"
        >
          <motion.section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-gate-title"
            aria-describedby="auth-gate-description"
            dir="rtl"
            className="w-full max-w-lg overflow-hidden rounded-t-[1.75rem] border border-white/10 bg-washa-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_28px_80px_rgba(31,25,20,0.28)] sm:rounded-[1.75rem]"
            initial={{ y: 38, opacity: 0, scale: 0.985 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 28, opacity: 0, scale: 0.985 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-washa-border/35 px-5 py-5 sm:px-6">
              <button
                type="button"
                onClick={closeAuthGate}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-washa-border/35 text-washa-text-faint transition-[background-color,color,transform] hover:bg-washa-bg/55 hover:text-washa-text active:scale-[0.98]"
                aria-label="إغلاق نافذة الدخول"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
              <div className="flex min-w-0 items-start gap-3 text-right">
                <div>
                  <p className="text-xs font-bold text-washa-gold">خطوة أخيرة</p>
                  <h2 id="auth-gate-title" className="mt-1 text-xl font-extrabold tracking-tight text-washa-text">
                    {isGenerationGate ? 'تابع التوليد بحسابك' : 'احفظ تصميمك وأكمل الطلب'}
                  </h2>
                </div>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-washa-gold/20 bg-washa-gold/8 text-washa-gold">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </span>
              </div>
            </div>

            <div className="space-y-5 px-5 py-6 sm:px-6">
              <p id="auth-gate-description" className="text-sm leading-7 text-washa-text-sec">
                {isGenerationGate
                  ? 'وصلت إلى حد تجربة الزائر أو أن التوليد العام متوقف. أنشئ حسابًا أو سجّل الدخول لاستعادة اختياراتك والمتابعة.'
                  : 'أنشئ حسابًا أو سجّل الدخول لربط التصميم بسلتك ومتابعة الطلب. لن نستهلك حصة جديدة طالما أمكن حفظ النتيجة الحالية.'}
              </p>

              {authGateNotice ? (
                <div className="flex items-start gap-2.5 rounded-xl border border-washa-gold/18 bg-washa-gold/6 px-3.5 py-3 text-xs leading-6 text-washa-text-sec" role="status">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-washa-gold" aria-hidden="true" />
                  <span>{authGateNotice}</span>
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-[1.15fr_0.85fr]">
                <button
                  ref={primaryActionRef}
                  type="button"
                  onClick={() => continueAuthentication('sign-up')}
                  className="group flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-washa-gold px-4 py-3 text-right font-bold text-washa-bg transition-[filter,transform] hover:brightness-105 active:scale-[0.985]"
                >
                  <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden="true" />
                  <span className="flex items-center gap-2">
                    إنشاء حساب جديد
                    <UserPlus className="h-5 w-5" aria-hidden="true" />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => continueAuthentication('sign-in')}
                  className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-washa-border/55 bg-washa-bg/45 px-4 py-3 font-bold text-washa-text transition-[border-color,background-color,transform] hover:border-washa-gold/35 hover:bg-washa-bg/70 active:scale-[0.985]"
                >
                  <LogIn className="h-5 w-5 text-washa-gold" aria-hidden="true" />
                  تسجيل الدخول
                </button>
              </div>

              <p className="text-center text-[11px] leading-5 text-washa-text-faint">
                يمكنك إغلاق النافذة ومواصلة تعديل التصميم كزائر.
              </p>
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
