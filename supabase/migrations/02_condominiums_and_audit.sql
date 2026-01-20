-- Migration: Multi-Tenant Condominiums & Audit System
-- File: 02_condominiums_and_audit.sql

-- ============================================
-- NEW ENUM TYPES
-- ============================================

-- User type: owner or tenant
CREATE TYPE public.user_type AS ENUM ('owner', 'tenant');

-- User status for approval workflow
CREATE TYPE public.user_status AS ENUM ('pending', 'active', 'suspended');

-- Audit action types
CREATE TYPE public.audit_action AS ENUM (
    'entry',
    'exit', 
    'booking_created',
    'booking_cancelled',
    'booking_completed',
    'check_in',
    'check_out',
    'denied',
    'user_created',
    'user_approved',
    'user_suspended'
);

-- ============================================
-- CONDOMINIUMS TABLE
-- ============================================

CREATE TABLE public.condominiums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    unique_code TEXT UNIQUE NOT NULL, -- For self-registration (e.g., "TERRAZAS-2024")
    address TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    max_parking_hours_per_week INTEGER DEFAULT 15,
    cooldown_period_hours INTEGER DEFAULT 2,
    max_booking_duration_hours INTEGER DEFAULT 4,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ============================================
-- PENDING REGISTRATIONS TABLE (for approval workflow)
-- ============================================

CREATE TYPE public.registration_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.pending_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    requested_unit_name TEXT, -- Name of unit they claim to belong to
    user_type public.user_type DEFAULT 'tenant',
    status public.registration_status DEFAULT 'pending' NOT NULL,
    reviewed_by UUID, -- Admin who reviewed
    reviewed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT, -- Admin notes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ============================================
-- AUDIT LOGS TABLE
-- ============================================

CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
    action public.audit_action NOT NULL,
    license_plate TEXT,
    spot_name TEXT,
    gate_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Index for efficient querying
CREATE INDEX idx_audit_logs_condominium ON public.audit_logs(condominium_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);

-- ============================================
-- ALTER EXISTING TABLES FOR MULTI-TENANCY
-- ============================================

-- Add condominium reference to units
ALTER TABLE public.units 
ADD COLUMN condominium_id UUID REFERENCES public.condominiums(id) ON DELETE CASCADE;

-- Add new columns to users
ALTER TABLE public.users 
ADD COLUMN phone TEXT,
ADD COLUMN user_type public.user_type DEFAULT 'owner',
ADD COLUMN status public.user_status DEFAULT 'active',
ADD COLUMN condominium_id UUID REFERENCES public.condominiums(id) ON DELETE CASCADE,
ADD COLUMN profile_completed BOOLEAN DEFAULT false,
ADD COLUMN invited_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
ADD COLUMN invited_at TIMESTAMP WITH TIME ZONE;

-- Add condominium reference to spots
ALTER TABLE public.spots
ADD COLUMN condominium_id UUID REFERENCES public.condominiums(id) ON DELETE CASCADE;

-- Add condominium reference to bookings (denormalized for query efficiency)
ALTER TABLE public.bookings
ADD COLUMN condominium_id UUID REFERENCES public.condominiums(id) ON DELETE CASCADE;

-- ============================================
-- CREATE DEFAULT CONDOMINIUM & MIGRATE DATA
-- ============================================

-- Insert the default condominium
INSERT INTO public.condominiums (id, name, unique_code, address)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Terrazas del Sol V',
    'TERRAZAS-2024',
    'Santiago, Chile'
);

-- Migrate existing units to default condominium
UPDATE public.units 
SET condominium_id = 'a0000000-0000-0000-0000-000000000001'
WHERE condominium_id IS NULL;

-- Migrate existing users to default condominium
UPDATE public.users 
SET condominium_id = 'a0000000-0000-0000-0000-000000000001',
    profile_completed = true
WHERE condominium_id IS NULL;

-- Migrate existing spots to default condominium
UPDATE public.spots
SET condominium_id = 'a0000000-0000-0000-0000-000000000001'
WHERE condominium_id IS NULL;

-- Migrate existing bookings to default condominium
UPDATE public.bookings
SET condominium_id = 'a0000000-0000-0000-0000-000000000001'
WHERE condominium_id IS NULL;

-- ============================================
-- MAKE COLUMNS NOT NULL AFTER MIGRATION
-- ============================================

ALTER TABLE public.units 
ALTER COLUMN condominium_id SET NOT NULL;

ALTER TABLE public.users 
ALTER COLUMN condominium_id SET NOT NULL;

ALTER TABLE public.spots
ALTER COLUMN condominium_id SET NOT NULL;

ALTER TABLE public.bookings
ALTER COLUMN condominium_id SET NOT NULL;

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE TRIGGER set_condominiums_updated_at
BEFORE UPDATE ON public.condominiums
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_pending_registrations_updated_at
BEFORE UPDATE ON public.pending_registrations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- ENABLE RLS ON NEW TABLES
-- ============================================

ALTER TABLE public.condominiums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================

-- Get current user's condominium_id
CREATE OR REPLACE FUNCTION public.get_user_condominium_id()
RETURNS UUID AS $$
    SELECT condominium_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT role = 'admin' FROM public.users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user is admin of a specific condominium
CREATE OR REPLACE FUNCTION public.is_condominium_admin(condo_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role = 'admin' 
        AND condominium_id = condo_id
    )
$$ LANGUAGE sql SECURITY DEFINER STABLE;
