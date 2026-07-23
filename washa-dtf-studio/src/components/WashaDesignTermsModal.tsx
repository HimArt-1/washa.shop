import { useEffect, useId, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Check,
  FileCheck2,
  Loader2,
  ShieldCheck,
  ShoppingBag,
  X,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';

const TERMS = [
  {
    title: 'طبيعة الطلب',
    body: 'هذا الطلب مبني على تصميم تم توليده بالذكاء الاصطناعي في استوديو وشّى. الموكب المعروض هو مرجع بصري قريب من المنتج، وقد تظهر فروقات طفيفة في اللون أو التفاصيل عند الطباعة.',
  },
  {
    title: 'الطباعة والجودة',
    body: 'تُطبع التصاميم بتقنية DTF عالية الدقة. قد تتفاوت الألوان الفعلية بدرجة محدودة عن الشاشة نتيجة اختلاف الإضاءة ومعايير عرض الألوان.',
  },
  {
    title: 'التنفيذ والتسليم',
    body: 'بعد إضافة التصميم إلى السلة وإتمام الطلب، يتولى فريق وشّى الطباعة والتجهيز. مدة التنفيذ المعتادة من 3 إلى 7 أيام عمل بحسب القطعة وضغط الطلبات.',
  },
  {
    title: 'حقوق التصميم',
    body: 'باعتماد الطلب، تقرّ بأن الفكرة والمحتوى لا ينتهكان حقوق الملكية الفكرية لأطراف أخرى، وأنهما لا يتعارضان مع حقوق النشر أو العلامات التجارية.',
  },
  {
    title: 'الدفع والإلغاء',
    body: 'سيُحفظ التصميم في طلبات التصميم ويُضاف إلى السلة بالسعر المحتسب، ويمكنك مراجعة تفاصيل القطعة والطباعة قبل إتمام الدفع.',
  },
] as const;

interface WashaDesignTermsModalProps {
  onAccept: () => void;
  onClose: () => void;
  isSubmitting: boolean;
  errorMessage?: string | null;
  variant?: 'classic' | 'prompt-native';
}

export default function WashaDesignTermsModal({
  onAccept,
  onClose,
  isSubmitting,
  errorMessage = null,
  variant = 'classic',
}: WashaDesignTermsModalProps) {
  const [agreed, setAgreed] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const isPromptNative = variant === 'prompt-native';
  const dialogRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const isSubmittingRef = useRef(isSubmitting);
  onCloseRef.current = onClose;
  isSubmittingRef.current = isSubmitting;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      const openDialogs = Array.from(
        document.querySelectorAll<HTMLElement>('[role="dialog"]')
      );
      if (openDialogs[openDialogs.length - 1] !== dialogRef.current) return;

      if (event.key === 'Escape' && !isSubmittingRef.current) {
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => !element.hasAttribute('hidden'));
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

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

    const focusFrame = window.requestAnimationFrame(() => {
      const firstAction = dialogRef.current?.querySelector<HTMLElement>(
        'button:not([disabled]), input:not([disabled])'
      );
      (firstAction ?? dialogRef.current)?.focus();
    });
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        'fixed inset-0 z-[105] flex items-end justify-center bg-[#11100E]/80 p-0 backdrop-blur-md sm:items-center sm:p-5',
        isPromptNative && 'bg-[#12100C]/84',
      )}
      onClick={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose();
      }}
    >
      <motion.section
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        initial={{ opacity: 0, y: 42, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 28, scale: 0.985 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          'flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-[30px] border border-washa-border/40 bg-washa-ivory text-right shadow-[0_30px_100px_rgba(0,0,0,0.38)] sm:rounded-[30px]',
          isPromptNative && 'border-[#C9A84C]/25 bg-[#FFFDF9]',
        )}
      >
        <header
          className={cn(
            'flex items-start justify-between gap-5 border-b border-washa-border/45 px-5 py-5 sm:px-7 sm:py-6',
            isPromptNative && 'bg-[#1A1A1A] text-white',
          )}
        >
          <div className="flex min-w-0 items-start gap-3.5">
            <span
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-washa-gold/12 text-washa-gold',
                isPromptNative && 'bg-[#C9A84C] text-[#1A1A1A]',
              )}
            >
              <FileCheck2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className={cn('text-[11px] font-black text-washa-gold', isPromptNative && 'text-[#C9A84C]')}>
                الخطوة الأخيرة قبل السلة
              </p>
              <h2 id={titleId} className={cn('mt-1 text-xl font-black text-washa-text', isPromptNative && 'text-white')}>
                الشروط والأحكام
              </h2>
              <p id={descriptionId} className={cn('mt-1.5 text-xs font-bold leading-5 text-washa-text-faint', isPromptNative && 'text-white/58')}>
                اقرأ البنود ثم وافق لاعتماد التصميم وحفظه بأمان.
              </p>
            </div>
          </div>

          {!isSubmitting ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق الشروط والأحكام"
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-washa-text-faint transition-colors hover:bg-washa-surface hover:text-washa-text',
                isPromptNative && 'text-white/60 hover:bg-white/10 hover:text-white',
              )}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          {isPromptNative ? (
            <div className="mb-5 rounded-[22px] border border-[#C9A84C]/25 bg-[#F7F0DF] p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#76591F]" aria-hidden="true" />
                <div>
                  <p className="text-sm font-black text-[#1A1A1A]">ماذا يحدث بعد الموافقة؟</p>
                  <p className="mt-1.5 text-xs font-bold leading-6 text-[#625C53]">
                    حفظ التصميم في طلبات التصميم، إضافة النسخة المعتمدة إلى طلبك، ثم الانتقال مباشرة إلى السلة.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <ol className="space-y-3">
            {TERMS.map((item, index) => (
              <li
                key={item.title}
                className="grid grid-cols-[2rem_1fr] gap-3 rounded-[18px] border border-washa-border/40 bg-washa-bg/55 p-3.5"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-washa-surface text-xs font-black text-washa-gold">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <p className="text-sm font-black text-washa-text">{item.title}</p>
                  <p className="mt-1 text-xs font-medium leading-6 text-washa-text-faint">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <footer className="border-t border-washa-border/45 bg-washa-ivory px-5 py-4 sm:px-7 sm:py-5">
          <label className="flex cursor-pointer items-start gap-3 rounded-[18px] border border-washa-border/50 bg-washa-bg/60 p-3.5 focus-within:border-washa-gold/50 focus-within:ring-2 focus-within:ring-washa-gold/20">
            <span
              className={cn(
                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors',
                agreed
                  ? 'border-washa-gold bg-washa-gold text-washa-bg'
                  : 'border-washa-border bg-washa-ivory text-transparent',
              )}
            >
              <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
            </span>
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
              disabled={isSubmitting}
              className="sr-only"
            />
            <span className="text-sm font-bold leading-6 text-washa-text-sec">
              أوافق على الشروط والأحكام وأعتمد إرسال التصميم إلى طلبات التصميم.
            </span>
          </label>

          {errorMessage ? (
            <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-bold leading-5 text-red-700">
              {errorMessage}
            </p>
          ) : null}

          <div className="mt-4 flex gap-3">
            {!isSubmitting ? (
              <Button variant="ghost" onClick={onClose} className="h-12 flex-1 rounded-2xl">
                رجوع
              </Button>
            ) : null}
            <Button
              variant="gold"
              onClick={onAccept}
              disabled={!agreed || isSubmitting}
              className={cn(
                'h-12 flex-1 gap-2 rounded-2xl font-black',
                isPromptNative && 'bg-[#1A1A1A] text-white hover:bg-[#302B23]',
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  جاري اعتماد التصميم...
                </>
              ) : (
                <>
                  <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                  اعتماد والذهاب للسلة
                </>
              )}
            </Button>
          </div>
        </footer>
      </motion.section>
    </motion.div>
  );
}
