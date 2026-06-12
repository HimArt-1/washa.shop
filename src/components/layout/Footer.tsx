"use client";

import { useState, type CSSProperties } from "react";
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

const wushaIntroMarkMaskStyle: CSSProperties = {
  WebkitMaskImage: "url('/header-logo-identity.png')",
  maskImage: "url('/header-logo-identity.png')",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  maskPosition: "center",
  WebkitMaskSize: "contain",
  maskSize: "contain",
};

export function Footer({ visibility }: { visibility?: { gallery?: boolean; store?: boolean; design_piece?: boolean; join?: boolean; } }) {
  const [submitting, setSubmitting] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [isJoinModalOpen, setJoinModalOpen] = useState(false);

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
    <footer className="home-flow-section home-flow-section--footer">
      <div className="home-section-smoke" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className="container-wusha relative z-10">
        <div className="home-footer-shell">
          <div className="home-footer-cta">
            <div>
              <div className="home-section-kicker">
                <span
                  aria-hidden
                  className="block h-4 w-5 shrink-0 bg-current"
                  style={wushaIntroMarkMaskStyle}
                />
                مجتمع وشّى
              </div>
              <h3>الفن، الأزياء، والانضمام الذكي في مساحة واحدة</h3>
              <p>
                انضم إلى مساحة تجمع الفنانين والعملاء في تجربة واحدة؛ من اكتشاف الأعمال والمنتجات إلى طلب القطعة المناسبة بثقة.
              </p>
            </div>
            {visibility?.join !== false && (
              <motion.button
                type="button"
                onClick={() => setJoinModalOpen(true)}
                className="home-cta-pill home-footer-action"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                انضم إلى المجتمع
              </motion.button>
            )}
          </div>

          <div className="home-footer-grid">
            <div className="home-footer-brand">
              <Logo
                size="lg"
                src="/header-logo-identity.png"
                aspectRatio={1017 / 888}
                toneColor="var(--hero-logo-tone)"
                className="home-footer-logo"
              />
              <h3>وشّى</h3>
              <p>
                منصة فنية رقمية للأزياء، تجمع التصميم، المتجر، وخدمات المجتمع في تجربة واحدة متماسكة.
              </p>

              <div className="home-footer-contact">
                <a href="mailto:washaksa@hotmail.com">
                  <Mail className="h-4 w-4" aria-hidden />
                  <span>washaksa@hotmail.com</span>
                </a>
                <a href="https://wa.me/966532235005" target="_blank" rel="noopener noreferrer">
                  <Phone className="h-4 w-4" aria-hidden />
                  <span dir="ltr">+966 53 223 5005</span>
                </a>
                <span>
                  <MapPin className="h-4 w-4" aria-hidden />
                  المملكة العربية السعودية
                </span>
              </div>

              <div className="home-footer-socials">
                {socialLinks.map((social) => {
                  const IconComponent = social.icon;
                  return (
                    <motion.a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.96 }}
                      aria-label={social.label}
                    >
                      <IconComponent className="h-4 w-4" />
                    </motion.a>
                  );
                })}
              </div>
            </div>

            <div className="home-footer-links">
              {filteredFooterLinks.map((column) => (
                <div key={column.title}>
                  <h4>{column.title}</h4>
                  <ul>
                    {column.links.map((link: any) => (
                      <li key={link.label}>
                        {link.action === "openJoinModal" ? (
                          <button type="button" onClick={() => setJoinModalOpen(true)}>
                            {link.label}
                          </button>
                        ) : (
                          <Link href={link.href}>{link.label}</Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="home-footer-newsletter">
              <h4>ابقَ على اطلاع</h4>
              <p>تصلك تحديثات المتجر، التصاميم، وفرص المجتمع بدون إزعاج.</p>
              {subscribed ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="home-footer-success"
                >
                  <Check className="h-5 w-5" aria-hidden />
                  تم تسجيل اشتراكك
                </motion.div>
              ) : (
                <form onSubmit={handleSubscribe}>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="بريدك الإلكتروني"
                    dir="ltr"
                  />
                  <motion.button
                    type="submit"
                    disabled={submitting}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "اشترك"}
                  </motion.button>
                </form>
              )}
            </div>
          </div>

          <div className="home-footer-bottom">
            <p>© {new Date().getFullYear()} وشّى. جميع الحقوق محفوظة.</p>
            <p>صُنع في السعودية</p>
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
