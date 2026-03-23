-- ============================================================
-- WASHA | Smart Store Design Intelligence Bundle
-- ============================================================
-- هذا الملف يجمع ترقية المتجر الذكي إلى:
-- 1) metadata غنية للأنماط والأساليب وباقات الألوان وعناصر الستوديو
-- 2) جدول Presets جاهزة
-- 3) جدول Compatibility Graph
-- 4) بذور محتوى احترافية + Pairings مبدئية
--
-- مناسب للّصق مباشرة في Supabase SQL Editor.
-- يفترض أن جداول Smart Store الأساسية موجودة مسبقًا.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1) Smart Store Design Intelligence Schema
-- المصدر: 20260321090000_smart_store_design_intelligence.sql
-- ------------------------------------------------------------

ALTER TABLE public.custom_design_styles
ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.custom_design_art_styles
ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.custom_design_color_packages
ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.custom_design_studio_items
ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.custom_design_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  story TEXT,
  badge TEXT,
  image_url TEXT,
  garment_id UUID REFERENCES public.custom_design_garments(id) ON DELETE SET NULL,
  design_method TEXT CHECK (design_method IN ('from_text', 'from_image', 'studio') OR design_method IS NULL),
  style_id UUID REFERENCES public.custom_design_styles(id) ON DELETE SET NULL,
  art_style_id UUID REFERENCES public.custom_design_art_styles(id) ON DELETE SET NULL,
  color_package_id UUID REFERENCES public.custom_design_color_packages(id) ON DELETE SET NULL,
  studio_item_id UUID REFERENCES public.custom_design_studio_items(id) ON DELETE SET NULL,
  print_position TEXT CHECK (print_position IN ('chest', 'back', 'shoulder_right', 'shoulder_left') OR print_position IS NULL),
  print_size TEXT CHECK (print_size IN ('large', 'small') OR print_size IS NULL),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cd_presets_active_order
ON public.custom_design_presets (is_active, is_featured, sort_order);

CREATE TABLE IF NOT EXISTS public.custom_design_option_compatibilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL CHECK (source_type IN ('garment', 'style', 'art_style', 'color_package', 'studio_item', 'preset')),
  source_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('garment', 'style', 'art_style', 'color_package', 'studio_item', 'preset')),
  target_id UUID NOT NULL,
  relation TEXT NOT NULL DEFAULT 'recommended' CHECK (relation IN ('recommended', 'signature', 'avoid')),
  score INTEGER NOT NULL DEFAULT 50 CHECK (score >= 0 AND score <= 100),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT custom_design_option_compatibilities_unique_pair
    UNIQUE (source_type, source_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_cd_compat_source
ON public.custom_design_option_compatibilities (source_type, source_id, target_type);

CREATE INDEX IF NOT EXISTS idx_cd_compat_target
ON public.custom_design_option_compatibilities (target_type, target_id, relation);

ALTER TABLE public.custom_design_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_design_option_compatibilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "custom_design_presets_public_read" ON public.custom_design_presets;
CREATE POLICY "custom_design_presets_public_read"
  ON public.custom_design_presets
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "custom_design_option_compatibilities_public_read" ON public.custom_design_option_compatibilities;
CREATE POLICY "custom_design_option_compatibilities_public_read"
  ON public.custom_design_option_compatibilities
  FOR SELECT
  USING (true);

DROP TRIGGER IF EXISTS set_cd_presets_updated_at ON public.custom_design_presets;
CREATE TRIGGER set_cd_presets_updated_at
BEFORE UPDATE ON public.custom_design_presets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_cd_option_compatibilities_updated_at ON public.custom_design_option_compatibilities;
CREATE TRIGGER set_cd_option_compatibilities_updated_at
BEFORE UPDATE ON public.custom_design_option_compatibilities
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------
-- 2) Rich Metadata + Curated Presets + Compatibility Seeds
-- المصدر: 20260321100000_seed_smart_store_design_intelligence.sql
-- ------------------------------------------------------------

UPDATE public.custom_design_styles
SET
  description = 'هوية راقية نظيفة تعتمد على المساحة والتنفس البصري والشعور الفاخر الهادئ، مناسبة للتصاميم الرفيعة التي لا تحتاج ضجيجاً.',
  metadata = jsonb_build_object(
    'creative_direction', 'quiet luxury minimalism',
    'energy', 'low',
    'complexity', 'minimal',
    'luxury_tier', 'editorial',
    'story_hook', 'قطعة هادئة تبدو باهظة بدون أن تصرخ',
    'keywords', jsonb_build_array('minimal', 'clean', 'luxury', 'quiet', 'editorial'),
    'moods', jsonb_build_array('هادئ', 'فاخر', 'واثق'),
    'audiences', jsonb_build_array('daily luxury', 'couples', 'gift'),
    'placements', jsonb_build_array('chest', 'back'),
    'recommended_methods', jsonb_build_array('from_text', 'studio'),
    'notes', 'أفضل ما ينجح معه التكوين المتزن والخامات المحدودة بصرياً.'
  )
