-- Read-only diagnostic: list duplicated (email, role) pairs.
SELECT email, role, COUNT(*) AS duplicate_count
FROM public.users
GROUP BY email, role
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, email;

-- Template: pick the row you want to keep (example keeps the earliest created_at).
-- UPDATE this CTE logic as needed before running in production.
WITH duplicate_candidates AS (
  SELECT
    *,
    ROW_NUMBER() OVER (PARTITION BY email, role ORDER BY created_at) AS row_rank
  FROM public.users
  WHERE email IN (
    -- replace with the email(s) returned by the diagnostic query
    'user@example.com'
  )
  AND role = 'user'
),
to_keep AS (
  SELECT id
  FROM duplicate_candidates
  WHERE row_rank = 1
),
to_merge AS (
  SELECT id
  FROM duplicate_candidates
  WHERE row_rank > 1
)
-- Example: update foreign keys in downstream tables to the kept id.
-- UPDATE tickets SET user_id = (SELECT id FROM to_keep) WHERE user_id IN (SELECT id FROM to_merge);
-- Repeat for each table referencing public.users.id (orders, tickets, etc).

-- Finally, delete the redundant rows once all references have been migrated.
-- DELETE FROM public.users WHERE id IN (SELECT id FROM to_merge);

-- Always wrap the UPDATE/DELETE operations in a transaction when executing in Supabase SQL editor:
-- BEGIN;
--   -- run UPDATE/DELETE statements here
-- COMMIT;

