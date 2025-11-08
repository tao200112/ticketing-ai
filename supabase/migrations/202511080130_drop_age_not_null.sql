-- Allow Google OAuth signups to omit age; users can update it later in profile
alter table public.users
  alter column age drop not null;

alter table public.users
  alter column age drop default;