WHERE name = 'Minimalist (بسيط وناعم)';

UPDATE public.custom_design_styles
SET
  description = 'هوية مستقبلية جريئة مبنية على النيون والتباين العالي والطبقات الرقمية، تناسب الطرح التجريبي والقطع ذات الحضور القوي.',
  metadata = jsonb_build_object(
    'creative_direction', 'future club energy',
    'energy', 'high',
    'complexity', 'bold',
    'luxury_tier', 'signature',
    'story_hook', 'تصميم يلمع كإشارة حضرية ليلية',
    'keywords', jsonb_build_array('cyberpunk', 'neon', 'future', 'techwear', 'night'),
    'moods', jsonb_build_array('حاد', 'مستقبلي', 'متمرد'),
    'audiences', jsonb_build_array('streetwear', 'drops', 'limited edition'),
    'placements', jsonb_build_array('back', 'chest'),
    'recommended_methods', jsonb_build_array('from_text', 'from_image'),
    'notes', 'يستفيد من الألوان المتوهجة والفراغات الداكنة.'
  )
WHERE name = 'Cyberpunk (عالم السايبر)';

UPDATE public.custom_design_styles
SET
  description = 'روح أرشيفية فيها دفء وحنين بصري، مثالية للقطع التي تريد أن تبدو وكأنها من مجموعة محفوظة بعناية.',
  metadata = jsonb_build_object(
    'creative_direction', 'archive nostalgia',
    'energy', 'medium',
    'complexity', 'balanced',
    'luxury_tier', 'core',
    'story_hook', 'كأن القطعة خرجت من أرشيف موسيقي قديم',
    'keywords', jsonb_build_array('retro', 'archive', 'washed', 'nostalgia', 'vintage'),
    'moods', jsonb_build_array('حنين', 'دافئ', 'أصيل'),
    'audiences', jsonb_build_array('collectors', 'daily wear', 'capsule'),
    'placements', jsonb_build_array('chest', 'back'),
    'recommended_methods', jsonb_build_array('from_text', 'from_image'),
    'notes', 'يناسب البالِتات الباهتة والملمس التقليدي.'
  )
WHERE name = 'Vintage/Retro (كلاسيكي ورجعي)';

UPDATE public.custom_design_styles
SET
  description = 'أسلوب حضري ثقيل بالنبرة البصرية، مبني على الجرأة والشعارات الكبيرة والطبعات ذات الحضور العالي.',
  metadata = jsonb_build_object(
    'creative_direction', 'urban statement',
    'energy', 'high',
    'complexity', 'bold',
    'luxury_tier', 'signature',
    'story_hook', 'قطعة تريد أن تُرى من أول نظرة',
    'keywords', jsonb_build_array('streetwear', 'statement', 'oversized', 'drop', 'attitude'),
    'moods', jsonb_build_array('جريء', 'حضري', 'حاد'),
    'audiences', jsonb_build_array('streetwear', 'campaign', 'drops'),
    'placements', jsonb_build_array('back', 'chest', 'shoulder_right'),
    'recommended_methods', jsonb_build_array('from_text', 'studio'),
    'notes', 'يتحمل تكوينات كبيرة وعبارات قوية.'
  )
WHERE name = 'Streetwear (أزياء الشارع)';

UPDATE public.custom_design_styles
SET
  description = 'تصميم حروفي يشتغل على التكوين والعبارة والإيقاع البصري بدل الرسم التقليدي، مثالي للرسائل والهوية.',
  metadata = jsonb_build_object(
    'creative_direction', 'type as image',
    'energy', 'medium',
    'complexity', 'balanced',
    'luxury_tier', 'editorial',
    'story_hook', 'الحروف هنا هي العمل الفني نفسه',
    'keywords', jsonb_build_array('typography', 'lettering', 'quote', 'composition', 'arabic'),
    'moods', jsonb_build_array('ذكي', 'محرري', 'مركّز'),
    'audiences', jsonb_build_array('brand lovers', 'editorial', 'statement'),
    'placements', jsonb_build_array('chest', 'back', 'shoulder_left'),
    'recommended_methods', jsonb_build_array('from_text'),
    'notes', 'يناسب العبارات المختصرة والهوية الطباعية.'
  )
