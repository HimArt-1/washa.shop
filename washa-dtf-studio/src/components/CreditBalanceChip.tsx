// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — شريحة رصيد الحصص في الهيدر
// ═══════════════════════════════════════════════════════════

import { Sparkles, Plus, Wallet, LockKeyhole } from 'lucide-react';
import { useCredits } from '../context/CreditsContext';
import { cn } from '../lib/utils';

export default function CreditBalanceChip() {
  const { status, loading, openPurchase } = useCredits();

  // المشرفون (unlimited) لا نعرض لهم عدّاداً.
  if (loading && !status) {
    return <div className="h-10 w-24 shrink-0 animate-pulse rounded-xl bg-washa-surface/60" aria-hidden />;
  }
  if (!status || status.unlimited) return null;

  if (status.blocked) {
    return (
      <div className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-3 text-xs font-bold text-red-300" title="التوليد غير متاح لهذه الفئة">
        <LockKeyhole className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">التوليد متوقف</span>
      </div>
    );
  }

  const { freeRemaining, freeLimit, paidBalance, canPurchase } = status;
  const totalRemaining = freeRemaining + paidBalance;
  const depleted = totalRemaining <= 0;
  const audienceLabel = status.audience === 'guest' ? 'تجربة' : status.audience === 'wushsha' ? 'وشّاي' : status.audience === 'booth' ? 'بوث' : 'اليوم';
  const progress = freeLimit > 0 ? Math.max(0, Math.min(100, (freeRemaining / freeLimit) * 100)) : 0;

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <div
        className={cn(
          'flex h-10 items-center gap-2 rounded-xl border px-2.5 text-sm transition-all duration-300 sm:px-3',
          depleted
            ? 'border-red-500/30 bg-red-500/5 text-red-300'
            : 'border-washa-gold/25 bg-washa-gold/5 text-washa-gold'
        )}
        title={`المتبقي المجاني اليوم: ${freeRemaining}/${freeLimit} · رصيدك المدفوع: ${paidBalance}`}
      >
        <span className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(currentColor ${progress}%, rgba(255,255,255,.08) 0)` }}>
          <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-washa-surface"><Sparkles className="h-3 w-3" /></span>
        </span>
        <span className="font-black tabular-nums leading-none">{totalRemaining}</span>
        <span className="hidden text-[10px] text-washa-text-sec sm:inline">حصة · {audienceLabel}</span>
        {paidBalance > 0 && (
          <span className="hidden items-center gap-0.5 border-r border-washa-gold/20 pr-1.5 text-[11px] text-washa-text-sec sm:flex">
            <Wallet className="h-3 w-3" />
            {paidBalance}
          </span>
        )}
      </div>

      {canPurchase && (
        <button
          onClick={openPurchase}
          className={cn(
            'flex h-10 shrink-0 items-center justify-center gap-1 rounded-xl border px-2.5 text-sm font-semibold transition-all duration-300 sm:px-3',
            depleted
              ? 'border-washa-gold/50 bg-washa-gold text-washa-bg hover:brightness-105'
              : 'border-washa-gold/20 text-washa-gold hover:border-washa-gold/40 hover:bg-washa-gold/10',
            'active:scale-[0.98]'
          )}
          title="شراء حصص إضافية"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">الباقات</span>
        </button>
      )}
    </div>
  );
}
