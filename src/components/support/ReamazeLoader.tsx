"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

const ALLOWED_PATH_PREFIXES = ["/store", "/design", "/support"];

export function ReamazeLoader() {
    const pathname = usePathname();
    const isHome = pathname === "/";
    const isAllowed = isHome || ALLOWED_PATH_PREFIXES.some((prefix) => pathname?.startsWith(prefix));

    if (!isAllowed) {
        return null;
    }

    return (
        <>
            <Script id="reamaze-config" strategy="afterInteractive">{`
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
        </>
    );
}
