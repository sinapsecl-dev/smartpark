-- Migration: Fix auth user trigger with fully qualified enum types
-- The trigger function needs to use public.user_role, public.user_status, public.user_type

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_condominium_id UUID;
  v_unit_id UUID;
  v_role TEXT;
  v_status TEXT;
  v_full_name TEXT;
  v_user_type TEXT;
  v_invited_by UUID;
  v_invited_at TIMESTAMPTZ;
  v_profile_completed BOOLEAN;
BEGIN
  -- Extract metadata from the user
  v_condominium_id := (NEW.raw_user_meta_data->>'condominium_id')::UUID;
  v_unit_id := (NEW.raw_user_meta_data->>'unit_id')::UUID;
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'resident');
  v_status := COALESCE(NEW.raw_user_meta_data->>'status', 'pending');
  v_full_name := NEW.raw_user_meta_data->>'full_name';
  v_user_type := NEW.raw_user_meta_data->>'user_type';
  v_invited_by := (NEW.raw_user_meta_data->>'invited_by')::UUID;
  v_invited_at := (NEW.raw_user_meta_data->>'invited_at')::TIMESTAMPTZ;
  v_profile_completed := COALESCE((NEW.raw_user_meta_data->>'profile_completed')::BOOLEAN, false);
  
  -- Only create if we have a condominium_id
  IF v_condominium_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id) THEN
      INSERT INTO public.users (
        id,
        email,
        condominium_id,
        unit_id,
        role,
        status,
        full_name,
        user_type,
        invited_by,
        invited_at,
        profile_completed,
        created_at,
        updated_at
      ) VALUES (
        NEW.id,
        NEW.email,
        v_condominium_id,
        v_unit_id,
        v_role::public.user_role,
        v_status::public.user_status,
        v_full_name,
        CASE WHEN v_user_type IS NOT NULL THEN v_user_type::public.user_type ELSE NULL END,
        v_invited_by,
        v_invited_at,
        v_profile_completed,
        NOW(),
        NOW()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix email confirmation handler
CREATE OR REPLACE FUNCTION public.handle_user_confirmed()
RETURNS TRIGGER AS $$
DECLARE
  v_condominium_id UUID;
  v_unit_id UUID;
  v_status TEXT;
  v_invited_by UUID;
BEGIN
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    v_condominium_id := (NEW.raw_user_meta_data->>'condominium_id')::UUID;
    v_unit_id := (NEW.raw_user_meta_data->>'unit_id')::UUID;
    v_status := COALESCE(NEW.raw_user_meta_data->>'status', 'pending');
    v_invited_by := (NEW.raw_user_meta_data->>'invited_by')::UUID;
    
    IF v_condominium_id IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id) THEN
        INSERT INTO public.users (
          id,
          email,
          condominium_id,
          unit_id,
          role,
          status,
          profile_completed,
          created_at,
          updated_at
        ) VALUES (
          NEW.id,
          NEW.email,
          v_condominium_id,
          v_unit_id,
          'resident'::public.user_role,
          v_status::public.user_status,
          false,
          NOW(),
          NOW()
        );
      ELSE
        IF v_invited_by IS NULL THEN
          UPDATE public.users SET updated_at = NOW() WHERE id = NEW.id;
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
