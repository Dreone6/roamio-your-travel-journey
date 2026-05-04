
-- Fix search path on nearby_offers
CREATE OR REPLACE FUNCTION public.nearby_offers(lat DOUBLE PRECISION, lng DOUBLE PRECISION, radius_miles DOUBLE PRECISION DEFAULT 5)
RETURNS SETOF public.partner_offers
LANGUAGE sql
STABLE
SET search_path = public
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

-- Fix bucket listing: drop overly broad policy, add scoped one
DROP POLICY "Anyone can view checkin photos" ON storage.objects;
CREATE POLICY "Anyone can view checkin photos by path" ON storage.objects FOR SELECT USING (bucket_id = 'checkin-photos' AND (storage.foldername(name))[1] IS NOT NULL);
