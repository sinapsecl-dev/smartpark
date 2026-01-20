-- Migration: Create trigger to auto-create public.users when auth.users is created
-- This ensures users are created in public.users when they confirm their email invitation

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_condominium_id UUID;
  v_unit_id UUID;
  v_role TEXT;
BEGIN
  -- Extract metadata from the user
  v_condominium_id := (NEW.raw_user_meta_data->>'condominium_id')::UUID;
  v_unit_id := (NEW.raw_user_meta_data->>'unit_id')::UUID;
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'resident');
  
  -- Only create if we have a condominium_id (came from invitation)
  IF v_condominium_id IS NOT NULL THEN
    -- Check if user already exists
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
        v_role::user_role,
        'pending',
        false,
        NOW(),
        NOW()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Also create trigger for when user confirms email (update)
CREATE OR REPLACE FUNCTION public.handle_user_confirmed()
RETURNS TRIGGER AS $$
DECLARE
  v_condominium_id UUID;
  v_unit_id UUID;
BEGIN
  -- Only trigger when email is confirmed
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    v_condominium_id := (NEW.raw_user_meta_data->>'condominium_id')::UUID;
    v_unit_id := (NEW.raw_user_meta_data->>'unit_id')::UUID;
    
    IF v_condominium_id IS NOT NULL THEN
      -- Ensure user exists in public.users
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
          'resident',
          'pending',
          false,
          NOW(),
          NOW()
        );
      ELSE
        -- Update existing user to active status
        UPDATE public.users 
        SET status = 'pending', updated_at = NOW()
        WHERE id = NEW.id AND status = 'pending';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;

-- Create trigger on auth.users update
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_confirmed();