WHERE name = 'Typography (حروفي/خطوط)';

UPDATE public.custom_design_styles
SET
  description = 'لغة تجريدية حرة تركز على الإيقاع والكتلة واللون والانطباع، ممتازة عندما يكون الهدف شعورًا لا رسالة مباشرة.',
  metadata = jsonb_build_object(
    'creative_direction', 'expressive abstraction',
    'energy', 'medium',
    'complexity', 'bold',
    'luxury_tier', 'editorial',
    'story_hook', 'القطعة تنقل مزاجاً أكثر مما تشرح فكرة',
    'keywords', jsonb_build_array('abstract', 'expressive', 'form', 'shape', 'emotion'),
    'moods', jsonb_build_array('فني', 'غامض', 'حر'),
    'audiences', jsonb_build_array('gallery', 'creative crowd', 'limited'),
    'placements', jsonb_build_array('back', 'chest'),
    'recommended_methods', jsonb_build_array('from_text', 'from_image'),
    'notes', 'يفضل معه وصف شعوري أو مرجعية بصرية واضحة.'
  )
WHERE name = 'Abstract Form (تجريدي حر)';

UPDATE public.custom_design_art_styles
SET
  description = 'خط عربي متقاطع بطابع متحفي فاخر، يعطي التصميم سكينة وهيبة في الوقت نفسه.',
  metadata = jsonb_build_object(
    'creative_direction', 'heritage calligraphy',
    'energy', 'medium',
    'complexity', 'balanced',
    'luxury_tier', 'editorial',
    'story_hook', 'الفن هنا يتحدث بلسان عربي فاخر',
    'keywords', jsonb_build_array('arabic', 'calligraphy', 'heritage', 'ornament', 'luxury'),
    'moods', jsonb_build_array('أصيل', 'فاخر', 'روحاني'),
    'audiences', jsonb_build_array('arabic luxury', 'gifts', 'cultural drops'),
    'placements', jsonb_build_array('chest', 'back'),
    'recommended_methods', jsonb_build_array('from_text', 'studio'),
    'notes', 'يناسب الحروف والرموز والاقتباسات المختصرة.'
  )
WHERE name = 'Arabic Calligraphy (مخطوطة عربية)';

UPDATE public.custom_design_art_styles
SET
  description = 'أسلوب ذو ملمس واضح وطبقات لونية عميقة يمنح العمل ثقلاً بصريًا ونبرة فنية كلاسيكية.',
  metadata = jsonb_build_object(
    'creative_direction', 'textured classic painting',
    'energy', 'medium',
    'complexity', 'bold',
    'luxury_tier', 'signature',
    'story_hook', 'القطعة تبدو كأنها لوحة محمولة',
    'keywords', jsonb_build_array('oil', 'texture', 'classic', 'paint', 'depth'),
    'moods', jsonb_build_array('غني', 'فني', 'عميق'),
    'audiences', jsonb_build_array('gallery crowd', 'collector drops'),
    'placements', jsonb_build_array('back', 'chest'),
    'recommended_methods', jsonb_build_array('from_image', 'from_text'),
    'notes', 'أفضل للسطوح الأكبر والحضور القوي.'
  )
WHERE name = 'Oil Painting (رسم زيتي الملمس)';

UPDATE public.custom_design_art_styles
SET
  description = 'فن خطي نقي يبرز الحواف والنِّسب ويعطي النتيجة طابعًا راقيًا وخفيفًا.',
  metadata = jsonb_build_object(
    'creative_direction', 'precision linework',
    'energy', 'low',
    'complexity', 'minimal',
    'luxury_tier', 'core',
    'story_hook', 'لمسة ناعمة عالية الذكاء البصري',
    'keywords', jsonb_build_array('line-art', 'outline', 'clean', 'minimal', 'graphic'),
    'moods', jsonb_build_array('نظيف', 'خفيف', 'متزن'),
    'audiences', jsonb_build_array('daily wear', 'minimal lovers'),
    'placements', jsonb_build_array('chest', 'shoulder_left', 'shoulder_right'),
    'recommended_methods', jsonb_build_array('from_text', 'from_image'),
    'notes', 'مناسب للتكوينات الصغيرة والمواقع الدقيقة.'
  )
WHERE name = 'Line Art (فن الخطوط المفرغة)';

