
-- Step 1: Add superuser to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'superuser' BEFORE 'owner';
