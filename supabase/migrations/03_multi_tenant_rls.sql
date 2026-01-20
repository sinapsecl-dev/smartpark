-- Migration: Multi-Tenant Row Level Security Policies
-- File: 03_multi_tenant_rls.sql

-- ============================================
-- DROP EXISTING POLICIES (to replace them)
-- ============================================

-- Units policies
DROP POLICY IF EXISTS "Admins can manage units" ON public.units;
DROP POLICY IF EXISTS "Residents can view own unit" ON public.units;
DROP POLICY IF EXISTS "Authenticated users can view all units" ON public.units;

-- Users policies
DROP POLICY IF EXISTS "Admins can manage user profiles" ON public.users;
DROP POLICY IF EXISTS "Users can view and update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Spots policies
DROP POLICY IF EXISTS "Admins can manage spots" ON public.spots;
DROP POLICY IF EXISTS "Authenticated users can view all spots" ON public.spots;

-- Bookings policies
DROP POLICY IF EXISTS "Admins can manage bookings" ON public.bookings;
DROP POLICY IF EXISTS "Residents can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Residents can view public active/future bookings of others" ON public.bookings;
DROP POLICY IF EXISTS "Residents can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Residents can update/delete own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Residents can delete own bookings" ON public.bookings;

-- Config rules policies
DROP POLICY IF EXISTS "Admins can manage config rules" ON public.config_rules;
DROP POLICY IF EXISTS "Authenticated users can view config rules" ON public.config_rules;

-- Infractions policies
DROP POLICY IF EXISTS "Admins can manage infractions" ON public.infractions;
DROP POLICY IF EXISTS "Residents can create infractions" ON public.infractions;
DROP POLICY IF EXISTS "Residents can view own infractions" ON public.infractions;

-- ============================================
-- CONDOMINIUMS POLICIES
-- ============================================

-- Admins can view their own condominium
CREATE POLICY "Users can view their condominium"
ON public.condominiums FOR SELECT
USING (id = public.get_user_condominium_id());

-- Admins can update their own condominium settings
CREATE POLICY "Admins can update their condominium"
ON public.condominiums FOR UPDATE
USING (public.is_condominium_admin(id))
WITH CHECK (public.is_condominium_admin(id));

-- ============================================
-- UNITS POLICIES (Multi-Tenant)
-- ============================================

-- All users in a condominium can view units in their condominium
CREATE POLICY "Users can view units in their condominium"
ON public.units FOR SELECT
USING (condominium_id = public.get_user_condominium_id());

-- Admins can manage units in their condominium
CREATE POLICY "Admins can insert units in their condominium"
ON public.units FOR INSERT
WITH CHECK (
    public.is_admin() AND 
    condominium_id = public.get_user_condominium_id()
);

CREATE POLICY "Admins can update units in their condominium"
ON public.units FOR UPDATE
USING (
    public.is_admin() AND 
    condominium_id = public.get_user_condominium_id()
)
WITH CHECK (
    public.is_admin() AND 
    condominium_id = public.get_user_condominium_id()
);

CREATE POLICY "Admins can delete units in their condominium"
ON public.units FOR DELETE
USING (
    public.is_admin() AND 
    condominium_id = public.get_user_condominium_id()
);

-- ============================================
-- USERS POLICIES (Multi-Tenant)
-- ============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.users FOR SELECT
USING (id = auth.uid());

-- Users can view other users in their condominium (for display purposes)
CREATE POLICY "Users can view users in their condominium"
ON public.users FOR SELECT
USING (condominium_id = public.get_user_condominium_id());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.users FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Admins can insert users in their condominium
CREATE POLICY "Admins can insert users in their condominium"
ON public.users FOR INSERT
WITH CHECK (
    public.is_admin() AND 
    condominium_id = public.get_user_condominium_id()
);

-- Admins can update users in their condominium
CREATE POLICY "Admins can update users in their condominium"
ON public.users FOR UPDATE
USING (
    public.is_admin() AND 
    condominium_id = public.get_user_condominium_id()
)
WITH CHECK (
    public.is_admin() AND 
    condominium_id = public.get_user_condominium_id()
);

-- ============================================
-- SPOTS POLICIES (Multi-Tenant)
-- ============================================

-- Users can view spots in their condominium
CREATE POLICY "Users can view spots in their condominium"
ON public.spots FOR SELECT
USING (condominium_id = public.get_user_condominium_id());

-- Admins can manage spots in their condominium
CREATE POLICY "Admins can insert spots"
ON public.spots FOR INSERT
WITH CHECK (
    public.is_admin() AND 
    condominium_id = public.get_user_condominium_id()
);

