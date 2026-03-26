import { motion } from 'motion/react';
import { Shirt, CheckCircle2, ChevronLeft } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { useDesign } from '../../context/DesignContext';
import { GarmentType, GarmentColor } from '../../types';

const GARMENT_TYPES: GarmentType[] = ['تيشيرت', 'هودي', 'سويت شيرت', 'جاكيت'];
const GARMENT_COLORS: { label: GarmentColor; hex: string }[] = [
  { label: 'أسود', hex: '#111111' },
  { label: 'أبيض', hex: '#F5F5F5' },
  { label: 'رمادي', hex: '#808080' },
  { label: 'كحلي', hex: '#000080' },
  { label: 'بيج', hex: '#F5F5DC' },
  { label: 'زيتي', hex: '#556B2F' },
  { label: 'أحمر عنابي', hex: '#800020' },
  { label: 'أخضر غابة', hex: '#228B22' },
  { label: 'أزرق ملكي', hex: '#4169E1' },
  { label: 'خردلي', hex: '#FFDB58' },
  { label: 'بنفسجي داكن', hex: '#301934' },
  { label: 'وردي مغبر', hex: '#DCAE96' },
  { label: 'بني قهوة', hex: '#4B3621' },
  { label: 'برتقالي محروق', hex: '#CC5500' },
  { label: 'فحم داكن', hex: '#36454F' },
  { label: 'أزرق سماوي', hex: '#87CEEB' },
];

const LIGHT_COLORS: GarmentColor[] = ['أبيض', 'بيج', 'خردلي', 'وردي مغبر', 'أزرق سماوي'];

const GARMENT_ICONS: Record<GarmentType, string> = {
  'تيشيرت': '👕',
  'هودي': '🧥',
  'سويت شيرت': '🧤',
  'جاكيت': '🧥',
};

export default function StepGarment() {
  const { state, updateState, nextStep } = useDesign();

  return (
    <motion.div
      key="step1"
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
          الخطوة ١ من ٤
        </div>
      </div>

      {/* Title */}
      <div className="text-center space-y-3">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="text-4xl font-serif bg-gradient-to-l from-washa-gold via-washa-gold-light to-washa-gold bg-clip-text text-transparent"
        >
          اختر القطعة
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-washa-text-sec text-lg"
        >
          حدد نوع الملابس واللون الأساسي للتصميم
        </motion.p>
      </div>

      <div className="space-y-10">
        {/* Garment Type */}
        <div className="space-y-5">
          <label className="text-lg text-washa-text font-medium block text-right">نوع القطعة</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {GARMENT_TYPES.map((type, i) => (
              <motion.button
                key={type}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.06, duration: 0.4 }}
                onClick={() => updateState({ garmentType: type })}
                className={cn(
                  'p-6 rounded-2xl border transition-all duration-500 flex flex-col items-center gap-3 group/card relative overflow-hidden card-interactive',
                  state.garmentType === type
                    ? 'border-washa-gold bg-washa-gold/10 text-washa-gold shadow-[0_0_35px_rgba(201,168,106,0.15)]'
                    : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-washa-text-sec hover:border-washa-gold/30 hover:text-washa-text'
                )}
              >
                <span className="text-4xl transition-transform duration-500 group-hover/card:scale-125 relative z-10">
                  {GARMENT_ICONS[type]}
                </span>
                <Shirt className="w-4 h-4 opacity-30 group-hover/card:opacity-60 transition-opacity" />
                <span className="text-sm font-semibold">{type}</span>
                {state.garmentType === type && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-gradient-to-t from-washa-gold/10 to-transparent pointer-events-none"
                  />
                )}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Garment Color */}
        <div className="space-y-5">
          <div className="flex justify-between items-center">
            <span className="text-xs text-washa-gold/60">{GARMENT_COLORS.length} لوناً متوفراً</span>
            <label className="text-lg text-washa-text font-medium">لون القطعة</label>
          </div>
          <div className="flex flex-wrap gap-3 sm:gap-4 justify-center">
            {GARMENT_COLORS.map((color, i) => (
              <motion.button
                key={color.label}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.03, duration: 0.3 }}
                onClick={() => updateState({ garmentColor: color.label })}
                className={cn(
                  'w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 transition-all duration-500 relative group/color',
                  state.garmentColor === color.label
                    ? 'border-washa-gold scale-115 shadow-[0_0_25px_rgba(201,168,106,0.5)] ring-2 ring-washa-gold/20 ring-offset-2 ring-offset-washa-bg'
                    : 'border-white/10 hover:border-white/30 hover:scale-110'
                )}
                style={{ backgroundColor: color.hex }}
                title={color.label}
              >
                {state.garmentColor === color.label && (
                  <CheckCircle2
                    className={cn(
                      'absolute inset-0 m-auto w-6 h-6 drop-shadow-lg',
                      LIGHT_COLORS.includes(color.label)
                        ? 'text-black'
                        : 'text-white'
                    )}
                  />
                )}
                <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[10px] sm:text-[11px] text-washa-text opacity-0 group-hover/color:opacity-100 transition-all transform translate-y-1 group-hover/color:translate-y-0 whitespace-nowrap font-medium pointer-events-none bg-washa-surface/90 px-2 py-0.5 rounded-md backdrop-blur-sm">
                  {color.label}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button variant="gold" size="lg" onClick={nextStep} className="gap-2 btn-shimmer-effect h-12 px-8 text-base rounded-xl">
          التالي <ChevronLeft className="w-5 h-5" />
        </Button>
      </div>
    </motion.div>
  );
}
