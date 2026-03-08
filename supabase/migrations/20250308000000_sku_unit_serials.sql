-- ═══════════════════════════════════════════════════════════
--  وشّى | WASHA — Unit-Level Serial Numbers per SKU
--  معرف فريد لكل قطعة مشتق من SKU الأساسي
--  مثال: 100 قطعة من تيشيرت A → WSH-P-00001-NA-NA-001 ... WSH-P-00001-NA-NA-100
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.sku_unit_serial (
    sku_id UUID PRIMARY KEY REFERENCES public.product_skus(id) ON DELETE CASCADE,
    last_serial INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sku_unit_serial_sku_id ON public.sku_unit_serial(sku_id);

-- Function: Get next N unit serial codes for a SKU (معرف فريد لكل قطعة)
CREATE OR REPLACE FUNCTION get_next_unit_serials(p_sku_id UUID, p_count INTEGER)
RETURNS TABLE(unit_code TEXT, serial_num INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
  v_sku TEXT;
  v_old INT := 0;
  i INT;
BEGIN
  IF p_count < 1 OR p_count > 9999 THEN RETURN; END IF;

  SELECT ps.sku INTO v_sku FROM product_skus ps WHERE id = p_sku_id;
  IF v_sku IS NULL THEN RETURN; END IF;

  INSERT INTO sku_unit_serial (sku_id, last_serial, updated_at)
  VALUES (p_sku_id, 0, NOW())
  ON CONFLICT (sku_id) DO NOTHING;

  SELECT last_serial INTO v_old FROM sku_unit_serial WHERE sku_id = p_sku_id FOR UPDATE;
  v_old := COALESCE(v_old, 0);

  UPDATE sku_unit_serial SET last_serial = v_old + p_count, updated_at = NOW() WHERE sku_id = p_sku_id;

  FOR i IN 1..p_count LOOP
    unit_code := v_sku || '-' || lpad((v_old + i)::TEXT, 5, '0');
    serial_num := v_old + i;
    RETURN NEXT;
  END LOOP;
END;
$$;
