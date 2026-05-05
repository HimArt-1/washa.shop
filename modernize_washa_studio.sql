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

-- ٥. إعادة ضبط أماكن الطباعة (تنظيف كامل وإدراج بمعرفات ثابتة)
DELETE FROM custom_design_positions;

INSERT INTO custom_design_positions (id, name, description, image_url, sort_order)
VALUES 
('d1111111-1111-1111-1111-111111111111', 'تصميم أمامي', 'يظهر في الصدر بحجم كبير ومميز.', '/generated/washa_pos_front.png', 0),
('d2222222-2222-2222-2222-222222222222', 'تصميم خلفي', 'يظهر في الظهر بشكل كبير وملفت.', '/generated/washa_pos_back.png', 1),
('d3333333-3333-3333-3333-333333333333', 'شعار يمين', 'يظهر مثل اللوقو في منطقة الصدر اليمنى.', '/generated/washa_pos_right.png', 2),
('d4444444-4444-4444-4444-444444444444', 'شعار يسار', 'يظهر مثل اللوقو في منطقة الصدر اليسرى.', '/generated/washa_pos_left.png', 3);

-- ٦. إعادة ضبط الأساليب الفنية (Styles)
DELETE FROM custom_design_styles;

INSERT INTO custom_design_styles (id, name, description, image_url, sort_order)
VALUES 
('s1111111-1111-1111-1111-111111111111', 'سينمائي (Cinematic)', 'إضاءة درامية وتفاصيل عميقة.', '/thumbnails/style-cinematic.webp', 0),
('s2222222-2222-2222-2222-222222222222', 'تراثي (Heritage)', 'عناصر تراثية بلمسة عصرية فخمة.', '/thumbnails/style-heritage.webp', 1),
('s3333333-3333-3333-3333-333333333333', 'بسيط (Minimalist)', 'خطوط نظيفة ومساحات هادئة.', '/thumbnails/style-minimalist.webp', 2),
('s4444444-4444-4444-4444-444444444444', 'أنمي (Anime)', 'أسلوب الرسوم اليابانية الحيوية.', '/thumbnails/style-anime.webp', 3),
('s5555555-5555-5555-5555-555555555555', 'سايبر بانك (Cyberpunk)', 'ألوان نيون وطابع مستقبلي.', '/thumbnails/style-cyberpunk.webp', 4);

-- ٧. إعادة ضبط التقنيات الفنية (Art Techniques)
DELETE FROM custom_design_art_styles;

INSERT INTO custom_design_art_styles (id, name, description, image_url, sort_order)
VALUES 
('a1111111-1111-1111-1111-111111111111', 'زيتي (Oil Painting)', 'ملمس كلاسيكي فني فاخر.', '/thumbnails/art-oil.webp', 0),
('a2222222-2222-2222-2222-222222222222', 'فيكتور (Vector Art)', 'خطوط حادة وألوان مسطحة واضحة.', '/thumbnails/art-vector.webp', 1),
('a3333333-3333-3333-3333-333333333333', 'رسم يدوي (Hand-Drawn)', 'طابع عفوي وشخصي فريد.', '/thumbnails/art-handdrawn.webp', 2),
('a4444444-4444-4444-4444-444444444444', 'ألوان مائية (Watercolor)', 'تداخلات لونية ناعمة وشفافة.', '/thumbnails/art-watercolor.webp', 3);

-- تفعيل كافة الخيارات
UPDATE custom_design_positions SET is_active = true;
UPDATE custom_design_styles SET is_active = true;
UPDATE custom_design_art_styles SET is_active = true;


