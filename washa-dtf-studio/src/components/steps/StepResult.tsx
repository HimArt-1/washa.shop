import { motion } from 'motion/react';
import { Wand2, Download, ChevronRight, Loader2, RotateCcw, ZoomIn, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { useDesign } from '../../context/DesignContext';

export default function StepResult() {
  const {
    mockupImage,
    extractedImage,
    isGenerating,
    isExtracting,
    error,
    handleExtract,
    handleDownload,
    setStep,
    resetDesign,
  } = useDesign();

  return (
    <motion.div
      key="step4"
      initial={{ opacity: 0, y: 40, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -30, scale: 0.97 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-8 max-w-4xl mx-auto"
    >
      {/* ===== GENERATING STATE ===== */}
      {isGenerating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card-strong p-10 sm:p-16 flex flex-col items-center justify-center text-center space-y-8 min-h-[500px]"
        >
          {/* Orbiting Loader */}
          <div className="relative w-32 h-32">
            {/* Central Logo */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-washa-gold/20 flex items-center justify-center backdrop-blur-sm border border-washa-gold/30">
                <Wand2 className="w-7 h-7 text-washa-gold animate-pulse" />
              </div>
            </div>
            {/* Orbiting Particles */}
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="orbit-particle absolute top-1/2 left-1/2 w-2.5 h-2.5 -mt-1.25 -ml-1.25 rounded-full bg-washa-gold shadow-[0_0_10px_rgba(201,168,106,0.6)]"
                style={{ animationDelay: `${-i * 0.5}s` }}
              />
            ))}
            {/* Outer Ring */}
            <div className="absolute inset-0 rounded-full border border-washa-gold/10 animate-spin" style={{ animationDuration: '8s' }} />
            <div className="absolute inset-[-10px] rounded-full border border-dashed border-washa-gold/5 animate-spin" style={{ animationDuration: '12s', animationDirection: 'reverse' }} />
          </div>

          <div className="space-y-3">
            <h3 className="text-2xl font-serif text-washa-gold animate-pulse">
              جاري تصميم الموكب...
            </h3>
            <p className="text-sm text-washa-text-faint">
              الذكاء الاصطناعي يعمل على إبداع تصميمك الفريد
            </p>
          </div>

          {/* Loading Shimmer Bar */}
          <div className="w-48 h-1 bg-washa-surface rounded-full overflow-hidden">
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="h-full w-full bg-gradient-to-r from-transparent via-washa-gold to-transparent"
            />
          </div>
        </motion.div>
      )}

      {/* ===== ERROR STATE ===== */}
      {error && !isGenerating && !mockupImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card-strong p-10 sm:p-16 flex flex-col items-center justify-center text-center space-y-6 min-h-[400px]"
        >
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
            <span className="text-4xl">⚠️</span>
          </div>
          <div className="space-y-3">
            <h3 className="text-xl font-serif text-red-400">حدث خطأ</h3>
            <p className="text-sm text-washa-text-sec max-w-md">{error}</p>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setStep(3)} className="gap-2 rounded-xl">
              <ChevronRight className="w-4 h-4" /> تعديل الخيارات
            </Button>
            <Button variant="gold" onClick={resetDesign} className="gap-2 rounded-xl">
              <RotateCcw className="w-4 h-4" /> البدء من جديد
            </Button>
          </div>
        </motion.div>
      )}

      {/* ===== RESULT STATE ===== */}
      {mockupImage && !isGenerating && (
        <>
          {/* Step Badge */}
          <div className="flex items-center justify-between">
            <div className="step-badge">
              <Sparkles className="w-3 h-3 text-washa-gold" />
              النتيجة النهائية
            </div>
          </div>

          {/* Mockup Image — Full Width */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="glass-card-strong overflow-hidden relative group"
          >
            <div className="aspect-square sm:aspect-[4/3] w-full relative">
              <img
                src={mockupImage}
                alt="Generated Mockup"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
              />
              {/* Overlay on Hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end justify-center p-8">
                <div className="flex gap-3">
                  <Button
                    variant="gold"
                    onClick={() => handleDownload(mockupImage, 'washa-mockup.png')}
                    className="gap-2 rounded-xl shadow-lg"
                  >
                    <Download className="w-4 h-4" /> تحميل الموكب
                  </Button>
                  <button
                    onClick={() => window.open(mockupImage, '_blank')}
                    className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md text-white text-sm font-medium hover:bg-white/20 transition-colors flex items-center gap-2"
                  >
                    <ZoomIn className="w-4 h-4" /> عرض كامل
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* DTF Extraction Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="glass-card-strong p-6 sm:p-8 space-y-6"
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="text-right flex-1">
                <h3 className="text-xl font-semibold text-washa-text flex items-center gap-2 justify-end">
                  <span>نموذج الطباعة المفرغ (DTF)</span>
                </h3>
                <p className="text-xs text-washa-text-faint mt-1">
                  تصميم مفرغ بدون خلفية للطباعة المباشرة بدقة عالية
                </p>
              </div>
              {extractedImage && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(extractedImage, 'washa-dtf-design.png')}
                  className="gap-2 rounded-xl"
                >
                  <Download className="w-4 h-4" /> تحميل DTF
                </Button>
              )}
            </div>

            <div className="bg-washa-bg/60 rounded-2xl border border-washa-border/30 flex items-center justify-center overflow-hidden relative group min-h-[400px] sm:min-h-[550px]">
              {/* Quality Badges */}
              {extractedImage && (
                <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
                  <div className="bg-washa-gold/20 backdrop-blur-md border border-washa-gold/50 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest text-washa-gold font-bold flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-washa-gold animate-pulse" />
                    2K Ultra Quality
                  </div>
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest text-white/70 font-medium">
                    8K Print Optimized
                  </div>
                </div>
              )}

              {/* Transparent grid background */}
              {extractedImage && (
                <div className="absolute inset-0 dtf-transparent-grid" />
              )}

              {isExtracting ? (
                <div className="flex flex-col items-center space-y-6">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-2 border-washa-gold/20 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-washa-gold animate-spin" />
                    </div>
                    <div className="absolute inset-0 rounded-full border-2 border-washa-gold/10 animate-ping" />
                  </div>
                  <p className="text-lg text-washa-text-sec animate-pulse">جاري استخراج الرسمة بدقة 2K فائقة...</p>
                </div>
              ) : extractedImage ? (
                <div className="relative w-full h-full flex items-center justify-center p-6 sm:p-10 group/dtf">
                  <img
                    src={extractedImage}
                    alt="Extracted Design"
                    className="max-w-full max-h-full object-contain relative z-10 drop-shadow-2xl transition-transform duration-500 group-hover/dtf:scale-105"
                  />
                  {/* Full size hint */}
                  <button
                    onClick={() => window.open(extractedImage, '_blank')}
                    className="absolute inset-0 z-20 bg-black/40 opacity-0 group-hover/dtf:opacity-100 transition-opacity flex items-center justify-center cursor-zoom-in rounded-2xl"
                  >
                    <span className="bg-washa-gold text-washa-bg px-5 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 shadow-lg">
                      <ZoomIn className="w-4 h-4" /> عرض بالحجم الكامل
                    </span>
                  </button>
                </div>
              ) : (
                <div className="text-center space-y-6 max-w-sm px-4">
                  <div className="w-20 h-20 rounded-2xl bg-washa-gold/8 flex items-center justify-center mx-auto border border-washa-gold/15 animate-glow-pulse">
                    <Wand2 className="w-10 h-10 text-washa-gold" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-washa-text">استخراج التصميم للطباعة</p>
                    <p className="text-sm text-washa-text-sec mt-2">
                      للحصول على نسخة عالية الدقة (2K) جاهزة للطباعة المباشرة بدون خلفية
                    </p>
                  </div>
                  <Button
                    variant="gold"
                    onClick={handleExtract}
                    className="gap-3 text-lg h-14 px-10 btn-shimmer-effect rounded-xl font-bold shadow-[0_0_30px_rgba(201,168,106,0.3)]"
                  >
                    <Wand2 className="w-5 h-5" /> استخراج التصميم
                  </Button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-2">
            <Button
              variant="ghost"
              onClick={() => setStep(3)}
              className="gap-2 rounded-xl hover:bg-washa-gold/5"
            >
              <ChevronRight className="w-4 h-4" /> تعديل الخيارات
            </Button>
            <Button variant="outline" onClick={resetDesign} className="gap-2 rounded-xl">
              <RotateCcw className="w-4 h-4" /> تصميم جديد
            </Button>
          </div>
        </>
      )}
    </motion.div>
  );
}
