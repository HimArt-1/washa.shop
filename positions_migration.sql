-- إنشاء جدول أماكن التصميم (Print Positions)
CREATE TABLE public.custom_design_positions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- إضافة سياسات الأمان RLS
ALTER TABLE public.custom_design_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.custom_design_positions
    FOR SELECT USING (true);

CREATE POLICY "Enable write access for admins" ON public.custom_design_positions
    FOR ALL USING (auth.role() = 'authenticated'); -- يمكنك تعديلها لتناسب صلاحيات الأدمن

-- إدراج البيانات الأساسية (التي كانت موجودة مسبقاً بشكل ثابت)
INSERT INTO public.custom_design_positions (id, name, description, sort_order) VALUES
('front_large', 'تصميم أمامي', 'يظهر في الصدر بحجم كبير ومميز ليكون واجهة القطعة الأساسية.', 1),
('back_large', 'تصميم خلفي', 'يظهر في الظهر بشكل كبير، مثالي للتصاميم المعقدة والملفتة.', 2),
('logo_right', 'تصميم شعار بسيط (يمين)', 'يظهر مثل اللوقو في منطقة الصدر من الجهة اليمنى.', 3),
('logo_left', 'تصميم شعار بسيط (يسار)', 'يظهر مثل اللوقو في منطقة الصدر من الجهة اليسرى (جهة القلب).', 4)
ON CONFLICT (id) DO NOTHING;

-- تحديث الدالة trigger لتحديث وقت التعديل
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_custom_design_positions_modtime
BEFORE UPDATE ON public.custom_design_positions
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
