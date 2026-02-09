-- Create login_otps table for admin-generated OTPs
CREATE TABLE public.login_otps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  used_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.login_otps ENABLE ROW LEVEL SECURITY;

-- Only owners and managers can create and view OTPs
CREATE POLICY "Owner and manager can manage OTPs"
ON public.login_otps
FOR ALL
USING (is_owner() OR is_manager())
WITH CHECK (is_owner() OR is_manager());

-- Allow unauthenticated users to verify OTPs (for login flow)
CREATE POLICY "Anyone can verify OTP during login"
ON public.login_otps
FOR SELECT
USING (true);

-- Add index for faster lookups
CREATE INDEX idx_login_otps_email_code ON public.login_otps(email, otp_code);
CREATE INDEX idx_login_otps_expires ON public.login_otps(expires_at);