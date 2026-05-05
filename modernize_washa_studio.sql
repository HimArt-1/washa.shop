-- ═══════════════════════════════════════════════════════════
--  تحديثات استوديو وشّى | Modernize WUSHA Studio Updates
-- ═══════════════════════════════════════════════════════════

-- ١. تفعيل إضافة توليد المعرفات العشوائية
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ٢. إنشاء الجدول (في حال لم يكن موجوداً) وتأكيد التوليد التلقائي لـ ID
CREATE TABLE IF NOT EXISTS custom_design_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- التأكد من أن العمود ID لديه قيمة افتراضية حتى لو كان الجدول موجوداً من قبل
ALTER TABLE custom_design_positions ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- ٣. استبدال وتحديث صور القطع بصور احترافية جديدة تم توليدها
UPDATE custom_design_garments SET image_url = '/generated/washa_tshirt.png' WHERE name = 'تيشيرت' OR name = 'تي شيرت' OR slug = 'tshirt';
UPDATE custom_design_garments SET name = 'بلوفر', slug = 'pullover', image_url = '/generated/washa_pullover.png' WHERE name = 'جاكيت' OR name = 'Jacket' OR slug = 'jacket';
UPDATE custom_design_garments SET image_url = '/generated/washa_hoodie.png' WHERE name = 'هودي' OR name = 'Hoodie' OR slug = 'hoodie';

-- ٤. تصحيح ألوان بطاقة "تلقائي" لضمان عدم ظهور ألوان رمادية باهتة
UPDATE custom_design_color_packages
SET colors = '[{"hex": "#C9A86C", "name": "ذهب وشّى"}, {"hex": "#111111", "name": "أسود داكن"}, {"hex": "#FFFFFF", "name": "أبيض ناصع"}]'::jsonb
WHERE name = 'تلقائي (Auto)' OR name = 'تلقائي';

-- ٥. إضافة وتحديث بيانات أماكن الطباعة الافتراضية
-- تنظيف الجدول أولاً لضمان عدم وجود تكرار من التشغيل السابق
DELETE FROM custom_design_positions;

INSERT INTO custom_design_positions (id, name, description, image_url, sort_order)
VALUES 
('d1111111-1111-1111-1111-111111111111', 'تصميم أمامي', 'يظهر في الصدر بحجم كبير ومميز ليكون واجهة القطعة الأساسية.', '/generated/washa_pos_front.png', 0),
('d2222222-2222-2222-2222-222222222222', 'تصميم خلفي', 'يظهر في الظهر بشكل كبير، مثالي للتصاميم المعقدة والملفتة.', '/generated/washa_pos_back.png', 1),
('d3333333-3333-3333-3333-333333333333', 'شعار يمين', 'يظهر مثل اللوقو في منطقة الصدر من الجهة اليمنى.', '/generated/washa_pos_right.png', 2),
('d4444444-4444-4444-4444-444444444444', 'شعار يسار', 'يظهر مثل اللوقو في منطقة الصدر من الجهة اليسرى (جهة القلب).', '/generated/washa_pos_left.png', 3)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    image_url = EXCLUDED.image_url,
    sort_order = EXCLUDED.sort_order;

-- ٦. تحديث صور بطاقات الأساليب الفنية (Styles)
UPDATE custom_design_styles SET image_url = '/thumbnails/styles/sticker.png' WHERE name = 'ملصق (Sticker)';
UPDATE custom_design_styles SET image_url = '/thumbnails/styles/anime.png' WHERE name = 'أنمي/مانغا (Anime/Manga)';
UPDATE custom_design_styles SET image_url = '/thumbnails/styles/pop_art.png' WHERE name = 'بوب آرت (Pop Art)';
UPDATE custom_design_styles SET image_url = '/thumbnails/styles/graffiti.png' WHERE name = 'جرافيتي (Graffiti)';
UPDATE custom_design_styles SET image_url = '/thumbnails/styles/line_art.png' WHERE name = 'فن الخطوط (Line Art)';
UPDATE custom_design_styles SET image_url = '/thumbnails/styles/geometric.png' WHERE name = 'هندسي (Geometric)';
UPDATE custom_design_styles SET image_url = '/thumbnails/styles/pixel_art.png' WHERE name = 'بكسل آرت (Pixel Art)';
UPDATE custom_design_styles SET image_url = '/thumbnails/styles/vintage.png' WHERE name = 'فينتيج (Vintage)';
UPDATE custom_design_styles SET image_url = '/thumbnails/styles/cyberpunk.png' WHERE name = 'سايبر بانك (Cyberpunk)';
UPDATE custom_design_styles SET image_url = '/thumbnails/styles/minimalist.png' WHERE name = 'بسيط (Minimalist)';
UPDATE custom_design_styles SET image_url = '/thumbnails/styles/3d.png' WHERE name = 'ثلاثي الأبعاد (3D)';

-- ٧. تحديث صور بطاقات التقنيات الفنية (Art Techniques)
UPDATE custom_design_art_styles SET image_url = '/thumbnails/techniques/digital.png' WHERE name = 'رسم رقمي (Digital)';
UPDATE custom_design_art_styles SET image_url = '/thumbnails/techniques/watercolor.png' WHERE name = 'ألوان مائية (Watercolor)';
UPDATE custom_design_art_styles SET image_url = '/thumbnails/techniques/oil.png' WHERE name = 'ألوان زيتية (Oil)';
UPDATE custom_design_art_styles SET image_url = '/thumbnails/techniques/pen.png' WHERE name = 'رسم بالقلم (Pen)';
UPDATE custom_design_art_styles SET image_url = '/thumbnails/techniques/airbrush.png' WHERE name = 'ايربراش (Airbrush)';
UPDATE custom_design_art_styles SET image_url = '/thumbnails/techniques/ink.png' WHERE name = 'حبر (Ink)';
UPDATE custom_design_art_styles SET image_url = '/thumbnails/techniques/risograph.png' WHERE name = 'طباعة ريزوغراف (Risograph)';


