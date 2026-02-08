-- Function to check if current user is developer (bypassing RLS)
CREATE OR REPLACE FUNCTION public.is_developer()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'developer'
  );
$$;

-- Drop recursive policy
DROP POLICY IF EXISTS "Developers can view all profiles" ON public.users;

-- Re-create policy using function
CREATE POLICY "Developers can view all profiles" ON public.users
FOR ALL TO authenticated
USING (is_developer());

-- Update other policies to use local check or function if needed
-- (The other tables policies usually check users table too, but that is cross-table, not recursive on SAME table, unless they are users policies)
-- The error was on 'users' relation.
