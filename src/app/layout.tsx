import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { arSA } from "@clerk/localizations";
import { ThemeProvider } from "@/context/ThemeContext";
import { FloatingJoinButton } from "@/components/ui/FloatingJoinButton";
import { FloatingChatButton } from "@/components/ui/FloatingChatButton";
import { VisitLogger } from "@/components/ops/VisitLogger";
import { ClientErrorLogger } from "@/components/ops/ClientErrorLogger";
import { AnnouncementLoader } from "@/components/ui/AnnouncementLoader";
import { ServiceWorkerRegister } from "@/components/notifications/ServiceWorkerRegister";
import { CartSyncProvider } from "@/components/store/CartSyncProvider";
import { ProfileBootstrapper } from "@/components/auth/ProfileBootstrapper";
import Script from "next/script";
import { Suspense } from "react";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://washa.shop";
const THEME_INIT_SCRIPT = `(function(){try{var key='wusha-theme';var stored=localStorage.getItem(key);var theme=(stored==='light'||stored==='dark')?stored:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',theme);document.documentElement.style.colorScheme=theme;}catch(e){document.documentElement.setAttribute('data-theme','light');document.documentElement.style.colorScheme='light';}})();`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "منصة وشّى | WASHA — فنٌ يرتدى",
    template: "%s | وشّى",
  },
  description: "منصة فنية رقمية للأزياء. تصميم، متجر، واكتشاف أزياء فنية مميزة بالذكاء الاصطناعي.",
  keywords: ["أزياء", "أزياء فنية", "تصميم أزياء", "متجر أزياء", "وشّى", "wusha", "washa", "streetwear", "أزياء عربية"],
  authors: [{ name: "WASHA", url: SITE_URL }],
  creator: "WASHA",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    title: "وشّى",
    statusBarStyle: "black-translucent",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  openGraph: {
    title: "منصة وشّى | WASHA — فنٌ يرتدى",
    description: "منصة فنية رقمية للأزياء. تصميم، متجر، واكتشاف أزياء فنية مميزة.",
    type: "website",
    locale: "ar_SA",
    url: SITE_URL,
    siteName: "وشّى",
  },
  twitter: {
    card: "summary_large_image",
    title: "منصة وشّى | WASHA",
    description: "منصة فنية رقمية للأزياء — فنٌ يرتدى",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: SITE_URL,
  },
};

