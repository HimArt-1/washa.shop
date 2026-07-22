const DEV_SURFACE_META_NAME = 'washa-ai-dev-surface';
const DEV_SIGNATURE_META_NAME = 'washa-ai-dev-signature';
const DEV_SURFACE_HEADER = 'x-washa-ai-dev-surface';
const DEV_SIGNATURE_HEADER = 'x-washa-ai-dev-signature';

type MetaSource = {
  querySelector(selector: string): {
    getAttribute(name: string): string | null;
  } | null;
};

function readMetaContent(source: MetaSource, name: string) {
  return source.querySelector(`meta[name="${name}"]`)?.getAttribute('content')?.trim() || '';
}

export function getWashaAiDevGenerationHeadersFromDocument(
  source?: MetaSource,
): Record<string, string> {
  const effectiveSource = source
    ?? (typeof document === 'undefined' ? null : document);
  if (!effectiveSource) return {};

  const surface = readMetaContent(effectiveSource, DEV_SURFACE_META_NAME);
  const signature = readMetaContent(effectiveSource, DEV_SIGNATURE_META_NAME);
  if ((surface !== 'dev' && surface !== 'dev-v2' && surface !== 'dev-v3') || !signature) return {};

  return {
    [DEV_SURFACE_HEADER]: surface,
    [DEV_SIGNATURE_HEADER]: signature,
  };
}
