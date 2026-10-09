-- Permissive storage policies are OR-ed, so another bucket's UPDATE policy could
-- satisfy WITH CHECK for a row whose bucket_id changed. Policies cannot compare
-- OLD vs NEW, so a trigger enforces: client roles may never move an object into or
-- out of the protected buckets. Same-bucket changes (rename/metadata) are untouched.
CREATE OR REPLACE FUNCTION public.guard_storage_bucket_move()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.bucket_id IS DISTINCT FROM OLD.bucket_id
     AND current_user IN ('authenticated', 'anon')
     AND (OLD.bucket_id IN ('checkin-photos', 'user-media')
          OR NEW.bucket_id IN ('checkin-photos', 'user-media')) THEN
    RAISE EXCEPTION 'moving objects between buckets is not allowed' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_storage_bucket_move() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_bucket_move ON storage.objects;
CREATE TRIGGER guard_bucket_move BEFORE UPDATE OF bucket_id ON storage.objects
  FOR EACH ROW EXECUTE FUNCTION public.guard_storage_bucket_move();