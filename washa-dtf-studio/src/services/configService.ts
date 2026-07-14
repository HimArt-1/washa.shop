import type { DtfStudioConfig } from '../types';

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
    Array.isArray(config.palettes) &&
    Array.isArray(config.positions)
  );
}

function assertCompleteProductionConfig(config: DtfStudioConfig) {
  const requiredCollections = [
    config.garments,
    config.styles,
    config.techniques,
    config.palettes,
    config.positions,
  ];
  if (requiredCollections.some((collection) => collection.length === 0)) {
    throw new Error('خيارات التصميم الإنتاجية غير مكتملة حالياً.');
  }
}

export async function fetchDtfStudioConfig(): Promise<DtfStudioConfig> {
  const response = await fetch(CONFIG_ENDPOINT, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('تعذر تجهيز خيارات التصميم حالياً.');
  }

  const data = (await response.json()) as DtfStudioConfig | { error?: string };
  if ('error' in data && data.error) {
    throw new Error(data.error);
  }

  if (!isDtfStudioConfig(data)) {
    throw new Error('خيارات التصميم غير مكتملة حالياً.');
  }

  assertCompleteProductionConfig(data);
  return data;
}
