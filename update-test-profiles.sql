-- SQL script to update test user profile pictures
-- Run this script to add profile pictures for Jimmy, Timmy, and Gracey

-- First, let's check what users exist
SELECT 
  u.id,
  u.username,
  u.display_name,
  u.first_name,
  u.last_name,
  u.role,
  u.parent_id,
  cp.age,
  cp.profile_picture
FROM users u
LEFT JOIN child_profiles cp ON u.id = cp.user_id
WHERE u.role = 'child'
ORDER BY u.username;

-- Update Jimmy's profile
UPDATE child_profiles 
SET 
  profile_picture = '/images/profile-boy-1.png',
  age = 8,
  updated_at = NOW()
WHERE user_id = (
  SELECT id FROM users WHERE username = 'jimmy' AND role = 'child'
);

-- If Jimmy doesn't have a profile, create one
INSERT INTO child_profiles (user_id, parent_id, age, profile_picture, created_at, updated_at)
SELECT 
  u.id,
  u.parent_id,
  8,
  '/images/profile-boy-1.png',
  NOW(),
  NOW()
FROM users u
WHERE u.username = 'jimmy' 
  AND u.role = 'child'
  AND u.id NOT IN (SELECT user_id FROM child_profiles)
ON CONFLICT (user_id) DO NOTHING;

-- Update Timmy's profile
UPDATE child_profiles 
SET 
  profile_picture = '/images/profile-boy-2.png',
  age = 10,
  updated_at = NOW()
WHERE user_id = (
  SELECT id FROM users WHERE username = 'timmy' AND role = 'child'
);

-- If Timmy doesn't have a profile, create one
INSERT INTO child_profiles (user_id, parent_id, age, profile_picture, created_at, updated_at)
SELECT 
  u.id,
  u.parent_id,
  10,
  '/images/profile-boy-2.png',
  NOW(),
  NOW()
FROM users u
WHERE u.username = 'timmy' 
  AND u.role = 'child'
  AND u.id NOT IN (SELECT user_id FROM child_profiles)
ON CONFLICT (user_id) DO NOTHING;

-- Update Gracey's profile
UPDATE child_profiles 
SET 
  profile_picture = '/images/profile-girl.png',
  age = 6,
  updated_at = NOW()
WHERE user_id = (
  SELECT id FROM users WHERE username = 'gracey' AND role = 'child'
);

-- If Gracey doesn't have a profile, create one
INSERT INTO child_profiles (user_id, parent_id, age, profile_picture, created_at, updated_at)
SELECT 
  u.id,
  u.parent_id,
  6,
  '/images/profile-girl.png',
  NOW(),
  NOW()
FROM users u
WHERE u.username = 'gracey' 
  AND u.role = 'child'
  AND u.id NOT IN (SELECT user_id FROM child_profiles)
ON CONFLICT (user_id) DO NOTHING;

-- Verify the updates
SELECT 
  u.id,
  u.username,
  u.display_name,
  u.first_name,
  u.last_name,
  u.role,
  u.parent_id,
  cp.age,
  cp.profile_picture,
  cp.updated_at
FROM users u
LEFT JOIN child_profiles cp ON u.id = cp.user_id
WHERE u.username IN ('jimmy', 'timmy', 'gracey')
ORDER BY u.username;