UPDATE public.custom_design_art_styles
SET
  description = 'أسلوب شفاف ناعم بحواف مائية وانسيابية عالية، يضيف رقة وحركة دون صلابة زائدة.',
  metadata = jsonb_build_object(
    'creative_direction', 'soft fluid pigment',
    'energy', 'low',
    'complexity', 'balanced',
    'luxury_tier', 'core',
    'story_hook', 'تدفق لوني ناعم كأنه مطبوع على الهواء',
    'keywords', jsonb_build_array('watercolor', 'soft', 'fluid', 'wash', 'light'),
    'moods', jsonb_build_array('رقيق', 'شاعري', 'هادئ'),
    'audiences', jsonb_build_array('gifts', 'daily luxury', 'capsule'),
    'placements', jsonb_build_array('chest', 'back'),
    'recommended_methods', jsonb_build_array('from_image', 'from_text'),
    'notes', 'يناسب الألوان الفاتحة والتركيبات الهادئة.'
  )
WHERE name = 'Watercolor (ألوان مائية)';

UPDATE public.custom_design_art_styles
SET
  description = 'معالجة ثلاثية الأبعاد بلمعان وحدّة تعطي العناصر حضورًا بارزًا ومشهدية عالية.',
  metadata = jsonb_build_object(
    'creative_direction', 'dimensional render impact',
    'energy', 'high',
    'complexity', 'bold',
    'luxury_tier', 'signature',
    'story_hook', 'العنصر يبدو وكأنه يطفو فوق القماش',
    'keywords', jsonb_build_array('3d', 'render', 'depth', 'futuristic', 'impact'),
    'moods', jsonb_build_array('قوي', 'لامع', 'تقني'),
    'audiences', jsonb_build_array('drops', 'collectors', 'statement'),
    'placements', jsonb_build_array('back', 'chest'),
    'recommended_methods', jsonb_build_array('from_text', 'from_image'),
    'notes', 'أفضل مع الباك الغرافيكي أو التكوينات البارزة.'
  )
WHERE name = '3D Render (مجسم ثلاثي الأبعاد)';

UPDATE public.custom_design_art_styles
SET
  description = 'أسلوب أنمي كلاسيكي دافئ يعطي الحملة روحًا عاطفية ونبرة نوستالجيا مرئية.',
  metadata = jsonb_build_object(
    'creative_direction', 'nostalgic illustrated frame',
    'energy', 'medium',
    'complexity', 'balanced',
    'luxury_tier', 'signature',
    'story_hook', 'مشهد أنمي محفوظ في ذاكرة التسعينات',
    'keywords', jsonb_build_array('anime', 'retro', 'character', 'warm', 'nostalgia'),
    'moods', jsonb_build_array('حنين', 'درامي', 'مرح'),
    'audiences', jsonb_build_array('anime crowd', 'drops', 'fan capsule'),
    'placements', jsonb_build_array('back', 'chest'),
    'recommended_methods', jsonb_build_array('from_image', 'from_text'),
    'notes', 'يحتاج قصة بصرية أو وصف شخصية/مشهد.'
  )
WHERE name = 'Retro Anime (أنمي كلاسيكي)';

UPDATE public.custom_design_color_packages
SET
  colors = jsonb_build_array(
    jsonb_build_object('hex', '#1a1a24', 'name', 'ليل فحمي'),
    jsonb_build_object('hex', '#3b3b58', 'name', 'بنفسجي مديني'),
    jsonb_build_object('hex', '#e63946', 'name', 'أحمر إنذار')
  ),
  metadata = jsonb_build_object(
    'palette_family', 'dark contrast',
    'energy', 'high',
    'luxury_tier', 'signature',
    'keywords', jsonb_build_array('night', 'dramatic', 'contrast'),
    'moods', jsonb_build_array('ليلي', 'حاد', 'مسرحي'),
    'placements', jsonb_build_array('back', 'chest'),
    'notes', 'ممتازة للسايبر والستريت وير القوي.'
  )
WHERE name = 'Midnight Vibes (ألوان منتصف الليل)';

UPDATE public.custom_design_color_packages
SET
  colors = jsonb_build_array(
    jsonb_build_object('hex', '#e5d3b3', 'name', 'رمل فاتح'),
    jsonb_build_object('hex', '#d4a373', 'name', 'طين صحراوي'),
    jsonb_build_object('hex', '#faedcd', 'name', 'كريمي ناعم')
  ),
  metadata = jsonb_build_object(
    'palette_family', 'earth neutral',
    'energy', 'low',
    'luxury_tier', 'editorial',
    'keywords', jsonb_build_array('desert', 'earth', 'neutral'),
    'moods', jsonb_build_array('دافئ', 'طبيعي', 'هادئ'),
    'placements', jsonb_build_array('chest', 'back'),
    'notes', 'مثالية للكاليغرافي والستايل الهادئ.'
  )
WHERE name = 'Desert Sand (رمال الصحراء)';

