DO $$
DECLARE
  v_condo_id UUID;
BEGIN
  -- 1. Get the Condominium ID
  SELECT id INTO v_condo_id FROM public.condominiums WHERE name = 'Terrazas del Sol V' LIMIT 1;
  
  -- Fallback
  IF v_condo_id IS NULL THEN
     v_condo_id := 'a0000000-0000-0000-0000-000000000001';
  END IF;

  -- 2. Delete existing spots for this condo
  DELETE FROM public.spots WHERE condominium_id = v_condo_id;

  -- 3. Insert V1 to V8
  FOR i IN 1..8 LOOP
    INSERT INTO public.spots (name, condominium_id) 
    VALUES ('V' || i, v_condo_id);
  END LOOP;
END $$;
