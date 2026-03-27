import { motion, AnimatePresence } from 'motion/react';
import { Image as ImageIcon, Type, PenLine, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { useDesign } from '../../context/DesignContext';

const SUGGESTIONS = [
  { text: 'ذئب هندسي', emoji: '🐺' },
  { text: 'وردة يابانية', emoji: '🌸' },
  { text: 'جمجمة مزخرفة', emoji: '💀' },
  { text: 'أسد ملكي', emoji: '🦁' },
  { text: 'تنين ناري', emoji: '🐉' },
  { text: 'فراشة كونية', emoji: '🦋' },
];

const CALLIGRAPHY_SUGGESTIONS = [
  { text: 'لا غالب إلا الله', emoji: '✨' },
  { text: 'والفجر', emoji: '🌅' },
  { text: 'كن فيكون', emoji: '🌙' },
  { text: 'أنا من أنا', emoji: '🔥' },
  { text: 'ولكل وجهة', emoji: '🌿' },
  { text: 'صبر جميل', emoji: '🕊️' },
];

export default function StepIdea() {
  const { state, updateState, nextStep, prevStep, handleImageUpload } = useDesign();

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
    <motion.div
      key="step2"
      initial={{ opacity: 0, y: 40, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -30, scale: 0.97 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card-strong p-6 sm:p-10 space-y-10"
    >
      {/* Step Badge */}
      <div className="flex items-center justify-between">
        <div className="step-badge">
          <span className="w-1.5 h-1.5 rounded-full bg-washa-gold animate-pulse" />
          الخطوة ٢ من ٤
        </div>
      </div>

      {/* Title */}
      <div className="text-center space-y-3">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl font-serif bg-gradient-to-l from-washa-gold via-washa-gold-light to-washa-gold bg-clip-text text-transparent"
        >
          الفكرة والتصميم
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-washa-text-sec text-lg"
        >
          {state.designMethod === 'calligraphy'
            ? 'اكتب الجملة التي تريدها تصميم مخطوطة فنية'
            : 'كيف تريد أن تصمم؟ يمكنك كتابة وصف أو رفع صورة مرجعية'}
        </motion.p>
      </div>

      <div className="space-y-8">
        {/* Method Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex gap-2 p-1.5 bg-washa-bg/60 rounded-xl border border-washa-border/50 w-fit mx-auto backdrop-blur-sm"
        >
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => updateState({ designMethod: id })}
              className={cn(
                'px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-500 flex items-center gap-2',
                state.designMethod === id
                  ? 'bg-washa-gold/15 text-washa-gold shadow-[0_0_20px_rgba(201,168,106,0.1)] border border-washa-gold/20'
                  : 'text-washa-text-sec hover:text-washa-text hover:bg-washa-surface/50'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
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
              className="space-y-5"
            >
              <Textarea
                placeholder="صف فكرتك بدقة... مثال: ذئب هندسي بخطوط حادة، يرمز للقوة"
                className="min-h-[160px] text-base resize-none rounded-xl bg-washa-bg/50 border-washa-border/40 focus:border-washa-gold/50 focus:shadow-[0_0_30px_rgba(201,168,106,0.08)] transition-shadow"
                value={state.prompt}
                onChange={e => updateState({ prompt: e.target.value })}
              />
              <div className="space-y-3">
                <div className="flex items-center gap-2 justify-end text-xs text-washa-text-faint">
                  <span>أفكار ملهمة</span>
                  <Sparkles className="w-3 h-3 text-washa-gold/60" />
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {SUGGESTIONS.map((suggestion, i) => (
                    <motion.button
                      key={suggestion.text}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + i * 0.06, duration: 0.3 }}
                      onClick={() => updateState({ prompt: suggestion.text })}
                      className={cn(
                        'px-4 py-2 text-sm rounded-full border transition-all duration-400 flex items-center gap-2 card-interactive',
                        state.prompt === suggestion.text
                          ? 'border-washa-gold/50 bg-washa-gold/10 text-washa-gold'
                          : 'border-washa-border/30 text-washa-text-faint hover:text-washa-gold hover:border-washa-gold/30 bg-washa-bg/30'
                      )}
                    >
                      <span>{suggestion.emoji}</span>
                      <span>{suggestion.text}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
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
              className="space-y-5"
            >
              {/* Calligraphy Info Banner */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-washa-gold/5 border border-washa-gold/15">
                <PenLine className="w-5 h-5 text-washa-gold mt-0.5 shrink-0" />
                <div className="text-sm text-washa-text-sec leading-relaxed text-right">
                  اكتب الجملة أو الكلمة التي تريدها، وسيحوّلها الذكاء الاصطناعي إلى تصميم مخطوطة فنية احترافية على قطعتك
                </div>
              </div>

              <Textarea
                placeholder="مثال: لا غالب إلا الله ، أو والفجر ، أو اسمك ..."
                className="min-h-[140px] text-xl text-center resize-none rounded-xl bg-washa-bg/50 border-washa-border/40 focus:border-washa-gold/50 focus:shadow-[0_0_30px_rgba(201,168,106,0.08)] transition-shadow font-serif tracking-wide"
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
                  {CALLIGRAPHY_SUGGESTIONS.map((s, i) => (
                    <motion.button
                      key={s.text}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 + i * 0.06, duration: 0.3 }}
                      onClick={() => updateState({ calligraphyText: s.text })}
                      className={cn(
                        'px-4 py-2 text-sm rounded-full border transition-all duration-400 flex items-center gap-2 card-interactive font-serif',
                        state.calligraphyText === s.text
                          ? 'border-washa-gold/50 bg-washa-gold/10 text-washa-gold'
                          : 'border-washa-border/30 text-washa-text-faint hover:text-washa-gold hover:border-washa-gold/30 bg-washa-bg/30'
                      )}
                    >
                      <span>{s.emoji}</span>
                      <span>{s.text}</span>
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
              className="space-y-5"
            >
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className={cn(
                  'border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-all duration-500 bg-washa-bg/30',
                  state.referenceImage
                    ? 'border-washa-gold/30'
                    : 'border-washa-border/40 hover:border-washa-gold/40 animate-pulse-border'
                )}
              >
                {state.referenceImage ? (
                  <div className="space-y-4">
                    <div className="w-36 h-36 rounded-xl overflow-hidden border border-washa-gold/20 mx-auto shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
                      <img
                        src={`data:${state.referenceImageMimeType};base64,${state.referenceImage}`}
                        alt="Reference"
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
                    <div className="w-20 h-20 rounded-2xl bg-washa-gold/5 flex items-center justify-center mb-4 border border-washa-gold/10">
                      <ImageIcon className="w-10 h-10 text-washa-text-faint" />
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
                      <div className="bg-washa-gold/10 hover:bg-washa-gold/20 text-washa-gold px-6 py-3 rounded-xl transition-all duration-300 text-sm font-medium border border-washa-gold/20 hover:border-washa-gold/40">
                        استعراض الملفات
                      </div>
                    </label>
                  </>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm text-washa-text-sec text-right block">أضف وصفاً إضافياً (اختياري)</label>
                <Input
                  placeholder="مثال: اجعل الألوان أكثر دفئاً..."
                  value={state.prompt}
                  onChange={e => updateState({ prompt: e.target.value })}
                  className="rounded-xl bg-washa-bg/50"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={prevStep} className="gap-2 rounded-xl hover:bg-washa-gold/5">
          <ChevronRight className="w-4 h-4" /> السابق
        </Button>
        <Button variant="gold" size="lg" onClick={nextStep} className="gap-2 btn-shimmer-effect h-12 px-8 text-base rounded-xl">
          التالي <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}
