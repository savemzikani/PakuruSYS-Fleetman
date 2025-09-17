-- Require super admin approval for new users

-- 1) Ensure profiles.is_active defaults to false for new records
ALTER TABLE profiles ALTER COLUMN is_active SET DEFAULT false;

-- 2) Optional: Mark existing profiles as active to avoid locking out current users
--    Comment this out if you want to deactivate everyone and re-approve manually.
--UPDATE profiles SET is_active = COALESCE(is_active, true);

-- 3) RLS tightening (optional): Ensure only active users can select their profile
--    Skip if you manage gating in middleware/UI. Shown here for completeness.
-- DO $$
-- BEGIN
--   IF NOT EXISTS (
--     SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Only active users access own profile'
--   ) THEN
--     CREATE POLICY "Only active users access own profile" ON profiles
--       FOR SELECT USING (id = auth.uid() AND is_active = true);
--   END IF;
-- END$$;


