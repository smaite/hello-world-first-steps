-- Create notifications table if not exists
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on notifications (if not already enabled)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- System can insert notifications (via trigger with SECURITY DEFINER)
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Update handle_new_user function to assign 'pending' role and notify owners
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  owner_record RECORD;
BEGIN
    -- Create profile
    INSERT INTO public.profiles (id, full_name, email)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);
    
    -- Check if this is the first user, make them owner
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'owner') THEN
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner');
    ELSE
        -- Assign pending role for new users
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'pending');
        
        -- Notify all owners about the new pending user
        FOR owner_record IN 
            SELECT user_id FROM public.user_roles WHERE role = 'owner'
        LOOP
            INSERT INTO public.notifications (user_id, title, message, type, metadata)
            VALUES (
                owner_record.user_id,
                'New User Pending Approval',
                'A new user "' || COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email) || '" has signed up and is waiting for approval.',
                'pending_user',
                jsonb_build_object('pending_user_id', NEW.id, 'pending_user_email', NEW.email)
            );
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Add helper function to check if user is pending
CREATE OR REPLACE FUNCTION public.is_pending()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT public.has_role(auth.uid(), 'pending')
$function$;