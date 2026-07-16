import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from '../ui/Button';

type StepNavigationBarProps = {
  onNext: () => void;
  onBack?: () => void;
  nextLabel?: string;
  backLabel?: string;
  nextDisabled?: boolean;
  hint?: ReactNode;
};

export default function StepNavigationBar({
  onNext,
  onBack,
  nextLabel = 'التالي',
  backLabel = 'رجوع',
  nextDisabled = false,
  hint,
}: StepNavigationBarProps) {
  const navigationRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const navigation = navigationRef.current;
    if (!navigation) return;

    const root = document.documentElement;
    const updateNavigationHeight = () => {
      root.style.setProperty(
        '--wizard-navigation-height',
        `${Math.ceil(navigation.getBoundingClientRect().height)}px`,
      );
    };

    updateNavigationHeight();

    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(updateNavigationHeight);
    resizeObserver?.observe(navigation);
    window.visualViewport?.addEventListener('resize', updateNavigationHeight);

    return () => {
      resizeObserver?.disconnect();
      window.visualViewport?.removeEventListener('resize', updateNavigationHeight);
      root.style.removeProperty('--wizard-navigation-height');
    };
  }, []);

  return (
    <nav
      ref={navigationRef}
      aria-label="التنقل بين خطوات التصميم"
      className="wizard-navigation-bar fixed inset-x-0 bottom-0 z-40 border-t border-washa-border/40 bg-washa-bg/90 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.6rem)] pt-2.5 shadow-[0_-12px_36px_rgba(44,36,24,0.12)] backdrop-blur-2xl sm:px-4"
    >
      <div className="mx-auto grid w-full max-w-5xl grid-cols-[auto_minmax(0,1fr)] items-end gap-2 sm:flex sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 sm:w-44">
          {onBack ? (
            <Button
              variant="ghost"
              size="lg"
              onClick={onBack}
              className="h-11 w-auto min-w-[5.5rem] gap-1.5 rounded-xl px-3 sm:gap-2"
            >
              <ChevronRight className="h-5 w-5" />
              {backLabel}
            </Button>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col items-stretch gap-1.5 sm:items-end">
          <Button
            variant="gold"
            size="lg"
            onClick={onNext}
            disabled={nextDisabled}
            className="h-11 w-full gap-2 rounded-xl px-7 text-sm disabled:cursor-not-allowed disabled:opacity-40 btn-shimmer-effect sm:w-auto"
          >
            {nextLabel}
            <ChevronLeft className="h-5 w-5" />
          </Button>
          {hint ? (
            <div className="text-center text-[11px] leading-5 text-washa-text-faint sm:text-right">
              {hint}
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
