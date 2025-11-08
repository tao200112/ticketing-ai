-- Google OAuth / Email auth user synchronisation
-- Ensures auth.users rows are synced into public.users via (email, role) upsert logic
-- Run via supabase db push / SQL editor after committing

-- Explain existing flow:
-- 1. Supabase inserts into auth.users when a new account is created (email/password or OAuth).
-- 2. This trigger copies the row into public.users so business logic can use it.
-- 3. Previously the trigger inserted by primary key only; when users_email_role_unique existed
--    we could hit duplicate key violations for the same (email, role).
-- 4. This migration replaces the trigger function so it performs an idempotent UPSERT on (email, role)
--    and logs insert vs update events for debugging.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user_to_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_name TEXT;
  v_provider TEXT;
  v_email_verified_at TIMESTAMPTZ;
  v_result_id UUID;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'user');
  IF v_role IS NULL OR v_role NOT IN ('user', 'merchant', 'admin') THEN
    v_role := 'user';
  END IF;

  v_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
    NEW.email
  );

  v_provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');
  v_email_verified_at := COALESCE(NEW.email_confirmed_at, NEW.confirmed_at);

  INSERT INTO public.users (
    id,
    email,
    name,
    role,
    auth_provider,
    email_verified_at,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_name,
    v_role,
    v_provider,
    v_email_verified_at,
    NOW(),
    NOW()
  )
  ON CONFLICT (email, role) DO UPDATE
    SET
      name = EXCLUDED.name,
      auth_provider = EXCLUDED.auth_provider,
      email_verified_at = COALESCE(EXCLUDED.email_verified_at, public.users.email_verified_at),
      updated_at = NOW()
  RETURNING id INTO v_result_id;

  IF v_result_id = NEW.id THEN
    RAISE LOG 'handle_new_auth_user_to_users: inserted email=% role=% id=% provider=%', NEW.email, v_role, v_result_id, v_provider;
  ELSE
    RAISE LOG 'handle_new_auth_user_to_users: updated existing record for email=% role=% existing_id=% auth_id=% provider=%', NEW.email, v_role, v_result_id, NEW.id, v_provider;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'handle_new_auth_user_to_users error email=% role=% id=% state=% message=%', NEW.email, v_role, NEW.id, SQLSTATE, SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_to_users ON auth.users;

CREATE TRIGGER on_auth_user_created_to_users
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user_to_users();

COMMENT ON FUNCTION public.handle_new_auth_user_to_users()
IS 'Sync auth.users rows into public.users using (email, role) upsert with detailed logging.';

