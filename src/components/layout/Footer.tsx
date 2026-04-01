"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { Instagram, Twitter, MessageCircle, Mail, MapPin, Phone, Check, Loader2 } from "lucide-react";
import { subscribeNewsletter } from "@/app/actions/forms";
import { JoinCommunityModal } from "@/components/modals/JoinCommunityModal";

// ─── Custom SVG Icons ──────────────────────────────────────

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.98a8.18 8.18 0 0 0 4.76 1.52V7.05a4.84 4.84 0 0 1-1-.36z" />
    </svg>
  );
}

function SnapchatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.07 2c.73 0 3.87.15 5.17 3.33.42 1.02.32 2.76.24 4.14l-.02.25c-.03.44-.06.86-.06 1.04 0 .27.1.37.2.44.24.16.56.22.88.28l.26.06c.57.13 1.22.28 1.55.62.22.23.3.52.23.83-.17.72-1.1.92-1.82 1.08l-.2.04c-.25.06-.5.11-.67.2-.14.07-.3.22-.1.57.5.94 1.18 1.74 2 2.35.42.3.88.54 1.37.7.2.07.65.22.66.64.01.47-.57.8-1.06 1.02-.61.27-1.28.46-1.61.55-.1.03-.17.09-.19.2-.04.2-.08.41-.37.58-.33.2-.77.2-1.25.2h-.14c-.52 0-.98.06-1.5.33-.48.25-.95.63-1.56 1.12-.36.28-.71.5-1.14.5h-.02c-.43 0-.78-.22-1.14-.5-.61-.49-1.08-.87-1.56-1.12a3.4 3.4 0 0 0-1.5-.33h-.14c-.48 0-.92 0-1.25-.2-.29-.17-.33-.38-.37-.58a.33.33 0 0 0-.19-.2c-.33-.09-1-.28-1.61-.55-.49-.22-1.07-.55-1.06-1.02.01-.42.47-.57.66-.64.49-.16.95-.4 1.37-.7.82-.61 1.5-1.41 2-2.35.2-.35.04-.5-.1-.57a4.6 4.6 0 0 0-.67-.2l-.2-.04c-.72-.16-1.65-.36-1.82-1.08a.68.68 0 0 1 .23-.83c.33-.34.98-.49 1.55-.62l.26-.06c.32-.06.64-.12.88-.28.1-.07.2-.17.2-.44 0-.18-.03-.6-.06-1.04l-.02-.25c-.08-1.38-.18-3.12.24-4.14C4.13 2.15 7.27 2 8 2h4.07z" />
    </svg>
  );
}

// ─── Footer Data ────────────────────────────────────────────

const footerLinks = [
  {
    title: "المنصة",
    links: [
      { label: "المعرض", href: "/gallery" },
      { label: "المتجر", href: "/store" },
      { label: "البحث", href: "/search" },
      { label: "التصاميم", href: "/brand" },
    ],
  },
  {
    title: "الدعم",
    links: [
      { label: "مركز المساعدة", href: "/support" },
      { label: "تذاكر الدعم الفني", href: "/account/support" },
      { label: "الأسئلة الشائعة", href: "/faq" },
      { label: "الشحن والتوصيل", href: "/shipping" },
    ],
  },
  {
    title: "القانونية",
    links: [
      { label: "الشروط والأحكام", href: "/terms#terms" },
      { label: "سياسة الخصوصية", href: "/terms#privacy" },
      { label: "حقوق الملكية", href: "/terms#copyright" },
    ],
  },
  {
    title: "كن جزءاً من وشّى",
    links: [
      { label: "انضم إلى المجتمع", action: "openJoinModal" },
    ],
  },
];

const socialLinks = [
  { icon: Twitter, href: "https://x.com/washaksa", label: "X (Twitter)" },
  { icon: Instagram, href: "https://www.instagram.com/washha.sa", label: "Instagram" },
  { icon: MessageCircle, href: "https://wa.me/966532235005", label: "WhatsApp" },
  { icon: TikTokIcon, href: "https://www.tiktok.com/@washaksa", label: "TikTok" },
  { icon: SnapchatIcon, href: "https://snapchat.com/t/iqNmyrCp", label: "Snapchat" },
];

