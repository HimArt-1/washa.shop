// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — شريحة رصيد الحصص في الهيدر
// ═══════════════════════════════════════════════════════════

import { Sparkles, Plus, Wallet } from 'lucide-react';
import { useCredits } from '../context/CreditsContext';
import { cn } from '../lib/utils';

export default function CreditBalanceChip() {
  const { status, loading, openPurchase } = useCredits();

  // المشرفون (unlimited) لا نعرض لهم عدّاداً.
  if (loading && !status) {
    return <div className="h-10 w-24 shrink-0 animate-pulse rounded-xl bg-washa-surface/60" aria-hidden />;
  }
  if (!status || status.unlimited || status.blocked) return null;

  const { freeRemaining, freeLimit, paidBalance, canPurchase } = status;
  const totalRemaining = freeRemaining + paidBalance;
  const depleted = totalRemaining <= 0;

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-sm transition-colors sm:px-3',
          depleted
            ? 'border-red-500/30 bg-red-500/5 text-red-300'
            : 'border-washa-gold/25 bg-washa-gold/5 text-washa-gold'
        )}
        title={`المتبقي المجاني اليوم: ${freeRemaining}/${freeLimit} · رصيدك المدفوع: ${paidBalance}`}
      >
        <Sparkles className="h-4 w-4 shrink-0" />
        <span className="font-bold tabular-nums leading-none">{totalRemaining}</span>
        <span className="hidden text-[11px] text-washa-text-sec sm:inline">حصة</span>
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
              ? 'border-washa-gold/50 bg-washa-gold text-washa-bg shadow-[0_0_20px_rgba(200,161,90,0.35)] hover:brightness-110'
              : 'border-washa-gold/20 text-washa-gold hover:border-washa-gold/40 hover:bg-washa-gold/10'
          )}
          title="شراء حصص إضافية"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">شراء حصص</span>
        </button>
      )}
    </div>
  );
}