const clerkAppearance = {
  variables: {
    colorPrimary: "var(--wusha-gold)",
    colorText: "var(--wusha-text)",
    colorBackground: "var(--wusha-surface)",
    colorInputBackground: "var(--wusha-surface-2)",
    colorInputText: "var(--wusha-text)",
    colorTextSecondary: "color-mix(in srgb, var(--wusha-text) 60%, transparent)",
    fontFamily: "var(--font-arabic), 'IBM Plex Sans Arabic', sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    card: "shadow-2xl border border-gold/10",
    formButtonPrimary:
      "bg-gradient-to-r from-gold to-gold-light hover:shadow-[0_0_30px_var(--neon-gold)] font-bold transition-all duration-500",
    footerActionLink: "text-gold hover:text-gold-light",
    headerTitle: "font-bold",
    headerSubtitle: "",
    formFieldInput: "border-gold/10",
    /* UserButton popover — متوافق مع النمط الفاتح والداكن */
    userButtonPopoverCard: "!bg-[var(--wusha-surface)] !text-[var(--wusha-text)] !border-[var(--wusha-border)]",
    userButtonPopoverActionButton: "!text-[var(--wusha-text)] hover:!text-[var(--wusha-gold)]",
    userButtonPopoverActionButtonText: "!text-[var(--wusha-text)]",
    userPreviewMainIdentifier: "!text-[var(--wusha-text)]",
    userPreviewSecondaryIdentifier: "!text-[color-mix(in_srgb,var(--wusha-text)_60%,transparent)]",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      localization={arSA}
      appearance={clerkAppearance}
      dynamic
    >
      <html lang="ar" dir="rtl" suppressHydrationWarning data-theme="light">
        <head>
          <script
            dangerouslySetInnerHTML={{
              __html: THEME_INIT_SCRIPT,
            }}
          />
          {/* JSON-LD Structured Data */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@graph": [
                  {
                    "@type": "Organization",
                    "@id": `${SITE_URL}/#organization`,
                    name: "وشّى | WASHA",
                    url: SITE_URL,
                    logo: `${SITE_URL}/icon-512.png`,
                    description: "منصة فنية رقمية للأزياء — فنٌ يرتدى",
                    sameAs: [],
                  },
                  {
                    "@type": "WebSite",
                    "@id": `${SITE_URL}/#website`,
                    url: SITE_URL,
                    name: "وشّى | WASHA",
                    publisher: { "@id": `${SITE_URL}/#organization` },
                    inLanguage: "ar",
                    potentialAction: {
                      "@type": "SearchAction",
                      target: `${SITE_URL}/search?q={search_term_string}`,
                      "query-input": "required name=search_term_string",
                    },
                  },
                ],
              }),
            }}
          />
        </head>
        <body className="font-arabic" style={{ backgroundColor: "var(--wusha-bg)", color: "var(--wusha-text)" }} suppressHydrationWarning>
          {/* Skip to Content — Accessibility */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:right-4 focus:z-[9999] focus:px-6 focus:py-3 focus:rounded-xl focus:font-bold focus:text-sm"
            style={{ background: "var(--wusha-gold)", color: "var(--wusha-bg)" }}
          >
            تخطي إلى المحتوى الرئيسي
          </a>

          {/* Noise Texture Overlay */}
          <div className="noise-overlay" aria-hidden="true" />

          {/* Announcements */}
          <Suspense fallback={null}>
            <AnnouncementLoader />
          </Suspense>

          {/* Main Content */}
          <ThemeProvider>
            <CartSyncProvider />
            <ProfileBootstrapper />
            <VisitLogger />
            <ClientErrorLogger />
            <main id="main-content" className="min-h-screen">
              {children}
            </main>
          </ThemeProvider>

          {/* Service Worker للـ PWA و Web Push */}
          <ServiceWorkerRegister />
          {/* Floating Join Button */}
          <FloatingJoinButton />
          {/* Custom Floating Chat Button */}
          <FloatingChatButton />

          {/* Re:amaze — دعم فني */}
          <Script id="reamaze-config" strategy="beforeInteractive">{`
            var _support = _support || { 'ui': {}, 'user': {} };
            _support['account'] = 'e0b4e5a7-7c09-4071-882e-2477bd1f3d20';
            _support['ui']['contactMode'] = 'mixed';
            _support['ui']['enableKb'] = 'true';
            _support['ui']['mailbox'] = '77652573';
            _support['ui']['styles'] = {
              widgetColor: '#8c3a08',
              gradient: 'true'
            };
            _support['ui']['shoutboxFacesMode'] = '';
            _support['ui']['widget'] = {
              allowBotProcessing: 'false',
              slug: 'wshw-fnun-yrtd',
              label: {
                text: 'حياك الله في وشّى ..',
                mode: 'notification',
                delay: 3,
                duration: 30,
                primary: '',
                secondary: '',
                sound: 'true'
              },
              position: 'bottom-right'
            };
            _support['ui']['overrides'] = _support['ui']['overrides'] || {};
            _support['ui']['overrides']['confirmationMessage'] = 'تم تلقي رسالتك .. موظفنا بس يخلص اللي في يده ويرد عليك .. معليش اذا تأخرنا عليك .. ';
            _support['ui']['overrides']['uploadingAttachments'] = 'جاري رفع {{count}} مرفق...';
            _support['apps'] = {
              recentConversations: {},
              faq: {"enabled":"true"}
            };
          `}</Script>
          <Script
            src="https://cdn.reamaze.com/assets/reamaze-loader.js"
            strategy="afterInteractive"
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
