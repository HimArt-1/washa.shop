import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Image as ImageIcon, Type, PenLine, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { useDesign } from '../../context/DesignContext';
import { enhanceDesignIdea } from '../../services/ideaEnhancerService';
import StepNavigationBar from './StepNavigationBar';
import GuidedIdeaBuilder from './GuidedIdeaBuilder';
import { buildGuidedIdeaPrompt, createEmptyGuidedIdeaBrief, isGuidedIdeaStale } from '../../lib/ideaBuilder';

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

export default function StepIdea() {
  const { state, updateState, nextStep, prevStep, handleImageUpload, showToast } = useDesign();
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
        ? 'ارفع صورة مرجعية للمتابعة'
        : ideaEntryMode === 'guided'
          ? guidedIdeaStale && state.prompt
            ? 'حدّث الوصف ليعكس التعديلات الأخيرة'
            : 'أكمل الفكرة ثم اضغط «صياغة الوصف الاحترافي»'
          : 'اكتب وصفًا قصيرًا على الأقل للمتابعة';

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
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -30, scale: 0.97 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="glass-card-strong wizard-panel"
      >
      {/* Step Badge */}
      <div className="flex items-center justify-between">
        <div className="step-badge">
          <span className="w-1.5 h-1.5 rounded-full bg-washa-gold animate-pulse" />
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
                      autoComplete="off"
                      placeholder="مثال: ذئب هندسي بخطوط حادة يرمز للقوة…"
                      className="min-h-[150px] resize-none rounded-2xl border-washa-border/40 bg-washa-bg/50 p-4 text-base leading-7 transition-[border-color,box-shadow] focus:border-washa-gold/50"
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
                className="min-h-[120px] resize-none rounded-xl border-washa-border/40 bg-washa-bg/50 text-center font-serif text-lg tracking-wide transition-shadow focus:border-washa-gold/50 focus:shadow-[0_0_30px_rgba(64,48,40,0.08)]"
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
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className={cn(
                  'flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-washa-bg/30 p-6 text-center transition-[border-color,background-color] duration-300',
                  state.referenceImage
                    ? 'border-washa-gold/30'
                    : 'border-washa-border/40 hover:border-washa-gold/40 animate-pulse-border'
                )}
              >
                {state.referenceImage ? (
                  <div className="space-y-4">
                    <div className="mx-auto h-28 w-28 overflow-hidden rounded-xl border border-washa-gold/20 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
                      <img
                        src={`data:${state.referenceImageMimeType};base64,${state.referenceImage}`}
                        alt="الصورة المرجعية"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateState({ referenceImage: null, referenceImageMimeType: null })
                      }
                      className="rounded-lg"
                    >
                      تغيير الصورة
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-washa-gold/10 bg-washa-gold/5">
                      <ImageIcon className="h-8 w-8 text-washa-text-faint" />
                    </div>
                    <p className="text-sm text-washa-text-sec mb-4">
                      اسحب وأفلت الصورة هنا أو انقر للرفع
                    </p>
                    <Input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="image-upload"
                      onChange={handleImageUpload}
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <div className="rounded-xl border border-washa-gold/20 bg-washa-gold/10 px-5 py-2.5 text-sm font-medium text-washa-gold transition-[border-color,background-color] duration-300 hover:border-washa-gold/40 hover:bg-washa-gold/20">
                        استعراض الملفات
                      </div>
                    </label>
                  </>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm text-washa-text-sec text-right block">أضف وصفاً إضافياً (اختياري)</label>
                <Input
                  placeholder="مثال: اجعل الألوان أكثر دفئًا…"
                  value={state.prompt}
                  onChange={e => updateState({ prompt: e.target.value })}
                  className="rounded-xl bg-washa-bg/50"
                />
              </div>
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
