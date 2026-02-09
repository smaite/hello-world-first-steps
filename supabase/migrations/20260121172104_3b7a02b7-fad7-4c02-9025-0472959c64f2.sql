-- Staff settlements table - tracks when staff submits personal eSewa to owner
CREATE TABLE public.staff_settlements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  npr_amount numeric NOT NULL DEFAULT 0,
  inr_amount numeric NOT NULL DEFAULT 0,
  settled_by uuid NOT NULL,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_settlements ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Owner and manager full access to settlements"
ON public.staff_settlements FOR ALL
USING (is_owner() OR is_manager());

CREATE POLICY "Staff can view own settlements"
ON public.staff_settlements FOR SELECT
USING (staff_id = auth.uid());

-- Staff salary table
CREATE TABLE public.staff_salaries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id uuid NOT NULL,
  month_year date NOT NULL,
  base_salary numeric NOT NULL DEFAULT 0,
  bonus numeric NOT NULL DEFAULT 0,
  deductions numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL DEFAULT 0,
  payment_date date,
  is_paid boolean NOT NULL DEFAULT false,
  paid_by uuid,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_salaries ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Owner and manager full access to salaries"
ON public.staff_salaries FOR ALL
USING (is_owner() OR is_manager());

CREATE POLICY "Staff can view own salary"
ON public.staff_salaries FOR SELECT
USING (staff_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_staff_salaries_updated_at
BEFORE UPDATE ON public.staff_salaries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();