export function Footer({ visibility }: { visibility?: { gallery?: boolean; store?: boolean; design_piece?: boolean; join?: boolean; } }) {
  const [submitting, setSubmitting] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [isJoinModalOpen, setJoinModalOpen] = useState(false);
  const footerTokens = {
    bg: "var(--footer-bg)",
    text: "var(--footer-text)",
    border: "var(--footer-border)",
    orbGold: "var(--footer-orb-gold)",
    orbMist: "var(--footer-orb-mist)",
    textMuted: "var(--footer-text-muted)",
    textStrong: "var(--footer-text-strong)",
    divider: "var(--footer-divider)",
    cardBg: "var(--footer-card-bg)",
    cardBorder: "var(--footer-card-border)",
    successBg: "var(--footer-success-bg)",
    successBorder: "var(--footer-success-border)",
    bottomText: "var(--footer-bottom-text)",
  };

  const handleSubscribe = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      const res = await subscribeNewsletter(formData);
      if (res.success) {
        setSubscribed(true);
      }
    } catch (err) {
      console.error("[Footer] Newsletter subscription error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredFooterLinks = footerLinks.map(column => {
    // Filter links within the column based on visibility
    const filteredLinks = column.links.filter(link => {
      if ('href' in link && link.href === "/gallery" && visibility?.gallery === false) return false;
      if ('href' in link && link.href === "/store" && visibility?.store === false) return false;
      if ('href' in link && link.href === "/design" && visibility?.design_piece === false) return false;
      if ('action' in link && link.action === "openJoinModal" && visibility?.join === false) return false;
      return true;
    });

    return { ...column, links: filteredLinks };
  }).filter(column => column.links.length > 0); // Remove columns with no links

  return (
      <footer
      className="relative overflow-hidden pt-12 sm:pt-20 pb-6 sm:pb-8 border-t"
      style={{
        backgroundColor: footerTokens.bg,
        color: footerTokens.text,
        borderColor: footerTokens.border,
      }}
    >
      <div
        className="pointer-events-none absolute -top-20 right-8 h-56 w-56 rounded-full blur-3xl"
        style={{ backgroundColor: footerTokens.orbGold }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-8 left-6 h-48 w-48 rounded-full blur-3xl"
        style={{ backgroundColor: footerTokens.orbMist }}
        aria-hidden
      />

      <div className="container-wusha relative z-10 space-y-8 sm:space-y-10">
        <div className="theme-surface-panel rounded-[2rem] px-6 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="mb-3 text-xs font-bold tracking-[0.24em] text-theme-faint">
                مجتمع وشّى
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-theme-strong">
                الفن، الأزياء، والانضمام الذكي في مساحة واحدة
              </h3>
              <p className="mt-3 max-w-xl text-sm sm:text-base text-theme-subtle">
                سواء كنت فنانًا، مصممًا، مودل، عميلًا مهتمًا أو شريكًا، صارت بوابة الانضمام في وشّى أكثر وضوحًا واحترافية.
              </p>
            </div>
            {visibility?.join !== false && (
              <motion.button
                type="button"
                onClick={() => setJoinModalOpen(true)}
                className="btn-gold w-full sm:w-auto px-8 py-3"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                انضم إلى المجتمع
              </motion.button>
            )}
          </div>
        </div>

        <div className="theme-surface-panel rounded-[2rem] px-6 py-8 sm:px-8 sm:py-10">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-8 sm:gap-12 mb-12 sm:mb-16">
          {/* Brand Column */}
          <div className="col-span-2 sm:col-span-2 lg:col-span-2">
            <Logo size="md" className="mb-6" />
            <p className="mb-6 max-w-sm" style={{ color: footerTokens.textMuted }}>
              منصة فنية رقمية للأزياء ..
            </p>

            {/* Contact Info */}
            <div className="space-y-3">
              <a
                href="mailto:washaksa@hotmail.com"
                className="flex items-center gap-3 text-sm transition-colors hover:text-[var(--wusha-gold)]"
                style={{ color: footerTokens.textMuted }}
              >
                <Mail className="w-4 h-4" />
                washaksa@hotmail.com
              </a>
              <a
                href="https://wa.me/966532235005"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm transition-colors hover:text-[var(--wusha-gold)]"
                style={{ color: footerTokens.textMuted }}
              >
                <Phone className="w-4 h-4" />
                +966 53 223 5005
              </a>
              <div className="flex items-center gap-3 text-sm" style={{ color: footerTokens.textMuted }}>
                <MapPin className="w-4 h-4" />
                المملكة العربية السعودية
              </div>
            </div>

            {/* Social Links */}
            <div className="flex gap-3 mt-6">
              {socialLinks.map((social) => {
                const IconComponent = social.icon;
                return (
                  <motion.a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="theme-icon-button h-10 w-10 hover:bg-[var(--wusha-gold)] hover:text-[var(--wusha-bg)] hover:border-[var(--wusha-gold)]"
                    whileHover={{ scale: 1.1, y: -3 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label={social.label}
                  >
                    <IconComponent className="w-5 h-5" />
                  </motion.a>
                );
              })}
            </div>
          </div>

          {/* Links Columns */}
          {filteredFooterLinks.map((column) => (
            <div key={column.title}>
              <h4 className="font-bold mb-6" style={{ color: footerTokens.textStrong }}>{column.title}</h4>
              <ul className="space-y-3">
                {column.links.map((link: any) => (
                  <li key={link.label}>
                    {link.action === "openJoinModal" ? (
                      <button
                        onClick={() => setJoinModalOpen(true)}
                        className="text-sm transition-colors text-right hover:text-[var(--wusha-gold)]"
                        style={{ color: footerTokens.textMuted }}
                      >
                        {link.label}
                      </button>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm transition-colors hover:text-[var(--wusha-gold)]"
                        style={{ color: footerTokens.textMuted }}
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter */}
        <div className="pt-8 sm:pt-12 mb-8 sm:mb-12" style={{ borderTop: `1px solid ${footerTokens.divider}` }}>
          <div className="max-w-xl mx-auto text-center rounded-[1.5rem] border px-5 py-6 sm:px-6 sm:py-7" style={{
            backgroundColor: footerTokens.cardBg,
            borderColor: footerTokens.cardBorder,
          }}>
            <h4 className="text-xl font-bold mb-3" style={{ color: footerTokens.textStrong }}>ابقَ على اطلاع</h4>
            <p className="text-sm mb-6" style={{ color: footerTokens.textMuted }}>
              اشترك في نشرتنا البريدية لتصلك آخر الأعمال والمعارض
            </p>
            {subscribed ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-lg flex items-center justify-center gap-2 border"
                style={{
                  backgroundColor: footerTokens.successBg,
                  color: "var(--wusha-forest)",
                  borderColor: footerTokens.successBorder,
                }}
              >
                <Check className="w-5 h-5" />
                شكراً لاشتراكك!
              </motion.div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3">
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="بريدك الإلكتروني"
                  className="input-dark flex-1 rounded-lg px-4 py-3 text-sm"
                  dir="ltr"
                />
                <motion.button
                  type="submit"
                  disabled={submitting}
                  className="btn-gold py-3 px-6 disabled:opacity-50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "اشترك"}
                </motion.button>
              </form>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4" style={{ borderTop: `1px solid ${footerTokens.divider}` }}>
          <p className="text-sm" style={{ color: footerTokens.bottomText }}>
            © {new Date().getFullYear()} وشّى. جميع الحقوق محفوظة.
          </p>
          <div className="flex items-center gap-2 text-sm" style={{ color: footerTokens.bottomText }}>
            <span>صُنع بـ</span>
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              ❤️
            </motion.span>
            <span>في السعودية</span>
          </div>
        </div>
        </div>
      </div>

      <JoinCommunityModal
        isOpen={isJoinModalOpen}
        onClose={() => setJoinModalOpen(false)}
      />
    </footer>
  );
}