UPDATE public.custom_design_color_packages
SET
  colors = jsonb_build_array(
    jsonb_build_object('hex', '#00f5d4', 'name', 'فيروزي نيون'),
    jsonb_build_object('hex', '#f15bb5', 'name', 'وردي كهربائي'),
    jsonb_build_object('hex', '#fee440', 'name', 'أصفر مشع')
  ),
  metadata = jsonb_build_object(
    'palette_family', 'neon club',
    'energy', 'high',
    'luxury_tier', 'signature',
    'keywords', jsonb_build_array('neon', 'club', 'electric'),
    'moods', jsonb_build_array('كهربائي', 'جريء', 'متوهج'),
    'placements', jsonb_build_array('back', 'chest'),
    'notes', 'أنسب باقة لهويات السايبر والدروب السريعة.'
  )
WHERE name = 'Neon Lights (إضاءة نيون)';

UPDATE public.custom_design_color_packages
SET
  colors = jsonb_build_array(
    jsonb_build_object('hex', '#ffcbf2', 'name', 'وردي باستيلي'),
    jsonb_build_object('hex', '#e2ece9', 'name', 'ضباب ناعم'),
    jsonb_build_object('hex', '#fdf0d5', 'name', 'فانيلا باهتة')
  ),
  metadata = jsonb_build_object(
    'palette_family', 'pastel soft',
    'energy', 'low',
    'luxury_tier', 'core',
    'keywords', jsonb_build_array('pastel', 'soft', 'dreamy'),
    'moods', jsonb_build_array('حالم', 'لطيف', 'خفيف'),
    'placements', jsonb_build_array('chest', 'back'),
    'notes', 'يناسب المائي والـ line art والعناصر الشاعرية.'
  )
WHERE name = 'Pastel Dreams (أحلام الباستيل)';

UPDATE public.custom_design_color_packages
SET
  colors = jsonb_build_array(
    jsonb_build_object('hex', '#606c38', 'name', 'زيتوني غامق'),
    jsonb_build_object('hex', '#283618', 'name', 'أخضر طحلبي'),
    jsonb_build_object('hex', '#dda15e', 'name', 'نحاسي دافئ')
  ),
  metadata = jsonb_build_object(
    'palette_family', 'earth rich',
    'energy', 'medium',
    'luxury_tier', 'editorial',
    'keywords', jsonb_build_array('earth', 'organic', 'heritage'),
    'moods', jsonb_build_array('ترابي', 'ثقيل', 'أصيل'),
    'placements', jsonb_build_array('back', 'chest'),
    'notes', 'ممتازة للتجريدي الدافئ والهوية التراثية.'
  )
WHERE name = 'Earth Tones (ألوان ترابية دافئة)';

UPDATE public.custom_design_color_packages
SET
  colors = jsonb_build_array(
    jsonb_build_object('hex', '#ffffff', 'name', 'أبيض صافي'),
    jsonb_build_object('hex', '#8c8c8c', 'name', 'رمادي معدني'),
    jsonb_build_object('hex', '#000000', 'name', 'أسود فاحم')
  ),
  metadata = jsonb_build_object(
    'palette_family', 'monochrome luxe',
    'energy', 'medium',
    'luxury_tier', 'editorial',
    'keywords', jsonb_build_array('mono', 'luxury', 'clean', 'contrast'),
    'moods', jsonb_build_array('فاخر', 'محرري', 'نظيف'),
    'placements', jsonb_build_array('chest', 'shoulder_left', 'shoulder_right', 'back'),
    'notes', 'أفضل خيار للنصوص والخطوط والتصاميم الهادئة الراقية.'
  )
WHERE name = 'Monochrome (أبيض وأسود فاخر)';

