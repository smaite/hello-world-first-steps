-- Allow owner to delete profiles
CREATE POLICY "Owner can delete profiles"
ON public.profiles
FOR DELETE
USING (is_owner());

-- Allow owner to delete notifications for any user
CREATE POLICY "Owner can delete notifications"
ON public.notifications
FOR DELETE
USING (is_owner());