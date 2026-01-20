-- Migration for Row Level Security (RLS) Policies
-- File: 01_security_policies.sql

-- Policies for public.units
-- Admins can do anything
CREATE POLICY "Admins can manage units" ON public.units
FOR ALL USING (auth.role() = 'admin') WITH CHECK (auth.role() = 'admin');

-- Residents can select their own unit for data display
CREATE POLICY "Residents can view own unit" ON public.units
FOR SELECT USING (id = (SELECT unit_id FROM public.users WHERE id = auth.uid()));

-- All authenticated users can read basic unit info (e.g., for dropdowns)
CREATE POLICY "Authenticated users can view all units" ON public.units
FOR SELECT USING (auth.uid() IS NOT NULL);


-- Policies for public.users (profiles)
-- Admins can do anything
CREATE POLICY "Admins can manage user profiles" ON public.users
FOR ALL USING (auth.role() = 'admin') WITH CHECK (auth.role() = 'admin');

-- Users can select and update their own profile
CREATE POLICY "Users can view and update own profile" ON public.users
FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.users
FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Policies for public.spots
-- Admins can do anything
CREATE POLICY "Admins can manage spots" ON public.spots
FOR ALL USING (auth.role() = 'admin') WITH CHECK (auth.role() = 'admin');

-- All authenticated users can view spots (for the map)
CREATE POLICY "Authenticated users can view all spots" ON public.spots
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Policies for public.bookings
-- Admins can do anything
CREATE POLICY "Admins can manage bookings" ON public.bookings
FOR ALL USING (auth.role() = 'admin') WITH CHECK (auth.role() = 'admin');

-- Residents can SELECT their own bookings (full details)
CREATE POLICY "Residents can view own bookings" ON public.bookings
FOR SELECT USING (user_id = auth.uid());

-- Residents can SELECT public details of active/future bookings of others (transparency)
CREATE POLICY "Residents can view public active/future bookings of others" ON public.bookings
FOR SELECT
USING (
    auth.uid() IS NOT NULL AND
    user_id != auth.uid() AND
    status IN ('confirmed', 'active') AND
    end_time > now()
);

-- Residents can INSERT new bookings (subject to later function checks for fair play rules)
CREATE POLICY "Residents can create bookings" ON public.bookings
FOR INSERT WITH CHECK (user_id = auth.uid() AND auth.uid() IS NOT NULL);

-- Residents can UPDATE/DELETE their own bookings (e.g., cancel)
CREATE POLICY "Residents can update/delete own bookings" ON public.bookings
FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Residents can delete own bookings" ON public.bookings
FOR DELETE USING (user_id = auth.uid());

-- Policies for public.config_rules
-- Admins can do anything
CREATE POLICY "Admins can manage config rules" ON public.config_rules
FOR ALL USING (auth.role() = 'admin') WITH CHECK (auth.role() = 'admin');

-- All authenticated users can read config rules
CREATE POLICY "Authenticated users can view config rules" ON public.config_rules
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Policies for public.infractions
-- Admins can do anything
CREATE POLICY "Admins can manage infractions" ON public.infractions
FOR ALL USING (auth.role() = 'admin') WITH CHECK (auth.role() = 'admin');

-- Residents can INSERT new infractions
CREATE POLICY "Residents can create infractions" ON public.infractions
FOR INSERT WITH CHECK (reporter_user_id = auth.uid() AND auth.uid() IS NOT NULL);

-- Residents can SELECT their own infractions
CREATE POLICY "Residents can view own infractions" ON public.infractions
FOR SELECT USING (reporter_user_id = auth.uid());