WITH preset_refs AS (
  SELECT
    (SELECT id FROM public.custom_design_styles WHERE name = 'Minimalist (بسيط وناعم)' LIMIT 1) AS minimalist_style_id,
    (SELECT id FROM public.custom_design_styles WHERE name = 'Cyberpunk (عالم السايبر)' LIMIT 1) AS cyberpunk_style_id,
    (SELECT id FROM public.custom_design_styles WHERE name = 'Streetwear (أزياء الشارع)' LIMIT 1) AS streetwear_style_id,
    (SELECT id FROM public.custom_design_styles WHERE name = 'Typography (حروفي/خطوط)' LIMIT 1) AS typography_style_id,
    (SELECT id FROM public.custom_design_styles WHERE name = 'Vintage/Retro (كلاسيكي ورجعي)' LIMIT 1) AS vintage_style_id,
    (SELECT id FROM public.custom_design_styles WHERE name = 'Abstract Form (تجريدي حر)' LIMIT 1) AS abstract_style_id,
    (SELECT id FROM public.custom_design_art_styles WHERE name = 'Arabic Calligraphy (مخطوطة عربية)' LIMIT 1) AS calligraphy_art_id,
    (SELECT id FROM public.custom_design_art_styles WHERE name = '3D Render (مجسم ثلاثي الأبعاد)' LIMIT 1) AS render_art_id,
    (SELECT id FROM public.custom_design_art_styles WHERE name = 'Line Art (فن الخطوط المفرغة)' LIMIT 1) AS line_art_id,
    (SELECT id FROM public.custom_design_art_styles WHERE name = 'Retro Anime (أنمي كلاسيكي)' LIMIT 1) AS anime_art_id,
    (SELECT id FROM public.custom_design_art_styles WHERE name = 'Watercolor (ألوان مائية)' LIMIT 1) AS watercolor_art_id,
    (SELECT id FROM public.custom_design_color_packages WHERE name = 'Monochrome (أبيض وأسود فاخر)' LIMIT 1) AS mono_palette_id,
    (SELECT id FROM public.custom_design_color_packages WHERE name = 'Neon Lights (إضاءة نيون)' LIMIT 1) AS neon_palette_id,
    (SELECT id FROM public.custom_design_color_packages WHERE name = 'Desert Sand (رمال الصحراء)' LIMIT 1) AS desert_palette_id,
    (SELECT id FROM public.custom_design_color_packages WHERE name = 'Midnight Vibes (ألوان منتصف الليل)' LIMIT 1) AS midnight_palette_id,
    (SELECT id FROM public.custom_design_color_packages WHERE name = 'Pastel Dreams (أحلام الباستيل)' LIMIT 1) AS pastel_palette_id,
    (SELECT id FROM public.custom_design_color_packages WHERE name = 'Earth Tones (ألوان ترابية دافئة)' LIMIT 1) AS earth_palette_id
)
INSERT INTO public.custom_design_presets (
  name,
  slug,
  description,
  story,
  badge,
  design_method,
  style_id,
  art_style_id,
  color_package_id,
  print_position,
  print_size,
  sort_order,
  is_featured,
  is_active,
  metadata
)
SELECT * FROM (
  SELECT
    'Maison Monochrome'::text,
    'maison-monochrome'::text,
    'تركيبة فاخرة هادئة تعتمد على النص والخط العربي الأبيض والأسود.'::text,
    'لمن يريد قطعة محررية أنيقة بلمسة ثقافية راقية.'::text,
    'Signature'::text,
    'from_text'::text,
    minimalist_style_id,
    calligraphy_art_id,
    mono_palette_id,
    'chest'::text,
    'small'::text,
    10,
    true,
    true,
    jsonb_build_object(
      'creative_direction', 'quiet arabic luxury',
      'keywords', jsonb_build_array('monochrome', 'calligraphy', 'luxury'),
      'notes', 'بداية ممتازة للهدايا والقطع الهادئة الراقية.'
    )
  FROM preset_refs

  UNION ALL

  SELECT
    'Neon After Midnight',
    'neon-after-midnight',
    'توليفة دروب ليلية جريئة بطبقات نيون ولمعة رقمية.',
    'قطعة تحمل طاقة مدينة مستقبلية بعد منتصف الليل.',
    'Drop Ready',
    'from_text',
    cyberpunk_style_id,
    render_art_id,
    neon_palette_id,
    'back',
    'large',
    20,
    true,
    true,
    jsonb_build_object(
      'creative_direction', 'future street drop',
      'keywords', jsonb_build_array('neon', 'cyber', 'impact'),
      'notes', 'مناسبة لحملات الإطلاقات السريعة والتصاميم الصارخة.'
    )
  FROM preset_refs

  UNION ALL

  SELECT
    'Archive Street Poster',
    'archive-street-poster',
    'خلطة ستريت وير أرشيفية بطابع قديم وعبارة أو رمز واضح.',
    'تحس أنك ترتدي بوستر قديم منسق بعناية.',
    'Archive',
    'from_text',
    streetwear_style_id,
    line_art_id,
    earth_palette_id,
    'back',
    'large',
    30,
    true,
    true,
    jsonb_build_object(
      'creative_direction', 'archive poster energy',
      'keywords', jsonb_build_array('streetwear', 'poster', 'archive'),
      'notes', 'أفضل مع عبارة قصيرة أو رمز بصري قوي.'
    )
  FROM preset_refs

  UNION ALL

  SELECT
    'Desert Letterform',
    'desert-letterform',
    'Preset هادئ يجمع بين الطباعة العربية وألوان الصحراء وهدوء القماش.',
    'تركيبة راقية تناسب القطع اليومية الفاخرة.',
    'Editorial',
    'from_text',
    typography_style_id,
    calligraphy_art_id,
    desert_palette_id,
    'chest',
    'small',
    40,
    false,
    true,
    jsonb_build_object(
      'creative_direction', 'soft heritage typography',
      'keywords', jsonb_build_array('arabic type', 'desert', 'editorial'),
      'notes', 'مناسب للأسماء والعبارات الشخصية.'
    )
  FROM preset_refs

  UNION ALL

  SELECT
    'Retro Frame Story',
    'retro-frame-story',
    'مشهد بصري دافئ مستوحى من الأنمي الكلاسيكي والأرشيف الملون.',
    'Preset مناسب للتصاميم القصصية والصور المرجعية.',
    'Nostalgia',
    'from_image',
    vintage_style_id,
    anime_art_id,
    pastel_palette_id,
    'back',
    'large',
    50,
    false,
    true,
    jsonb_build_object(
      'creative_direction', 'nostalgic illustrated scene',
      'keywords', jsonb_build_array('anime', 'retro', 'nostalgia'),
      'notes', 'يلائم الصور المرجعية واللقطات القصصية.'
    )
  FROM preset_refs

  UNION ALL

  SELECT
    'Fluid Museum',
    'fluid-museum',
    'Preset تجريدي مائي يعطي القطعة حضور معرضي مع تدرجات ناعمة.',
    'للقطع التي تريدها أقرب لعمل فني قابل للارتداء.',
    'Gallery',
    'from_image',
    abstract_style_id,
    watercolor_art_id,
    midnight_palette_id,
    'back',
    'large',
    60,
    false,
    true,
    jsonb_build_object(
      'creative_direction', 'wearable gallery abstraction',
      'keywords', jsonb_build_array('abstract', 'watercolor', 'gallery'),
      'notes', 'مثالي للتجارب الأكثر فنية وأقل مباشرة.'
    )
  FROM preset_refs
) AS presets
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  story = EXCLUDED.story,
  badge = EXCLUDED.badge,
  design_method = EXCLUDED.design_method,
  style_id = EXCLUDED.style_id,
  art_style_id = EXCLUDED.art_style_id,
  color_package_id = EXCLUDED.color_package_id,
  print_position = EXCLUDED.print_position,
  print_size = EXCLUDED.print_size,
  sort_order = EXCLUDED.sort_order,
  is_featured = EXCLUDED.is_featured,
  is_active = EXCLUDED.is_active,
  metadata = EXCLUDED.metadata;

