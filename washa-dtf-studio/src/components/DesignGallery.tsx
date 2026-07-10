import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, Clock, Image as ImageIcon } from 'lucide-react';
import { Button } from './ui/Button';
import { DesignHistoryItem } from '../types';
import { studioAsset } from '../lib/assets';

interface DesignGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  history: DesignHistoryItem[];
  onDelete: (id: string) => void;
  onClear: () => void;
}

export default function DesignGallery({
  isOpen,
  onClose,
  history,
  onDelete,
  onClear,
}: DesignGalleryProps) {
  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 right-0 top-0 z-[101] flex w-full max-w-sm flex-col border-l border-washa-border bg-washa-surface shadow-[−20px_0_50px_rgba(0,0,0,0.35)] sm:max-w-md"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-washa-border p-4 sm:p-5">
              <h2 className="font-serif text-lg text-washa-gold">تصاميمي السابقة</h2>
              <div className="flex items-center gap-2">
                {history.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={onClear} className="text-red-400 hover:text-red-300 text-xs">
                    مسح الكل
                  </Button>
                )}
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-washa-elevated transition-colors"
                >
                  <X className="w-4 h-4 text-washa-text-sec" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 space-y-3 overflow-y-auto p-3.5 sm:p-4">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-20">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-washa-elevated">
                    <ImageIcon className="h-7 w-7 text-washa-text-faint" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-washa-text-sec font-medium">لا توجد تصاميم سابقة</p>
                    <p className="text-sm text-washa-text-faint">
                      ستظهر تصاميمك هنا بعد إنشاء أول تصميم
                    </p>
                  </div>
                </div>
              ) : (
                history.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group overflow-hidden rounded-xl border border-washa-border/50 bg-washa-bg transition-colors hover:border-washa-gold/30"
                  >
                    {/* Thumbnail */}
                    {item.thumbnail && (
                      <div className="aspect-[16/9] w-full overflow-hidden">
                        <img
                          src={studioAsset(item.thumbnail)}
                          alt={item.prompt || 'تصميم'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                      </div>
                    )}

                    {/* Info */}
                    <div className="space-y-2.5 p-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        <span className="px-2 py-0.5 text-[10px] rounded-full bg-washa-gold/10 text-washa-gold border border-washa-gold/20">
                          {item.garmentType}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] rounded-full bg-washa-surface text-washa-text-sec border border-washa-border/50">
                          {item.garmentColor}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] rounded-full bg-washa-surface text-washa-text-sec border border-washa-border/50">
                          {item.style}
                        </span>
                      </div>

                      {item.prompt && (
                        <p className="text-sm text-washa-text-sec line-clamp-2">{item.prompt}</p>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-[10px] text-washa-text-faint">
                          <Clock className="w-3 h-3" />
                          {formatDate(item.createdAt)}
                        </span>
                        <button
                          onClick={() => onDelete(item.id)}
                          className="p-1.5 rounded-md hover:bg-red-500/10 text-washa-text-faint hover:text-red-400 transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
