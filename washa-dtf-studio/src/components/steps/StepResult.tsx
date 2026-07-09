import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wand2, Download, ChevronRight, Loader2, RotateCcw,
  ZoomIn, Sparkles, ShoppingBag, CheckCircle2, X, FileCheck,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { useDesign } from '../../context/DesignContext';
import { cn } from '../../lib/utils';
import { LIGHT_GARMENT_COLORS } from '../../types';

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

// ── Terms & Conditions Modal ──────────────────────────────────
function TermsModal({
  onAccept,
  onClose,
  isSubmitting,
}: {
  onAccept: () => void;
  onClose: () => void;
  isSubmitting: boolean;
}) {
  const [agreed, setAgreed] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !isSubmitting) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.96 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="glass-card-strong flex max-h-[90vh] w-full max-w-lg flex-col space-y-5 rounded-2xl p-5 sm:p-6"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-washa-gold">
              <FileCheck className="w-5 h-5" />
              <span className="font-bold text-lg">الشروط والأحكام</span>
            </div>
            <p className="text-xs text-washa-text-faint">يرجى القراءة والموافقة قبل إرسال طلبك</p>
          </div>
          {!isSubmitting && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-washa-text-faint hover:text-washa-text hover:bg-washa-surface/60 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Terms content */}
        <div className="flex-1 space-y-3 overflow-y-auto pr-1 text-sm leading-relaxed text-washa-text-sec scrollbar-thin">
          {[
            {
              title: 'طبيعة الطلب',
              body: 'هذا الطلب مبني على تصميم تم توليده بالذكاء الاصطناعي في استوديو وشّى DTF. يُعدّ الموكب المُولَّد مرجعًا تقريبيًا، والمنتج النهائي قد يختلف طفيفًا في الألوان أو التفاصيل.',
            },
            {
              title: 'الطباعة والجودة',
              body: 'تُطبَع التصاميم بتقنية DTF (طباعة مباشرة على الفيلم) بدقة عالية. الألوان الفعلية قد تتفاوت بين الشاشة والمنتج المطبوع بسبب اختلاف معايير الألوان.',
            },
            {
              title: 'التنفيذ والتسليم',
              body: 'بعد إضافة التصميم إلى السلة وإتمام الطلب، يتولى فريق وشّى تنفيذ الطباعة والتجهيز. مدة التنفيذ المعتادة 3–7 أيام عمل حسب الضغط ونوع القطعة.',
            },
            {
              title: 'حقوق التصميم',
              body: 'بإرسال هذا الطلب، تُقرّ بأن التصميم المُولَّد لا يُنتهك حقوق الملكية الفكرية لأطراف ثالثة. وشّى غير مسؤولة عن أي محتوى يتعارض مع حقوق النشر أو العلامات التجارية.',
            },
            {
              title: 'الدفع والإلغاء',
              body: 'سيُضاف التصميم إلى السلة بسعره المحتسب من إعدادات القطعة والطباعة المعتمدة، ويمكنك مراجعة الطلب في صفحة الدفع قبل الإتمام. لأي تعديل لاحق يُرجى التواصل مع الدعم.',
            },
          ].map((item, i) => (
            <div key={i} className="space-y-1.5 rounded-xl border border-washa-border/20 bg-washa-bg/40 p-3.5">
              <p className="font-semibold text-washa-text text-sm">{i + 1}. {item.title}</p>
              <p className="text-washa-text-faint text-xs leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>

        {/* Agreement checkbox */}
        <label className="flex items-start gap-3 cursor-pointer group">
          <div className={cn(
            'mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all duration-200',
            agreed
              ? 'bg-washa-gold border-washa-gold'
              : 'border-washa-border/50 group-hover:border-washa-gold/40'
          )}>
            {agreed && <CheckCircle2 className="w-3.5 h-3.5 text-washa-bg" />}
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="sr-only"
            />
          </div>
          <span className="text-sm text-washa-text-sec leading-relaxed">
            أقرّ بقراءة الشروط والأحكام أعلاه وأوافق عليها بالكامل
          </span>
        </label>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          {!isSubmitting && (
            <Button
              variant="ghost"
              onClick={onClose}
              className="flex-1 rounded-xl"
            >
              رجوع
            </Button>
          )}
          <Button
            variant="gold"
            onClick={onAccept}
            disabled={!agreed || isSubmitting}
            className="flex-1 gap-2 rounded-xl btn-shimmer-effect h-12 font-bold"
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> جاري الإضافة...</>
            ) : (
              <><ShoppingBag className="w-4 h-4" /> تأكيد وإضافة للسلة</>
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Order Success State ───────────────────────────────────────
function OrderSuccessCard({
  itemTitle,
  price,
  onReset,
}: {
  itemTitle: string;
  price: number;
  onReset: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card-strong flex flex-col items-center space-y-5 p-6 text-center sm:p-8"
    >
      {/* Animated checkmark */}
      <div className="relative">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-washa-gold/25 bg-washa-gold/10">
          <CheckCircle2 className="h-10 w-10 text-washa-gold" />
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-washa-gold/20 animate-ping" style={{ animationDuration: '2s' }} />
      </div>

      <div className="space-y-3">
        <h3 className="text-xl font-bold text-washa-gold">تمت إضافة التصميم إلى السلة</h3>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-washa-gold/10 border border-washa-gold/20">
          <span className="text-xs text-washa-text-faint">السعر</span>
          <span className="text-lg font-black text-washa-gold">{price.toFixed(2)} ر.س</span>
        </div>
        <p className="text-sm text-washa-text-sec max-w-sm leading-relaxed">
          أصبح تصميمك الآن عنصرًا مخصصًا داخل السلة. يمكنك متابعة الدفع الآن أو العودة لتصميم قطعة جديدة.
        </p>
        <p className="text-xs text-washa-text-faint max-w-sm mx-auto">{itemTitle}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-sm text-center">
        {[
          { icon: '🛒', label: 'في السلة الآن', time: 'جاهز للمراجعة' },
          { icon: '💳', label: 'إتمام الطلب', time: 'من صفحة الدفع' },
          { icon: '🎨', label: 'التنفيذ والطباعة', time: 'بعد الإتمام' },
        ].map((step, i) => (
          <div key={i} className="rounded-xl p-3 bg-washa-bg/40 border border-washa-border/20 space-y-1">
            <span className="text-xl">{step.icon}</span>
            <p className="text-[11px] font-medium text-washa-text">{step.label}</p>
            <p className="text-[10px] text-washa-text-faint">{step.time}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href="/checkout"
          className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-washa-gold text-washa-bg font-bold text-base shadow-[0_0_24px_rgba(64,48,40,0.3)] hover:shadow-[0_0_36px_rgba(64,48,40,0.45)] transition-shadow"
        >
          <ShoppingBag className="w-5 h-5" /> إتمام الطلب
        </a>
        <Button variant="outline" onClick={onReset} className="gap-2 rounded-xl">
          <RotateCcw className="w-4 h-4" /> إنشاء تصميم جديد
        </Button>
      </div>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function StepResult() {
  const {
    mockupImage,
    isGenerating,
    error,
    handleDownload,
    setStep,
    resetDesign,
    isSubmittingOrder,
    orderResult,
    submitOrder,
    state,
  } = useDesign();

  const [showTerms, setShowTerms] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Derived garment color for ambient preview
  const garmentHex   = state.garmentColorHex || '#111111';
  const garmentRgb   = hexToRgb(garmentHex);
  const isLightColor = LIGHT_GARMENT_COLORS.includes(state.garmentColor);

  const handleConfirmOrder = () => setShowTerms(true);
  const handleEditOptions = () => setStep(5);
  const handleAcceptTerms = async () => {
    const success = await submitOrder();
    if (success) setShowTerms(false);
  };

  return (
    <>
      {/* Terms Modal */}
      <AnimatePresence>
        {showTerms && (
          <TermsModal
            onAccept={handleAcceptTerms}
            onClose={() => !isSubmittingOrder && setShowTerms(false)}
            isSubmitting={isSubmittingOrder}
          />
        )}
      </AnimatePresence>

      {/* ── Lightbox Modal ── */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md cursor-zoom-out"
            onClick={() => setLightboxImage(null)}
          >
            <motion.img
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              src={lightboxImage}
              alt="Full view"
              className="max-w-[92vw] max-h-[90vh] object-contain rounded-xl shadow-2xl cursor-default"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/20 transition-colors border border-white/15"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="absolute bottom-5 flex gap-3">
              <button
                onClick={(e) => { e.stopPropagation(); handleDownload(lightboxImage, 'washa-mockup.png'); }}
                className="px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-md text-white text-sm font-medium hover:bg-white/20 transition-colors flex items-center gap-2 border border-white/15"
              >
                <Download className="w-4 h-4" /> تحميل
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        key="step4"
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -30, scale: 0.97 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto max-w-3xl space-y-6"
      >
        {/* ===== GENERATING STATE ===== */}
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card-strong relative flex min-h-[420px] flex-col items-center justify-center space-y-7 overflow-hidden p-8 text-center sm:p-12"
          >
            {/* AI Radar Background Effect - Center Focused */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] aspect-square animate-slow-spin bg-[conic-gradient(from_0deg,transparent_0deg,transparent_340deg,rgba(64,48,40,0.15)_360deg)] opacity-60" />
              <div className="absolute inset-0 bg-gradient-to-t from-washa-bg via-transparent to-transparent" />
            </div>

            <div className="relative">
              <div className="relative flex h-32 w-32 items-center justify-center">
                {/* Core Icon */}
                <div className="relative z-20 flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-washa-gold shadow-[0_0_50px_rgba(64,48,40,0.4)]">
                  <Wand2 className="h-8 w-8 animate-pulse text-washa-bg" />
                </div>
                
                {/* Orbital Rings */}
                <div className="absolute inset-0 rounded-full border border-washa-gold/20 animate-slow-spin" style={{ animationDuration: '8s' }} />
                <div className="absolute inset-4 rounded-full border border-dashed border-washa-gold/10 animate-slow-spin" style={{ animationDuration: '12s', animationDirection: 'reverse' }} />
                
                {/* Floating Particles */}
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      rotate: 360,
                      scale: [1, 1.2, 1],
                    }}
                    transition={{
                      rotate: { duration: 3 + i, repeat: Infinity, ease: "linear" },
                      scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                    }}
                    className="absolute w-2 h-2 rounded-full bg-washa-gold/40 shadow-[0_0_10px_rgba(64,48,40,0.5)]"
                    style={{
                      top: '50%',
                      left: '50%',
                      marginTop: '-4px',
                      marginLeft: '-4px',
                      transform: `rotate(${i * 60}deg) translateX(${60 + i * 5}px)`
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-4 relative z-10">
              <h3 className="animate-pulse font-serif text-2xl tracking-wide text-washa-gold">
                يتم الآن نسج إبداعك...
              </h3>
              <p className="mx-auto max-w-sm text-base leading-relaxed text-washa-text-sec">
                ذكاء وشّى الاصطناعي يعمل على تحويل فكرتك إلى تصميم فريد يليق بك
              </p>
            </div>

            <div className="relative z-10 h-1.5 w-56 overflow-hidden rounded-full border border-white/5 bg-white/5">
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="h-full w-full bg-gradient-to-r from-transparent via-washa-gold to-transparent shadow-[0_0_15px_rgba(64,48,40,0.5)]"
              />
            </div>
          </motion.div>
        )}

        {/* ===== ERROR STATE ===== */}
        {error && !isGenerating && !mockupImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card-strong flex min-h-[320px] flex-col items-center justify-center space-y-5 p-8 text-center sm:p-10"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10">
              <span className="text-3xl">⚠️</span>
            </div>
            <div className="space-y-3">
              <h3 className="text-xl font-serif text-red-400">حدث خطأ</h3>
              <p className="text-sm text-washa-text-sec max-w-md">{error}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={handleEditOptions} className="gap-2 rounded-xl">
                <ChevronRight className="w-4 h-4" /> تعديل الخيارات
              </Button>
              <Button variant="gold" onClick={resetDesign} className="gap-2 rounded-xl">
                <RotateCcw className="w-4 h-4" /> البدء من جديد
              </Button>
            </div>
          </motion.div>
        )}

        {/* ===== ORDER SUCCESS STATE ===== */}
        {orderResult && !isGenerating && (
          <OrderSuccessCard
            itemTitle={orderResult.itemTitle}
            price={orderResult.price}
            onReset={resetDesign}
          />
        )}

        {/* ===== RESULT STATE ===== */}
        {mockupImage && !isGenerating && !orderResult && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="step-badge border-washa-gold/30 bg-washa-gold/10 text-washa-gold">
                <Sparkles className="w-3 h-3 text-washa-gold" />
                الخطوة ٦ من ٦: النتيجة النهائية
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-washa-surface/50 border border-washa-border/25 text-xs text-washa-text-sec">
                <span
                  className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0 shadow-sm"
                  style={{ backgroundColor: garmentHex }}
                />
                <span className="font-medium text-washa-text">{state.garmentType}</span>
                <span className="text-washa-text-faint/40">·</span>
                <span>{state.garmentColor}</span>
                {state.garmentSize ? (
                  <>
                    <span className="text-washa-text-faint/40">·</span>
                    <span>{state.garmentSize}</span>
                  </>
                ) : null}
              </div>
            </div>

            {/* ── Mockup Card ── */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="glass-card-strong overflow-hidden relative group"
              style={{
                background: `linear-gradient(160deg, rgba(${garmentRgb}, ${isLightColor ? 0.12 : 0.18}) 0%, rgba(13,13,13,0.95) 52%)`,
                boxShadow: `0 0 90px rgba(${garmentRgb}, 0.1), 0 40px 100px rgba(0,0,0,0.55), 0 12px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)`,
              }}
            >
              {/* Image */}
              <div className="relative aspect-[4/3] w-full">
                <img
                  src={mockupImage}
                  alt="Generated Mockup"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                />
                {/* Hover zoom hint */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end justify-center p-6">
                  <button
                    onClick={() => setLightboxImage(mockupImage)}
                    className="px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-md text-white text-sm font-medium hover:bg-white/20 transition-colors flex items-center gap-2 border border-white/15"
                  >
                    <ZoomIn className="w-4 h-4" /> عرض بالحجم الكامل
                  </button>
                </div>
              </div>

              {/* Persistent action bar — always visible, essential for mobile */}
              <div className="flex items-center justify-between gap-3 border-t border-washa-border/20 px-4 py-3">
                <div className="text-xs text-washa-text-faint line-clamp-2">
                  {state.style} · {state.technique} · {state.palette}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(mockupImage, 'washa-mockup.png')}
                  className="gap-2 rounded-xl shrink-0"
                >
                  <Download className="w-4 h-4" /> تحميل الموكب
                </Button>
              </div>
            </motion.div>

            {/* ── Order CTA ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="glass-card-strong p-5 sm:p-6"
            >
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <div className="flex-1 text-center sm:text-right space-y-1.5">
                  <h3 className="text-lg font-bold text-washa-text flex items-center justify-center sm:justify-end gap-2">
                    <ShoppingBag className="w-5 h-5 text-washa-gold" />
                    هل أعجبك التصميم؟
                  </h3>
                  <p className="text-sm text-washa-text-sec leading-relaxed">
                    أضف التصميم إلى السلة الآن ليُحتسب بسعر القطعة والطباعة المعتمدين ثم أكمل الطلب من صفحة الدفع
                  </p>
                </div>
                <Button
                  variant="gold"
                  size="lg"
                  onClick={handleConfirmOrder}
                  className="h-12 w-full shrink-0 gap-2 rounded-xl px-8 text-base font-bold shadow-[0_0_30px_rgba(64,48,40,0.25)] btn-shimmer-effect sm:w-auto"
                >
                  <ShoppingBag className="w-5 h-5" /> إضافة إلى السلة
                </Button>
              </div>
            </motion.div>

            {/* ── Footer navigation ── */}
            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={handleEditOptions} className="gap-2 rounded-xl hover:bg-washa-gold/5">
                <ChevronRight className="w-4 h-4" /> تعديل الخيارات
              </Button>
              <Button variant="outline" onClick={resetDesign} className="gap-2 rounded-xl">
                <RotateCcw className="w-4 h-4" /> تصميم جديد
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </>
  );
}
