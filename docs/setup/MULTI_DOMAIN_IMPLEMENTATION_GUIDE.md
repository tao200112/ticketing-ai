# Multi-Domain Multi-Role Implementation Guide

## Overview

This guide explains how to implement separate domains for Customer, Merchant, and Admin portals, allowing the same email to register as different roles.

## Architecture

### Domain Structure

- **Customer Portal**: `app.partytix.com` or `partytix.com`
  - Role: `user`
  - Routes: `/`, `/auth/*`, `/account`, `/events/*`

- **Merchant Portal**: `merchant.partytix.com`
  - Role: `merchant`
  - Routes: `/merchant/*`, `/merchant/auth/*`

- **Admin Portal**: `admin.partytix.com`
  - Role: `admin`
  - Routes: `/admin/*`, `/admin/login`

## Database Changes

### Step 1: Run Database Migration

Run the SQL migration file in Supabase SQL Editor:

```sql
-- File: supabase/migrations/multi_domain_multi_role_support.sql
```

This migration:
1. Removes unique constraint on `email` column
2. Adds unique constraint on `(email, role)` combination
3. Adds domain tracking columns

**Result**: Same email can exist with different roles:
- `user@example.com` as `user` (customer)
- `user@example.com` as `merchant` (merchant)
- `user@example.com` as `admin` (admin)

### Step 2: Verify Migration

```sql
-- Check constraint exists
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE constraint_name = 'users_email_role_unique';
```

## Environment Variables

Add these to your `.env.local` and Vercel settings:

```bash
# Domain Configuration
NEXT_PUBLIC_CUSTOMER_DOMAIN=app.partytix.com
NEXT_PUBLIC_MERCHANT_DOMAIN=merchant.partytix.com
NEXT_PUBLIC_ADMIN_DOMAIN修真.admin.partytix.com
NEXT_PUBLIC_DEFAULT_DOMAIN=partytix.com

# For development (localhost)
NODE_ENV=development
```

## API Changes

### Registration API

**Endpoint**: `POST /api/auth/register`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "age": 25,
  "role": "user" // or "merchant", "admin"
}
```

**Changes**:
- Role is determined by domain OR explicitly passed
- Checks for `(email, role)` combination, not just email
- Same email can register multiple times with different roles

### Login API

**Endpoint**: `POST /api/auth/login`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "user" // Optional, auto-detected from domain
}
```

**Changes**:
- Role can be auto-detected from domain
- If user has multiple roles, returns available roles
- Login succeeds only if `(email, role, password)` match

## Domain Configuration

### Vercel Configuration

1. **Add domains in Vercel Dashboard**:
   - Go to Project Settings → Domains
   - Add: `app.partytix.com`, `merchant.partytix.com`, `admin.partytix.com`

2. **DNS Configuration**:
   ```
   app.partytix.com    → CNAME → cname.vercel-dns.com
   merchant.partytix.com → CNAME → cname.vercel-dns.com
   admin.partytix.com  → CNAME → cname.vercel-dns.com
   ```

### Development Setup

For local development, use pathname-based routing:

```bash
# Customer portal
http://localhost:3000/

# Merchant portal  
http://localhost:3000/merchant

# Admin portal
http://localhost:3000/admin
```

## Middleware Logic

The middleware (`middleware.js`) now:

1. **Detects portal** from hostname
2. **Protects routes**:
   - `/admin/*` only accessible from admin domain
   - `/merchant/*` only accessible from merchant domain
   - `/` accessible from customer domain
3. **Adds headers**:
   - `x-portal`: Current portal type
   - `x-request-id`: Request tracking

## User Flow Examples

### Scenario 1: Same Email, Different Roles

1. **Register as Customer**:
   - Visit `app.partytix.com/auth/register`
   - Email: `john@example.com`, Role: `user`
   - ✅ Registration successful

2. **Register as Merchant** (same email):
   - Visit `merchant.partytix.com/merchant/auth/register`
   - Email: `john@example.com`, Role: `merchant`
   - ✅ Registration successful (different account)

3. **Login as Customer**:
   - Visit `app.partytix.com/auth/login`
   - Email: `john@example.com`, Password: `password123`
   - ✅ Logged in as customer

4. **Login as Merchant** (same credentials):
   - Visit `merchant.partytix.com/merchant/auth/login`
   - Email: `john@example.com`, Password: `password123`
   - ✅ Logged in as merchant

### Scenario 2: Domain Protection

1. **Try to access Admin from Customer domain**:
   - Visit `app.partytix.com/admin`
   - ✅ Automatically redirected to `admin.partytix.com/admin`

2. **Try to access Merchant from Customer domain**:
   - Visit `app.partytix.com/merchant`
   - ✅ Automatically redirected to `merchant.partytix.com/merchant`

## Testing Checklist

- [ ] Database migration successful
- [ ] Can register same email as different roles
- [ ] Domain detection works correctly
- [ ] Route protection works (redirects to correct domain)
- [ ] Login works for each role separately
- [ ] Sessions are isolated per role
- [ ] API routes respect domain boundaries
- [ ] Development mode works with pathname routing

## Security Considerations

1. **Session Isolation**: Each role has separate session
2. **Domain Validation**: API routes verify request domain
3. **Role Verification**: Middleware enforces role-based access
4. **Password Security**: Same email, different roles can have different passwords

## Rollback Plan

If issues occur, you can rollback:

```sql
-- Restore unique constraint on email
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_email_role_unique;

ALTER TABLE users 
ADD CONSTRAINT users_email_key UNIQUE (email);
```

**Note**: This will prevent multi-role apartment for same email.

## Support

For issues or questions:
1. Check middleware logs for domain detection
2. Verify environment variables are set
3. Test database constraints with SQL queries
4. Check browser console for domain mismatch errors

