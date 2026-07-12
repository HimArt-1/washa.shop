import type { DtfStudioPositionOption, PrintPosition, PrintSize } from '../types';

type PlacementInput = Pick<DtfStudioPositionOption, 'id' | 'name' | 'description' | 'printPosition' | 'printSize'> | null | undefined;

export const SUPPORTED_PRINT_DESIGN_POSITIONS = ['front_large', 'back_large', 'logo_right', 'logo_left'] as const;

function normalizeArabic(value: string) {
  return value
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

function includesAny(value: string, tokens: string[]) {
  return tokens.some((token) => value.includes(token));
}

export function resolveDesignPosition(position: PrintPosition | null | undefined, size: PrintSize | null | undefined) {
  if (position === 'back') return size === 'small' ? 'back_small' : 'back_large';
  if (position === 'shoulder_right') return 'logo_right';
  if (position === 'shoulder_left') return 'logo_left';
  if (position === 'chest') return size === 'small' ? 'front_small' : 'front_large';
  return 'front_large';
}

export function resolvePrintPositionFromDesignPosition(designPosition: string): PrintPosition {
  if (designPosition.startsWith('back')) return 'back';
  if (designPosition === 'logo_right') return 'shoulder_right';
  if (designPosition === 'logo_left') return 'shoulder_left';
  return 'chest';
}

export function resolvePrintSizeFromDesignPosition(designPosition: string): PrintSize {
  if (designPosition.includes('small') || designPosition.startsWith('logo_')) return 'small';
  return 'large';
}

export function getPrintPlacementCopy(position: PrintPosition, size: PrintSize) {
  if (position === 'back') {
    return {
      title: size === 'small' ? 'طباعة خلفية صغيرة' : 'تصميم خلفي كبير',
      description: size === 'small'
        ? 'يظهر بحجم صغير في أعلى الظهر.'
        : 'يظهر في الظهر بحجم كبير ومميز ليمنح التصميم حضورًا واضحًا.',
    };
  }

  if (position === 'shoulder_right') {
    return {
      title: 'لوقو صغير في الصدر (يمين)',
      description: 'يظهر كلوقو صغير في أعلى الصدر من الجهة اليمنى.',
    };
  }

  if (position === 'shoulder_left') {
    return {
      title: 'لوقو صغير في الصدر (يسار)',
      description: 'يظهر كلوقو صغير في أعلى الصدر من الجهة اليسرى، جهة القلب.',
    };
  }

  return {
    title: size === 'small' ? 'طباعة أمامية صغيرة' : 'تصميم أمامي كبير',
    description: size === 'small'
      ? 'يظهر بحجم صغير في أعلى الصدر.'
      : 'يظهر في الصدر بحجم كبير ومميز ليكون واجهة القطعة الأساسية.',
  };
}

export function isSupportedPrintDesignPosition(value: string) {
  return (SUPPORTED_PRINT_DESIGN_POSITIONS as readonly string[]).includes(value);
}

export function findSupportedPrintOption(options: DtfStudioPositionOption[], preferredId?: string | null) {
  const preferred = options.find((option) => option.id === preferredId) ?? null;
  if (preferred && isSupportedPrintDesignPosition(resolvePrintPlacementFromOption(preferred).designPosition)) {
    return preferred;
  }

  return options.find((option) => resolvePrintPlacementFromOption(option).designPosition === 'front_large') ??
    options.find((option) => isSupportedPrintDesignPosition(resolvePrintPlacementFromOption(option).designPosition)) ??
    null;
}

export function resolvePrintPlacementFromOption(option: PlacementInput): {
  printPosition: PrintPosition;
  printSize: PrintSize;
  designPosition: string;
} {
  const labelText = normalizeArabic([
    option?.id,
    option?.name,
  ].filter(Boolean).join(' '));

  const explicitPrintPosition =
    includesAny(labelText, ['back', 'rear', 'ظهر', 'خلفي', 'الخلف'])
      ? 'back'
      : includesAny(labelText, ['right', 'يمين', 'ايمن'])
        ? 'shoulder_right'
        : includesAny(labelText, ['left', 'يسار', 'ايسر', 'قلب'])
          ? 'shoulder_left'
          : includesAny(labelText, ['front', 'chest', 'صدر', 'امام'])
            ? 'chest'
            : null;
  const explicitPrintSize =
    includesAny(labelText, ['small', 'logo', 'صغير', 'شعار', 'بسيط'])
      ? 'small'
      : includesAny(labelText, ['large', 'كبير'])
        ? 'large'
        : null;

  const printPosition = explicitPrintPosition ?? option?.printPosition ?? 'chest';
  let printSize = explicitPrintSize ?? option?.printSize ?? null;

  if (!printSize) {
    if (
      printPosition === 'shoulder_right' ||
      printPosition === 'shoulder_left' ||
      includesAny(labelText, ['small', 'logo', 'صغير', 'شعار', 'بسيط'])
    ) {
      printSize = 'small';
    } else {
      printSize = 'large';
    }
  }

  return {
    printPosition,
    printSize,
    designPosition: resolveDesignPosition(printPosition, printSize),
  };
}
