type ContentSecurityPolicyOptions = {
    nonce?: string;
    isDevelopment?: boolean;
    allowInlineScripts?: boolean;
};

export function createContentSecurityPolicy({
    nonce,
    isDevelopment = false,
    allowInlineScripts = false,
}: ContentSecurityPolicyOptions = {}) {
    const scriptSources = [
        "'self'",
        nonce && !allowInlineScripts ? `'nonce-${nonce}'` : null,
        allowInlineScripts ? "'unsafe-inline'" : null,
        isDevelopment ? "'unsafe-eval'" : null,
        "https://www.googletagmanager.com",
        "https://connect.facebook.net",
        "https://cdn.reamaze.com",
        "https://cdn.jsdelivr.net",
        "https://*.clerk.accounts.dev",
        "https://*.clerk.com",
    ].filter(Boolean);

    return [
        "default-src 'self'",
        `script-src ${scriptSources.join(" ")}`,
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data: https:",
        "connect-src 'self' https: wss:",
        "media-src 'self' data: blob: https:",
        "worker-src 'self' blob:",
        "manifest-src 'self'",
        "frame-src https:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self' https:",
        "frame-ancestors 'none'",
    ].join("; ");
}
