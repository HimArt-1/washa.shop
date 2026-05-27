import type { DtfStudioPositionOption, PrintPosition, PrintSize } from '../types';

type PlacementInput = Pick<DtfStudioPositionOption, 'id' | 'name' | 'description' | 'printPosition' | 'printSize'> | null | undefined;

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

export function resolvePrintPlacementFromOption(option: PlacementInput): {
  printPosition: PrintPosition;
  printSize: PrintSize;
  designPosition: string;
} {
  const text = normalizeArabic([
    option?.id,
    option?.name,
    option?.description,
  ].filter(Boolean).join(' '));

  const explicitPrintPosition =
    includesAny(text, ['back', 'rear', 'ظهر', 'خلف'])
      ? 'back'
      : includesAny(text, ['right', 'يمين', 'ايمن'])
        ? 'shoulder_right'
        : includesAny(text, ['left', 'يسار', 'ايسر', 'قلب'])
          ? 'shoulder_left'
          : includesAny(text, ['front', 'chest', 'صدر', 'امام'])
            ? 'chest'
            : null;
  const explicitPrintSize =
    includesAny(text, ['small', 'logo', 'صغير', 'شعار', 'بسيط'])
      ? 'small'
      : includesAny(text, ['large', 'كبير'])
        ? 'large'
        : null;

  const printPosition = explicitPrintPosition ?? option?.printPosition ?? 'chest';
  let printSize = explicitPrintSize ?? option?.printSize ?? null;

  if (!printSize) {
    if (
      printPosition === 'shoulder_right' ||
      printPosition === 'shoulder_left' ||
      includesAny(text, ['small', 'logo', 'صغير', 'شعار', 'بسيط'])
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
