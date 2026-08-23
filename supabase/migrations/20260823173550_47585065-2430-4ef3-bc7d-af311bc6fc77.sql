
REVOKE ALL ON FUNCTION public.can_view_user_media(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_user_media(uuid, text) TO authenticated, service_role;
