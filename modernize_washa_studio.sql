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
UPDATE custom_design_positions SET image_url = '/generated/washa_pos_front.png' WHERE name = 'تصميم أمامي';
UPDATE custom_design_positions SET image_url = '/generated/washa_pos_back.png' WHERE name = 'تصميم خلفي';
UPDATE custom_design_positions SET image_url = '/generated/washa_pos_front.png' WHERE name = 'شعار يمين';
UPDATE custom_design_positions SET image_url = '/generated/washa_pos_front.png' WHERE name = 'شعار يسار';

INSERT INTO custom_design_positions (id, name, description, image_url, sort_order)
VALUES 
(gen_random_uuid(), 'تصميم أمامي', 'يظهر في الصدر بحجم كبير ومميز ليكون واجهة القطعة الأساسية.', '/generated/washa_pos_front.png', 0),
(gen_random_uuid(), 'تصميم خلفي', 'يظهر في الظهر بشكل كبير، مثالي للتصاميم المعقدة والملفتة.', '/generated/washa_pos_back.png', 1),
(gen_random_uuid(), 'شعار يمين', 'يظهر مثل اللوقو في منطقة الصدر من الجهة اليمنى.', '/generated/washa_pos_front.png', 2),
(gen_random_uuid(), 'شعار يسار', 'يظهر مثل اللوقو في منطقة الصدر من الجهة اليسرى (جهة القلب).', '/generated/washa_pos_front.png', 3)
ON CONFLICT (id) DO NOTHING;
