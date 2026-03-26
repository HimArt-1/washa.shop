import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useDesign } from '../../context/DesignContext';

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const COLORS = {
  success: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    icon: 'text-emerald-400',
    text: 'text-emerald-300',
  },
  error: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    icon: 'text-red-400',
    text: 'text-red-300',
  },
  info: {
    bg: 'bg-washa-gold/10',
    border: 'border-washa-gold/20',
    icon: 'text-washa-gold',
    text: 'text-washa-gold-light',
  },
};

export default function Toast() {
  const { toast, clearToast } = useDesign();

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(clearToast, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast, clearToast]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9998] pointer-events-none">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="pointer-events-auto"
          >
            <div
              className={`flex items-center gap-3 px-5 py-3.5 rounded-xl border backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.5)] ${COLORS[toast.type].bg} ${COLORS[toast.type].border}`}
            >
              {(() => {
                const Icon = ICONS[toast.type];
                return <Icon className={`w-5 h-5 flex-shrink-0 ${COLORS[toast.type].icon}`} />;
              })()}
              <span className={`text-sm font-medium ${COLORS[toast.type].text}`}>
                {toast.message}
              </span>
              <button
                onClick={clearToast}
                className="ml-2 text-washa-text-faint hover:text-washa-text transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
