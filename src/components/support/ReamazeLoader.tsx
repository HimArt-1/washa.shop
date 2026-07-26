"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const SUPPORT_PATH_PREFIXES = ["/support", "/account/support"];

function setReamazeVisibility(isSupportPath: boolean) {
    const toggleSelectors = [
        "[data-reamaze-widget]",
        "#reamaze-widget",
        "#reamaze-widget-icon",
    ];
    const allSelectors = [
        ...toggleSelectors,
        ".reamaze-widget",
        ".reamaze-shoutbox",
        "iframe[src*='reamaze']",
        "[id*='reamaze']",
        "[class*='reamaze']",
    ];

    document.querySelectorAll(allSelectors.join(",")).forEach((element) => {
        if (element instanceof HTMLElement) {
            element.style.display = isSupportPath ? "" : "none";
        }
    });

    document.querySelectorAll(toggleSelectors.join(",")).forEach((element) => {
        if (element instanceof HTMLElement) {
            element.style.display = "none";
        }
    });
}

export function ReamazeLoader({ nonce }: { nonce?: string }) {
    const pathname = usePathname();
    const isSupportPath = SUPPORT_PATH_PREFIXES.some((prefix) => pathname?.startsWith(prefix));

    useEffect(() => {
        setReamazeVisibility(isSupportPath);

        const observer = new MutationObserver(() => {
            setReamazeVisibility(isSupportPath);
        });

        observer.observe(document.body, { childList: true, subtree: true });
        return () => observer.disconnect();
    }, [isSupportPath]);

    if (!isSupportPath) {
        return null;
    }

    return (
        <>
            <Script id="reamaze-config" nonce={nonce} strategy="afterInteractive">{`
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
                  display: 'none',
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
                nonce={nonce}
                src="https://cdn.reamaze.com/assets/reamaze-loader.js"
                strategy="afterInteractive"
            />
        </>
    );
}
