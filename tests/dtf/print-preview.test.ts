import { describe, expect, it } from 'vitest';
import {
  buildPrintAdjustmentDirective,
  clampPrintAdjustment,
  DEFAULT_PRINT_ADJUSTMENT,
  getPrintSafety,
} from '../../washa-dtf-studio/src/lib/printPreview';

describe('WASHA AI interactive print preview', () => {
  it('clamps adjustments to the printable control range', () => {
    expect(clampPrintAdjustment({ scale: 180, offsetX: -45, offsetY: 80 })).toEqual({
      scale: 120,
      offsetX: -30,
      offsetY: 25,
    });
  });

  it('marks default placement safe and warns near edges or tiny scale', () => {
    expect(getPrintSafety(DEFAULT_PRINT_ADJUSTMENT).safe).toBe(true);
    expect(getPrintSafety({ scale: 60, offsetX: 0, offsetY: 0 }).tooSmall).toBe(true);
    expect(getPrintSafety({ scale: 100, offsetX: 28, offsetY: 0 }).nearEdge).toBe(true);
    expect(getPrintSafety({ scale: 120, offsetX: 0, offsetY: 0 }).nearEdge).toBe(true);
    expect(getPrintSafety({ scale: 80, offsetX: 10, offsetY: 8 }).safe).toBe(true);
  });

  it('produces a precise generation directive from the visual controls', () => {
    const directive = buildPrintAdjustmentDirective(
      { scale: 85, offsetX: 12, offsetY: -8 },
      'chest',
      'large',
    );

    expect(directive).toContain('85%');
    expect(directive).toContain('viewer-right');
    expect(directive).toContain('toward the top');
    expect(directive).toContain('safe printable area');
  });
});
