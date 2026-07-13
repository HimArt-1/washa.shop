import type { ReferenceImageMode } from '../types';

export const REFERENCE_IMAGE_MODES: Array<{
  id: ReferenceImageMode;
  title: string;
  description: string;
  badge: string;
}> = [
  {
    id: 'reinterpret',
    title: 'إعادة ابتكار',
    description: 'نستخرج الفكرة الأساسية ونبني منها عملاً أصلياً مناسباً للطباعة.',
    badge: 'الأكثر إبداعاً',
  },
  {
    id: 'preserve_subject',
    title: 'حافظ على العنصر',
    description: 'نحافظ على هوية العنصر وملامحه، مع تنظيفه وصياغته فنياً.',
    badge: 'الأكثر دقة',
  },
  {
    id: 'style_inspiration',
    title: 'استلهم الأسلوب',
    description: 'نستلهم الألوان والإيقاع فقط وننشئ موضوعاً وتكويناً جديدين.',
    badge: 'الأكثر أصالة',
  },
];

export function normalizeReferenceImageMode(value: unknown): ReferenceImageMode {
  return value === 'preserve_subject' || value === 'style_inspiration' ? value : 'reinterpret';
}

export function getReferenceFallbackConcept(mode: ReferenceImageMode) {
  if (mode === 'preserve_subject') {
    return 'the main subject in the supplied reference image, preserving its recognizable identity, silhouette, pose, and defining visual features';
  }
  if (mode === 'style_inspiration') {
    return 'an original print concept inspired only by the supplied reference image visual language, color rhythm, texture, and artistic mood';
  }
  return 'the central idea and strongest visual motif from the supplied reference image, reimagined as original print-ready artwork';
}

export function getReferenceGenerationDirectives(mode: ReferenceImageMode) {
  const shared = [
    'Treat the uploaded customer image as an artwork reference, never as the garment mockup or the final rectangular print itself.',
    'Analyze the reference before generating: identify its main subject, defining silhouette, visual hierarchy, palette, texture, and the details that make it recognizable.',
    'Remove irrelevant background scenery, photo borders, framing, interface elements, watermarks, and compression artifacts. Never reproduce them in the print.',
    'Rebuild the result as one cohesive print-ready artwork with a deliberate silhouette, controlled detail density, strong contrast, and clean edges suitable for DTF printing.',
    'Do not paste, crop, photocopy, or place the raw reference image as a rectangle on the garment.',
  ];

  if (mode === 'preserve_subject') {
    return [
      ...shared,
      'REFERENCE MODE — PRESERVE SUBJECT: preserve the identity, pose, proportions, silhouette, and distinctive features of the main subject. Refine and stylize it without replacing it with a different subject.',
    ];
  }

  if (mode === 'style_inspiration') {
    return [
      ...shared,
      'REFERENCE MODE — STYLE INSPIRATION: use only the visual language, palette relationships, texture, rhythm, and mood. Do not copy the exact subject, composition, or arrangement; create a clearly original artwork from the customer description.',
    ];
  }

  return [
    ...shared,
    'REFERENCE MODE — CREATIVE REINTERPRETATION: preserve the reference core idea and recognizability, but redesign the composition, shapes, and details into a fresh, original artwork rather than a literal copy.',
  ];
}
