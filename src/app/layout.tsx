import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { arSA } from "@clerk/localizations";
import {
  IBM_Plex_Sans_Arabic,
  Playfair_Display,
  Tajawal,
} from "next/font/google";
import { ThemeProvider } from "@/context/ThemeContext";
import { FloatingJoinButton } from "@/components/ui/FloatingJoinButton";
import { FloatingChatButton } from "@/components/ui/FloatingChatButton";
import { VisitLogger } from "@/components/ops/VisitLogger";
import { ClientErrorLogger } from "@/components/ops/ClientErrorLogger";
import { AnnouncementLoader } from "@/components/ui/AnnouncementLoader";
import { ServiceWorkerRegister } from "@/components/notifications/ServiceWorkerRegister";
import { CartSyncProvider } from "@/components/store/CartSyncProvider";
import { ProfileBootstrapper } from "@/components/auth/ProfileBootstrapper";
import { ReamazeLoader } from "@/components/support/ReamazeLoader";
import { Suspense } from "react";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://washa.shop";
const BUILD_VERSION =
  process.env.NEXT_PUBLIC_BUILD_VERSION ||
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
  "dev";
const THEME_INIT_SCRIPT = `(function(){try{var key='wusha-theme';var stored=localStorage.getItem(key);var theme=(stored==='light'||stored==='dark')?stored:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',theme);document.documentElement.style.colorScheme=theme;}catch(e){document.documentElement.setAttribute('data-theme','light');document.documentElement.style.colorScheme='light';}})();`;
/* لا نخفي body أثناء pending — كان يسبب شاشة بيضاء طويلة وبطء ملاحظ حتى يكتمل فحص CSS */
const CSS_GUARD_STYLE = `
html[data-css-ready="fallback"] body {
  background: #f4ede3;
  color: #1a1612;
}

html[data-css-ready="fallback"] .noise-overlay,
html[data-css-ready="fallback"] .public-orb,
html[data-css-ready="fallback"] .video-overlay {
  display: none !important;
}

#css-recovery-banner[hidden] {
  display: none !important;
}

html[data-css-ready="fallback"] #css-recovery-banner {
  position: sticky;
  top: 0;
  z-index: 2147483647;
  display: flex !important;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  background: #fff7ed;
  color: #7c2d12;
  border-bottom: 1px solid rgba(124, 45, 18, 0.18);
  font: 600 0.95rem/1.4 Tahoma, Arial, sans-serif;
}

html[data-css-ready="fallback"] #css-recovery-banner a {
  flex-shrink: 0;
  color: inherit;
  text-decoration: underline;
}
`;
const CSS_GUARD_SCRIPT = String.raw`(function(){
  var doc = document.documentElement;
  var buildVersion = ${JSON.stringify(BUILD_VERSION)};
  var recoveryKey = "wusha-css-recovery:" + buildVersion;
  var recoveryParam = "__css_recover";
  var maxWaitMs = 1800;
  doc.dataset.cssReady = "pending";

  function emitRecoveryEvent(phase, detail) {
    var payload = Object.assign({ phase: phase, buildVersion: buildVersion }, detail || {});
    try {
      window.dispatchEvent(new CustomEvent("wusha:css-recovery", { detail: payload }));
    } catch (error) {
      console.warn("[CSS] Failed to dispatch recovery event", error);
    }
    if (phase === "reload" || phase === "fallback") {
      console.warn("[CSS] Recovery state:", payload);
    } else {
      console.info("[CSS] Recovery state:", payload);
    }
  }

  function clearRecoveryState() {
    try {
      sessionStorage.removeItem(recoveryKey);
    } catch (error) {
      console.warn("[CSS] Failed to clear recovery state", error);
    }
  }

  function cleanRecoveryUrl() {
    try {
      var url = new URL(window.location.href);
      if (url.searchParams.has(recoveryParam)) {
        url.searchParams.delete(recoveryParam);
        history.replaceState(null, "", url.toString());
      }
    } catch (error) {
      console.warn("[CSS] Failed to clean recovery URL", error);
    }
  }

  function markState(state) {
    if (doc.dataset.cssReady === state) {
      return;
    }
    doc.dataset.cssReady = state;
    if (state === "ready") {
      clearRecoveryState();
      cleanRecoveryUrl();
      var banner = document.getElementById("css-recovery-banner");
      if (banner) {
        banner.hidden = true;
      }
    }
    if (state === "fallback") {
      var fallbackBanner = document.getElementById("css-recovery-banner");
      if (fallbackBanner) {
        fallbackBanner.hidden = false;
      }
    }
    emitRecoveryEvent(state);
  }

  function hasHealthyStylesheet() {
    try {
      if (!document.body) {
        return false;
      }
      var rootStyles = getComputedStyle(doc);
      var bgVar = rootStyles.getPropertyValue("--wusha-bg").trim();
      var bodyStyles = getComputedStyle(document.body);
      var hasNextCss = Array.prototype.some.call(document.styleSheets, function(sheet) {
        try {
          var href = sheet.href || "";
          return href.indexOf("/_next/static/css/") !== -1 || href.indexOf("/_next/static/chunks/") !== -1;
        } catch (error) {
          return false;
        }
      });
      return Boolean(bgVar) && bodyStyles.backgroundColor !== "rgba(0, 0, 0, 0)" && hasNextCss;
    } catch (error) {
      return false;
    }
  }

  function hardReload() {
    var url = new URL(window.location.href);
    url.searchParams.set(recoveryParam, buildVersion);
    window.location.replace(url.toString());
  }

  function recoverFromCssFailure() {
    var alreadyRetried = false;
    try {
      var currentUrl = new URL(window.location.href);
      alreadyRetried = currentUrl.searchParams.get(recoveryParam) === buildVersion;
    } catch (error) {
      alreadyRetried = false;
    }
    try {
      alreadyRetried = alreadyRetried || sessionStorage.getItem(recoveryKey) === "reloaded";
    } catch (error) {
      alreadyRetried = alreadyRetried || false;
    }

    if (alreadyRetried) {
      markState("fallback");
      return;
    }

    try {
      sessionStorage.setItem(recoveryKey, "reloaded");
    } catch (error) {
      console.warn("[CSS] Failed to persist recovery state", error);
    }

    var cleanupTasks = [];

    if ("serviceWorker" in navigator) {
      cleanupTasks.push(
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
          return Promise.all(registrations.map(function(registration) {
            return registration.update();
          }));
        })
      );
    }

    if ("caches" in window) {
      cleanupTasks.push(
        window.caches.keys().then(function(keys) {
          return Promise.all(
            keys
              .filter(function(key) {
                return key.indexOf("wusha") === 0;
              })
              .map(function(key) {
                return window.caches.delete(key);
              })
          );
        })
      );
    }

    emitRecoveryEvent("reload", { cacheClearRequested: cleanupTasks.length > 0 });
    Promise.allSettled(cleanupTasks).finally(hardReload);
  }

  function watchForCss() {
    var startedAt = Date.now();
    var poll = function() {
      if (hasHealthyStylesheet()) {
        markState("ready");
        return;
      }

      if (Date.now() - startedAt >= maxWaitMs) {
        recoverFromCssFailure();
        return;
      }

      window.requestAnimationFrame(poll);
    };

    poll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", watchForCss, { once: true });
  } else {
    watchForCss();
  }

  window.addEventListener("pageshow", function() {
    if (hasHealthyStylesheet()) {
      markState("ready");
    }
  });
})();`;

