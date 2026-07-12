import type { PrintPosition, PrintSize } from '../types';

export type PrintAdjustment = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

export const DEFAULT_PRINT_ADJUSTMENT: PrintAdjustment = {
  scale: 100,
  offsetX: 0,
  offsetY: 0,
};

export function clampPrintAdjustment(adjustment: PrintAdjustment): PrintAdjustment {
  return {
    scale: Math.round(Math.min(120, Math.max(55, adjustment.scale))),
    offsetX: Math.round(Math.min(30, Math.max(-30, adjustment.offsetX))),
    offsetY: Math.round(Math.min(25, Math.max(-25, adjustment.offsetY))),
  };
}

export function getPrintSafety(adjustment: PrintAdjustment) {
  const normalized = clampPrintAdjustment(adjustment);
  const horizontalExtent = normalized.scale / 2 + (Math.abs(normalized.offsetX) * normalized.scale) / 100;
  const verticalExtent = normalized.scale / 2 + (Math.abs(normalized.offsetY) * normalized.scale) / 100;
  const nearHorizontalEdge = horizontalExtent > 50;
  const nearVerticalEdge = verticalExtent > 50;
  const tooSmall = normalized.scale < 65;

  return {
    safe: !nearHorizontalEdge && !nearVerticalEdge && !tooSmall,
    nearEdge: nearHorizontalEdge || nearVerticalEdge,
    tooSmall,
  };
}

export function buildPrintAdjustmentDirective(
  adjustment: PrintAdjustment,
  position: PrintPosition | null,
  size: PrintSize | null,
) {
  const normalized = clampPrintAdjustment(adjustment);
  const horizontal = normalized.offsetX === 0
    ? 'horizontally centered'
    : `${Math.abs(normalized.offsetX)}% toward the viewer-${normalized.offsetX > 0 ? 'right' : 'left'} within the printable area`;
  const vertical = normalized.offsetY === 0
    ? 'vertically centered'
    : `${Math.abs(normalized.offsetY)}% toward the ${normalized.offsetY > 0 ? 'bottom' : 'top'} within the printable area`;

  return `Custom print adjustment: ${normalized.scale}% of the selected ${size ?? 'standard'} print scale, ${horizontal}, ${vertical}. Keep the artwork fully inside the safe printable area on the ${position ?? 'selected'} placement.`;
}
