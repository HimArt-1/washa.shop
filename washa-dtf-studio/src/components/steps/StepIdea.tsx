import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Focus, Image as ImageIcon, Loader2, Palette, PenLine, RefreshCw, Sparkles, Type, Wand2, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { useDesign } from '../../context/DesignContext';
import { enhanceDesignIdea } from '../../services/ideaEnhancerService';
import StepNavigationBar from './StepNavigationBar';
import GuidedIdeaBuilder from './GuidedIdeaBuilder';
import { buildGuidedIdeaPrompt, createEmptyGuidedIdeaBrief, isGuidedIdeaStale } from '../../lib/ideaBuilder';
import { REFERENCE_IMAGE_MODES } from '../../lib/referenceImage';
import type { ReferenceImageMode } from '../../types';
import { focusStudioPromptInput } from '../../lib/structuredErrorActions';

const SUGGESTIONS = [
  'ذئب هندسي',
  'وردة يابانية',
  'جمجمة مزخرفة',
  'أسد ملكي',
  'تنين ناري',
  'فراشة كونية',
];

const CALLIGRAPHY_SUGGESTIONS = [
  'لا غالب إلا الله',
  'والفجر',
  'كن فيكون',
  'أنا من أنا',
  'ولكل وجهة',
  'صبر جميل',
];

const REFERENCE_MODE_ICONS = {
  reinterpret: RefreshCw,
  preserve_subject: Focus,
  style_inspiration: Palette,
} satisfies Record<ReferenceImageMode, typeof RefreshCw>;

