# Ticket Verification System Guide

## Overview

The ticket verification system has been enhanced to support:
1. **Unlimited entry within validity window** - Tickets can be scanned multiple times during the validity period
2. **Automatic expiration** - Tickets expire immediately after the validity window ends
3. **Holder information display** - Shows name and age of the ticket holder
4. **Verification tracking** - Tracks how many times a ticket has been verified

## Database Schema Changes

### New Fields in `tickets` Table

```sql
validity_start_time TIMESTAMPTZ  -- When ticket becomes valid for entry
validity_end_time TIMESTAMPTZ    -- When ticket expires (no entry after this)
holder_name TEXT                 -- Name of ticket holder
holder_age INTEGER               -- Age of ticket holder
verification_count INTEGER       -- Total verification count
first_verified_at TIMESTAMPTZ    -- First verification timestamp
last_verified_at TIMESTAMPTZ     -- Most recent verification timestamp
```

## Setup Instructions

### Step 1: Run Database Migration

Execute the migration script in Supabase SQL Editor:

```bash
# Open Supabase Dashboard > SQL Editor
# Copy and paste: supabase/migrations/add_ticket_validity_fields.sql
# Click "Run"
```

Or manually run the SQL:

```sql
-- Add validity fields to tickets table
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS validity_start_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS validity_end_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS holder_name TEXT,
ADD COLUMN IF NOT EXISTS holder_age INTEGER,
ADD COLUMN IF NOT EXISTS verification_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS first_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tickets_validity ON tickets(validity_start_time, validity_end_time);
```

## How It Works

### 1. Ticket Creation (Automatic)

When a ticket is created via Stripe webhook:

1. **Validity Window**: Automatically set from event's `start_at` and `end_at`
2. **Holder Information**: Extracted from user account or metadata
   - `holder_name`: From user account name or `customer_name` in session metadata
   - `holder_age`: From user account age field

Example webhook flow:
```javascript
// Webhook automatically populates:
{
  validity_start_time: event.start_at,
  validity_end_time: event.end_at,
  holder_name: user.name,
  holder_age: user.age
}
```

### 2. Ticket Verification

When scanning a QR code via `/api/tickets/verify`:

**Priority 1: Check Validity Window**
- If `now < validity_start_time` → Invalid: "Ticket not yet valid"
- If `now > validity_end_time` → Invalid: "Ticket has expired"
- If `validity_start_time <= now <= validity_end_time` → Valid: "Ticket valid - entry allowed"

**Priority 2: Check Event End Time** (fallback if validity times not set)
- If `now > event.end_at` → Invalid: "Ticket has expired"

**Priority 3: Check Status**
- If `status === 'refunded'` or `status === 'cancelled'` → Invalid

**Verification Tracking**
- Increment `verification_count` on each scan
- Update `last_verified_at` on each scan
- Set `first_verified_at` on first verification

### 3. Display Information

The QR scanner displays:
- ✅ **Holder Name** - From `holder_name` field
- ✅ **Holder Age** - From `holder_age` field
- ✅ **Validity Status** - Valid/Invalid with message
- ✅ **Verification Count** - Number of times scanned
- ✅ **Valid From** - `validity_start_time`
- ✅ **Valid Until** - `validity_end_time`

## Usage Examples

### Example 1: Unlimited Entry Within Window

**Event**: New Year Party  
**Start**: 2024-12-31 20:00:00  
**End**: 2025-01-01 04:00:00

**Ticket Behavior**:
- ✅ **20:00 - 04:00**: Unlimited entry allowed (any number of scans)
- ❌ **04:01+**: Expired, no entry

### Example 2: Expired Ticket

**Current Time**: 2025-01-01 05:00:00  
**Validity End**: 2025-01-01 04:00:00

**Scan Result**:
```
❌ Ticket Invalid
Ticket has expired - validity window has ended
Valid Until: 2025-01-01 04:00:00
```

### Example 3: Not Yet Valid

**Current Time**: 2024-12-31 19:00:00  
**Validity Start**: 2024-12-31 20:00:00

