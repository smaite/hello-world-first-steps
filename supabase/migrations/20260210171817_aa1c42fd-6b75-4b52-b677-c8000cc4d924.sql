
-- Create activity tracking table
CREATE TABLE public.user_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT,
  full_name TEXT,
  ip_address TEXT,
  device_info TEXT,
  browser TEXT,
  os TEXT,
  location TEXT,
  is_online BOOLEAN NOT NULL DEFAULT true,
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

-- Only owner/manager can view all activity
CREATE POLICY "Owner and manager can view all activity"
ON public.user_activity FOR SELECT
USING (is_owner() OR is_manager());

-- Any authenticated user can upsert their own activity
CREATE POLICY "Users can upsert own activity"
ON public.user_activity FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activity"
ON public.user_activity FOR UPDATE
USING (auth.uid() = user_id);

-- Owner can delete activity records
CREATE POLICY "Owner can delete activity"
ON public.user_activity FOR DELETE
USING (is_owner());

-- Create unique index on user_id for upsert
CREATE UNIQUE INDEX idx_user_activity_user_id ON public.user_activity (user_id);
