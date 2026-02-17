-- Update is_owner() to include superuser so they get full access everywhere owners do
CREATE OR REPLACE FUNCTION public.is_owner()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'superuser')
$$;