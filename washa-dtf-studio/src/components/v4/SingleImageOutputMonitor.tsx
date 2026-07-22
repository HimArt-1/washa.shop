import {
  ActivityLogIcon,
  CheckCircledIcon,
  Crosshair2Icon,
  FrameIcon,
} from '@radix-ui/react-icons';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react';
import { useMemo, type PointerEvent as ReactPointerEvent } from 'react';

type SingleImageOutputMonitorProps = {
  generating: boolean;
  designWidth: number;
  designHeight: number;
  composition: string;
  filledInputs: number;
  artworkColors: Array<{ name: string; hex: string }>;
};

const spring = { stiffness: 150, damping: 24, mass: 0.35 };

function validHex(value: string) {
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
}

export default function SingleImageOutputMonitor({
  generating,
  designWidth,
  designHeight,
  composition,
  filledInputs,
  artworkColors,
}: SingleImageOutputMonitorProps) {
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const reduceMotion = useReducedMotion();
  const crosshairX = useSpring(pointerX, spring);
  const crosshairY = useSpring(pointerY, spring);
  const activeColors = useMemo(
    () => artworkColors.filter((color) => validHex(color.hex)).slice(0, 5),
    [artworkColors],
  );

  const trackPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set(event.clientX - bounds.left - bounds.width / 2);
    pointerY.set(event.clientY - bounds.top - bounds.height / 2);
  };

  const resetPointer = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  return (
    <div
      dir="ltr"
      onPointerMove={trackPointer}
      onPointerLeave={resetPointer}
      className="group relative aspect-[4/5] overflow-hidden border border-[#3d4840] bg-[#171b18] text-[#dce3dc] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
      aria-label={generating ? 'يتم إنشاء الصورة النهائية الواحدة' : 'شاشة خرج الصورة الواحدة'}
      aria-busy={generating}
    >
      <div className="v4-output-grid absolute inset-0 opacity-65" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(111,132,116,0.13),transparent_47%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-[#809487]/55" />

      <div className="absolute left-5 right-5 top-5 flex items-start justify-between font-mono text-[8px] font-bold tracking-[0.18em] text-[#91a095] sm:text-[9px]">
        <div className="flex items-center gap-2">
          <motion.span
            animate={reduceMotion ? { opacity: 1 } : { opacity: generating ? [0.35, 1, 0.35] : [0.6, 1, 0.6] }}
            transition={{ duration: generating ? 0.9 : 2.8, repeat: reduceMotion ? 0 : Infinity, ease: 'easeInOut' }}
            className="h-1.5 w-1.5 rounded-full bg-[#8ca493]"
          />
          {generating ? 'RENDER SESSION ACTIVE' : 'OUTPUT SYSTEM READY'}
        </div>
        <span>{String(filledInputs).padStart(2, '0')} / 05 INPUT</span>
      </div>

      <div className="absolute left-5 top-14 flex items-center gap-2 font-mono text-[8px] tracking-[0.16em] text-[#65756a]">
        <ActivityLogIcon /> LIVE SIGNAL
      </div>
      <div className="absolute right-5 top-14 flex items-center gap-2 font-mono text-[8px] tracking-[0.16em] text-[#65756a]">
        FRAME 4:5 <FrameIcon />
      </div>

      <motion.div
        aria-hidden="true"
        style={{ x: crosshairX, y: crosshairY }}
        className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-300 group-hover:opacity-100 md:block"
      >
        <Crosshair2Icon className="h-7 w-7 text-[#8fa295]/45" />
      </motion.div>

      <div className="absolute inset-x-[15%] bottom-[19%] top-[19%] grid place-items-center">
        <motion.div
          animate={generating && !reduceMotion
            ? { scale: [0.985, 1.015, 0.985], opacity: [0.72, 1, 0.72] }
            : { scale: 1, opacity: 1 }}
          transition={{ duration: 2.4, repeat: generating && !reduceMotion ? Infinity : 0, ease: 'easeInOut' }}
          className="relative grid aspect-[4/5] h-full max-h-full place-items-center border border-[#708076]/45 bg-[#202622]/45 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.025)]"
        >
          <span className="absolute -left-px -top-px h-5 w-5 border-l border-t border-[#9eb0a3]" />
          <span className="absolute -right-px -top-px h-5 w-5 border-r border-t border-[#9eb0a3]" />
          <span className="absolute -bottom-px -left-px h-5 w-5 border-b border-l border-[#9eb0a3]" />
          <span className="absolute -bottom-px -right-px h-5 w-5 border-b border-r border-[#9eb0a3]" />

          <div className="relative z-[1] max-w-[78%] text-center">
            <motion.div
              animate={{ rotate: generating && !reduceMotion ? 360 : 0 }}
              transition={{ duration: 7, repeat: generating && !reduceMotion ? Infinity : 0, ease: 'linear' }}
              className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-dashed border-[#819287]/55 text-[#a9b7ad]"
            >
              {generating ? <ActivityLogIcon className="h-5 w-5" /> : <CheckCircledIcon className="h-5 w-5" />}
            </motion.div>
            <p className="mt-5 font-mono text-[9px] font-bold tracking-[0.22em] text-[#9eafa3]">
              {generating ? 'COMPOSING ONE FRAME' : 'SINGLE RENDER TARGET'}
            </p>
            <p dir="rtl" className="mt-3 text-sm font-bold leading-6 text-[#e3e8e3] sm:text-base">
              {generating ? 'يُبنى الناتج الحقيقي الآن' : 'لا توجد معاينة اصطناعية'}
            </p>
            <p dir="rtl" className="mx-auto mt-2 max-w-[24ch] text-[10px] leading-5 text-[#87958b] sm:text-xs">
              {generating
                ? 'ستظهر الصورة المكتملة هنا فور انتهاء جلسة التوليد.'
                : 'هذه شاشة تقنية فقط. لن يظهر موكب أو تصميم افتراضي قبل التوليد.'}
            </p>
            {!generating ? <p className="mt-4 font-mono text-[7px] tracking-[0.2em] text-[#617167]">NO SIMULATION</p> : null}
          </div>

          <motion.span
            aria-hidden="true"
            animate={reduceMotion ? { x: 0, opacity: 0.22 } : { x: [-120, 120], opacity: [0, 0.8, 0] }}
            transition={{ duration: generating ? 1.7 : 4.8, repeat: reduceMotion ? 0 : Infinity, ease: 'easeInOut' }}
            className="absolute inset-y-0 left-1/2 w-px bg-[#9fb1a5]/55"
          />
          <motion.span
            aria-hidden="true"
            animate={reduceMotion ? { y: 0, opacity: 0.18 } : { y: [-160, 160], opacity: [0, 0.7, 0] }}
            transition={{ duration: generating ? 2.1 : 5.6, repeat: reduceMotion ? 0 : Infinity, ease: 'easeInOut' }}
            className="absolute inset-x-0 top-1/2 h-px bg-[#9fb1a5]/45"
          />
        </motion.div>
      </div>

      <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4 border-t border-[#445148] pt-3 font-mono text-[8px] tracking-[0.14em] text-[#718177] sm:text-[9px]">
        <div>
          <p>CANVAS 3200 × 4000</p>
          <p className="mt-1 text-[#9aaa9e]">PRINT {designWidth} × {designHeight} CM</p>
        </div>
        <div className="text-right">
          <p>{composition.toUpperCase()}</p>
          <div className="mt-2 flex justify-end gap-1.5" aria-label="ألوان العمل المحددة">
            {activeColors.length > 0
              ? activeColors.map((color, index) => (
                <span
                  key={`${color.hex}-${index}`}
                  className="h-2 w-2 rounded-full border border-white/15"
                  style={{ backgroundColor: color.hex }}
                />
              ))
              : <span>PALETTE PENDING</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
