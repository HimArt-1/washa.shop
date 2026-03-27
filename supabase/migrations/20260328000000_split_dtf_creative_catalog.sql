-- ═══════════════════════════════════════════════════════════
--  وشّى | WASHA — Split DTF Creative Catalog
--  Separate DTF Studio styles / techniques / palettes
--  from the experimental "Design Your Piece" catalog.
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.custom_design_styles
ADD COLUMN IF NOT EXISTS catalog_scope TEXT NOT NULL DEFAULT 'design_piece';

ALTER TABLE public.custom_design_art_styles
ADD COLUMN IF NOT EXISTS catalog_scope TEXT NOT NULL DEFAULT 'design_piece';

ALTER TABLE public.custom_design_color_packages
ADD COLUMN IF NOT EXISTS catalog_scope TEXT NOT NULL DEFAULT 'design_piece';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'custom_design_styles_catalog_scope_check'
  ) THEN
    ALTER TABLE public.custom_design_styles
    ADD CONSTRAINT custom_design_styles_catalog_scope_check
    CHECK (catalog_scope IN ('design_piece', 'dtf_studio', 'shared'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'custom_design_art_styles_catalog_scope_check'
  ) THEN
    ALTER TABLE public.custom_design_art_styles
    ADD CONSTRAINT custom_design_art_styles_catalog_scope_check
    CHECK (catalog_scope IN ('design_piece', 'dtf_studio', 'shared'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'custom_design_color_packages_catalog_scope_check'
  ) THEN
    ALTER TABLE public.custom_design_color_packages
    ADD CONSTRAINT custom_design_color_packages_catalog_scope_check
    CHECK (catalog_scope IN ('design_piece', 'dtf_studio', 'shared'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cd_styles_scope_active_order
ON public.custom_design_styles (catalog_scope, is_active, sort_order);

CREATE INDEX IF NOT EXISTS idx_cd_art_styles_scope_active_order
ON public.custom_design_art_styles (catalog_scope, is_active, sort_order);

CREATE INDEX IF NOT EXISTS idx_cd_color_packages_scope_active_order
ON public.custom_design_color_packages (catalog_scope, is_active, sort_order);

UPDATE public.custom_design_styles
SET catalog_scope = 'design_piece'
WHERE catalog_scope IS NULL OR btrim(catalog_scope) = '';

UPDATE public.custom_design_art_styles
SET catalog_scope = 'design_piece'
WHERE catalog_scope IS NULL OR btrim(catalog_scope) = '';

UPDATE public.custom_design_color_packages
SET catalog_scope = 'design_piece'
WHERE catalog_scope IS NULL OR btrim(catalog_scope) = '';

WITH style_seed(name, description, sort_order, metadata) AS (
  VALUES
    ('ملصق (Sticker)', 'تصميم قصاصات جريء بحدود واضحة ومساحات لونية حادة، مناسب للرسومات الأيقونية وقطع الشارع.', 10, '{"creative_direction":"die-cut graphic sticker","energy":"high","complexity":"balanced","luxury_tier":"core","story_hook":"قطعة تبدو كملصق فاخر مطبوع بدقة عالية","keywords":["sticker","vector","bold","outline"],"moods":["جريء","مرح","واضح"],"audiences":["streetwear","drops","daily luxury"],"placements":["chest","back"],"recommended_methods":["from_text","from_image","studio"],"notes":"أفضل خيار للرسومات الصريحة والشعارات البصرية والملامح الواضحة."}'::jsonb),
    ('أنمي/مانغا (Anime/Manga)', 'جمالية يابانية نابضة، تعبيرات قوية وتباين بصري مناسب للشخصيات والقصص.', 20, '{"creative_direction":"anime illustration energy","energy":"high","complexity":"bold","luxury_tier":"signature","story_hook":"لوحة أنمي محسوبة كأنها لقطة افتتاحية من مانغا فاخرة","keywords":["anime","manga","character","dynamic"],"moods":["حماسي","حي","قوي"],"audiences":["anime fans","drops","youth"],"placements":["chest","back"],"recommended_methods":["from_text","from_image","studio"],"notes":"مناسب للشخصيات والوجوه واللقطات الحركية والموضوعات الخيالية."}'::jsonb),
    ('بوب آرت (Pop Art)', 'ألوان صادمة، تباين قوي وإيقاع بصري واضح مستلهم من ملصقات الثقافة الجماهيرية.', 30, '{"creative_direction":"bold pop art statement","energy":"high","complexity":"balanced","luxury_tier":"core","story_hook":"قطعة تلفت النظر من أول لمحة من خلال اللون والضربة الجريئة","keywords":["pop art","halftone","statement","bold"],"moods":["مشع","صاخب","مرِح"],"audiences":["drops","giftable","streetwear"],"placements":["chest","back"],"recommended_methods":["from_text","from_image","studio"],"notes":"يمتاز بالحضور الفوري وبناء التكوين حول عناصر قليلة لكنها بارزة."}'::jsonb),
    ('جرافيتي (Graffiti)', 'ستايل شارع خام، حروف وأشكال مرشوشة ومشحونة بطاقة حضرية مباشرة.', 40, '{"creative_direction":"urban graffiti attitude","energy":"high","complexity":"bold","luxury_tier":"core","story_hook":"قطعة بروح الجدار والشارع والهوية الجريئة غير الملمعة","keywords":["graffiti","street","spray","urban"],"moods":["متمرد","خام","شبابي"],"audiences":["streetwear","drops","urban culture"],"placements":["chest","back"],"recommended_methods":["from_text","from_image","studio"],"notes":"ممتاز للهوية الشبابية والرسائل الجريئة والأشكال الحرة."}'::jsonb),
    ('فن الخطوط (Line Art)', 'تجريد نظيف يعتمد على الخط والتكوين أكثر من الكتلة اللونية، مناسب للقطع الراقية الهادئة.', 50, '{"creative_direction":"minimal linework elegance","energy":"low","complexity":"minimal","luxury_tier":"signature","story_hook":"فخامة ناعمة مبنية على الخط والفراغ لا على ازدحام التفاصيل","keywords":["line art","minimal","contour","clean"],"moods":["هادئ","راقي","متزن"],"audiences":["daily luxury","minimal lovers","gifts"],"placements":["chest","shoulder_right","shoulder_left"],"recommended_methods":["from_text","from_image","studio"],"notes":"أفضل للرسومات الدقيقة والتكوينات البسيطة والقصائد البصرية الهادئة."}'::jsonb),
    ('هندسي (Geometric)', 'تنسيق مبني على الأشكال والزوايا والبنية الرياضية، يعطي إحساسًا هندسيًا محسوبًا ونظيفًا.', 60, '{"creative_direction":"structured geometric composition","energy":"medium","complexity":"balanced","luxury_tier":"signature","story_hook":"قطعة تبدو مصممة بمنطق معماري متوازن ودقيق","keywords":["geometric","structured","symmetry","shapes"],"moods":["متوازن","دقيق","تقني"],"audiences":["design lovers","editorial","minimal tech"],"placements":["chest","back"],"recommended_methods":["from_text","from_image","studio"],"notes":"مناسب للشعارات البصرية والتجريدات المنظمة والأفكار ذات البناء القوي."}'::jsonb),
    ('بكسل آرت (Pixel Art)', 'روح ألعاب كلاسيكية بدقة مربعة واضحة، تمنح القطعة شخصية مرحة ونوستالجية.', 70, '{"creative_direction":"retro pixel nostalgia","energy":"medium","complexity":"balanced","luxury_tier":"core","story_hook":"قطعة تبدو كإحياء أنيق لذاكرة الألعاب القديمة","keywords":["pixel art","8-bit","retro game","nostalgia"],"moods":["مرِح","نوستالجي","خفيف"],"audiences":["gamers","drops","gifts"],"placements":["chest","back"],"recommended_methods":["from_text","from_image","studio"],"notes":"يفضل للرسومات الأيقونية والموضوعات المرحة ذات التكوين الشبكي."}'::jsonb),
    ('فينتيج (Vintage)', 'لمسة رجعية ناعمة مع إحساس مستهلك قليلًا وطبقات شخصية أكثر دفئًا من الحداثة المباشرة.', 80, '{"creative_direction":"aged vintage print feeling","energy":"medium","complexity":"balanced","luxury_tier":"signature","story_hook":"قطعة تبدو كإصدار نادر محفوظ من زمن جميل","keywords":["vintage","retro","aged","heritage"],"moods":["حنين","دافئ","أصيل"],"audiences":["heritage lovers","daily luxury","gifts"],"placements":["chest","back"],"recommended_methods":["from_text","from_image","studio"],"notes":"يميل إلى الألوان الهادئة والملمس البصري غير الحاد."}'::jsonb),
    ('سايبر بانك (Cyberpunk)', 'رؤية مستقبلية مفعمة بالضوء والتقنية والتباين الحضري، مثالية للتصاميم اللافتة.', 90, '{"creative_direction":"neon cyber future","energy":"high","complexity":"bold","luxury_tier":"editorial","story_hook":"قطعة تحمل وهج المدينة المستقبلية وتوترها البصري","keywords":["cyberpunk","future","neon","sci-fi"],"moods":["مستقبلي","حاد","داكن"],"audiences":["editorial","drops","sci-fi fans"],"placements":["chest","back"],"recommended_methods":["from_text","from_image","studio"],"notes":"يعمل بشكل أفضل مع النيون والتباينات العميقة والقصص التقنية."}'::jsonb),
    ('بسيط (Minimalist)', 'أقل عناصر ممكنة، حضور أنيق وصامت، مناسب للقطع اليومية الراقية.', 100, '{"creative_direction":"quiet minimalist luxury","energy":"low","complexity":"minimal","luxury_tier":"signature","story_hook":"قطعة تبدو فاخرة لأنها لم تقل كل شيء دفعة واحدة","keywords":["minimalist","clean","quiet luxury","negative space"],"moods":["هادئ","فخم","صافي"],"audiences":["daily luxury","minimalists","premium basics"],"placements":["chest","shoulder_right","shoulder_left"],"recommended_methods":["from_text","from_image","studio"],"notes":"ممتاز للنصوص المقتضبة والرموز الصغيرة والرسومات المتزنة."}'::jsonb),
    ('ثلاثي الأبعاد (3D)', 'إخراج مجسم يوحي بعمق واقعي وطبقات بصرية قوية، مناسب للقطع البارزة بصريًا.', 110, '{"creative_direction":"dimensional 3d showcase","energy":"high","complexity":"bold","luxury_tier":"editorial","story_hook":"قطعة تبدو وكأن التصميم يخرج منها إلى الفراغ","keywords":["3d","render","depth","dimensional"],"moods":["مبهر","تقني","بارز"],"audiences":["editorial","drops","premium graphic lovers"],"placements":["chest","back"],"recommended_methods":["from_text","from_image","studio"],"notes":"يفضل للرموز المركزية والتكوينات الكبيرة ذات التأثير البصري."}'::jsonb)
)
UPDATE public.custom_design_styles s
SET
  description = seed.description,
  sort_order = seed.sort_order,
  metadata = seed.metadata,
  catalog_scope = 'dtf_studio',
  is_active = true
FROM style_seed seed
WHERE s.name = seed.name;

WITH style_seed(name, description, sort_order, metadata) AS (
  VALUES
    ('ملصق (Sticker)', 'تصميم قصاصات جريء بحدود واضحة ومساحات لونية حادة، مناسب للرسومات الأيقونية وقطع الشارع.', 10, '{"creative_direction":"die-cut graphic sticker","energy":"high","complexity":"balanced","luxury_tier":"core","story_hook":"قطعة تبدو كملصق فاخر مطبوع بدقة عالية","keywords":["sticker","vector","bold","outline"],"moods":["جريء","مرح","واضح"],"audiences":["streetwear","drops","daily luxury"],"placements":["chest","back"],"recommended_methods":["from_text","from_image","studio"],"notes":"أفضل خيار للرسومات الصريحة والشعارات البصرية والملامح الواضحة."}'::jsonb),
    ('أنمي/مانغا (Anime/Manga)', 'جمالية يابانية نابضة، تعبيرات قوية وتباين بصري مناسب للشخصيات والقصص.', 20, '{"creative_direction":"anime illustration energy","energy":"high","complexity":"bold","luxury_tier":"signature","story_hook":"لوحة أنمي محسوبة كأنها لقطة افتتاحية من مانغا فاخرة","keywords":["anime","manga","character","dynamic"],"moods":["حماسي","حي","قوي"],"audiences":["anime fans","drops","youth"],"placements":["chest","back"],"recommended_methods":["from_text","from_image","studio"],"notes":"مناسب للشخصيات والوجوه واللقطات الحركية والموضوعات الخيالية."}'::jsonb),
    ('بوب آرت (Pop Art)', 'ألوان صادمة، تباين قوي وإيقاع بصري واضح مستلهم من ملصقات الثقافة الجماهيرية.', 30, '{"creative_direction":"bold pop art statement","energy":"high","complexity":"balanced","luxury_tier":"core","story_hook":"قطعة تلفت النظر من أول لمحة من خلال اللون والضربة الجريئة","keywords":["pop art","halftone","statement","bold"],"moods":["مشع","صاخب","مرِح"],"audiences":["drops","giftable","streetwear"],"placements":["chest","back"],"recommended_methods":["from_text","from_image","studio"],"notes":"يمتاز بالحضور الفوري وبناء التكوين حول عناصر قليلة لكنها بارزة."}'::jsonb),
    ('جرافيتي (Graffiti)', 'ستايل شارع خام، حروف وأشكال مرشوشة ومشحونة بطاقة حضرية مباشرة.', 40, '{"creative_direction":"urban graffiti attitude","energy":"high","complexity":"bold","luxury_tier":"core","story_hook":"قطعة بروح الجدار والشارع والهوية الجريئة غير الملمعة","keywords":["graffiti","street","spray","urban"],"moods":["متمرد","خام","شبابي"],"audiences":["streetwear","drops","urban culture"],"placements":["chest","back"],"recommended_methods":["from_text","from_image","studio"],"notes":"ممتاز للهوية الشبابية والرسائل الجريئة والأشكال الحرة."}'::jsonb),
    ('فن الخطوط (Line Art)', 'تجريد نظيف يعتمد على الخط والتكوين أكثر من الكتلة اللونية، مناسب للقطع الراقية الهادئة.', 50, '{"creative_direction":"minimal linework elegance","energy":"low","complexity":"minimal","luxury_tier":"signature","story_hook":"فخامة ناعمة مبنية على الخط والفراغ لا على ازدحام التفاصيل","keywords":["line art","minimal","contour","clean"],"moods":["هادئ","راقي","متزن"],"audiences":["daily luxury","minimal lovers","gifts"],"placements":["chest","shoulder_right","shoulder_left"],"recommended_methods":["from_text","from_image","studio"],"notes":"أفضل للرسومات الدقيقة والتكوينات البسيطة والقصائد البصرية الهادئة."}'::jsonb),
    ('هندسي (Geometric)', 'تنسيق مبني على الأشكال والزوايا والبنية الرياضية، يعطي إحساسًا هندسيًا محسوبًا ونظيفًا.', 60, '{"creative_direction":"structured geometric composition","energy":"medium","complexity":"balanced","luxury_tier":"signature","story_hook":"قطعة تبدو مصممة بمنطق معماري متوازن ودقيق","keywords":["geometric","structured","symmetry","shapes"],"moods":["متوازن","دقيق","تقني"],"audiences":["design lovers","editorial","minimal tech"],"placements":["chest","back"],"recommended_methods":["from_text","from_image","studio"],"notes":"مناسب للشعارات البصرية والتجريدات المنظمة والأفكار ذات البناء القوي."}'::jsonb),
    ('بكسل آرت (Pixel Art)', 'روح ألعاب كلاسيكية بدقة مربعة واضحة، تمنح القطعة شخصية مرحة ونوستالجية.', 70, '{"creative_direction":"retro pixel nostalgia","energy":"medium","complexity":"balanced","luxury_tier":"core","story_hook":"قطعة تبدو كإحياء أنيق لذاكرة الألعاب القديمة","keywords":["pixel art","8-bit","retro game","nostalgia"],"moods":["مرِح","نوستالجي","خفيف"],"audiences":["gamers","drops","gifts"],"placements":["chest","back"],"recommended_methods":["from_text","from_image","studio"],"notes":"يفضل للرسومات الأيقونية والموضوعات المرحة ذات التكوين الشبكي."}'::jsonb),
    ('فينتيج (Vintage)', 'لمسة رجعية ناعمة مع إحساس مستهلك قليلًا وطبقات شخصية أكثر دفئًا من الحداثة المباشرة.', 80, '{"creative_direction":"aged vintage print feeling","energy":"medium","complexity":"balanced","luxury_tier":"signature","story_hook":"قطعة تبدو كإصدار نادر محفوظ من زمن جميل","keywords":["vintage","retro","aged","heritage"],"moods":["حنين","دافئ","أصيل"],"audiences":["heritage lovers","daily luxury","gifts"],"placements":["chest","back"],"recommended_methods":["from_text","from_image","studio"],"notes":"يميل إلى الألوان الهادئة والملمس البصري غير الحاد."}'::jsonb),
    ('سايبر بانك (Cyberpunk)', 'رؤية مستقبلية مفعمة بالضوء والتقنية والتباين الحضري، مثالية للتصاميم اللافتة.', 90, '{"creative_direction":"neon cyber future","energy":"high","complexity":"bold","luxury_tier":"editorial","story_hook":"قطعة تحمل وهج المدينة المستقبلية وتوترها البصري","keywords":["cyberpunk","future","neon","sci-fi"],"moods":["مستقبلي","حاد","داكن"],"audiences":["editorial","drops","sci-fi fans"],"placements":["chest","back"],"recommended_methods":["from_text","from_image","studio"],"notes":"يعمل بشكل أفضل مع النيون والتباينات العميقة والقصص التقنية."}'::jsonb),
    ('بسيط (Minimalist)', 'أقل عناصر ممكنة، حضور أنيق وصامت، مناسب للقطع اليومية الراقية.', 100, '{"creative_direction":"quiet minimalist luxury","energy":"low","complexity":"minimal","luxury_tier":"signature","story_hook":"قطعة تبدو فاخرة لأنها لم تقل كل شيء دفعة واحدة","keywords":["minimalist","clean","quiet luxury","negative space"],"moods":["هادئ","فخم","صافي"],"audiences":["daily luxury","minimalists","premium basics"],"placements":["chest","shoulder_right","shoulder_left"],"recommended_methods":["from_text","from_image","studio"],"notes":"ممتاز للنصوص المقتضبة والرموز الصغيرة والرسومات المتزنة."}'::jsonb),
    ('ثلاثي الأبعاد (3D)', 'إخراج مجسم يوحي بعمق واقعي وطبقات بصرية قوية، مناسب للقطع البارزة بصريًا.', 110, '{"creative_direction":"dimensional 3d showcase","energy":"high","complexity":"bold","luxury_tier":"editorial","story_hook":"قطعة تبدو وكأن التصميم يخرج منها إلى الفراغ","keywords":["3d","render","depth","dimensional"],"moods":["مبهر","تقني","بارز"],"audiences":["editorial","drops","premium graphic lovers"],"placements":["chest","back"],"recommended_methods":["from_text","from_image","studio"],"notes":"يفضل للرموز المركزية والتكوينات الكبيرة ذات التأثير البصري."}'::jsonb)
)
INSERT INTO public.custom_design_styles (name, description, catalog_scope, metadata, sort_order, is_active)
SELECT seed.name, seed.description, 'dtf_studio', seed.metadata, seed.sort_order, true
FROM style_seed seed
WHERE NOT EXISTS (
  SELECT 1 FROM public.custom_design_styles s WHERE s.name = seed.name
);

WITH art_seed(name, description, sort_order, metadata) AS (
  VALUES
    ('رسم رقمي (Digital)', 'إخراج رقمي نظيف وواضح يمنح حرية كاملة في الحدة والتفاصيل واللون.', 10, '{"creative_direction":"clean digital execution","energy":"medium","complexity":"balanced","luxury_tier":"core","story_hook":"تنفيذ مرن وواضح يصلح لكل الأفكار تقريبًا","keywords":["digital","clean","illustration","sharp"],"moods":["مرن","واضح","حديث"],"audiences":["all","daily luxury","drops"],"placements":["chest","back","shoulder_right","shoulder_left"],"recommended_methods":["from_text","from_image","studio"],"notes":"الافتراضي الأكثر توازنًا حين لا توجد حاجة لملمس محدد."}'::jsonb),
    ('ألوان مائية (Watercolor)', 'طبقات شفافة ناعمة وتدرجات حالمة تناسب المشاهد الهادئة أو العضوية.', 20, '{"creative_direction":"soft watercolor bloom","energy":"low","complexity":"balanced","luxury_tier":"signature","story_hook":"لوحة مطبوعة بخفة واتساع بصري غير صاخب","keywords":["watercolor","soft","bleed","organic"],"moods":["هادئ","حالم","ناعم"],"audiences":["gifts","daily luxury","feminine edits"],"placements":["chest","back"],"recommended_methods":["from_text","from_image","studio"],"notes":"ممتاز للزهور والطبيعة والرموز الهادئة والعناصر الشاعرية."}'::jsonb),
    ('ألوان زيتية (Oil)', 'ملمس عميق وضربات فرشاة واضحة، يعطي التصميم وزنًا فنيًا وحضورًا كلاسيكيًا.', 30, '{"creative_direction":"rich oil texture","energy":"medium","complexity":"bold","luxury_tier":"editorial","story_hook":"يشبه لوحة فنية نقلت إلى القماش بدل أن تكون مجرد رسم رقمي","keywords":["oil","brushstroke","texture","fine art"],"moods":["عميق","فني","ثقيل"],"audiences":["editorial","art lovers","premium drops"],"placements":["chest","back"],"recommended_methods":["from_text","from_image","studio"],"notes":"يفضل للتكوينات الغنية والوجوه والعناصر ذات الثقل البصري."}'::jsonb),
    ('رسم بالقلم (Pen)', 'حبر وخطوط دقيقة وتظليل محكوم، مناسب للرسوم التفصيلية والأعمال المرسومة يدويًا.', 40, '{"creative_direction":"pen sketch precision","energy":"medium","complexity":"balanced","luxury_tier":"signature","story_hook":"تصميم يبدو مرسومًا بعناية على دفتر فنان محترف","keywords":["pen","ink","hatching","sketch"],"moods":["دقيق","فني","مقروء"],"audiences":["illustration lovers","daily luxury","gifts"],"placements":["chest","back"],"recommended_methods":["from_text","from_image","studio"],"notes":"قوي في الخطوط، الخرائط البصرية، والرسوم الأحادية أو شبه الأحادية."}'::jsonb),
    ('ايربراش (Airbrush)', 'تدرجات ناعمة وهواء بصري لامع، مناسب للعناصر اللامعة والستايلات المعاصرة.', 50, '{"creative_direction":"smooth airbrushed glow","energy":"medium","complexity":"balanced","luxury_tier":"editorial","story_hook":"نظرة مطبوعة بملمس لامع وانسيابي قريب من الملصقات المعاصرة","keywords":["airbrush","smooth","glow","gradient"],"moods":["لامع","معاصر","خفيف"],"audiences":["streetwear","editorial","drops"],"placements":["chest","back"],"recommended_methods":["from_text","from_image","studio"],"notes":"يفضل للأيقونات والوجوه والعناصر ذات الحضور الانسيابي."}'::jsonb),
    ('حبر (Ink)', 'تباين عالٍ وخطوط حاسمة ومساحات سوداء وبيضاء أنيقة، مناسب للطابع الدرامي.', 60, '{"creative_direction":"high-contrast ink drama","energy":"medium","complexity":"balanced","luxury_tier":"signature","story_hook":"فخامة مشدودة بين الأبيض والأسود والضربة الحاسمة","keywords":["ink","contrast","sumi-e","dramatic"],"moods":["درامي","حاسم","راقي"],"audiences":["minimal luxury","editorial","calligraphy lovers"],"placements":["chest","back","shoulder_right"],"recommended_methods":["from_text","from_image","studio"],"notes":"ممتاز للمخطوطات، الحيوانات، والتكوينات ذات التناقض الواضح."}'::jsonb),
    ('طباعة ريزوغراف (Risograph)', 'طابع مطبوع حبيبي وطبقات حبر متداخلة، مناسب للهوية الفنية والنوستالجيا المعاصرة.', 70, '{"creative_direction":"riso print grain","energy":"medium","complexity":"balanced","luxury_tier":"core","story_hook":"قطعة تبدو كمطبوعة فنية قصيرة الإصدار","keywords":["risograph","grain","print","editorial"],"moods":["فني","نوستالجي","مطبوعي"],"audiences":["design lovers","editorial","drops"],"placements":["chest","back"],"recommended_methods":["from_text","from_image","studio"],"notes":"يناسب التكوينات الجرافيكية والطبقات اللونية المحدودة."}'::jsonb)
)
UPDATE public.custom_design_art_styles a
SET
  description = seed.description,
  sort_order = seed.sort_order,
  metadata = seed.metadata,
  catalog_scope = 'dtf_studio',
  is_active = true
FROM art_seed seed
WHERE a.name = seed.name;

WITH art_seed(name, description, sort_order, metadata) AS (
  VALUES
    ('رسم رقمي (Digital)', 'إخراج رقمي نظيف وواضح يمنح حرية كاملة في الحدة والتفاصيل واللون.', 10, '{"creative_direction":"clean digital execution","energy":"medium","complexity":"balanced","luxury_tier":"core","story_hook":"تنفيذ مرن وواضح يصلح لكل الأفكار تقريبًا","keywords":["digital","clean","illustration","sharp"],"moods":["مرن","واضح","حديث"],"audiences":["all","daily luxury","drops"],"placements":["chest","back","shoulder_right","shoulder_left"],"recommended_methods":["from_text","from_image","studio"],"notes":"الافتراضي الأكثر توازنًا حين لا توجد حاجة لملمس محدد."}'::jsonb),
    ('ألوان مائية (Watercolor)', 'طبقات شفافة ناعمة وتدرجات حالمة تناسب المشاهد الهادئة أو العضوية.', 20, '{"creative_direction":"soft watercolor bloom","energy":"low","complexity":"balanced","luxury_tier":"signature","story_hook":"لوحة مطبوعة بخفة واتساع بصري غير صاخب","keywords":["watercolor","soft","bleed","organic"],"moods":["هادئ","حالم","ناعم"],"audiences":["gifts","daily luxury","feminine edits"],"placements":["chest","back"],"recommended_methods":["from_text","from_image","studio"],"notes":"ممتاز للزهور والطبيعة والرموز الهادئة والعناصر الشاعرية."}'::jsonb),
    ('ألوان زيتية (Oil)', 'ملمس عميق وضربات فرشاة واضحة، يعطي التصميم وزنًا فنيًا وحضورًا كلاسيكيًا.', 30, '{"creative_direction":"rich oil texture","energy":"medium","complexity":"bold","luxury_tier":"editorial","story_hook":"يشبه لوحة فنية نقلت إلى القماش بدل أن تكون مجرد رسم رقمي","keywords":["oil","brushstroke","texture","fine art"],"moods":["عميق","فني","ثقيل"],"audiences":["editorial","art lovers","premium drops"],"placements":["chest","back"],"recommended_methods":["from_text","from_image","studio"],"notes":"يفضل للتكوينات الغنية والوجوه والعناصر ذات الثقل البصري."}'::jsonb),
    ('رسم بالقلم (Pen)', 'حبر وخطوط دقيقة وتظليل محكوم، مناسب للرسوم التفصيلية والأعمال المرسومة يدويًا.', 40, '{"creative_direction":"pen sketch precision","energy":"medium","complexity":"balanced","luxury_tier":"signature","story_hook":"تصميم يبدو مرسومًا بعناية على دفتر فنان محترف","keywords":["pen","ink","hatching","sketch"],"moods":["دقيق","فني","مقروء"],"audiences":["illustration lovers","daily luxury","gifts"],"placements":["chest","back"],"recommended_methods":["from_text","from_image","studio"],"notes":"قوي في الخطوط، الخرائط البصرية، والرسوم الأحادية أو شبه الأحادية."}'::jsonb),
    ('ايربراش (Airbrush)', 'تدرجات ناعمة وهواء بصري لامع، مناسب للعناصر اللامعة والستايلات المعاصرة.', 50, '{"creative_direction":"smooth airbrushed glow","energy":"medium","complexity":"balanced","luxury_tier":"editorial","story_hook":"نظرة مطبوعة بملمس لامع وانسيابي قريب من الملصقات المعاصرة","keywords":["airbrush","smooth","glow","gradient"],"moods":["لامع","معاصر","خفيف"],"audiences":["streetwear","editorial","drops"],"placements":["chest","back"],"recommended_methods":["from_text","from_image","studio"],"notes":"يفضل للأيقونات والوجوه والعناصر ذات الحضور الانسيابي."}'::jsonb),
    ('حبر (Ink)', 'تباين عالٍ وخطوط حاسمة ومساحات سوداء وبيضاء أنيقة، مناسب للطابع الدرامي.', 60, '{"creative_direction":"high-contrast ink drama","energy":"medium","complexity":"balanced","luxury_tier":"signature","story_hook":"فخامة مشدودة بين الأبيض والأسود والضربة الحاسمة","keywords":["ink","contrast","sumi-e","dramatic"],"moods":["درامي","حاسم","راقي"],"audiences":["minimal luxury","editorial","calligraphy lovers"],"placements":["chest","back","shoulder_right"],"recommended_methods":["from_text","from_image","studio"],"notes":"ممتاز للمخطوطات، الحيوانات، والتكوينات ذات التناقض الواضح."}'::jsonb),
    ('طباعة ريزوغراف (Risograph)', 'طابع مطبوع حبيبي وطبقات حبر متداخلة، مناسب للهوية الفنية والنوستالجيا المعاصرة.', 70, '{"creative_direction":"riso print grain","energy":"medium","complexity":"balanced","luxury_tier":"core","story_hook":"قطعة تبدو كمطبوعة فنية قصيرة الإصدار","keywords":["risograph","grain","print","editorial"],"moods":["فني","نوستالجي","مطبوعي"],"audiences":["design lovers","editorial","drops"],"placements":["chest","back"],"recommended_methods":["from_text","from_image","studio"],"notes":"يناسب التكوينات الجرافيكية والطبقات اللونية المحدودة."}'::jsonb)
)
INSERT INTO public.custom_design_art_styles (name, description, catalog_scope, metadata, sort_order, is_active)
SELECT seed.name, seed.description, 'dtf_studio', seed.metadata, seed.sort_order, true
FROM art_seed seed
WHERE NOT EXISTS (
  SELECT 1 FROM public.custom_design_art_styles a WHERE a.name = seed.name
);

WITH palette_seed(name, colors, sort_order, metadata) AS (
  VALUES
    ('تلقائي (Auto)', '[{"hex":"#111111","name":"Graphite"},{"hex":"#F5F5F0","name":"Ivory"},{"hex":"#C9A86A","name":"Warm Gold"}]'::jsonb, 10, '{"palette_family":"adaptive premium","creative_direction":"balanced automatic palette","energy":"medium","complexity":"balanced","luxury_tier":"core","story_hook":"يترك القرار اللوني للنظام لكن داخل ذائقة محسوبة","keywords":["auto","adaptive","balanced"],"moods":["متزن","مرن","عملي"],"audiences":["all"],"placements":["chest","back"],"recommended_methods":["from_text","from_image","studio"],"notes":"الخيار الافتراضي حين تريد أفضل توافق لوني تلقائيًا."}'::jsonb),
    ('نيون ساطع (Neon)', '[{"hex":"#00FFFF","name":"Cyan"},{"hex":"#FF00FF","name":"Magenta"},{"hex":"#00FF00","name":"Lime"}]'::jsonb, 20, '{"palette_family":"neon contrast","creative_direction":"glowing neon signal","energy":"high","complexity":"bold","luxury_tier":"editorial","story_hook":"لوحة مشحونة كإضاءة مدينة ليلية","keywords":["neon","glow","cyber","contrast"],"moods":["متوهج","حاد","مستقبلي"],"audiences":["streetwear","editorial","drops"],"placements":["chest","back"],"recommended_methods":["from_text","from_image","studio"],"notes":"مثالية لستايل السايبر والهوية الحضرية المضيئة."}'::jsonb),
    ('باستيل هادئ (Pastel)', '[{"hex":"#FFB6C1","name":"Pastel Pink"},{"hex":"#ADD8E6","name":"Baby Blue"},{"hex":"#98FB98","name":"Mint"}]'::jsonb, 30, '{"palette_family":"soft pastel","creative_direction":"gentle pastel calm","energy":"low","complexity":"minimal","luxury_tier":"signature","story_hook":"مشهد لوني خفيف لا يزاحم الفكرة بل يحتضنها","keywords":["pastel","soft","gentle","airy"],"moods":["هادئ","لطيف","نظيف"],"audiences":["gifts","daily luxury","soft edits"],"placements":["chest","back"],"recommended_methods":["from_text","from_image","studio"],"notes":"مناسب للزهور، العناصر الناعمة، والمشاهد الحالمة."}'::jsonb),
    ('أحادي اللون (Monochrome)', '[{"hex":"#FFFFFF","name":"White"},{"hex":"#888888","name":"Gray"},{"hex":"#000000","name":"Black"}]'::jsonb, 40, '{"palette_family":"monochrome luxury","creative_direction":"black white editorial","energy":"low","complexity":"minimal","luxury_tier":"signature","story_hook":"قطعة قوية بلا ضوضاء لونية","keywords":["mono","black","white","editorial"],"moods":["راق","حاسم","نظيف"],"audiences":["minimal luxury","editorial","all"],"placements":["chest","back","shoulder_right"],"recommended_methods":["from_text","from_image","studio"],"notes":"الأكثر أمانًا للطباعة الواضحة والهوية الكلاسيكية."}'::jsonb),
    ('ألوان ترابية (Earth)', '[{"hex":"#8B4513","name":"Brown"},{"hex":"#CD853F","name":"Terracotta"},{"hex":"#556B2F","name":"Olive"}]'::jsonb, 50, '{"palette_family":"earth warmth","creative_direction":"grounded earthy tone","energy":"medium","complexity":"balanced","luxury_tier":"signature","story_hook":"فخامة طبيعية دافئة وغير مصطنعة","keywords":["earth","olive","terracotta","natural"],"moods":["دافئ","أصيل","عضوي"],"audiences":["heritage lovers","daily luxury","gifts"],"placements":["chest","back"],"recommended_methods":["from_text","from_image","studio"],"notes":"ممتاز للموضوعات العضوية والهوية الهادئة القريبة من الطبيعة."}'::jsonb),
    ('ريترو 80s (Retro)', '[{"hex":"#FF69B4","name":"Hot Pink"},{"hex":"#FF8C00","name":"Orange"},{"hex":"#8A2BE2","name":"Purple"}]'::jsonb, 60, '{"palette_family":"retro synth","creative_direction":"80s retro burst","energy":"high","complexity":"bold","luxury_tier":"core","story_hook":"طاقة نوستالجية واضحة مثل غلاف شريط قديم فاخر","keywords":["retro","80s","nostalgia","synth"],"moods":["مرِح","صارخ","نوستالجي"],"audiences":["drops","streetwear","retro fans"],"placements":["chest","back"],"recommended_methods":["from_text","from_image","studio"],"notes":"يناسب البوب آرت والأنمي والموضوعات الحيوية عالية الحضور."}'::jsonb),
    ('فيبورويف (Vaporwave)', '[{"hex":"#00D4FF","name":"Turquoise"},{"hex":"#FF00C1","name":"Pink"},{"hex":"#9D00FF","name":"Purple"}]'::jsonb, 70, '{"palette_family":"vaporwave dusk","creative_direction":"dreamy vapor horizon","energy":"high","complexity":"bold","luxury_tier":"editorial","story_hook":"لوحة كأنها غروب رقمي بين الحلم والمدينة","keywords":["vaporwave","dreamy","sunset","digital"],"moods":["حالم","لامع","غامر"],"audiences":["editorial","drops","cyber fans"],"placements":["chest","back"],"recommended_methods":["from_text","from_image","studio"],"notes":"ممتاز للسايبر، الأنمي، والمشاهد الخيالية ذات الإحساس الرقمي."}'::jsonb)
)
UPDATE public.custom_design_color_packages p
SET
  colors = seed.colors,
  sort_order = seed.sort_order,
  metadata = seed.metadata,
  catalog_scope = 'dtf_studio',
  is_active = true
FROM palette_seed seed
WHERE p.name = seed.name;

WITH palette_seed(name, colors, sort_order, metadata) AS (
  VALUES
    ('تلقائي (Auto)', '[{"hex":"#111111","name":"Graphite"},{"hex":"#F5F5F0","name":"Ivory"},{"hex":"#C9A86A","name":"Warm Gold"}]'::jsonb, 10, '{"palette_family":"adaptive premium","creative_direction":"balanced automatic palette","energy":"medium","complexity":"balanced","luxury_tier":"core","story_hook":"يترك القرار اللوني للنظام لكن داخل ذائقة محسوبة","keywords":["auto","adaptive","balanced"],"moods":["متزن","مرن","عملي"],"audiences":["all"],"placements":["chest","back"],"recommended_methods":["from_text","from_image","studio"],"notes":"الخيار الافتراضي حين تريد أفضل توافق لوني تلقائيًا."}'::jsonb),
    ('نيون ساطع (Neon)', '[{"hex":"#00FFFF","name":"Cyan"},{"hex":"#FF00FF","name":"Magenta"},{"hex":"#00FF00","name":"Lime"}]'::jsonb, 20, '{"palette_family":"neon contrast","creative_direction":"glowing neon signal","energy":"high","complexity":"bold","luxury_tier":"editorial","story_hook":"لوحة مشحونة كإضاءة مدينة ليلية","keywords":["neon","glow","cyber","contrast"],"moods":["متوهج","حاد","مستقبلي"],"audiences":["streetwear","editorial","drops"],"placements":["chest","back"],"recommended_methods":["from_text","from_image","studio"],"notes":"مثالية لستايل السايبر والهوية الحضرية المضيئة."}'::jsonb),
    ('باستيل هادئ (Pastel)', '[{"hex":"#FFB6C1","name":"Pastel Pink"},{"hex":"#ADD8E6","name":"Baby Blue"},{"hex":"#98FB98","name":"Mint"}]'::jsonb, 30, '{"palette_family":"soft pastel","creative_direction":"gentle pastel calm","energy":"low","complexity":"minimal","luxury_tier":"signature","story_hook":"مشهد لوني خفيف لا يزاحم الفكرة بل يحتضنها","keywords":["pastel","soft","gentle","airy"],"moods":["هادئ","لطيف","نظيف"],"audiences":["gifts","daily luxury","soft edits"],"placements":["chest","back"],"recommended_methods":["from_text","from_image","studio"],"notes":"مناسب للزهور، العناصر الناعمة، والمشاهد الحالمة."}'::jsonb),
    ('أحادي اللون (Monochrome)', '[{"hex":"#FFFFFF","name":"White"},{"hex":"#888888","name":"Gray"},{"hex":"#000000","name":"Black"}]'::jsonb, 40, '{"palette_family":"monochrome luxury","creative_direction":"black white editorial","energy":"low","complexity":"minimal","luxury_tier":"signature","story_hook":"قطعة قوية بلا ضوضاء لونية","keywords":["mono","black","white","editorial"],"moods":["راق","حاسم","نظيف"],"audiences":["minimal luxury","editorial","all"],"placements":["chest","back","shoulder_right"],"recommended_methods":["from_text","from_image","studio"],"notes":"الأكثر أمانًا للطباعة الواضحة والهوية الكلاسيكية."}'::jsonb),
    ('ألوان ترابية (Earth)', '[{"hex":"#8B4513","name":"Brown"},{"hex":"#CD853F","name":"Terracotta"},{"hex":"#556B2F","name":"Olive"}]'::jsonb, 50, '{"palette_family":"earth warmth","creative_direction":"grounded earthy tone","energy":"medium","complexity":"balanced","luxury_tier":"signature","story_hook":"فخامة طبيعية دافئة وغير مصطنعة","keywords":["earth","olive","terracotta","natural"],"moods":["دافئ","أصيل","عضوي"],"audiences":["heritage lovers","daily luxury","gifts"],"placements":["chest","back"],"recommended_methods":["from_text","from_image","studio"],"notes":"ممتاز للموضوعات العضوية والهوية الهادئة القريبة من الطبيعة."}'::jsonb),
    ('ريترو 80s (Retro)', '[{"hex":"#FF69B4","name":"Hot Pink"},{"hex":"#FF8C00","name":"Orange"},{"hex":"#8A2BE2","name":"Purple"}]'::jsonb, 60, '{"palette_family":"retro synth","creative_direction":"80s retro burst","energy":"high","complexity":"bold","luxury_tier":"core","story_hook":"طاقة نوستالجية واضحة مثل غلاف شريط قديم فاخر","keywords":["retro","80s","nostalgia","synth"],"moods":["مرِح","صارخ","نوستالجي"],"audiences":["drops","streetwear","retro fans"],"placements":["chest","back"],"recommended_methods":["from_text","from_image","studio"],"notes":"يناسب البوب آرت والأنمي والموضوعات الحيوية عالية الحضور."}'::jsonb),
    ('فيبورويف (Vaporwave)', '[{"hex":"#00D4FF","name":"Turquoise"},{"hex":"#FF00C1","name":"Pink"},{"hex":"#9D00FF","name":"Purple"}]'::jsonb, 70, '{"palette_family":"vaporwave dusk","creative_direction":"dreamy vapor horizon","energy":"high","complexity":"bold","luxury_tier":"editorial","story_hook":"لوحة كأنها غروب رقمي بين الحلم والمدينة","keywords":["vaporwave","dreamy","sunset","digital"],"moods":["حالم","لامع","غامر"],"audiences":["editorial","drops","cyber fans"],"placements":["chest","back"],"recommended_methods":["from_text","from_image","studio"],"notes":"ممتاز للسايبر، الأنمي، والمشاهد الخيالية ذات الإحساس الرقمي."}'::jsonb)
)
INSERT INTO public.custom_design_color_packages (name, colors, catalog_scope, metadata, sort_order, is_active)
SELECT seed.name, seed.colors, 'dtf_studio', seed.metadata, seed.sort_order, true
FROM palette_seed seed
WHERE NOT EXISTS (
  SELECT 1 FROM public.custom_design_color_packages p WHERE p.name = seed.name
);

UPDATE public.custom_design_styles
SET is_active = false
WHERE catalog_scope = 'dtf_studio'
  AND name NOT IN (
    'ملصق (Sticker)',
    'أنمي/مانغا (Anime/Manga)',
    'بوب آرت (Pop Art)',
    'جرافيتي (Graffiti)',
    'فن الخطوط (Line Art)',
    'هندسي (Geometric)',
    'بكسل آرت (Pixel Art)',
    'فينتيج (Vintage)',
    'سايبر بانك (Cyberpunk)',
    'بسيط (Minimalist)',
    'ثلاثي الأبعاد (3D)'
  );

UPDATE public.custom_design_art_styles
SET is_active = false
WHERE catalog_scope = 'dtf_studio'
  AND name NOT IN (
    'رسم رقمي (Digital)',
    'ألوان مائية (Watercolor)',
    'ألوان زيتية (Oil)',
    'رسم بالقلم (Pen)',
    'ايربراش (Airbrush)',
    'حبر (Ink)',
    'طباعة ريزوغراف (Risograph)'
  );

UPDATE public.custom_design_color_packages
SET is_active = false
WHERE catalog_scope = 'dtf_studio'
  AND name NOT IN (
    'تلقائي (Auto)',
    'نيون ساطع (Neon)',
    'باستيل هادئ (Pastel)',
    'أحادي اللون (Monochrome)',
    'ألوان ترابية (Earth)',
    'ريترو 80s (Retro)',
    'فيبورويف (Vaporwave)'
  );