WITH compat_refs AS (
  SELECT
    (SELECT id FROM public.custom_design_styles WHERE name = 'Minimalist (بسيط وناعم)' LIMIT 1) AS minimalist_style_id,
    (SELECT id FROM public.custom_design_styles WHERE name = 'Cyberpunk (عالم السايبر)' LIMIT 1) AS cyberpunk_style_id,
    (SELECT id FROM public.custom_design_styles WHERE name = 'Streetwear (أزياء الشارع)' LIMIT 1) AS streetwear_style_id,
    (SELECT id FROM public.custom_design_styles WHERE name = 'Typography (حروفي/خطوط)' LIMIT 1) AS typography_style_id,
    (SELECT id FROM public.custom_design_styles WHERE name = 'Vintage/Retro (كلاسيكي ورجعي)' LIMIT 1) AS vintage_style_id,
    (SELECT id FROM public.custom_design_styles WHERE name = 'Abstract Form (تجريدي حر)' LIMIT 1) AS abstract_style_id,
    (SELECT id FROM public.custom_design_art_styles WHERE name = 'Arabic Calligraphy (مخطوطة عربية)' LIMIT 1) AS calligraphy_art_id,
    (SELECT id FROM public.custom_design_art_styles WHERE name = '3D Render (مجسم ثلاثي الأبعاد)' LIMIT 1) AS render_art_id,
    (SELECT id FROM public.custom_design_art_styles WHERE name = 'Line Art (فن الخطوط المفرغة)' LIMIT 1) AS line_art_id,
    (SELECT id FROM public.custom_design_art_styles WHERE name = 'Retro Anime (أنمي كلاسيكي)' LIMIT 1) AS anime_art_id,
    (SELECT id FROM public.custom_design_art_styles WHERE name = 'Watercolor (ألوان مائية)' LIMIT 1) AS watercolor_art_id,
    (SELECT id FROM public.custom_design_color_packages WHERE name = 'Monochrome (أبيض وأسود فاخر)' LIMIT 1) AS mono_palette_id,
    (SELECT id FROM public.custom_design_color_packages WHERE name = 'Neon Lights (إضاءة نيون)' LIMIT 1) AS neon_palette_id,
    (SELECT id FROM public.custom_design_color_packages WHERE name = 'Desert Sand (رمال الصحراء)' LIMIT 1) AS desert_palette_id,
    (SELECT id FROM public.custom_design_color_packages WHERE name = 'Midnight Vibes (ألوان منتصف الليل)' LIMIT 1) AS midnight_palette_id,
    (SELECT id FROM public.custom_design_color_packages WHERE name = 'Pastel Dreams (أحلام الباستيل)' LIMIT 1) AS pastel_palette_id,
    (SELECT id FROM public.custom_design_color_packages WHERE name = 'Earth Tones (ألوان ترابية دافئة)' LIMIT 1) AS earth_palette_id
)
INSERT INTO public.custom_design_option_compatibilities (
  source_type,
  source_id,
  target_type,
  target_id,
  relation,
  score,
  reason
)
SELECT * FROM (
  SELECT 'style'::text, minimalist_style_id, 'art_style'::text, calligraphy_art_id, 'signature'::text, 96, 'الكاليغرافي مع المينيمال يخلق هدوءًا فاخرًا.'
  FROM compat_refs
  UNION ALL
  SELECT 'style', minimalist_style_id, 'color_package', mono_palette_id, 'signature', 94, 'الأسود والأبيض أفضل رفيق للهوية الهادئة.'
  FROM compat_refs
  UNION ALL
  SELECT 'style', cyberpunk_style_id, 'art_style', render_art_id, 'signature', 97, 'الـ 3D render يرفع إحساس المستقبلية مباشرة.'
  FROM compat_refs
  UNION ALL
  SELECT 'style', cyberpunk_style_id, 'color_package', neon_palette_id, 'signature', 99, 'هذه هي الخلطة الأكثر منطقية للسايبر.'
  FROM compat_refs
  UNION ALL
  SELECT 'style', cyberpunk_style_id, 'color_package', pastel_palette_id, 'avoid', 18, 'الباستيل يضعف هوية السايبر عالية الطاقة.'
  FROM compat_refs
  UNION ALL
  SELECT 'style', streetwear_style_id, 'art_style', line_art_id, 'recommended', 83, 'الخطوط النظيفة تبني شعارًا/رمزًا حضريًا واضحًا.'
  FROM compat_refs
  UNION ALL
  SELECT 'style', streetwear_style_id, 'color_package', earth_palette_id, 'recommended', 81, 'الألوان الترابية تمنح الستريت وير عمقًا أرشيفيًا.'
  FROM compat_refs
  UNION ALL
  SELECT 'style', typography_style_id, 'art_style', calligraphy_art_id, 'signature', 95, 'أفضل تركيب للنصوص العربية الراقية.'
  FROM compat_refs
  UNION ALL
  SELECT 'style', typography_style_id, 'color_package', mono_palette_id, 'signature', 92, 'المونوكروم يركز العين على الحرف والتكوين.'
  FROM compat_refs
  UNION ALL
  SELECT 'style', vintage_style_id, 'art_style', anime_art_id, 'recommended', 87, 'الأنمي الكلاسيكي ينسجم مع النبرة الرجعية مباشرة.'
  FROM compat_refs
  UNION ALL
  SELECT 'style', vintage_style_id, 'color_package', pastel_palette_id, 'recommended', 84, 'الباستيل يمنح الفينتج دفئًا بصريًا سلسًا.'
  FROM compat_refs
  UNION ALL
  SELECT 'style', abstract_style_id, 'art_style', watercolor_art_id, 'signature', 90, 'المائي مع التجريدي يعطي نتيجة معرضية قوية.'
  FROM compat_refs
  UNION ALL
  SELECT 'style', abstract_style_id, 'color_package', midnight_palette_id, 'recommended', 79, 'البالِت الليلي يدعم العمق والتباين.'
  FROM compat_refs
  UNION ALL
  SELECT 'art_style', calligraphy_art_id, 'color_package', desert_palette_id, 'recommended', 88, 'ألوان الصحراء تضيف أصالة وهدوءًا للكاليغرافي.'
  FROM compat_refs
) AS compat_rows(source_type, source_id, target_type, target_id, relation, score, reason)
WHERE compat_rows.source_id IS NOT NULL AND compat_rows.target_id IS NOT NULL
ON CONFLICT (source_type, source_id, target_type, target_id) DO UPDATE SET
  relation = EXCLUDED.relation,
  score = EXCLUDED.score,
  reason = EXCLUDED.reason;

COMMIT;
