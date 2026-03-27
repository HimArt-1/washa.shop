import { FALLBACK_DTF_CONFIG, type DtfStudioConfig } from '../types';

const CONFIG_ENDPOINT = '/api/washa-dtf-studio/config';

function isDtfStudioConfig(value: unknown): value is DtfStudioConfig {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const config = value as Partial<DtfStudioConfig>;
  return (
    Array.isArray(config.garments) &&
    Array.isArray(config.styles) &&
    Array.isArray(config.techniques) &&
    Array.isArray(config.palettes)
  );
}

function hydrateConfigWithFallback(config: DtfStudioConfig): DtfStudioConfig {
  return {
    garments: config.garments.length > 0 ? config.garments : FALLBACK_DTF_CONFIG.garments,
    styles: config.styles.length > 0 ? config.styles : FALLBACK_DTF_CONFIG.styles,
    techniques: config.techniques.length > 0 ? config.techniques : FALLBACK_DTF_CONFIG.techniques,
    palettes: config.palettes.length > 0 ? config.palettes : FALLBACK_DTF_CONFIG.palettes,
  };
}

export async function fetchDtfStudioConfig(): Promise<DtfStudioConfig> {
  const response = await fetch(CONFIG_ENDPOINT, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('تعذر تحميل إعدادات استوديو DTF من المتجر الذكي.');
  }

  const data = (await response.json()) as DtfStudioConfig | { error?: string };
  if ('error' in data && data.error) {
    throw new Error(data.error);
  }

  if (!isDtfStudioConfig(data)) {
    throw new Error('بيانات إعدادات استوديو DTF غير مكتملة.');
  }

  return hydrateConfigWithFallback(data);
}
