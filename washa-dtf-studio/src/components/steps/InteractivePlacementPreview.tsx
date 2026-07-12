import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Crosshair, Move, RotateCcw } from 'lucide-react';
import type { DesignMethod, PrintPosition } from '../../types';
import { clampPrintAdjustment, getPrintSafety, type PrintAdjustment } from '../../lib/printPreview';
import { cn } from '../../lib/utils';

type Props = {
  adjustment: PrintAdjustment;
  garmentImage: string | null;
  garmentColor: string;
  position: PrintPosition | null;
  designMethod: DesignMethod;
  prompt: string;
  calligraphyText: string;
  referenceImage: string | null;
  referenceImageMimeType: string | null;
  onChange: (adjustment: PrintAdjustment) => void;
};

export default function InteractivePlacementPreview({
  adjustment,
  garmentImage,
  garmentColor,
  position,
  designMethod,
  prompt,
  calligraphyText,
  referenceImage,
  referenceImageMimeType,
  onChange,
}: Props) {
  const [dragAdjustment, setDragAdjustment] = useState(adjustment);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; startX: number; startY: number } | null>(null);
  const latestAdjustmentRef = useRef(adjustment);
  const safety = getPrintSafety(dragAdjustment);
  const artworkImage = referenceImage && referenceImageMimeType
    ? `data:${referenceImageMimeType};base64,${referenceImage}`
    : null;
  const artworkLabel = designMethod === 'calligraphy'
    ? calligraphyText.trim().slice(0, 30)
    : prompt.trim().slice(0, 34);

  useEffect(() => {
    latestAdjustmentRef.current = adjustment;
    setDragAdjustment(adjustment);
  }, [adjustment]);

  const previewAdjustment = (next: PrintAdjustment) => {
    const normalized = clampPrintAdjustment(next);
    latestAdjustmentRef.current = normalized;
    setDragAdjustment(normalized);
  };

  const commit = (next: PrintAdjustment) => {
    const normalized = clampPrintAdjustment(next);
    latestAdjustmentRef.current = normalized;
    setDragAdjustment(normalized);
    onChange(normalized);
  };

  const finishDrag = (pointerId: number) => {
    if (dragRef.current?.pointerId !== pointerId) return;
    dragRef.current = null;
    commit(latestAdjustmentRef.current);
  };

  const moveBy = (x: number, y: number) => commit({
    ...dragAdjustment,
    offsetX: dragAdjustment.offsetX + x,
    offsetY: dragAdjustment.offsetY + y,
  });

  return (
    <section className="space-y-4" aria-labelledby="placement-preview-title">
      <div className="flex items-end justify-between gap-4">
        <div id="placement-coordinates" className="text-left text-xs tabular-nums text-washa-text-faint" dir="ltr" aria-live="polite">
          X {dragAdjustment.offsetX} · Y {dragAdjustment.offsetY}
        </div>
        <div className="text-right">
          <h3 id="placement-preview-title" className="text-base font-bold text-washa-text">معاينة مباشرة</h3>
          <p className="mt-1 text-xs text-washa-text-sec">اسحب التصميم داخل المنطقة الآمنة</p>
        </div>
      </div>

      <div className="relative mx-auto aspect-[4/5] w-full max-w-[25rem] overflow-hidden rounded-[1.75rem] border border-washa-border/55 bg-[radial-gradient(circle_at_50%_16%,rgba(255,255,255,0.96),rgba(235,226,210,0.9)_54%,rgba(64,48,40,0.22))] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_24px_55px_rgba(44,36,24,0.12)]">
        {garmentImage ? (
          <img src={garmentImage} alt="معاينة القطعة المختارة" className="absolute inset-0 h-full w-full object-contain p-4" draggable={false} />
        ) : (
          <svg viewBox="0 0 320 400" className="absolute inset-0 h-full w-full p-5" aria-label="رسم توضيحي للقطعة">
            <path d="M83 74 25 130l45 37v205h180V167l45-37-58-56-43 26c-17 10-51 10-68 0L83 74Z" fill={garmentColor || '#252321'} stroke="rgba(255,255,255,.34)" strokeWidth="3" />
            <path d="M126 100c10 28 58 28 68 0" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="4" />
          </svg>
        )}

        <div className={cn(
          'absolute aspect-square border border-dashed transition-[border-color,background-color] duration-300',
          position === 'back' ? 'inset-x-[27%] top-[24%]' : 'inset-x-[29%] top-[25%]',
          position === 'shoulder_right' && 'left-[64%] right-[10%] top-[25%]',
          position === 'shoulder_left' && 'left-[10%] right-[64%] top-[25%]',
          safety.safe ? 'border-emerald-700/55 bg-emerald-700/[0.035]' : 'border-amber-700/70 bg-amber-700/[0.055]',
        )}>
          <span className="absolute -top-6 right-0 rounded-md bg-washa-ivory/90 px-2 py-1 text-[10px] font-bold text-washa-text-sec backdrop-blur-sm">منطقة الطباعة</span>
          <button
            type="button"
            aria-label="حرّك التصميم داخل منطقة الطباعة باستخدام السحب أو أسهم لوحة المفاتيح"
            aria-describedby="placement-coordinates placement-move-help"
            onKeyDown={(event) => {
              const step = event.shiftKey ? 5 : 2;
              if (event.key === 'ArrowRight') moveBy(step, 0);
              else if (event.key === 'ArrowLeft') moveBy(-step, 0);
              else if (event.key === 'ArrowDown') moveBy(0, step);
              else if (event.key === 'ArrowUp') moveBy(0, -step);
              else return;
              event.preventDefault();
            }}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, startX: dragAdjustment.offsetX, startY: dragAdjustment.offsetY };
            }}
            onPointerMove={(event) => {
              const drag = dragRef.current;
              if (!drag || drag.pointerId !== event.pointerId) return;
              const rect = event.currentTarget.parentElement?.getBoundingClientRect();
              if (!rect) return;
              previewAdjustment({
                ...dragAdjustment,
                offsetX: drag.startX + ((event.clientX - drag.x) / rect.width) * 60,
                offsetY: drag.startY + ((event.clientY - drag.y) / rect.height) * 50,
              });
            }}
            onPointerUp={(event) => {
              finishDrag(event.pointerId);
              if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            onPointerCancel={(event) => finishDrag(event.pointerId)}
            onLostPointerCapture={(event) => finishDrag(event.pointerId)}
            className="absolute left-1/2 top-1/2 flex aspect-square min-h-14 min-w-14 touch-none select-none items-center justify-center overflow-hidden rounded-xl border border-washa-gold/70 bg-washa-ivory/92 text-center text-[10px] font-bold leading-4 text-washa-gold-deep shadow-[0_10px_28px_rgba(44,36,24,0.2)] outline-none transition-[box-shadow] focus-visible:ring-2 focus-visible:ring-washa-gold active:cursor-grabbing"
            style={{
              width: `${dragAdjustment.scale}%`,
              maxWidth: '120%',
              transform: `translate(calc(-50% + ${dragAdjustment.offsetX}%), calc(-50% + ${dragAdjustment.offsetY}%))`,
            }}
          >
            {artworkImage ? (
              <img src={artworkImage} alt="التصميم المرجعي" className="h-full w-full object-contain" draggable={false} />
            ) : artworkLabel ? (
              <span className="line-clamp-3 px-2">{artworkLabel}</span>
            ) : (
              <Crosshair className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <p id="placement-move-help" className="sr-only">استخدم الأسهم للتحريك بمقدار درجتين، أو اضغط Shift مع السهم للتحريك بمقدار خمس درجات.</p>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <label className="space-y-2 text-right">
          <span className="flex items-center justify-between text-xs font-bold text-washa-text">
            <span className="tabular-nums">{dragAdjustment.scale}%</span>
            <span>حجم التصميم</span>
          </span>
          <input
            type="range"
            min="55"
            max="120"
            step="5"
            value={dragAdjustment.scale}
            onChange={(event) => commit({ ...dragAdjustment, scale: Number(event.target.value) })}
            className="h-2 w-full cursor-pointer accent-washa-gold"
          />
        </label>
        <button
          type="button"
          onClick={() => commit({ scale: 100, offsetX: 0, offsetY: 0 })}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-washa-border/55 px-4 text-xs font-bold text-washa-text-sec transition-[border-color,color,transform] hover:border-washa-gold/45 hover:text-washa-gold active:scale-[0.98]"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          إعادة الضبط
        </button>
      </div>

      <div className={cn('flex items-start gap-3 rounded-xl border px-4 py-3 text-right', safety.safe ? 'border-emerald-700/20 bg-emerald-700/5' : 'border-amber-700/25 bg-amber-700/5')} role="status">
        {safety.safe ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />}
        <div className="flex-1">
          <p className="text-sm font-bold text-washa-text">{safety.safe ? 'موضع آمن للطباعة' : 'راجع موضع التصميم'}</p>
          <p className="mt-0.5 text-xs leading-5 text-washa-text-sec">
            {safety.tooSmall ? 'كبّر التصميم قليلًا ليظهر بوضوح على القماش.' : safety.nearEdge ? 'أبعد التصميم عن الحواف لتفادي القص أثناء الطباعة.' : 'التصميم داخل الحدود وبحجم واضح.'}
          </p>
        </div>
        <Move className="mt-0.5 h-4 w-4 shrink-0 text-washa-text-faint" aria-hidden="true" />
      </div>
    </section>
  );
}
