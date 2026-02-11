
-- Create table for staff money receivings (money sent to company)
CREATE TABLE public.money_receivings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NPR',
  method TEXT NOT NULL DEFAULT 'cash',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confirmed_by UUID,
  is_confirmed BOOLEAN NOT NULL DEFAULT false,
  confirmed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.money_receivings ENABLE ROW LEVEL SECURITY;

-- Staff can insert their own receivings
CREATE POLICY "Staff can create own receivings"
ON public.money_receivings
FOR INSERT
WITH CHECK (staff_id = auth.uid());

-- Staff can view their own receivings
CREATE POLICY "Staff can view own receivings"
ON public.money_receivings
FOR SELECT
USING (staff_id = auth.uid());

-- Owner and manager full access
CREATE POLICY "Owner and manager full access to receivings"
ON public.money_receivings
FOR ALL
USING (is_owner() OR is_manager());
