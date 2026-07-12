import { describe, expect, it } from 'vitest';
import type { DtfStudioPositionOption } from '../../washa-dtf-studio/src/types';
import {
  findSupportedPrintOption,
  getPrintPlacementCopy,
  resolvePrintPlacementFromOption,
} from '../../washa-dtf-studio/src/lib/placement';

function option(id: string, name: string, printPosition: DtfStudioPositionOption['printPosition'], printSize: DtfStudioPositionOption['printSize']): DtfStudioPositionOption {
  return { id, name, description: null, imageUrl: null, printPosition, printSize, price: 0, sortOrder: 0 };
}

describe('WASHA AI supported print placements', () => {
  it('falls back from a hidden small-front option to the approved large-front option', () => {
    const options = [
      option('front-small', 'أمامي صغير', 'chest', 'small'),
      option('front-large', 'أمامي كبير', 'chest', 'large'),
    ];

    const selected = findSupportedPrintOption(options, 'front-small');
    expect(selected?.id).toBe('front-large');
    expect(resolvePrintPlacementFromOption(selected).designPosition).toBe('front_large');
  });

  it('uses wearer-side labels for the two small chest logos', () => {
    expect(getPrintPlacementCopy('shoulder_right', 'small').title).toContain('يمين');
    expect(getPrintPlacementCopy('shoulder_left', 'small')).toMatchObject({
      title: expect.stringContaining('يسار'),
      description: expect.stringContaining('جهة القلب'),
    });
  });
});
