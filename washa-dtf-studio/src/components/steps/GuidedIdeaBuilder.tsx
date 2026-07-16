import { AlertCircle, Ban, CheckCircle2, Heart, MessageSquareText, Sparkles, Target, Wand2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import type { GuidedIdeaBrief } from '../../types';
import { assessGuidedIdea, buildCreativeDirections, buildGuidedIdeaPrompt } from '../../lib/ideaBuilder';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';

const MOOD_OPTIONS = ['جريء وواثق', 'هادئ وفاخر', 'مرح وحيوي', 'غامض وعميق', 'حماسي وسريع', 'شاعري وحالم'];
const SUBJECT_STARTERS = ['صقر عربي', 'نخلة هندسية', 'موجة تجريدية', 'زخرفة نجدية'];

function revealAfterLayout(getElement: () => HTMLElement | null) {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      const element = getElement();
      if (!element) return;

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      element.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'center',
      });
    });
  });
}

type GuidedIdeaBuilderProps = {
  brief: GuidedIdeaBrief;
  prompt: string;
  isEnhancing: boolean;
  isStale: boolean;
  onBriefChange: (brief: GuidedIdeaBrief) => void;
  onPromptChange: (prompt: string) => void;
  onCompose: (prompt: string) => void;
  onEnhance: () => void;
};

