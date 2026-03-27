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

export async function fetchDtfStudioConfig(): Promise<DtfStudioConfig> {
  const response = await fetch(CONFIG_ENDPOINT, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error('تعذر تحميل إعدادات WASHA AI من المتجر الذكي.');
  }

  const data = (await response.json()) as DtfStudioConfig | { error?: string };
  if ('error' in data && data.error) {
    throw new Error(data.error);
  }

  if (!isDtfStudioConfig(data)) {
    throw new Error('بيانات إعدادات WASHA AI غير مكتملة.');
  }

  if (data.garments.length === 0) {
    return FALLBACK_DTF_CONFIG;
  }

  return data;
}
