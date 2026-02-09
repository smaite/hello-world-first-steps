-- Create remembered_devices table for "Remember this device" feature
CREATE TABLE public.remembered_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  device_token TEXT NOT NULL UNIQUE,
  device_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days')
);

-- Enable RLS
ALTER TABLE public.remembered_devices ENABLE ROW LEVEL SECURITY;

-- Users can manage their own devices
CREATE POLICY "Users can view own devices"
ON public.remembered_devices
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own devices"
ON public.remembered_devices
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own devices"
ON public.remembered_devices
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own devices"
ON public.remembered_devices
FOR UPDATE
USING (auth.uid() = user_id);

-- Allow checking device token during login (before auth)
CREATE POLICY "Anyone can check device token"
ON public.remembered_devices
FOR SELECT
USING (true);

-- Add index for faster lookups
CREATE INDEX idx_remembered_devices_token ON public.remembered_devices(device_token);
CREATE INDEX idx_remembered_devices_user ON public.remembered_devices(user_id);
CREATE INDEX idx_remembered_devices_expires ON public.remembered_devices(expires_at);