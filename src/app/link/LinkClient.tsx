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
    <div className="min-h-screen bg-theme-base flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      
      {/* Background Ambient Glows */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gold/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-gold/10 blur-[150px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <div
          className="w-full rounded-3xl p-8 sm:p-10 flex flex-col items-center justify-start overflow-hidden relative shadow-2xl border border-white/10"
          style={{
            background: "linear-gradient(135deg, #1A110A 0%, #322014 100%)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 60px rgba(202, 160, 82, 0.15) inset"
          }}
        >
          {/* Subtle Top Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-gold/15 blur-[80px] z-0 rounded-full pointer-events-none" />
          
          {/* Grainy Texture */}
          <div className="absolute inset-0 opacity-[0.04] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] pointer-events-none mix-blend-overlay z-0" />
          
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
              className="text-2xl font-bold text-white mb-2 tracking-wide text-center"
            >
              {config.linktree_title || "وشّى منصة الفن"}
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-gold/80 text-sm tracking-widest uppercase mb-10 text-center"
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
              {config.social_instagram && config.show_instagram !== false && (
                <motion.a
                  variants={itemVariants}
                  whileHover={{ scale: 1.03, backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(202,160,82,0.4)" }}
                  whileTap={{ scale: 0.98 }}
                  href={getUrl('instagram', config.social_instagram)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 flex items-center gap-4 transition-colors group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer" />
                  <div className="w-10 h-10 rounded-full bg-theme-strong/20 flex items-center justify-center shrink-0 group-hover:bg-theme-strong/40 transition-colors">
                    <Instagram className="w-5 h-5 text-gold group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="text-white/90 text-sm sm:text-base font-medium tracking-wide flex-1 text-left" dir="ltr">Instagram</span>
                  <LinkIcon className="w-4 h-4 text-white/20 group-hover:text-gold/50 transition-colors" />
                </motion.a>
              )}
              
              {config.social_twitter && config.show_twitter !== false && (
                <motion.a
                  variants={itemVariants}
                  whileHover={{ scale: 1.03, backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(202,160,82,0.4)" }}
                  whileTap={{ scale: 0.98 }}
                  href={getUrl('twitter', config.social_twitter)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 flex items-center gap-4 transition-colors group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer" />
                  <div className="w-10 h-10 rounded-full bg-theme-strong/20 flex items-center justify-center shrink-0 group-hover:bg-theme-strong/40 transition-colors">
                    <Twitter className="w-5 h-5 text-gold group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="text-white/90 text-sm sm:text-base font-medium tracking-wide flex-1 text-left" dir="ltr">Twitter (X)</span>
                  <LinkIcon className="w-4 h-4 text-white/20 group-hover:text-gold/50 transition-colors" />
                </motion.a>
              )}
              
              {config.social_tiktok && config.show_tiktok !== false && (
                <motion.a
                  variants={itemVariants}
                  whileHover={{ scale: 1.03, backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(202,160,82,0.4)" }}
                  whileTap={{ scale: 0.98 }}
                  href={getUrl('tiktok', config.social_tiktok)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 flex items-center gap-4 transition-colors group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer" />
                  <div className="w-10 h-10 rounded-full bg-theme-strong/20 flex items-center justify-center shrink-0 group-hover:bg-theme-strong/40 transition-colors">
                    <Music className="w-5 h-5 text-gold group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="text-white/90 text-sm sm:text-base font-medium tracking-wide flex-1 text-left" dir="ltr">TikTok</span>
                  <LinkIcon className="w-4 h-4 text-white/20 group-hover:text-gold/50 transition-colors" />
                </motion.a>
              )}
              
              {config.social_snapchat && config.show_snapchat !== false && (
                <motion.a
                  variants={itemVariants}
                  whileHover={{ scale: 1.03, backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(202,160,82,0.4)" }}
                  whileTap={{ scale: 0.98 }}
                  href={getUrl('snapchat', config.social_snapchat)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 flex items-center gap-4 transition-colors group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer" />
                  <div className="w-10 h-10 rounded-full bg-theme-strong/20 flex items-center justify-center shrink-0 group-hover:bg-theme-strong/40 transition-colors">
                    <Ghost className="w-5 h-5 text-gold group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="text-white/90 text-sm sm:text-base font-medium tracking-wide flex-1 text-left" dir="ltr">Snapchat</span>
                  <LinkIcon className="w-4 h-4 text-white/20 group-hover:text-gold/50 transition-colors" />
                </motion.a>
              )}

              {config.brand_assets?.business_card_website && config.show_website !== false && (
                 <motion.a
                 variants={itemVariants}
                 whileHover={{ scale: 1.03, backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(202,160,82,0.4)" }}
                 whileTap={{ scale: 0.98 }}
                 href={`https://${config.brand_assets.business_card_website.replace('www.', '')}`}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 flex items-center gap-4 transition-colors group relative overflow-hidden"
               >
                 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer" />
                 <div className="w-10 h-10 rounded-full bg-theme-strong/20 flex items-center justify-center shrink-0 group-hover:bg-theme-strong/40 transition-colors">
                   <Globe className="w-5 h-5 text-gold group-hover:scale-110 transition-transform" />
                 </div>
                 <span className="text-white/90 text-sm sm:text-base font-medium tracking-wide flex-1 text-left" dir="ltr">Our Website</span>
                 <LinkIcon className="w-4 h-4 text-white/20 group-hover:text-gold/50 transition-colors" />
               </motion.a>
              )}

              {config.social_whatsapp && config.show_whatsapp !== false && (
                <motion.a
                  variants={itemVariants}
                  whileHover={{ scale: 1.03, backgroundColor: "rgba(34,197,94,0.1)", borderColor: "rgba(34,197,94,0.4)" }}
                  whileTap={{ scale: 0.98 }}
                  href={getUrl('whatsapp', config.social_whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 flex items-center gap-4 transition-colors group relative overflow-hidden mt-2"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer" />
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 group-hover:bg-green-500/20 transition-colors">
                    <MessageCircle className="w-5 h-5 text-green-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="text-white/90 text-sm sm:text-base font-medium tracking-wide flex-1 text-left" dir="ltr">WhatsApp</span>
                  <LinkIcon className="w-4 h-4 text-white/20 group-hover:text-green-500/50 transition-colors" />
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
            <span dir="ltr" className="text-white/30 text-xs tracking-[0.2em] uppercase block">
              &copy; {new Date().getFullYear()} WUSHA.SHOP
            </span>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