const arabicFont = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-arabic",
});

const bodyFont = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["200", "300", "400", "500", "700", "800", "900"],
  display: "swap",
  variable: "--font-tajawal",
});

const displayFont = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-display",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "وشّى | WUSHA — فنٌ يرتدى",
    template: "%s | وشّى",
  },
  description: "منصة فنية رقمية للأزياء. صمّم قطعتك الفريدة، تصفح متجرنا، واكتشف أزياء عصرية مصممة بالذكاء الاصطناعي.",
  keywords: ["أزياء", "أزياء فنية", "تصميم أزياء", "متجر أزياء", "وشّى", "wusha", "washa", "streetwear", "أزياء عربية", "تيشرتات مخصصة", "طباعة عند الطلب"],
  authors: [{ name: "WUSHA", url: SITE_URL }],
  creator: "WUSHA",
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
    title: "وشّى | WUSHA — فنٌ يرتدى",
    description: "منصة فنية رقمية للأزياء. صمّم قطعتك الفريدة، تصفح متجرنا، واكتشف أزياء عصرية مصممة بالذكاء الاصطناعي.",
    type: "website",
    locale: "ar_SA",
    url: SITE_URL,
    siteName: "وشّى | WUSHA",
    images: [
      {
        url: `${SITE_URL}/icon-512.png`, // Placeholder for actual OG image
        width: 512,
        height: 512,
        alt: "وشّى - فنٌ يرتدى",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "وشّى | WUSHA",
    description: "منصة فنية رقمية للأزياء — فنٌ يرتدى",
    images: [`${SITE_URL}/icon-512.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
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
    colorTextSecondary: "var(--clerk-secondary-text)",
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
    userPreviewSecondaryIdentifier: "!text-[var(--clerk-secondary-text)]",
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
      <html
        lang="ar"
        dir="rtl"
        suppressHydrationWarning
        data-theme="light"
        className={`${arabicFont.variable} ${bodyFont.variable} ${displayFont.variable}`}
      >
        <head>
          <meta name="wusha-build" content={BUILD_VERSION} />
          <style
            dangerouslySetInnerHTML={{
              __html: CSS_GUARD_STYLE,
            }}
          />
          <script
            dangerouslySetInnerHTML={{
              __html: THEME_INIT_SCRIPT,
            }}
          />
          <script
            dangerouslySetInnerHTML={{
              __html: CSS_GUARD_SCRIPT,
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
          <div id="css-recovery-banner" hidden>
            <span>تعذر تحميل التنسيق بالكامل. تمت محاولة الاسترداد تلقائيًا.</span>
            <a href="">إعادة التحميل</a>
          </div>
          {/* Skip to Content — Accessibility */}
          <a
            href="#main-content"
            className="skip-to-content sr-only focus:not-sr-only focus:fixed focus:top-4 focus:right-4 focus:px-6 focus:py-3 focus:rounded-xl focus:font-bold focus:text-sm focus:shadow-lg"
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
            <main id="main-content" className="min-h-[100svh] min-h-[100dvh]">
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
          <ReamazeLoader />
        </body>
      </html>
    </ClerkProvider>
  );
}