export default function StepIdea() {
  const {
    state,
    updateState,
    nextStep,
    prevStep,
    handleImageUpload,
    showToast,
    promptFieldError,
    promptFocusRequestId,
  } = useDesign();
  const [isEnhancingIdea, setIsEnhancingIdea] = useState(false);
  const ideaEntryMode = state.ideaEntryMode ?? (state.prompt && !state.ideaBrief ? 'free' : 'guided');
  const ideaBrief = state.ideaBrief ?? createEmptyGuidedIdeaBrief();
  const guidedIdeaStale = isGuidedIdeaStale(ideaBrief, state.ideaBriefPromptSource);
  const hasUsefulPrompt = state.prompt.trim().length >= 3;
  const canProceed = state.designMethod === 'calligraphy'
    ? Boolean(state.calligraphyText.trim())
    : state.designMethod === 'image'
      ? Boolean(state.referenceImage)
      : hasUsefulPrompt && (ideaEntryMode !== 'guided' || !guidedIdeaStale);
  const nextHint = canProceed
    ? 'فكرتك محفوظة ويمكن تعديلها لاحقًا'
    : state.designMethod === 'calligraphy'
      ? 'اكتب العبارة التي تريد تصميمها'
      : state.designMethod === 'image'
        ? 'ارفع صورة مرجعية، ثم اختر طريقة الاستفادة منها'
        : ideaEntryMode === 'guided'
          ? guidedIdeaStale && state.prompt
            ? 'حدّث الوصف ليعكس التعديلات الأخيرة'
            : 'أكمل الفكرة ثم اضغط «صياغة الوصف الاحترافي»'
          : 'اكتب وصفًا قصيرًا على الأقل للمتابعة';

  useEffect(() => {
    if (!promptFocusRequestId) return;
    const frame = window.requestAnimationFrame(() => {
      focusStudioPromptInput(
        () => document.querySelector<HTMLTextAreaElement>(
          '[data-washa-prompt-input="true"]',
        ),
      );
    });
    return () => window.cancelAnimationFrame(frame);
  }, [promptFocusRequestId]);

  const handleEnhanceIdea = async () => {
    const idea = state.prompt.trim();
    if (!idea || isEnhancingIdea) return;

    setIsEnhancingIdea(true);
    try {
      const result = await enhanceDesignIdea({
        idea,
        garmentType: state.garmentType,
        style: state.style,
        technique: state.technique,
        palette: state.palette,
      });

      if (result.enhancedIdea) {
        updateState({ prompt: result.enhancedIdea });
        showToast(result.source === 'ai' ? 'تم تحسين الفكرة بالذكاء الاصطناعي' : 'تم تحسين الفكرة محلياً', result.source === 'ai' ? 'success' : 'info');
      }
    } catch {
      showToast('تعذر تحسين الفكرة الآن', 'error');
    } finally {
      setIsEnhancingIdea(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const fakeEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
    handleImageUpload(fakeEvent);
  };

  const tabs = [
    { id: 'text', label: 'وصف فكرة', icon: Type },
    { id: 'calligraphy', label: 'مخطوطة', icon: PenLine },
    { id: 'image', label: 'صورة مرجعية', icon: ImageIcon },
  ] as const;

  return (
    <>
      <motion.div
        key="step2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="glass-card-strong wizard-panel"
      >
      {/* Step Badge */}
      <div className="flex items-center justify-between">
        <div className="step-badge">
          <span className="h-1.5 w-1.5 rounded-full bg-washa-gold" aria-hidden="true" />
          الخطوة ٢ من ٦
        </div>
      </div>

      {/* Title */}
      <div className="text-center space-y-2">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="step-title-heading bg-gradient-to-l from-washa-gold via-washa-gold-light to-washa-gold bg-clip-text text-transparent"
        >
          الفكرة والتصميم
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="wizard-copy text-washa-text-sec"
        >
          {state.designMethod === 'calligraphy'
            ? 'اكتب الجملة التي تريدها تصميم مخطوطة فنية'
            : 'كيف تريد أن تصمم؟ يمكنك كتابة وصف أو رفع صورة مرجعية'}
        </motion.p>
      </div>

      <div className="space-y-6">
        {/* Method Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mx-auto flex w-fit flex-wrap gap-1.5 rounded-2xl border border-washa-border/30 bg-washa-bg/40 p-1.5 backdrop-blur-md"
        >
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={state.designMethod === id}
              onClick={() => updateState({ designMethod: id })}
              className={cn(
                'group/tab relative flex items-center gap-2 overflow-hidden rounded-xl px-4 py-2 text-sm font-bold transition-[background-color,color,transform] duration-300',
                state.designMethod === id
                  ? 'text-washa-bg'
                  : 'text-washa-text-sec hover:text-white hover:bg-white/5'
              )}
            >
              {state.designMethod === id && (
                <motion.div
                  layoutId="active-tab"
                  className="absolute inset-0 bg-washa-gold shadow-[0_0_20px_rgba(64,48,40,0.3)]"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <Icon className={cn(
                "w-4 h-4 relative z-10 transition-transform duration-500",
                state.designMethod === id ? "scale-110" : "group-hover/tab:scale-110"
              )} />
              <span className="relative z-10">{label}</span>
            </button>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          {/* Text Description */}
          {state.designMethod === 'text' && (
            <motion.div
              key="text"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-1 rounded-xl border border-washa-border/35 bg-washa-bg/55 p-1" aria-label="طريقة كتابة الفكرة">
                <button
                  type="button"
                  aria-pressed={ideaEntryMode === 'guided'}
                  onClick={() => updateState({ ideaEntryMode: 'guided' })}
                  className={cn(
                    'min-h-10 rounded-lg px-3 py-2 text-sm font-bold transition-[background-color,color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-washa-gold/40 active:scale-[0.98]',
                    ideaEntryMode === 'guided' ? 'bg-washa-gold text-washa-bg shadow-sm' : 'text-washa-text-sec hover:text-washa-gold',
                  )}
                >
                  مساعد الفكرة
                </button>
                <button
                  type="button"
                  aria-pressed={ideaEntryMode === 'free'}
                  onClick={() => updateState({ ideaEntryMode: 'free' })}
                  className={cn(
                    'min-h-10 rounded-lg px-3 py-2 text-sm font-bold transition-[background-color,color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-washa-gold/40 active:scale-[0.98]',
                    ideaEntryMode === 'free' ? 'bg-washa-gold text-washa-bg shadow-sm' : 'text-washa-text-sec hover:text-washa-gold',
                  )}
                >
                  كتابة حرة
                </button>
              </div>

              <AnimatePresence mode="wait">
                {ideaEntryMode === 'guided' ? (
                  <motion.div key="guided-entry" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                    <GuidedIdeaBuilder
                      brief={ideaBrief}
                      prompt={state.prompt}
                      promptError={promptFieldError}
                      isEnhancing={isEnhancingIdea}
                      isStale={guidedIdeaStale}
                      onBriefChange={(ideaBrief) => updateState({ ideaBrief })}
                      onPromptChange={(prompt) => updateState({ prompt })}
                      onCompose={(prompt) => updateState({ prompt, ideaBriefPromptSource: buildGuidedIdeaPrompt(ideaBrief) })}
                      onEnhance={() => void handleEnhanceIdea()}
                    />
                  </motion.div>
                ) : (
                  <motion.div key="free-entry" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-4">
                    <Textarea
                      name="design-idea"
                      aria-label="وصف فكرة التصميم"
                      aria-invalid={promptFieldError}
                      data-washa-prompt-input="true"
                      autoComplete="off"
                      placeholder="مثال: ذئب هندسي بخطوط حادة يرمز للقوة…"
                      className={cn(
                        'min-h-[150px] resize-none rounded-2xl border-washa-border/40 bg-washa-bg/50 p-4 text-base leading-7 transition-[border-color,box-shadow] focus:border-washa-gold/50',
                        promptFieldError && 'border-red-500/70 ring-2 ring-red-500/20',
                      )}
                      value={state.prompt}
                      onChange={(event) => updateState({ prompt: event.target.value })}
                    />
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleEnhanceIdea}
                        disabled={!state.prompt.trim() || isEnhancingIdea}
                        className="gap-2 rounded-xl border-washa-gold/25 bg-washa-gold/5 text-washa-gold hover:bg-washa-gold/10"
                      >
                        {isEnhancingIdea ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                        {isEnhancingIdea ? 'جاري التحسين…' : 'حسّن الفكرة'}
                      </Button>
                      <span className="text-xs tabular-nums text-washa-text-faint">{state.prompt.length ? `${state.prompt.length} حرف` : 'اكتب فكرتك بأسلوبك'}</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-end gap-2 text-xs text-washa-text-faint">
                        <span>أفكار للبدء</span>
                        <Sparkles className="h-3 w-3 text-washa-gold/60" aria-hidden="true" />
                      </div>
                      <div className="flex flex-wrap justify-center gap-2">
                        {SUGGESTIONS.map((suggestion, index) => (
                          <motion.button
                            key={suggestion}
                            type="button"
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.04, duration: 0.25 }}
                            onClick={() => updateState({ prompt: suggestion })}
                            className={cn(
                              'rounded-full border px-3 py-1.5 text-sm transition-[border-color,background-color,transform] active:scale-[0.98]',
                              state.prompt === suggestion
                                ? 'border-washa-gold/50 bg-washa-gold/10 text-washa-gold'
                                : 'border-washa-border/40 bg-washa-bg/40 text-washa-text-sec hover:border-washa-gold/30 hover:text-washa-gold',
                            )}
                          >
                            {suggestion}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Calligraphy Design */}
          {state.designMethod === 'calligraphy' && (
            <motion.div
              key="calligraphy"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
              className="space-y-4"
            >
              {/* Calligraphy Info Banner */}
              <div className="flex items-start gap-3 rounded-xl border border-washa-gold/15 bg-washa-gold/5 p-3.5">
                <PenLine className="w-5 h-5 text-washa-gold mt-0.5 shrink-0" />
                <div className="text-sm text-washa-text-sec leading-relaxed text-right">
                  اكتب الجملة أو الكلمة التي تريدها، وسيحوّلها الذكاء الاصطناعي إلى تصميم مخطوطة فنية احترافية على قطعتك
                </div>
              </div>

              <Textarea
                placeholder="مثال: لا غالب إلا الله، أو والفجر، أو اسمك…"
                aria-invalid={promptFieldError}
                data-washa-prompt-input="true"
                className={cn(
                  'min-h-[120px] resize-none rounded-xl border-washa-border/40 bg-washa-bg/50 text-center font-serif text-lg tracking-wide transition-shadow focus:border-washa-gold/50 focus:shadow-[0_0_30px_rgba(64,48,40,0.08)]',
                  promptFieldError && 'border-red-500/70 ring-2 ring-red-500/20',
                )}
                value={state.calligraphyText}
                onChange={e => updateState({ calligraphyText: e.target.value })}
                dir="auto"
              />

              {/* Character count */}
              <div className="flex justify-end">
                <span className={cn(
                  'text-xs tabular-nums transition-colors',
                  state.calligraphyText.length > 60 ? 'text-amber-400' : 'text-washa-text-faint'
                )}>
                  {state.calligraphyText.length} / 80
                </span>
              </div>

              {/* Calligraphy Suggestions */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 justify-end text-xs text-washa-text-faint">
                  <span>أمثلة ملهمة</span>
                  <Sparkles className="w-3 h-3 text-washa-gold/60" />
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {CALLIGRAPHY_SUGGESTIONS.map((suggestion, i) => (
                    <motion.button
                      key={suggestion}
                      type="button"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 + i * 0.06, duration: 0.3 }}
                      onClick={() => updateState({ calligraphyText: suggestion })}
                      className={cn(
                        'card-interactive flex items-center gap-2 rounded-full border px-3 py-1.5 font-serif text-sm transition-[border-color,background-color,transform]',
                        state.calligraphyText === suggestion
                          ? 'border-washa-gold/50 bg-washa-gold/10 text-washa-gold'
                          : 'border-washa-border/30 text-washa-text-faint hover:text-washa-gold hover:border-washa-gold/30 bg-washa-bg/30'
                      )}
                    >
                      <span>{suggestion}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Image Reference */}
          {state.designMethod === 'image' && (
            <motion.div
              key="image"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
              className="space-y-4"
            >
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                id="image-upload"
                onChange={handleImageUpload}
              />
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className={cn(
                  'rounded-2xl border bg-washa-bg/30 text-center transition-[border-color,background-color] duration-300',
                  state.referenceImage
                    ? 'border-washa-gold/25 p-3 sm:p-4'
                    : 'flex min-h-64 flex-col items-center justify-center border-dashed border-washa-border/45 p-6 hover:border-washa-gold/45 animate-pulse-border'
                )}
              >
                {state.referenceImage ? (
                  <div className="grid gap-4 text-right lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
                    <div className="relative min-h-64 overflow-hidden rounded-xl border border-washa-border/35 bg-[#f5efe4] shadow-[0_16px_34px_rgba(64,48,40,0.10)]">
                      <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full border border-white/60 bg-white/85 px-2.5 py-1 text-[11px] font-bold text-washa-text-sec backdrop-blur-md">
                        <CheckCircle2 className="h-3.5 w-3.5 text-washa-gold" aria-hidden="true" />
                        جاهزة للتحليل
                      </div>
                      <img
                        src={`data:${state.referenceImageMimeType};base64,${state.referenceImage}`}
                        alt="معاينة الصورة المرجعية المرفوعة"
                        className="h-full min-h-64 w-full object-contain p-3"
                      />
                      <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2">
                        <label htmlFor="image-upload" className="cursor-pointer rounded-lg border border-white/60 bg-white/90 px-3 py-2 text-xs font-bold text-washa-text shadow-sm backdrop-blur-md transition-colors hover:text-washa-gold">
                          استبدال الصورة
                        </label>
                        <button
                          type="button"
                          onClick={() => updateState({ referenceImage: null, referenceImageMimeType: null })}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/60 bg-white/90 text-washa-text-sec shadow-sm backdrop-blur-md transition-colors hover:text-red-700 active:scale-[0.98]"
                          aria-label="حذف الصورة المرجعية"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <h3 className="text-sm font-black text-washa-text">كيف تريد الاستفادة من المرجع؟</h3>
                        <p className="mt-1 text-xs leading-5 text-washa-text-faint">اختيارك يغيّر طريقة تحليل الصورة وبناء العمل الفني.</p>
                      </div>
                      <div className="divide-y divide-washa-border/30 overflow-hidden rounded-xl border border-washa-border/40 bg-white/55" role="radiogroup" aria-label="طريقة استخدام الصورة المرجعية">
                        {REFERENCE_IMAGE_MODES.map((mode) => {
                          const isSelected = (state.referenceImageMode ?? 'reinterpret') === mode.id;
                          const ModeIcon = REFERENCE_MODE_ICONS[mode.id];
                          return (
                            <button
                              key={mode.id}
                              type="button"
                              role="radio"
                              aria-checked={isSelected}
                              onClick={() => updateState({ referenceImageMode: mode.id })}
                              className={cn(
                                'grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-3 text-right transition-[background-color,color,transform] active:scale-[0.99]',
                                isSelected ? 'bg-washa-gold/[0.10]' : 'hover:bg-washa-gold/[0.05]',
                              )}
                            >
                              <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg border', isSelected ? 'border-washa-gold/35 bg-washa-gold/15 text-washa-gold-deep' : 'border-washa-border/40 bg-washa-ivory text-washa-text-faint')}>
                                <ModeIcon className="h-4 w-4" aria-hidden="true" />
                              </span>
                              <span className="min-w-0">
                                <span className="block text-sm font-bold text-washa-text">{mode.title}</span>
                                <span className="mt-0.5 block text-[11px] leading-5 text-washa-text-sec">{mode.description}</span>
                              </span>
                              <span className={cn('rounded-full px-2 py-1 text-[10px] font-bold', isSelected ? 'bg-washa-gold text-washa-bg' : 'bg-washa-bg/70 text-washa-text-faint')}>
                                {mode.badge}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-washa-gold/10 bg-washa-gold/5">
                      <ImageIcon className="h-8 w-8 text-washa-text-faint" />
                    </div>
                    <p className="text-sm text-washa-text-sec mb-4">
                      اسحب وأفلت الصورة هنا أو انقر للرفع
                    </p>
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <div className="rounded-xl border border-washa-gold/20 bg-washa-gold/10 px-5 py-2.5 text-sm font-medium text-washa-gold transition-[border-color,background-color] duration-300 hover:border-washa-gold/40 hover:bg-washa-gold/20">
                        استعراض الملفات
                      </div>
                    </label>
                    <p className="mt-3 text-[11px] text-washa-text-faint">PNG أو JPG أو WebP · حتى 15 ميجابايت</p>
                  </>
                )}
              </div>
              {state.referenceImage && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-end justify-between gap-3">
                      <span className="text-xs tabular-nums text-washa-text-faint">{state.prompt.length ? `${state.prompt.length} حرف` : 'اختياري'}</span>
                      <label htmlFor="reference-transformation" className="block text-sm font-bold text-washa-text">صف التحويل الذي تريده</label>
                    </div>
                    <Textarea
                      id="reference-transformation"
                      aria-label="وصف تحويل الصورة المرجعية"
                      aria-invalid={promptFieldError}
                      data-washa-prompt-input="true"
                      placeholder="مثال: حوّل العنصر الرئيسي إلى رسم هندسي نظيف، واحتفظ بحركته، واستخدم لونين فقط دون خلفية…"
                      value={state.prompt}
                      onChange={(event) => updateState({ prompt: event.target.value })}
                      className={cn(
                        'min-h-28 resize-none rounded-xl border-washa-border/40 bg-washa-bg/45 p-4 leading-7 focus:border-washa-gold/50',
                        promptFieldError && 'border-red-500/70 ring-2 ring-red-500/20',
                      )}
                    />
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-washa-text-faint">
                      {['تحليل العنصر', 'تنظيف الخلفية', 'تهيئة للطباعة'].map((item) => (
                        <span key={item} className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-washa-gold" aria-hidden="true" />
                          {item}
                        </span>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleEnhanceIdea}
                      disabled={!state.prompt.trim() || isEnhancingIdea}
                      className="gap-2 rounded-xl border-washa-gold/25 bg-washa-gold/5 text-washa-gold hover:bg-washa-gold/10"
                    >
                      {isEnhancingIdea ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                      {isEnhancingIdea ? 'جاري التحسين…' : 'حسّن توجيه التحويل'}
                    </Button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      </motion.div>
      <StepNavigationBar
        onBack={prevStep}
        backLabel="السابق"
        onNext={nextStep}
        nextDisabled={!canProceed}
        hint={nextHint}
      />
    </>
  );
}
