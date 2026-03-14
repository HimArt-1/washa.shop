-- Seed 6 Premium Design Styles
INSERT INTO public.custom_design_styles (name, description, sort_order, is_active)
VALUES
  ('Minimalist (بسيط وناعم)', 'تصميم هادئ يركز على المساحات السلبية والتفاصيل الدقيقة، مثالي للمظهر العصري.', 10, true),
  ('Cyberpunk (عالم السايبر)', 'ألوان نيون صارخة وتصاميم مستوحاة من التكنولوجيا والمستقبل وجماليات الخيال العلمي.', 20, true),
  ('Vintage/Retro (كلاسيكي ورجعي)', 'طابع الحنين للماضي مع ألوان باهتة قليلاً وجماليات فترة الثمانينات والتسعينات.', 30, true),
  ('Streetwear (أزياء الشارع)', 'تصاميم قوية وجريئة، ذات مظهر جرافيتي خشن يناسب ثقافة الهيب هوب والستريت وير.', 40, true),
  ('Typography (حروفي/خطوط)', 'اعتماد التصميم كلياً على ترتيب وتكوين الحروف والعبارات بطريقة إبداعية ملفته.', 50, true),
  ('Abstract Form (تجريدي حر)', 'أشكال هندسية غير متوقعة وتداخلات فنية حرة لا تعبر عن شيء ملموس، بل عن مشاعر.', 60, true)
ON CONFLICT DO NOTHING;

-- Seed 6 Premium Art Styles
INSERT INTO public.custom_design_art_styles (name, description, sort_order, is_active)
VALUES
  ('Arabic Calligraphy (مخطوطة عربية)', 'فن الخط العربي الأصيل والمتداخل، يعطي طابعاً فاخراً وراقياً.', 10, true),
  ('Oil Painting (رسم زيتي الملمس)', 'ضربات فرشاة واضحة وألوان عميقة تذكرنا باللوحات الزيتية الكلاسيكية.', 20, true),
  ('Line Art (فن الخطوط المفرغة)', 'رسم يعتمد فقط على رسم الخطوط الخارجية بدون تلوين متصل، لعمق في البساطة.', 30, true),
  ('Watercolor (ألوان مائية)', 'انتشار ناعم للألوان وتداخلات خفيفة شفافة تناسب التصاميم الرقيقة.', 40, true),
  ('3D Render (مجسم ثلاثي الأبعاد)', 'عناصر تظهر بواقعية عالية بعمق ثلاثي الأبعاد وكأنها بارزة من القماش.', 50, true),
  ('Retro Anime (أنمي كلاسيكي)', 'مستوحى من رسومات الأنمي في التسعينات بألوان دافئة ونوستالجي عالي.', 60, true)
ON CONFLICT DO NOTHING;

-- Seed 6 Premium Color Packages
INSERT INTO public.custom_design_color_packages (name, colors, sort_order, is_active)
VALUES
  ('Midnight Vibes (ألوان منتصف الليل)', '["#1a1a24", "#3b3b58", "#e63946"]'::jsonb, 10, true),
  ('Desert Sand (رمال الصحراء)', '["#e5d3b3", "#d4a373", "#faedcd"]'::jsonb, 20, true),
  ('Neon Lights (إضاءة نيون)', '["#00f5d4", "#f15bb5", "#fee440"]'::jsonb, 30, true),
  ('Pastel Dreams (أحلام الباستيل)', '["#ffcbf2", "#e2ece9", "#fdf0d5"]'::jsonb, 40, true),
  ('Earth Tones (ألوان ترابية دافئة)', '["#606c38", "#283618", "#dda15e"]'::jsonb, 50, true),
  ('Monochrome (أبيض وأسود فاخر)', '["#ffffff", "#8c8c8c", "#000000"]'::jsonb, 60, true)
ON CONFLICT DO NOTHING;
