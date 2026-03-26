export type GarmentType = 'تيشيرت' | 'هودي' | 'سويت شيرت' | 'جاكيت';
export type GarmentColor = 
  | 'أسود' | 'أبيض' | 'رمادي' | 'كحلي' | 'بيج' | 'زيتي' 
  | 'أحمر عنابي' | 'أخضر غابة' | 'أزرق ملكي' | 'خردلي' 
  | 'بنفسجي داكن' | 'وردي مغبر' | 'بني قهوة' | 'برتقالي محروق' 
  | 'فحم داكن' | 'أزرق سماوي';

export type DesignMethod = 'text' | 'image';

export type ArtisticStyle = 
  | 'ملصق (Sticker)' 
  | 'أنمي/مانغا (Anime/Manga)' 
  | 'بوب آرت (Pop Art)' 
  | 'جرافيتي (Graffiti)' 
  | 'فن الخطوط (Line Art)' 
  | 'هندسي (Geometric)' 
  | 'بكسل آرت (Pixel Art)' 
  | 'فينتيج (Vintage)' 
  | 'سايبر بانك (Cyberpunk)' 
  | 'بسيط (Minimalist)' 
  | 'ثلاثي الأبعاد (3D)';

export type Technique = 
  | 'رسم رقمي (Digital)' 
  | 'ألوان مائية (Watercolor)' 
  | 'ألوان زيتية (Oil)' 
  | 'رسم بالقلم (Pen)' 
  | 'ايربراش (Airbrush)' 
  | 'حبر (Ink)' 
  | 'طباعة ريزوغراف (Risograph)';

export type ColorPalette = 
  | 'تلقائي (Auto)' 
  | 'نيون ساطع (Neon)' 
  | 'باستيل هادئ (Pastel)' 
  | 'أحادي اللون (Monochrome)' 
  | 'ألوان ترابية (Earth)' 
  | 'ريترو 80s (Retro)' 
  | 'فيبورويف (Vaporwave)' 
  | 'تخصيص... (Custom)';

export interface DesignState {
  garmentType: GarmentType;
  garmentColor: GarmentColor;
  designMethod: DesignMethod;
  prompt: string;
  referenceImage: string | null;
  referenceImageMimeType: string | null;
  style: ArtisticStyle;
  technique: Technique;
  palette: ColorPalette;
  customPalette?: string;
}

export const STYLE_PROMPTS: Record<ArtisticStyle, string> = {
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
  'ثلاثي الأبعاد (3D)': '3d render, octane render, c4d, plastic, depth, professional'
};

export const TECHNIQUE_PROMPTS: Record<Technique, string> = {
  'رسم رقمي (Digital)': 'digital illustration, crisp digital art',
  'ألوان مائية (Watercolor)': 'watercolor painting, fluid, color bleeds, artisanal',
  'ألوان زيتية (Oil)': 'thick oil painting, impasto, visible brush strokes, fine art',
  'رسم بالقلم (Pen)': 'pen and ink drawing, hatched lines, detailed sketching',
  'ايربراش (Airbrush)': 'airbrush art, smooth gradients, soft edges, glossy',
  'حبر (Ink)': 'black ink wash, sumi-e style, high contrast, elegant strokes',
  'طباعة ريزوغراف (Risograph)': 'risograph print style, textured, vibrant overprinting, grainy'
};

export const PALETTE_PROMPTS: Record<ColorPalette, string> = {
  'تلقائي (Auto)': 'best-matching colors for the theme',
  'نيون ساطع (Neon)': 'vibrant neon colors, cyan, magenta, lime, glowing',
  'باستيل هادئ (Pastel)': 'soft pastel colors, light pink, baby blue, mint green, serene',
  'أحادي اللون (Monochrome)': 'monochrome, black and white, grayscale, varying shades',
  'ألوان ترابية (Earth)': 'earth tones, brown, terracotta, olive green, warm beige, natural',
  'ريترو 80s (Retro)': '80s retro wave colors, hot pink, orange, purple, nostalgic',
  'فيبورويف (Vaporwave)': 'vaporwave palette, turquoise, hot pink, soft purple, sunset yellow',
  'تخصيص... (Custom)': '' // Filled by actual customPalette string
};

// Design History
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

// API Error types
export interface ApiError {
  code: 'INVALID_KEY' | 'GENERATION_FAILED' | 'EXTRACTION_FAILED' | 'NETWORK_ERROR';
  message: string;
}
