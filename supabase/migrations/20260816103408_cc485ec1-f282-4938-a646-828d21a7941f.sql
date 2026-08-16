
CREATE POLICY "Users read own backups" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'backups' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users upload own backups" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'backups' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users update own backups" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'backups' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own backups" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'backups' AND (storage.foldername(name))[1] = auth.uid()::text);
