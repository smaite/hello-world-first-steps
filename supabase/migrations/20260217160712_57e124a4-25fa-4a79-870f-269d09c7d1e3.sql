-- Create a system-wide subscription table (one active record at a time)
CREATE TABLE public.system_subscription (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  starts_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  activated_by uuid,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.system_subscription ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view the system subscription
CREATE POLICY "Anyone authenticated can view system subscription"
  ON public.system_subscription FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only superuser can manage
CREATE POLICY "Superuser can manage system subscription"
  ON public.system_subscription FOR ALL
  USING (is_superuser());

-- Trigger for updated_at
CREATE TRIGGER update_system_subscription_updated_at
  BEFORE UPDATE ON public.system_subscription
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();