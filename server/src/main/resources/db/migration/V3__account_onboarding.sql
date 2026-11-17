-- When the member finished the first-login onboarding (theme, profile, this device's notifications). Empty means not
-- yet, existing accounts included, so everyone goes through it once on their next sign-in.
ALTER TABLE user_account ADD COLUMN onboarded_at timestamptz;
