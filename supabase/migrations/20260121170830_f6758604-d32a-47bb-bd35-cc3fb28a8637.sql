-- Add column to track if online payment was received in staff's personal account
ALTER TABLE public.transactions 
ADD COLUMN is_personal_account boolean NOT NULL DEFAULT false;

-- Add comment to explain the column
COMMENT ON COLUMN public.transactions.is_personal_account IS 'True when staff receives online payment in their personal account (eSewa/Wallet) instead of company account';

-- Create a view to easily get staff owes summary
CREATE OR REPLACE FUNCTION public.get_staff_owes(p_staff_id uuid, p_date date)
RETURNS TABLE(total_npr numeric, total_inr numeric) 
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(SUM(CASE WHEN from_currency = 'NPR' THEN from_amount ELSE 0 END), 0) as total_npr,
    COALESCE(SUM(CASE WHEN from_currency = 'INR' THEN from_amount ELSE 0 END), 0) as total_inr
  FROM transactions
  WHERE staff_id = p_staff_id
    AND is_personal_account = true
    AND created_at::date = p_date;
$$;