CREATE POLICY "Admins can update spots"
ON public.spots FOR UPDATE
USING (
    public.is_admin() AND 
    condominium_id = public.get_user_condominium_id()
)
WITH CHECK (
    public.is_admin() AND 
    condominium_id = public.get_user_condominium_id()
);

CREATE POLICY "Admins can delete spots"
ON public.spots FOR DELETE
USING (
    public.is_admin() AND 
    condominium_id = public.get_user_condominium_id()
);

-- ============================================
-- BOOKINGS POLICIES (Multi-Tenant)
-- ============================================

-- Users can view all bookings in their condominium (for parking map)
CREATE POLICY "Users can view bookings in their condominium"
ON public.bookings FOR SELECT
USING (condominium_id = public.get_user_condominium_id());

-- Residents can create bookings in their condominium
CREATE POLICY "Users can create bookings in their condominium"
ON public.bookings FOR INSERT
WITH CHECK (
    user_id = auth.uid() AND 
    condominium_id = public.get_user_condominium_id()
);

-- Users can update their own bookings
CREATE POLICY "Users can update own bookings"
ON public.bookings FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own bookings
CREATE POLICY "Users can delete own bookings"
ON public.bookings FOR DELETE
USING (user_id = auth.uid());

-- Admins can manage all bookings in their condominium
CREATE POLICY "Admins can update bookings in their condominium"
ON public.bookings FOR UPDATE
USING (
    public.is_admin() AND 
    condominium_id = public.get_user_condominium_id()
)
WITH CHECK (
    public.is_admin() AND 
    condominium_id = public.get_user_condominium_id()
);

CREATE POLICY "Admins can delete bookings in their condominium"
ON public.bookings FOR DELETE
USING (
    public.is_admin() AND 
    condominium_id = public.get_user_condominium_id()
);

-- ============================================
-- AUDIT LOGS POLICIES (Multi-Tenant)
-- ============================================

-- Admins can view audit logs in their condominium
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs FOR SELECT
USING (
    public.is_admin() AND 
    condominium_id = public.get_user_condominium_id()
);

-- System can insert audit logs (using service role or authenticated users)
CREATE POLICY "Users can insert audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (condominium_id = public.get_user_condominium_id());

-- ============================================
-- PENDING REGISTRATIONS POLICIES (Multi-Tenant)
-- ============================================

-- Admins can view pending registrations in their condominium
CREATE POLICY "Admins can view pending registrations"
ON public.pending_registrations FOR SELECT
USING (
    public.is_admin() AND 
    condominium_id = public.get_user_condominium_id()
);

-- Anyone can insert a pending registration (for self-registration)
-- The condominium_id is validated via the unique_code in application logic
CREATE POLICY "Anyone can request registration"
ON public.pending_registrations FOR INSERT
WITH CHECK (true);

-- Admins can update pending registrations in their condominium
CREATE POLICY "Admins can update pending registrations"
ON public.pending_registrations FOR UPDATE
USING (
    public.is_admin() AND 
    condominium_id = public.get_user_condominium_id()
)
WITH CHECK (
    public.is_admin() AND 
    condominium_id = public.get_user_condominium_id()
);

-- ============================================
-- CONFIG RULES POLICIES (Global for now)
-- ============================================

-- All authenticated users can view config rules
CREATE POLICY "Authenticated users can view config rules"
ON public.config_rules FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only admins can manage config rules
CREATE POLICY "Admins can manage config rules"
ON public.config_rules FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================
-- INFRACTIONS POLICIES (Multi-Tenant via booking)
-- ============================================

-- Users can view infractions they reported
CREATE POLICY "Users can view own infractions"
ON public.infractions FOR SELECT
USING (reporter_user_id = auth.uid());

-- Admins can view all infractions in their condominium (via booking)
CREATE POLICY "Admins can view infractions in their condominium"
ON public.infractions FOR SELECT
USING (
    public.is_admin() AND
    EXISTS (
        SELECT 1 FROM public.bookings b 
        WHERE b.id = booking_id 
        AND b.condominium_id = public.get_user_condominium_id()
    )
);

-- Users can create infractions
CREATE POLICY "Users can create infractions"
ON public.infractions FOR INSERT
WITH CHECK (reporter_user_id = auth.uid());

-- Admins can update infractions in their condominium
CREATE POLICY "Admins can update infractions"
ON public.infractions FOR UPDATE
USING (
    public.is_admin() AND
    EXISTS (
        SELECT 1 FROM public.bookings b 
        WHERE b.id = booking_id 
        AND b.condominium_id = public.get_user_condominium_id()
    )
);
