import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { arSA } from "@clerk/localizations";
import { FloatingJoinButton } from "@/components/ui/FloatingJoinButton";
import { FloatingChatButton } from "@/components/ui/FloatingChatButton";
import { ServiceWorkerRegister } from "@/components/notifications/ServiceWorkerRegister";
import Script from "next/script";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://washa.shop";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "منصة وشّى | WUSHA — فنٌ يرتدى",
    template: "%s | وشّى",
  },
  description: "منصة فنية رقمية تجمع المبدعين العرب. معرض، بورتفوليو، متجر، وتصميم قطعك بالذكاء الاصطناعي.",
  keywords: ["فن", "معرض", "رقمي", "عربي", "بورتفوليو", "متجر فني", "وشّى", "wusha", "فن عربي"],
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
    capable: true,
    statusBarStyle: "black-translucent",
    title: "وشّى",
  },
  openGraph: {
    title: "منصة وشّى | WUSHA — فنٌ يرتدى",
    description: "منصة فنية رقمية تجمع المبدعين العرب. معرض، متجر، وتصميم قطعك بالذكاء الاصطناعي.",
    type: "website",
    locale: "ar_SA",
    url: SITE_URL,
    siteName: "وشّى",
  },
  twitter: {
    card: "summary_large_image",
    title: "منصة وشّى | WUSHA",
    description: "منصة فنية رقمية تجمع المبدعين العرب",
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
    colorPrimary: "#ceae7f",
    colorText: "#f0ebe3",
    colorBackground: "#111111",
    colorInputBackground: "#1a1a1a",
    colorInputText: "#f0ebe3",
    fontFamily: "var(--font-arabic), 'IBM Plex Sans Arabic', sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    card: "shadow-2xl border border-gold/10 bg-[#111111]",
    formButtonPrimary:
      "bg-gradient-to-r from-[#ceae7f] to-[#b8964f] hover:shadow-[0_0_30px_rgba(206,174,127,0.3)] text-[#0a0a0a] font-bold transition-all duration-500",
    footerActionLink: "text-[#ceae7f] hover:text-[#e0c99a]",
    headerTitle: "font-bold text-[#f0ebe3]",
    headerSubtitle: "text-[#f0ebe3]/60",
    formFieldInput: "bg-[#1a1a1a] border-[#ceae7f]/10 text-[#f0ebe3]",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider localization={arSA} appearance={clerkAppearance} dynamic>
      <html lang="ar" dir="rtl" suppressHydrationWarning>
        <body className="font-arabic bg-[#080808] text-[#f0ebe3]" suppressHydrationWarning>
          {/* Noise Texture Overlay */}
          <div className="noise-overlay" aria-hidden="true" />

          {/* Main Content */}
          {children}

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
