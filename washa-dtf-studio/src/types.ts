export type GarmentType = string;
export type GarmentColor = string;
export type GarmentSize = string;
export type ArtisticStyle = string;
export type Technique = string;
export type ColorPalette = string;
export type DesignMethod = 'text' | 'image' | 'calligraphy';

export interface DtfStudioColorToken {
  hex: string;
  name: string;
}

export interface DtfStudioColorOption {
  id: string;
  garmentId: string;
  name: string;
  hexCode: string;
  imageUrl: string | null;
  sortOrder: number;
}

export interface DtfStudioSizeOption {
  id: string;
  garmentId: string;
  colorId: string | null;
  name: string;
  imageFrontUrl: string | null;
  imageBackUrl: string | null;
}

export interface DtfStudioGarmentOption {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  sortOrder: number;
  basePrice: number;
  pricing: {
    chestLarge: number;
    chestSmall: number;
    backLarge: number;
    backSmall: number;
    shoulderLarge: number;
    shoulderSmall: number;
  };
  colors: DtfStudioColorOption[];
  sizes: DtfStudioSizeOption[];
}

export interface DtfStudioCreativeOption {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  prompt: string;
  metadata?: Record<string, unknown> | null;
}

export interface DtfStudioPaletteOption extends DtfStudioCreativeOption {
  colors: DtfStudioColorToken[];
}

export interface DtfStudioConfig {
  garments: DtfStudioGarmentOption[];
  styles: DtfStudioCreativeOption[];
  techniques: DtfStudioCreativeOption[];
  palettes: DtfStudioPaletteOption[];
}

export interface DesignState {
  garmentId: string | null;
  garmentType: GarmentType;
  garmentColorId: string | null;
  garmentColor: GarmentColor;
  garmentColorHex: string;
  garmentSizeId: string | null;
  garmentSize: GarmentSize;
  designMethod: DesignMethod;
  prompt: string;
  calligraphyText: string;
  referenceImage: string | null;
  referenceImageMimeType: string | null;
  styleId: string | null;
  style: ArtisticStyle;
  techniqueId: string | null;
  technique: Technique;
  paletteId: string | null;
  palette: ColorPalette;
  customPalette?: string;
}

export const CUSTOM_PALETTE_ID = '__custom_palette__';
export const CUSTOM_PALETTE_LABEL = 'تخصيص... (Custom)';
export const CUSTOM_PALETTE_PROMPT = 'custom colors';

export const FALLBACK_STYLE_PROMPTS: Record<string, string> = {
  'ملصق (Sticker)': 'die-cut sticker style, vector art, flat colors, bold outlines',
  'أنمي/مانغا (Anime/Manga)': 'anime style, manga illustration, Japanese animation art, vivid',
  'بوب آرت (Pop Art)': 'pop art, Andy Warhol style, halftone dots, bold colors',
  'جرافيتي (Graffiti)': 'street art, graffiti style, spray paint, urban, edgy',
  'فن الخطوط (Line Art)': 'continuous line art, minimalist line drawing, focused on form',
  'هندسي (Geometric)': 'geometric patterns, mathematical shapes, symmetric, structural',
  'بكسل آرت (Pixel Art)': 'pixel art, 8-bit, 16-bit, retro gaming style, sharp edges',
  'فينتيج (Vintage)': 'vintage aesthetic, retro design, slightly distressed, classic',
  'سايبر بانك (Cyberpunk)': 'cyberpunk, futuristic, sci-fi, high tech, urban dystopia',
  'بسيط (Minimalist)': 'minimalist design, clean lines, simple forms, negative space',
  'ثلاثي الأبعاد (3D)': '3d render, octane render, c4d, plastic, depth, professional',
};

export const FALLBACK_TECHNIQUE_PROMPTS: Record<string, string> = {
  'رسم رقمي (Digital)': 'digital illustration, crisp digital art',
  'ألوان مائية (Watercolor)': 'watercolor painting, fluid, color bleeds, artisanal',
  'ألوان زيتية (Oil)': 'thick oil painting, impasto, visible brush strokes, fine art',
  'رسم بالقلم (Pen)': 'pen and ink drawing, hatched lines, detailed sketching',
  'ايربراش (Airbrush)': 'airbrush art, smooth gradients, soft edges, glossy',
  'حبر (Ink)': 'black ink wash, sumi-e style, high contrast, elegant strokes',
  'طباعة ريزوغراف (Risograph)': 'risograph print style, textured, vibrant overprinting, grainy',
};

export const FALLBACK_PALETTE_PROMPTS: Record<string, string> = {
  'تلقائي (Auto)': 'best-matching colors for the theme',
  'نيون ساطع (Neon)': 'vibrant neon colors, cyan, magenta, lime, glowing',
  'باستيل هادئ (Pastel)': 'soft pastel colors, light pink, baby blue, mint green, serene',
  'أحادي اللون (Monochrome)': 'monochrome, black and white, grayscale, varying shades',
  'ألوان ترابية (Earth)': 'earth tones, brown, terracotta, olive green, warm beige, natural',
  'ريترو 80s (Retro)': '80s retro wave colors, hot pink, orange, purple, nostalgic',
  'فيبورويف (Vaporwave)': 'vaporwave palette, turquoise, hot pink, soft purple, sunset yellow',
  [CUSTOM_PALETTE_LABEL]: '',
};

