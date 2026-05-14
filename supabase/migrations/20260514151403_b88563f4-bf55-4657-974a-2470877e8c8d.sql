INSERT INTO public.user_roles (user_id, role)
VALUES ('acacc340-0bf8-49ee-b009-ed2d349dc39a', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;