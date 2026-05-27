INSERT INTO storage.buckets (id, name, public) VALUES ('offer-images', 'offer-images', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Offer images public read" ON storage.objects FOR SELECT USING (bucket_id = 'offer-images');
CREATE POLICY "Partners upload offer images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'offer-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Partners update own offer images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'offer-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Partners delete own offer images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'offer-images' AND auth.uid()::text = (storage.foldername(name))[1]);