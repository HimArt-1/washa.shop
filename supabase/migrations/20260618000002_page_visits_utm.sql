-- وشّى | WASHA — إضافة أعمدة UTM لسجل الزيارات
ALTER TABLE public.page_visits
    ADD COLUMN IF NOT EXISTS utm_source   text,
    ADD COLUMN IF NOT EXISTS utm_medium   text,
    ADD COLUMN IF NOT EXISTS utm_campaign text,
    ADD COLUMN IF NOT EXISTS utm_content  text,
    ADD COLUMN IF NOT EXISTS utm_term     text;

CREATE INDEX IF NOT EXISTS idx_page_visits_utm_source   ON public.page_visits (utm_source);
CREATE INDEX IF NOT EXISTS idx_page_visits_utm_campaign ON public.page_visits (utm_campaign);
