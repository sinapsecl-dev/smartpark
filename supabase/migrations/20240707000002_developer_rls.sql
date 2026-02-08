-- Developer RLS Policies

-- Users
CREATE POLICY "Developers can view all profiles" ON "public"."users"
FOR ALL TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'developer'
);

-- Units
CREATE POLICY "Developers can view all units" ON "public"."units"
FOR ALL TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'developer'
);

-- Bookings
CREATE POLICY "Developers can view all bookings" ON "public"."bookings"
FOR ALL TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'developer'
);

-- Condominiums
CREATE POLICY "Developers can view all condominiums" ON "public"."condominiums"
FOR ALL TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'developer'
);

-- Config Rules
CREATE POLICY "Developers can view all config_rules" ON "public"."config_rules"
FOR ALL TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'developer'
);

-- Infractions
CREATE POLICY "Developers can view all infractions" ON "public"."infractions"
FOR ALL TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'developer'
);

-- Unit Vehicles
CREATE POLICY "Developers can view all vehicles" ON "public"."unit_vehicles"
FOR ALL TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'developer'
);