**Scan Result**:
```
❌ Ticket Invalid
Ticket not yet valid - validity window has not started
Valid From: 2024-12-31 20:00:00
```

## QR Code Formats

The system supports two QR code formats:

### Format 1: TKT Format (Recommended)
```
TKT.<ticket_id>.<exp_ts>.<signature>
```

Example:
```
TKT.a1b2c3d4-e5f6-7890-abcd-ef1234567890.1735689600.abc123xyz789...
```

### Format 2: JSON Format (Legacy)
```json
{
  "ticket_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "short_id": "ABCD1234",
  "event_id": "...",
  "tier": "VIP",
  "holder_email": "user@example.com"
}
```

## Verification Response

### Valid Ticket Response
```json
{
  "success": true,
  "data": {
    "ticket": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "short_id": "ABCD1234",
      "tier": "VIP",
      "holder_name": "John Doe",
      "holder_age": 28,
      "status": "unused",
      "verification_count": 3,
      "first_verified_at": "2024-12-31T20:05:00Z",
      "last_verified_at": "2024-12-31T23:45:00Z"
    },
    "event": {
      "id": "...",
      "title": "New Year Party",
      "venue_name": "Grand Ballroom"
    },
    "validity": {
      "valid": true,
      "message": "Ticket valid - entry allowed",
      "validFrom": "2024-12-31T20:00:00Z",
      "validUntil": "2025-01-01T04:00:00Z",
      "status": "valid"
    },
    "scanned_at": "2024-12-31T23:45:00Z"
  }
}
```

### Invalid Ticket Response
```json
{
  "success": true,
  "data": {
    "ticket": { ... },
    "validity": {
      "valid": false,
      "message": "Ticket has expired - validity window has ended",
      "validFrom": "2024-12-31T20:00:00Z",
      "validUntil": "2025-01-01T04:00:00Z",
      "status": "expired"
    }
  }
}
```

## Testing

### Test Valid Ticket
1. Create an event with `start_at` and `end_at`
2. Purchase a ticket
3. Scan QR code during validity window
4. Should show: "Ticket valid - entry allowed"
5. Scan again multiple times - all should succeed

### Test Expired Ticket
1. Wait until after `validity_end_time`
2. Scan QR code
3. Should show: "Ticket has expired - validity window has ended"

### Test Not Yet Valid
1. Create ticket for future event
2. Scan before `validity_start_time`
3. Should show: "Ticket not yet valid - validity window has not started"

## Frontend Integration

The QR scanner is automatically integrated at `/qr-scanner`.

To use the verification API in your own component:

```javascript
const response = await fetch('/api/tickets/verify', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ qr_payload: 'TKT...' }),
});

const result = await response.json();

if (result.success && result.data.validity.valid) {
  console.log('Ticket valid!');
  console.log('Holder:', result.data.ticket.holder_name);
  console.log('Age:', result.data.ticket.holder_age);
  console.log('Verifications:', result.data.ticket.verification_count);
} else {
  console.log('Ticket invalid:', result.data.validity.message);
}
```

## Troubleshooting

### Issue: Validity times not set on existing tickets

**Solution**: Update existing tickets:
```sql
UPDATE tickets t
SET 
  validity_start_time = e.start_at,
  validity_end_time = e.end_at
FROM events e
WHERE t.event_id = e.id
  AND t.validity_start_time IS NULL;
```

### Issue: Holder information missing

**Solution**: Update tickets with order information:
```sql
UPDATE tickets t
SET 
  holder_name = o.customer_name
FROM orders o
WHERE t.order_id = o.id
  AND t.holder_name IS NULL;
```

## Environment Variables

No additional environment variables required. Uses existing:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Security Notes

1. **Signature Verification**: TKT format includes HMAC signature verification
2. **Server-side Validation**: All verification logic runs on server
3. **Database-level Constraints**: Uses indexes for performance
4. **No Client-side Rules**: Client cannot bypass expiration checks

## Future Enhancements

Potential improvements:
- [ ] Add entry location tracking
- [ ] Support for multi-day events
- [ ] Manual validity override for staff
- [ ] Real-time verification analytics dashboard
- [ ] SMS notifications for ticket scans


