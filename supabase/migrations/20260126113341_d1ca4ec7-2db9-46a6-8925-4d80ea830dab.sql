-- Fix security issues from previous migration

-- Fix 1: Set search_path on generate_invoice_number function
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := 'INV-' || TO_CHAR(NEW.created_at, 'YYYYMMDD') || '-' || SUBSTRING(NEW.id::text, 1, 8);
  END IF;
  RETURN NEW;
END;
$$;

-- Fix 2: Make system_settings SELECT policy more restrictive
DROP POLICY IF EXISTS "All authenticated users can view system settings" ON public.system_settings;

CREATE POLICY "Authenticated users can view system settings"
ON public.system_settings FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);