export const FALLBACK_DTF_CONFIG: DtfStudioConfig = {
  garments: [
    {
      id: 'garment-tshirt',
      name: 'تيشيرت',
      slug: 'tshirt',
      imageUrl: null,
      sortOrder: 0,
      basePrice: 0,
      pricing: {
        chestLarge: 0,
        chestSmall: 0,
        backLarge: 0,
        backSmall: 0,
        shoulderLarge: 0,
        shoulderSmall: 0,
      },
      colors: [
        { id: 'color-black', garmentId: 'garment-tshirt', name: 'أسود', hexCode: '#111111', imageUrl: null, sortOrder: 0 },
        { id: 'color-white', garmentId: 'garment-tshirt', name: 'أبيض', hexCode: '#F5F5F5', imageUrl: null, sortOrder: 1 },
        { id: 'color-gray', garmentId: 'garment-tshirt', name: 'رمادي', hexCode: '#808080', imageUrl: null, sortOrder: 2 },
        { id: 'color-navy', garmentId: 'garment-tshirt', name: 'كحلي', hexCode: '#000080', imageUrl: null, sortOrder: 3 },
        { id: 'color-beige', garmentId: 'garment-tshirt', name: 'بيج', hexCode: '#F5F5DC', imageUrl: null, sortOrder: 4 },
        { id: 'color-olive', garmentId: 'garment-tshirt', name: 'زيتي', hexCode: '#556B2F', imageUrl: null, sortOrder: 5 },
        { id: 'color-burgundy', garmentId: 'garment-tshirt', name: 'أحمر عنابي', hexCode: '#800020', imageUrl: null, sortOrder: 6 },
        { id: 'color-forest', garmentId: 'garment-tshirt', name: 'أخضر غابة', hexCode: '#228B22', imageUrl: null, sortOrder: 7 },
        { id: 'color-royal', garmentId: 'garment-tshirt', name: 'أزرق ملكي', hexCode: '#4169E1', imageUrl: null, sortOrder: 8 },
        { id: 'color-mustard', garmentId: 'garment-tshirt', name: 'خردلي', hexCode: '#FFDB58', imageUrl: null, sortOrder: 9 },
        { id: 'color-purple', garmentId: 'garment-tshirt', name: 'بنفسجي داكن', hexCode: '#301934', imageUrl: null, sortOrder: 10 },
        { id: 'color-dusty-rose', garmentId: 'garment-tshirt', name: 'وردي مغبر', hexCode: '#DCAE96', imageUrl: null, sortOrder: 11 },
        { id: 'color-coffee', garmentId: 'garment-tshirt', name: 'بني قهوة', hexCode: '#4B3621', imageUrl: null, sortOrder: 12 },
        { id: 'color-burnt-orange', garmentId: 'garment-tshirt', name: 'برتقالي محروق', hexCode: '#CC5500', imageUrl: null, sortOrder: 13 },
        { id: 'color-charcoal', garmentId: 'garment-tshirt', name: 'فحم داكن', hexCode: '#36454F', imageUrl: null, sortOrder: 14 },
        { id: 'color-sky', garmentId: 'garment-tshirt', name: 'أزرق سماوي', hexCode: '#87CEEB', imageUrl: null, sortOrder: 15 },
      ],
      sizes: [
        { id: 'size-s', garmentId: 'garment-tshirt', colorId: null, name: 'S', imageFrontUrl: null, imageBackUrl: null },
        { id: 'size-m', garmentId: 'garment-tshirt', colorId: null, name: 'M', imageFrontUrl: null, imageBackUrl: null },
        { id: 'size-l', garmentId: 'garment-tshirt', colorId: null, name: 'L', imageFrontUrl: null, imageBackUrl: null },
        { id: 'size-xl', garmentId: 'garment-tshirt', colorId: null, name: 'XL', imageFrontUrl: null, imageBackUrl: null },
      ],
    },
    {
      id: 'garment-hoodie',
      name: 'هودي',
      slug: 'hoodie',
      imageUrl: null,
      sortOrder: 1,
      basePrice: 0,
      pricing: {
        chestLarge: 0,
        chestSmall: 0,
        backLarge: 0,
        backSmall: 0,
        shoulderLarge: 0,
        shoulderSmall: 0,
      },
      colors: [],
      sizes: [
        { id: 'hoodie-m', garmentId: 'garment-hoodie', colorId: null, name: 'M', imageFrontUrl: null, imageBackUrl: null },
        { id: 'hoodie-l', garmentId: 'garment-hoodie', colorId: null, name: 'L', imageFrontUrl: null, imageBackUrl: null },
        { id: 'hoodie-xl', garmentId: 'garment-hoodie', colorId: null, name: 'XL', imageFrontUrl: null, imageBackUrl: null },
      ],
    },
    {
      id: 'garment-sweatshirt',
      name: 'سويت شيرت',
      slug: 'sweatshirt',
      imageUrl: null,
      sortOrder: 2,
      basePrice: 0,
      pricing: {
        chestLarge: 0,
        chestSmall: 0,
        backLarge: 0,
        backSmall: 0,
        shoulderLarge: 0,
        shoulderSmall: 0,
      },
      colors: [],
      sizes: [
        { id: 'sweatshirt-m', garmentId: 'garment-sweatshirt', colorId: null, name: 'M', imageFrontUrl: null, imageBackUrl: null },
        { id: 'sweatshirt-l', garmentId: 'garment-sweatshirt', colorId: null, name: 'L', imageFrontUrl: null, imageBackUrl: null },
      ],
    },
    {
      id: 'garment-jacket',
      name: 'جاكيت',
      slug: 'jacket',
      imageUrl: null,
      sortOrder: 3,
      basePrice: 0,
      pricing: {
        chestLarge: 0,
        chestSmall: 0,
        backLarge: 0,
        backSmall: 0,
        shoulderLarge: 0,
        shoulderSmall: 0,
      },
      colors: [],
      sizes: [
        { id: 'jacket-l', garmentId: 'garment-jacket', colorId: null, name: 'L', imageFrontUrl: null, imageBackUrl: null },
        { id: 'jacket-xl', garmentId: 'garment-jacket', colorId: null, name: 'XL', imageFrontUrl: null, imageBackUrl: null },
      ],
    },
  ],
  styles: Object.entries(FALLBACK_STYLE_PROMPTS).map(([name, prompt], index) => ({
    id: `style-${index}`,
    name,
    description: null,
    imageUrl: null,
    sortOrder: index,
    prompt,
    metadata: null,
  })),
  techniques: Object.entries(FALLBACK_TECHNIQUE_PROMPTS).map(([name, prompt], index) => ({
    id: `technique-${index}`,
    name,
    description: null,
    imageUrl: null,
    sortOrder: index,
    prompt,
    metadata: null,
  })),
  palettes: Object.entries(FALLBACK_PALETTE_PROMPTS)
    .filter(([name]) => name !== CUSTOM_PALETTE_LABEL)
    .map(([name, prompt], index) => ({
      id: `palette-${index}`,
      name,
      description: null,
      imageUrl: null,
      sortOrder: index,
      prompt,
      metadata: null,
      colors:
        name === 'نيون ساطع (Neon)'
          ? [{ hex: '#00FFFF', name: 'Cyan' }, { hex: '#FF00FF', name: 'Magenta' }, { hex: '#00FF00', name: 'Lime' }]
          : name === 'باستيل هادئ (Pastel)'
            ? [{ hex: '#FFB6C1', name: 'Pastel Pink' }, { hex: '#ADD8E6', name: 'Baby Blue' }, { hex: '#98FB98', name: 'Mint' }]
            : name === 'أحادي اللون (Monochrome)'
              ? [{ hex: '#FFFFFF', name: 'White' }, { hex: '#888888', name: 'Gray' }, { hex: '#000000', name: 'Black' }]
              : name === 'ألوان ترابية (Earth)'
                ? [{ hex: '#8B4513', name: 'Brown' }, { hex: '#CD853F', name: 'Terracotta' }, { hex: '#556B2F', name: 'Olive' }]
                : name === 'ريترو 80s (Retro)'
                  ? [{ hex: '#FF69B4', name: 'Hot Pink' }, { hex: '#FF8C00', name: 'Orange' }, { hex: '#8A2BE2', name: 'Purple' }]
                  : name === 'فيبورويف (Vaporwave)'
                    ? [{ hex: '#00D4FF', name: 'Turquoise' }, { hex: '#FF00C1', name: 'Pink' }, { hex: '#9D00FF', name: 'Purple' }]
                    : [{ hex: '#CCCCCC', name: 'Auto 1' }, { hex: '#999999', name: 'Auto 2' }, { hex: '#666666', name: 'Auto 3' }],
    })),
};

export const LIGHT_GARMENT_COLORS = ['أبيض', 'بيج', 'خردلي', 'وردي مغبر', 'أزرق سماوي'];

export interface DesignHistoryItem {
  id: string;
  garmentType: GarmentType;
  garmentColor: GarmentColor;
  style: ArtisticStyle;
  technique: Technique;
  palette: ColorPalette;
  prompt: string;
  thumbnail: string | null;
  createdAt: string;
}

export interface ApiError {
  code: 'INVALID_KEY' | 'GENERATION_FAILED' | 'EXTRACTION_FAILED' | 'NETWORK_ERROR';
  message: string;
}
