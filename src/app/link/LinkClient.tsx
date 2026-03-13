"use client";

import { motion } from "framer-motion";
import { 
  Instagram, 
  Twitter, 
  Music, 
  Ghost, 
  MessageCircle,
  Link as LinkIcon,
  Globe
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";

export default function LinkClient({ config }: { config: any }) {
  
  // Helper to construct actual URLs from handles
  const getUrl = (platform: string, handle: string) => {
    if (!handle) return "#";
    
    const cleanHandle = handle.replace('@', '').trim();
    
    switch (platform) {
      case 'instagram': return `https://instagram.com/${cleanHandle}`;
      case 'twitter': return `https://x.com/${cleanHandle}`;
      case 'tiktok': return `https://tiktok.com/@${cleanHandle}`;
      case 'snapchat': return `https://snapchat.com/add/${cleanHandle}`;
      case 'whatsapp': {
        const cleanPhone = handle.replace(/[^0-9]/g, '');
        return `https://wa.me/${cleanPhone}`;
      }
      default: return handle.startsWith('http') ? handle : `https://${handle}`;
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-screen bg-theme flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      
      {/* Creative Dynamic Background - Light & Dark Mode Compatible */}
      <div className="fixed inset-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="bg-blob bg-blob-gold top-[-10%] left-[-10%] w-[60vw] h-[60vw] mix-blend-multiply dark:mix-blend-screen opacity-20 dark:opacity-10 animate-pulse-slow" />
        <div className="bg-blob bg-blob-mist bottom-[-20%] right-[-10%] w-[70vw] h-[70vw] mix-blend-multiply dark:mix-blend-screen opacity-20 dark:opacity-10" style={{ animationDelay: '2s' }} />
        <div className="bg-blob bg-blob-forest top-[30%] left-[20%] w-[50vw] h-[50vw] mix-blend-multiply dark:mix-blend-screen opacity-15 dark:opacity-5 animate-pulse-slow" style={{ animationDelay: '4s' }} />
        <div className="absolute inset-0 bg-grid opacity-10 dark:opacity-20 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-theme/20 to-theme z-0" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <div className="w-full rounded-[2.5rem] p-8 sm:p-10 flex flex-col items-center justify-start overflow-hidden relative shadow-2xl glass-premium hover-glow transition-all duration-700">
          
          {/* Subtle Top Glow & Shimmers */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-gold/20 dark:bg-gold/15 blur-[60px] z-0 rounded-full pointer-events-none" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-mist/20 blur-[50px] z-0 rounded-full pointer-events-none" />
          
          {/* Grainy Texture for Premium Feel */}
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] pointer-events-none mix-blend-overlay z-0" />
          
          <div className="relative z-10 w-full flex flex-col items-center pt-2">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Logo size="lg" className="mb-6 drop-shadow-2xl" />
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-2xl font-bold text-theme mb-2 tracking-wide text-center"
            >
              {config.linktree_title || "وشّى منصة الفن"}
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-gold text-sm tracking-widest uppercase mb-10 text-center"
            >
              {config.linktree_subtitle || "الإبداع بين يديك"}
            </motion.p>

            {/* Interactive Social Buttons List */}
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="w-full flex flex-col gap-4"
            >
              {/* Instagram URL */}
              {config.social_instagram && config.show_instagram !== false && (
                <motion.a
                  variants={itemVariants}
                  whileHover={{ scale: 1.03, borderColor: "rgba(202,160,82,0.5)" }}
                  whileTap={{ scale: 0.98 }}
                  href={getUrl('instagram', config.social_instagram)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-6 py-4 rounded-2xl border border-theme-subtle bg-theme-faint hover:bg-theme-subtle flex items-center gap-4 transition-all duration-300 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-theme/5 to-transparent -translate-x-full group-hover:animate-shimmer" />
                  <div className="w-10 h-10 rounded-full bg-theme-soft flex items-center justify-center shrink-0 group-hover:shadow-[0_0_15px_rgba(202,160,82,0.3)] transition-all">
                    <Instagram className="w-5 h-5 text-gold group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="text-theme-strong text-sm sm:text-base font-medium tracking-wide flex-1 text-left" dir="ltr">Instagram</span>
                  <LinkIcon className="w-4 h-4 text-theme-subtle group-hover:text-gold transition-colors" />
                </motion.a>
              )}
              
              {/* Twitter URL */}
              {config.social_twitter && config.show_twitter !== false && (
                <motion.a
                  variants={itemVariants}
                  whileHover={{ scale: 1.03, borderColor: "rgba(202,160,82,0.5)" }}
                  whileTap={{ scale: 0.98 }}
                  href={getUrl('twitter', config.social_twitter)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-6 py-4 rounded-2xl border border-theme-subtle bg-theme-faint hover:bg-theme-subtle flex items-center gap-4 transition-all duration-300 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-theme/5 to-transparent -translate-x-full group-hover:animate-shimmer" />
                  <div className="w-10 h-10 rounded-full bg-theme-soft flex items-center justify-center shrink-0 group-hover:shadow-[0_0_15px_rgba(202,160,82,0.3)] transition-all">
                    <Twitter className="w-5 h-5 text-gold group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="text-theme-strong text-sm sm:text-base font-medium tracking-wide flex-1 text-left" dir="ltr">Twitter (X)</span>
                  <LinkIcon className="w-4 h-4 text-theme-subtle group-hover:text-gold transition-colors" />
                </motion.a>
              )}
              
              {/* TikTok URL */}
              {config.social_tiktok && config.show_tiktok !== false && (
                <motion.a
                  variants={itemVariants}
                  whileHover={{ scale: 1.03, borderColor: "rgba(202,160,82,0.5)" }}
                  whileTap={{ scale: 0.98 }}
                  href={getUrl('tiktok', config.social_tiktok)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-6 py-4 rounded-2xl border border-theme-subtle bg-theme-faint hover:bg-theme-subtle flex items-center gap-4 transition-all duration-300 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-theme/5 to-transparent -translate-x-full group-hover:animate-shimmer" />
                  <div className="w-10 h-10 rounded-full bg-theme-soft flex items-center justify-center shrink-0 group-hover:shadow-[0_0_15px_rgba(202,160,82,0.3)] transition-all">
                    <Music className="w-5 h-5 text-gold group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="text-theme-strong text-sm sm:text-base font-medium tracking-wide flex-1 text-left" dir="ltr">TikTok</span>
                  <LinkIcon className="w-4 h-4 text-theme-subtle group-hover:text-gold transition-colors" />
                </motion.a>
              )}
              
              {/* Snapchat URL */}
              {config.social_snapchat && config.show_snapchat !== false && (
                <motion.a
                  variants={itemVariants}
                  whileHover={{ scale: 1.03, borderColor: "rgba(202,160,82,0.5)" }}
                  whileTap={{ scale: 0.98 }}
                  href={getUrl('snapchat', config.social_snapchat)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-6 py-4 rounded-2xl border border-theme-subtle bg-theme-faint hover:bg-theme-subtle flex items-center gap-4 transition-all duration-300 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-theme/5 to-transparent -translate-x-full group-hover:animate-shimmer" />
                  <div className="w-10 h-10 rounded-full bg-theme-soft flex items-center justify-center shrink-0 group-hover:shadow-[0_0_15px_rgba(202,160,82,0.3)] transition-all">
                    <Ghost className="w-5 h-5 text-gold group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="text-theme-strong text-sm sm:text-base font-medium tracking-wide flex-1 text-left" dir="ltr">Snapchat</span>
                  <LinkIcon className="w-4 h-4 text-theme-subtle group-hover:text-gold transition-colors" />
                </motion.a>
              )}

              {/* Website URL (Added Default to Washa.shop) */}
              {config.show_website !== false && (
                 <motion.a
                 variants={itemVariants}
                 whileHover={{ scale: 1.03, borderColor: "rgba(202,160,82,0.5)" }}
                 whileTap={{ scale: 0.98 }}
                 href={config.brand_assets?.business_card_website ? `https://${config.brand_assets.business_card_website.replace('www.', '')}` : "https://washa.shop"}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="w-full px-6 py-4 rounded-2xl border border-theme-subtle bg-theme-faint hover:bg-theme-subtle flex items-center gap-4 transition-all duration-300 group relative overflow-hidden"
               >
                 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-theme/5 to-transparent -translate-x-full group-hover:animate-shimmer" />
                 <div className="w-10 h-10 rounded-full bg-theme-soft flex items-center justify-center shrink-0 group-hover:shadow-[0_0_15px_rgba(202,160,82,0.3)] transition-all">
                   <Globe className="w-5 h-5 text-gold group-hover:scale-110 transition-transform" />
                 </div>
                 <span className="text-theme-strong text-sm sm:text-base font-medium tracking-wide flex-1 text-left" dir="ltr">Our Website</span>
                 <LinkIcon className="w-4 h-4 text-theme-subtle group-hover:text-gold transition-colors" />
               </motion.a>
              )}

              {/* WhatsApp URL */}
              {config.social_whatsapp && config.show_whatsapp !== false && (
                <motion.a
                  variants={itemVariants}
                  whileHover={{ scale: 1.03, borderColor: "rgba(34,197,94,0.5)" }}
                  whileTap={{ scale: 0.98 }}
                  href={getUrl('whatsapp', config.social_whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-6 py-4 rounded-2xl border border-theme-subtle bg-theme-faint hover:bg-green-500/5 flex items-center gap-4 transition-all duration-300 group relative overflow-hidden mt-2"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-theme/5 to-transparent -translate-x-full group-hover:animate-shimmer" />
                  <div className="w-10 h-10 rounded-full bg-theme-soft flex items-center justify-center shrink-0 group-hover:shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-all">
                    <MessageCircle className="w-5 h-5 text-green-500 group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="text-theme-strong text-sm sm:text-base font-medium tracking-wide flex-1 text-left" dir="ltr">WhatsApp</span>
                  <LinkIcon className="w-4 h-4 text-theme-subtle group-hover:text-green-500 transition-colors" />
                </motion.a>
              )}
            </motion.div>
          </div>

          {/* Web URL Footer Wrapper */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="mt-12 relative z-10 w-full text-center pb-2"
          >
            <span dir="ltr" className="text-theme-muted text-xs tracking-[0.2em] font-medium uppercase block hover:text-gold transition-colors duration-300">
              WASHA.SHOP &copy; {new Date().getFullYear()}
            </span>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
