CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Create ENUM for booking_status
CREATE TYPE public.booking_status AS ENUM ('confirmed', 'active', 'completed', 'cancelled', 'reported', 'liberated');

-- Create ENUM for unit_status
CREATE TYPE public.unit_status AS ENUM ('active', 'delinquent');

-- Create ENUM for infraction_report_type
CREATE TYPE public.infraction_report_type AS ENUM ('exceeded_time', 'ghost_booking');

-- Create ENUM for infraction_status
CREATE TYPE public.infraction_status AS ENUM ('pending', 'resolved', 'false_positive');

-- Create ENUM for user_role
CREATE TYPE public.user_role AS ENUM ('resident', 'admin');

-- Table: units
CREATE TABLE public.units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    status public.unit_status DEFAULT 'active' NOT NULL,
    weekly_quota_hours INTEGER DEFAULT 15 NOT NULL,
    current_week_usage_minutes INTEGER DEFAULT 0 NOT NULL,
    last_booking_end_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Table: users (profiles)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
    email TEXT UNIQUE NOT NULL,
    role public.user_role DEFAULT 'resident' NOT NULL,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Table: spots
CREATE TABLE public.spots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    location_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Table: bookings
CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spot_id UUID REFERENCES public.spots(id) ON DELETE RESTRICT,
    unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    license_plate TEXT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status public.booking_status DEFAULT 'confirmed' NOT NULL,
    report_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    -- Ensure no overlapping bookings for the same spot
    EXCLUDE USING gist (spot_id WITH =, tstzrange(start_time, end_time) WITH &&)
);

-- Table: config_rules (for dynamic rules)
CREATE TABLE public.config_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name TEXT NOT NULL UNIQUE,
    rule_value TEXT NOT NULL, -- Stored as text, parsed in application logic
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Table: infractions
CREATE TABLE public.infractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL, -- Booking might be deleted
    reporter_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Reporter might be deleted
    report_type public.infraction_report_type NOT NULL,
    description TEXT,
    status public.infraction_status DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Set up Row-Level Security (RLS)
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infractions ENABLE ROW LEVEL SECURITY;

-- Add a trigger to update 'updated_at' column automatically
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_units_updated_at
BEFORE UPDATE ON public.units
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_spots_updated_at
BEFORE UPDATE ON public.spots
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_bookings_updated_at
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_config_rules_updated_at
BEFORE UPDATE ON public.config_rules
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_infractions_updated_at
BEFORE UPDATE ON public.infractions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable the pg_trgm extension for similarity searches if needed later (e.g., license plate search)
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create indexes for performance
CREATE INDEX ON public.bookings (spot_id, start_time, end_time);
CREATE INDEX ON public.bookings (unit_id);
CREATE INDEX ON public.bookings (user_id);
CREATE INDEX ON public.infractions (booking_id);
CREATE INDEX ON public.infractions (reporter_user_id);
