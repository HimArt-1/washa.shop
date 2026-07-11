export type PublicStudioErrorScope = 'generation' | 'extraction' | 'submit' | 'general';

export const PUBLIC_GENERATION_ERROR =
  'تعذر إنشاء التصميم الآن. عدّل الوصف قليلًا أو جرّب مرة أخرى بعد لحظات.';

export const PUBLIC_EXTRACTION_ERROR =
  'تعذر تجهيز التصميم للطباعة الآن. جرّب مرة أخرى بعد لحظات.';

export const PUBLIC_SUBMIT_ERROR =
  'تعذر إضافة التصميم للسلة الآن. جرّب مرة أخرى بعد لحظات.';

export const PUBLIC_GENERAL_ERROR =
  'تعذر إكمال الطلب الآن. حاول مرة أخرى بعد لحظات.';

const INTERNAL_ERROR_PATTERNS = [
  /\bapi\b/i,
  /\bhttp\b/i,
  /\bstatus\b/i,
  /\btrace\b/i,
  /\bserver\b/i,
  /\bfetch\b/i,
  /\bnetwork\b/i,
  /\bjson\b/i,
  /\bunexpected\b/i,
  /\bproxy\b/i,
  /\bprovider\b/i,
  /\bmerchant\b/i,
  /\bdeadline\b/i,
  /\btimeout\b/i,
  /\btimed out\b/i,
  /\bquota\b/i,
  /\bbilling\b/i,
  /\bpermission[_ -]?denied\b/i,
  /\bgemini\b/i,
  /\bopenai\b/i,
  /\breplicate\b/i,
  /\bgoogle\b/i,
  /\bgoogle ai\b/i,
  /\bsupabase\b/i,
  /\bmigration/i,
  /\bschema\b/i,
  /\bendpoint\b/i,
  /\bwebhook\b/i,
  /\bcredentials?\b/i,
  /\bkey\b/i,
  /\btoken\b/i,
  /\bquota_unavailable\b/i,
  /\bOPENAI_API_KEY\b/,
  /\bGEMINI_API_KEY\b/,
  /الخادم/,
  /مزود/,
  /المزوّد/,
  /المزود/,
  /تاجر/,
  /التاجر/,
  /مراجعة/,
  /راجع/,
  /مفتاح/,
  /الفوترة/,
  /نموذج/,
  /قاعدة البيانات/,
  /migrations?/i,
  /[45]\d{2}/,
];

function getDefaultPublicError(scope: PublicStudioErrorScope) {
  if (scope === 'generation') return PUBLIC_GENERATION_ERROR;
  if (scope === 'extraction') return PUBLIC_EXTRACTION_ERROR;
  if (scope === 'submit') return PUBLIC_SUBMIT_ERROR;
  return PUBLIC_GENERAL_ERROR;
}

export function isInternalStudioErrorMessage(message: string) {
  const trimmed = message.trim();
  return INTERNAL_ERROR_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function getPublicStudioErrorMessage(
  message: string | null | undefined,
  scope: PublicStudioErrorScope = 'general',
  fallback = getDefaultPublicError(scope)
) {
  const trimmed = typeof message === 'string' ? message.trim() : '';
  if (!trimmed) return fallback;
  if (isInternalStudioErrorMessage(trimmed)) return fallback;
  return trimmed;
}
