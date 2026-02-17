
-- Create is_superuser() function
CREATE OR REPLACE FUNCTION public.is_superuser()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_role(auth.uid(), 'superuser')
$$;

-- Update subscription_plans policies: only superuser can manage
DROP POLICY IF EXISTS "Owner can manage plans" ON public.subscription_plans;
CREATE POLICY "Superuser can manage plans"
ON public.subscription_plans
FOR ALL
USING (is_superuser());

-- Update user_subscriptions policies: only superuser can manage
DROP POLICY IF EXISTS "Owner can manage all subscriptions" ON public.user_subscriptions;
CREATE POLICY "Superuser can manage all subscriptions"
ON public.user_subscriptions
FOR ALL
USING (is_superuser());
