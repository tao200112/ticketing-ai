# Path-Based Routing Setup Guide

## Overview

Since you're using a single domain with path-based routing instead of separate domains, this guide explains how the system works with your configuration.

## Your Configuration

```
NEXT_PUBLIC_CUSTOMER_DOMAIN=https://ticketing-ai-six.vercel.app/customer
NEXT_PUBLIC_MERCHANT_DOMAIN=https://ticketing-ai-six.vercel.app/merchant
NEXT_PUBLIC_ADMIN_DOMAIN=https://ticketing-ai-six.vercel.app/admin
NEXT_PUBLIC_DEFAULT_DOMAIN=https://ticketing-ai-six.vercel.app
```

## How It Works

### Portal Detection

The system detects the portal (customer/merchant/admin) based on the **pathname** first, then falls back to hostname:

1. **Path-based detection** (priority):
   - `/admin/*` → Admin Portal
   - `/merchant/*` → Merchant Portal
   - `/customer/*`, `/`, `/auth/*`, `/events/*`, `/account/*` → Customer Portal

2. **Domain-based detection** (fallback):
   - Only used if pathname doesn't match

### Access URLs

- **Customer Portal**: 
  - `https://ticketing-ai-six.vercel.app/` (root)
  - `https://ticketing-ai-six.vercel.app/customer`
  - `https://ticketing-ai-six.vercel.app/auth/login`
  - `https://ticketing-ai-six.vercel.app/events`
  - `https://ticketing-ai-six.vercel.app/account`

- **Merchant Portal**:
  - `https://ticketing-ai-six.vercel.app/merchant`
  - `https://ticketing-ai-six.vercel.app/merchant/auth/login`
  - `https://ticketing-ai-six.vercel.app/merchant/events`

- **Admin Portal**:
  - `https://ticketing-ai-six.vercel.app/admin`
  - `https://ticketing-ai-six.vercel.app/admin/login`
  - `https://ticketing-ai-six.vercel.app/admin/dashboard`

## Registration Flow

### Customer Registration

1. Visit: `https://ticketing-ai-six.vercel.app/auth/register`
2. System detects: Portal = `customer`, Role = `user`
3. Same email can be registered again as merchant or admin

### Merchant Registration

1. Visit: `https://ticketing-ai-six.vercel.app/merchant/auth/register`
2. System detects: Portal = `merchant`, Role = `merchant`
3. Can use same email as customer registration

### Admin Registration

1. Visit: `https://ticketing-ai-six.vercel.app/admin/login`
2. System detects: Portal = `admin`, Role = `admin`
3. Requires admin invite code

## Login Flow

When logging in, the system automatically detects which portal you're accessing from:

- Login at `/auth/login` → Login as customer (role: user)
- Login at `/merchant/auth/login` → Login as merchant (role: merchant)
- Login at `/admin/login` → Login as admin (role: admin)

**Important**: Each portal has separate sessions. Logging in as a customer doesn't log you in as a merchant, even with the same email.

## Route Structure

```
/                              → Customer Portal (Home)
/auth/*                        → Customer Portal (Authentication)
/account                       → Customer Portal (User Account)
/events/*                      → Customer Portal (Browse Events)
/customer/*                    → Customer Portal (explicit path)

/merchant                      → Merchant Portal (Dashboard)
/merchant/auth/*               → Merchant Portal (Authentication)
/merchant/events/*             → Merchant Portal (Event Management)
/merchant/purchases            → Merchant Portal (Sales)
/merchant/scan                 → Merchant Portal (QR Scanner)

/admin                         → Admin Portal (Dashboard)
/admin/login                   → Admin Portal (Login)
/admin/dashboard               → Admin Portal (Admin Dashboard)
/admin/merchants               → Admin Portal (Merchant Management)
/admin/customers               → Admin Portal (Customer Management)
```

## Middleware Behavior

The middleware (`middleware.js`) now:

1. **Detects portal** from pathname first
2. **Enforces path consistency**: Redirects to correct portal path if mismatch
3. **Adds headers**:
   - `x-portal`: Current portal (customer/merchant/admin)
   - `x-request-id`: Request tracking

## Example User Journey

### Same Email, Different Roles

1. **Register as Customer**:
   ```
   Visit: https://ticketing-ai-six.vercel.app/auth/register
   Email: john@example.com
   Password: password123
   Role: user (auto-detected)
   ✅ Success
   ```

2. **Register as Merchant** (same email):
   ```
   Visit: https://ticketing-ai-six.vercel.app/merchant/auth/register
   Email: john@example.com
   Password: password456 (can be different)
   Role: merchant (auto-detected)
   ✅ Success (separate account)
   ```

3. **Login as Customer**:
   ```
   Visit: https://ticketing-ai-six.vercel.app/auth/login
   Email: john@example.com
   Password: password123
   ✅ Logged in as customer
   ```

4. **Login as Merchant** (different session):
   ```
   Visit: https://ticketing-ai-six.vercel.app/merchant/auth/login
   Email: john@example.com
   Password: password456
   ✅ Logged in as merchant (separate session)
   ```

## Development Setup

For local development, the same path-based routing works:

```bash
# Customer portal
http://localhost:3000/
http://localhost:3000/auth/login

# Merchant portal
http://localhost:3000/merchant
http://localhost:3000/merchant/auth/login

# Admin portal
http://localhost:3000/admin
http://localhost:3000/admin/login
```

## Benefits of Path-Based Routing

✅ **No DNS Configuration**: Works with single domain  
✅ **Easy Setup**: Just configure environment variables  
✅ **Same Security**: Each portal still isolated  
✅ **Flexible**: Can switch to domain-based later easily  

## Migration Notes

If you later want to switch to domain-based routing:

1. Update environment variables to use domains:
   ```
   NEXT_PUBLIC_CUSTOMER_DOMAIN=https://app.partytix.com
   NEXT_PUBLIC_MERCHANT_DOMAIN=https://merchant.partytix.com
   NEXT_PUBLIC_ADMIN_DOMAIN=https://admin.partytix.com
   ```

2. The system automatically detects and switches to domain-based mode

## Troubleshooting

### Portal Detection Not Working

Check:
1. Pathname starts with `/merchant` or `/admin`
2. Environment variables are set correctly
3. Check browser console for portal header: `x-portal`

### Wrong Portal Redirect

If you're redirected to wrong portal:
1. Clear browser cache
2. Check pathname matches expected portal
3. Verify middleware is running (check Network tab headers)

### Same Email Registration Fails

Ensure:
1. You're registering from different portals
2. Database migration is complete (allows same email with different roles)
3. Check error message for specific issue

