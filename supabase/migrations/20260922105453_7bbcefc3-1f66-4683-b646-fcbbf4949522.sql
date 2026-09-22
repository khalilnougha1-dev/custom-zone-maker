DROP POLICY IF EXISTS "Public read product images" ON storage.objects;

CREATE POLICY "Authenticated read product images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'product-images');