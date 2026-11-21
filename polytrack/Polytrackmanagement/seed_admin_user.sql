-- Insert test admin user into PolyTrack database
-- Password: Admin@123456
-- Email: admin@polytrack.com

INSERT INTO public.users (
    id, 
    name, 
    email, 
    password_hash, 
    avatar_url, 
    phone, 
    "role", 
    is_active, 
    timezone, 
    last_login_at, 
    created_at, 
    updated_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
    'Admin User',
    'admin@polytrack.com',
    '$2a$11$HxWsKSfXjx/GbC5fzM5aou1YzW5JNVwNYpwJ5.O.HnKVYh1jWcyGa',
    NULL,
    NULL,
    'admin',
    true,
    'UTC',
    NULL,
    NOW(),
    NOW()
) ON CONFLICT DO NOTHING;

-- Verify insertion
SELECT id, name, email, "role", is_active FROM public.users WHERE email = 'admin@polytrack.com';
