-- Harden public storage bucket write policies.
-- Service role uploads keep working through RLS bypass; browser uploads need explicit ownership/admin checks.

CREATE OR REPLACE FUNCTION public.current_clerk_subject()
RETURNS text
LANGUAGE sql
STABLE
AS $$
    SELECT coalesce(
        nullif(nullif(current_setting('request.jwt.claims', true), '')::json->>'sub', ''),
        auth.uid()::text
    );
$$;

CREATE OR REPLACE FUNCTION public.is_storage_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.clerk_id = public.current_clerk_subject()
          AND profiles.role IN ('admin', 'dev', 'manager')
    );
$$;

-- smart-store: public read, privileged writes only.
DROP POLICY IF EXISTS "Smart store images admin insert" ON storage.objects;
DROP POLICY IF EXISTS "Smart store images admin update" ON storage.objects;
DROP POLICY IF EXISTS "Smart store images admin delete" ON storage.objects;

CREATE POLICY "Smart store images admin insert" ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'smart-store' AND public.is_storage_admin());

CREATE POLICY "Smart store images admin update" ON storage.objects
FOR UPDATE
USING (bucket_id = 'smart-store' AND public.is_storage_admin())
WITH CHECK (bucket_id = 'smart-store' AND public.is_storage_admin());

CREATE POLICY "Smart store images admin delete" ON storage.objects
FOR DELETE
USING (bucket_id = 'smart-store' AND public.is_storage_admin());

-- products: public read, privileged writes only.
DROP POLICY IF EXISTS "Authenticated users can upload products" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update products" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete products" ON storage.objects;
DROP POLICY IF EXISTS "Admin users can upload products" ON storage.objects;
DROP POLICY IF EXISTS "Admin users can update products" ON storage.objects;
DROP POLICY IF EXISTS "Admin users can delete products" ON storage.objects;

CREATE POLICY "Admin users can upload products" ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'products' AND public.is_storage_admin());

CREATE POLICY "Admin users can update products" ON storage.objects
FOR UPDATE
USING (bucket_id = 'products' AND public.is_storage_admin())
WITH CHECK (bucket_id = 'products' AND public.is_storage_admin());

CREATE POLICY "Admin users can delete products" ON storage.objects
FOR DELETE
USING (bucket_id = 'products' AND public.is_storage_admin());

-- avatars: public read, authenticated insert, owner/admin update and delete.
DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Avatar owners can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Avatar owners can delete avatars" ON storage.objects;

CREATE POLICY "Avatar owners can update avatars" ON storage.objects
FOR UPDATE
USING (
    bucket_id = 'avatars'
    AND (owner = auth.uid() OR public.is_storage_admin())
)
WITH CHECK (
    bucket_id = 'avatars'
    AND (owner = auth.uid() OR public.is_storage_admin())
);

CREATE POLICY "Avatar owners can delete avatars" ON storage.objects
FOR DELETE
USING (
    bucket_id = 'avatars'
    AND (owner = auth.uid() OR public.is_storage_admin())
);
