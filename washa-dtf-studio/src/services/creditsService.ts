// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — عميل حصص/رصيد WASHA AI (داخل الاستوديو)
// ═══════════════════════════════════════════════════════════

export interface QuotaStatus {
  audience: 'guest' | 'subscriber' | 'wushsha' | 'booth' | 'privileged';
  guest?: boolean;
  unlimited: boolean;
  blocked?: boolean;
  freeLimit: number;
  freeUsed: number;
  freeRemaining: number;
  paidBalance: number;
  canPurchase: boolean;
}

export interface CreditPackage {
  id: string;
  label: string;
  credits: number;
  price: number;
  popular?: boolean;
}

export interface CreditCatalog {
  packages: CreditPackage[];
  checkoutEnabled: boolean;
}

export interface CheckoutResponse {
  success: boolean;
  url: string;
  mobileUrl: string | null;
  orderNumber: string;
  transactionNo: string;
  credits: number;
  amount: number;
}

const DTF_BASE = '/api/washa-dtf-studio';
const CREDITS_BASE = '/api/washa-ai/credits';

export async function fetchQuotaStatus(
  signal?: AbortSignal,
  expectedAuthenticated = false,
): Promise<QuotaStatus | null> {
  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const res = await fetch(`${DTF_BASE}/quota-status`, {
        signal,
        cache: 'no-store',
        credentials: 'same-origin',
        headers: expectedAuthenticated ? { 'X-Washa-Auth-State': 'authenticated' } : undefined,
      });
      if (res.ok) return (await res.json()) as QuotaStatus;

      if (attempt === 0 && expectedAuthenticated && res.status === 503) {
        const payload = await res.json().catch(() => null);
        if (payload?.code === 'session_unavailable' && !signal?.aborted) continue;
      }
      return null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchCreditPackages(signal?: AbortSignal): Promise<CreditCatalog> {
  try {
    const res = await fetch(`${CREDITS_BASE}/packages`, { signal, cache: 'no-store' });
    if (!res.ok) return { packages: [], checkoutEnabled: false };
    const data = await res.json();
    return {
      packages: Array.isArray(data?.packages) ? (data.packages as CreditPackage[]) : [],
      checkoutEnabled: data?.checkoutEnabled === true,
    };
  } catch {
    return { packages: [], checkoutEnabled: false };
  }
}

/** يبدأ الدفع ويعيد بيانات الفاتورة، أو يرمي خطأً برسالة عربية. */
export async function startCreditCheckout(
  packageId: string,
  clientMobile?: string
): Promise<CheckoutResponse> {
  let res: Response;
  try {
    res = await fetch(`${CREDITS_BASE}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageId, clientMobile }),
    });
  } catch {
    throw new Error('تعذّر الاتصال بالخادم');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || 'تعذّر بدء عملية الدفع');
  }
  return data as CheckoutResponse;
}
