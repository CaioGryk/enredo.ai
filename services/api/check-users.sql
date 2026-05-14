-- Check UserRole enum
SELECT typname FROM pg_type WHERE typname = 'UserRole';

-- Check role column
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'users' 
ORDER BY ordinal_position;

-- Check users and their roles
SELECT email, role FROM public.users;
