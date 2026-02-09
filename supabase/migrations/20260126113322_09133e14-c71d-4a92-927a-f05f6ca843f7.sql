-- A) Add receipt/slip storage for expense tracking
-- Create storage bucket for receipts
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for receipts
CREATE POLICY "Authenticated users can upload receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "Users can view own receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'receipts');

CREATE POLICY "Owners and managers can view all receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'receipts' AND (is_owner() OR is_manager()));

-- B) Add system settings for day-end time
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_end_hour integer NOT NULL DEFAULT 0,
  day_end_minute integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage system settings"
ON public.system_settings FOR ALL
TO authenticated
USING (is_owner());

CREATE POLICY "All authenticated users can view system settings"
ON public.system_settings FOR SELECT
TO authenticated
USING (true);

-- Insert default settings
INSERT INTO public.system_settings (day_end_hour, day_end_minute)
VALUES (0, 0)
ON CONFLICT DO NOTHING;

-- D) Add invoice_number to transactions - use trigger instead of generated column
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS invoice_number text;

-- Create function to generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := 'INV-' || TO_CHAR(NEW.created_at, 'YYYYMMDD') || '-' || SUBSTRING(NEW.id::text, 1, 8);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for invoice number generation
DROP TRIGGER IF EXISTS set_invoice_number ON public.transactions;
CREATE TRIGGER set_invoice_number
BEFORE INSERT ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.generate_invoice_number();

-- Update existing transactions with invoice numbers
UPDATE public.transactions
SET invoice_number = 'INV-' || TO_CHAR(created_at, 'YYYYMMDD') || '-' || SUBSTRING(id::text, 1, 8)
WHERE invoice_number IS NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_invoice_number ON public.transactions(invoice_number);

-- H) Add QR code storage for bank accounts
INSERT INTO storage.buckets (id, name, public)
VALUES ('qr-codes', 'qr-codes', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload QR codes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'qr-codes' AND (is_owner() OR is_manager()));

CREATE POLICY "Anyone can view QR codes"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'qr-codes');

-- Add QR code URL to bank accounts
ALTER TABLE public.bank_accounts
ADD COLUMN IF NOT EXISTS qr_code_url text;

-- J) Staff document management
INSERT INTO storage.buckets (id, name, public)
VALUES ('staff-documents', 'staff-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Owners and managers can upload staff documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'staff-documents' AND (is_owner() OR is_manager()));

CREATE POLICY "Owners and managers can view staff documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'staff-documents' AND (is_owner() OR is_manager()));

CREATE POLICY "Staff can view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'staff-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add document fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS id_document_url text,
ADD COLUMN IF NOT EXISTS agreement_url text,
ADD COLUMN IF NOT EXISTS salary_agreement_url text,
ADD COLUMN IF NOT EXISTS signed_agreement_url text;

-- F) Fix customer deletion - allow staff with permission to delete
DROP POLICY IF EXISTS "Staff can delete customers with permission" ON public.customers;

CREATE POLICY "Staff can delete customers with permission"
ON public.customers FOR DELETE
TO authenticated
USING (is_staff() AND has_permission('delete_customer'));

DROP POLICY IF EXISTS "Owner and manager can delete customers" ON public.customers;

CREATE POLICY "Owner and manager can delete customers"
ON public.customers FOR DELETE
TO authenticated
USING (is_owner() OR is_manager());