export default function GuidedIdeaBuilder({
  brief,
  prompt,
  isEnhancing,
  isStale,
  onBriefChange,
  onPromptChange,
  onCompose,
  onEnhance,
}: GuidedIdeaBuilderProps) {
  const composeActionRef = useRef<HTMLDivElement | null>(null);
  const finalPromptRef = useRef<HTMLDivElement | null>(null);
  const revealPromptAfterComposeRef = useRef(false);
  const quality = assessGuidedIdea(brief);
  const creativeDirections = buildCreativeDirections(brief);
  const hasSubject = brief.subject.trim().length >= 3;
  const canCompose = hasSubject && Boolean(brief.direction);

  const updateField = (field: keyof GuidedIdeaBrief, value: string) => {
    onBriefChange({ ...brief, [field]: value });
  };

  const composePrompt = () => {
    const composed = buildGuidedIdeaPrompt(brief);
    if (!composed) return;

    revealPromptAfterComposeRef.current = true;
    onCompose(composed);

    if (prompt === composed) {
      revealPromptAfterComposeRef.current = false;
      revealAfterLayout(() => finalPromptRef.current);
    }
  };

  useEffect(() => {
    if (!prompt || !revealPromptAfterComposeRef.current) return;

    revealPromptAfterComposeRef.current = false;
    revealAfterLayout(() => finalPromptRef.current);
  }, [prompt]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-washa-border/45 bg-washa-ivory/85 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_16px_38px_rgba(44,36,24,0.07)] sm:p-5">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0 text-right">
            <h3 className="text-base font-bold text-washa-gold-deep">ابنِ فكرتك في أقل من دقيقة</h3>
            <p className="mt-1 text-xs leading-5 text-washa-text-sec">ابدأ بالعنصر الرئيسي، ثم أضف الطابع والمعنى.</p>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-washa-gold/15 bg-washa-gold/8 text-washa-gold">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="idea-subject" className="flex items-center justify-end gap-2 text-sm font-bold text-washa-text">
              <span>ما العنصر الرئيسي؟</span>
              <Target className="h-4 w-4 text-washa-gold" aria-hidden="true" />
            </label>
            <Input
              id="idea-subject"
              name="idea-subject"
              autoComplete="off"
              value={brief.subject}
              onChange={(event) => updateField('subject', event.target.value)}
              placeholder="مثال: صقر هندسي بجناحين مفتوحين…"
              className="h-12 rounded-xl bg-washa-bg/55 text-base"
            />
            <div className="flex flex-wrap justify-end gap-2" aria-label="اقتراحات للعناصر الرئيسية">
              {SUBJECT_STARTERS.map((subject) => (
                <button
                  key={subject}
                  type="button"
                  onClick={() => updateField('subject', subject)}
                  className="rounded-full border border-washa-border/50 bg-washa-bg/45 px-3 py-1.5 text-xs text-washa-text-sec transition-[border-color,background-color,transform] hover:border-washa-gold/40 hover:bg-washa-gold/5 hover:text-washa-gold active:scale-[0.98]"
                >
                  {subject}
                </button>
              ))}
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="flex w-full items-center justify-end gap-2 text-sm font-bold text-washa-text">
              <span>ما الطابع المطلوب؟</span>
              <Heart className="h-4 w-4 text-washa-gold" aria-hidden="true" />
            </legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {MOOD_OPTIONS.map((mood) => {
                const selected = brief.mood === mood;
                return (
                  <button
                    key={mood}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => updateField('mood', selected ? '' : mood)}
                    className={cn(
                      'min-h-11 rounded-xl border px-3 py-2 text-xs font-bold transition-[border-color,background-color,transform,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-washa-gold/40 active:scale-[0.98]',
                      selected
                        ? 'border-washa-gold bg-washa-gold text-washa-bg shadow-[0_8px_18px_rgba(44,36,24,0.12)]'
                        : 'border-washa-border/50 bg-washa-bg/45 text-washa-text-sec hover:border-washa-gold/35 hover:text-washa-gold',
                    )}
                  >
                    {mood}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="idea-meaning" className="flex items-center justify-end gap-2 text-sm font-bold text-washa-text">
                <span>ما الرسالة أو المعنى؟</span>
                <MessageSquareText className="h-4 w-4 text-washa-gold" aria-hidden="true" />
              </label>
              <Input
                id="idea-meaning"
                name="idea-meaning"
                autoComplete="off"
                value={brief.meaning}
                onChange={(event) => updateField('meaning', event.target.value)}
                placeholder="مثال: الطموح والحرية…"
                className="h-11 rounded-xl bg-washa-bg/55"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="idea-wording" className="block text-right text-sm font-bold text-washa-text">هل تريد عبارة؟ <span className="font-normal text-washa-text-faint">اختياري</span></label>
              <Input
                id="idea-wording"
                name="idea-wording"
                autoComplete="off"
                value={brief.wording}
                onChange={(event) => updateField('wording', event.target.value)}
                placeholder="مثال: حلّق عاليًا…"
                className="h-11 rounded-xl bg-washa-bg/55"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="idea-avoid" className="flex items-center justify-end gap-2 text-sm font-bold text-washa-text">
              <span>ما الذي لا تريد ظهوره؟ <span className="font-normal text-washa-text-faint">اختياري</span></span>
              <Ban className="h-4 w-4 text-washa-gold" aria-hidden="true" />
            </label>
            <Input
              id="idea-avoid"
              name="idea-avoid"
              autoComplete="off"
              value={brief.avoid}
              onChange={(event) => updateField('avoid', event.target.value)}
              placeholder="مثال: الخلفيات المزدحمة أو التفاصيل الصغيرة جدًا…"
              className="h-11 rounded-xl bg-washa-bg/55"
            />
          </div>

          {hasSubject ? (
            <motion.fieldset
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 150, damping: 22 }}
              className="space-y-3 border-t border-washa-border/35 pt-5"
            >
              <legend className="w-full text-right">
                <span className="block text-sm font-bold text-washa-text">اختر الاتجاه الإبداعي</span>
                <span className="mt-1 block text-xs leading-5 text-washa-text-sec">ثلاث رؤى مختلفة لفكرتك؛ اختر الطريقة التي تريد أن تُروى بها بصريًا.</span>
              </legend>
              <div className="grid gap-2.5 sm:grid-cols-[1.12fr_0.94fr_0.94fr]">
                {creativeDirections.map((direction, index) => {
                  const selected = brief.direction === direction.id;
                  return (
                    <motion.button
                      key={direction.id}
                      type="button"
                      aria-pressed={selected}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.06, duration: 0.28 }}
                      onClick={() => {
                        updateField('direction', direction.id);
                        revealAfterLayout(() => composeActionRef.current);
                      }}
                      className={cn(
                        'group min-h-[9.5rem] rounded-2xl border p-4 text-right transition-[border-color,background-color,transform,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-washa-gold/40 active:scale-[0.985]',
                        selected
                          ? 'border-washa-gold bg-washa-gold text-washa-bg shadow-[0_14px_30px_rgba(44,36,24,0.14)]'
                          : 'border-washa-border/50 bg-washa-bg/45 text-washa-text hover:-translate-y-0.5 hover:border-washa-gold/35 hover:bg-washa-gold/5',
                      )}
                    >
                      <span className={cn('flex items-center justify-between text-[0.68rem] font-bold', selected ? 'text-washa-bg/70' : 'text-washa-text-faint')}>
                        <span>{direction.eyebrow}</span>
                        <span dir="ltr">0{index + 1}</span>
                      </span>
                      <span className="mt-5 block font-arsenica text-xl font-bold">{direction.label}</span>
                      <span className={cn('mt-2 block text-xs leading-5', selected ? 'text-washa-bg/80' : 'text-washa-text-sec')}>
                        {direction.description}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.fieldset>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          'flex items-start gap-3 rounded-xl border px-4 py-3 text-right',
          quality.tier === 'strong'
            ? 'border-emerald-700/20 bg-emerald-700/5'
            : quality.tier === 'ready'
              ? 'border-washa-gold/20 bg-washa-gold/5'
              : 'border-amber-700/20 bg-amber-700/5',
        )}
        aria-live="polite"
      >
        {quality.tier === 'strong' ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
        ) : (
          <AlertCircle className={cn('mt-0.5 h-5 w-5 shrink-0', quality.tier === 'ready' ? 'text-washa-gold' : 'text-amber-700')} aria-hidden="true" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-washa-text">{quality.label}</p>
          <p className="mt-0.5 text-xs leading-5 text-washa-text-sec">{quality.message}</p>
          {quality.suggestions.length > 0 ? (
            <p className="mt-1 text-xs font-medium text-washa-gold-deep">التالي: {quality.suggestions[0]}</p>
          ) : null}
        </div>
      </div>

      <div ref={composeActionRef}>
        <Button
          type="button"
          variant="gold"
          onClick={composePrompt}
          disabled={!canCompose}
          className="h-12 w-full gap-2 rounded-xl text-sm"
        >
          <Wand2 className="h-4 w-4" aria-hidden="true" />
          {isStale && prompt ? 'تحديث الوصف الاحترافي' : 'صياغة الوصف الاحترافي'}
        </Button>
      </div>

      {prompt ? (
        <motion.div
          ref={finalPromptRef}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 160, damping: 22 }}
          className="space-y-3 rounded-2xl border border-washa-gold/25 bg-washa-bg/45 p-4"
        >
          {isStale ? (
            <p className="rounded-lg border border-amber-700/20 bg-amber-700/5 px-3 py-2 text-xs font-medium text-amber-800" role="status">
              عدّلت الإجابات؛ حدّث الوصف ليعكس فكرتك الحالية قبل المتابعة.
            </p>
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-washa-text-faint">يمكنك تعديل الصياغة قبل المتابعة</span>
            <h3 className="text-sm font-bold text-washa-text">الوصف النهائي</h3>
          </div>
          <Textarea
            name="guided-design-idea"
            aria-label="الوصف النهائي للتصميم"
            autoComplete="off"
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            className="min-h-32 resize-none rounded-xl bg-washa-ivory text-sm leading-7"
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={onEnhance}
              disabled={isEnhancing || !prompt.trim()}
              className="gap-2 rounded-xl"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {isEnhancing ? 'جاري التحسين…' : 'حسّن الصياغة بالذكاء الاصطناعي'}
            </Button>
            <span className="text-xs tabular-nums text-washa-text-faint">{prompt.length} حرف</span>
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}
