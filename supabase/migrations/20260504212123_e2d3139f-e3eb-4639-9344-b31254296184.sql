
-- Storage bucket for check-in photos
INSERT INTO storage.buckets (id, name, public) VALUES ('checkin-photos', 'checkin-photos', true);

CREATE POLICY "Anyone can view checkin photos" ON storage.objects FOR SELECT USING (bucket_id = 'checkin-photos');
CREATE POLICY "Authenticated users can upload checkin photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'checkin-photos' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update own checkin photos" ON storage.objects FOR UPDATE USING (bucket_id = 'checkin-photos' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete own checkin photos" ON storage.objects FOR DELETE USING (bucket_id = 'checkin-photos' AND auth.role() = 'authenticated');

-- Haversine-based nearby offers function
CREATE OR REPLACE FUNCTION public.nearby_offers(lat DOUBLE PRECISION, lng DOUBLE PRECISION, radius_miles DOUBLE PRECISION DEFAULT 5)
RETURNS SETOF public.partner_offers
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM public.partner_offers
  WHERE active = true
    AND latitude IS NOT NULL
    AND longitude IS NOT NULL
    AND (
      3959 * acos(
        cos(radians(lat)) * cos(radians(latitude)) *
        cos(radians(longitude) - radians(lng)) +
        sin(radians(lat)) * sin(radians(latitude))
      )
    ) <= radius_miles;
$$;
