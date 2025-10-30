# Debug Login Issue Guide

## Console Errors Seen

1. `TypeError: Cannot read properties of undefined (reading 'id')`
   - Location: `at onSuccess` 
   - Issue: `userData` is undefined when trying to access `userData.id`

2. `SyntaxError: "undefined" is not valid JSON`
   - Location: Account page parsing session
   - Issue: localStorage contains string "undefined" instead of JSON

## Root Cause

The first login saves `undefined` to localStorage, causing subsequent page loads to fail.

## Expected Flow

1. User submits login form
2. API returns: `{ success: true, data: user, user: user }`
3. Frontend extracts: `result.data || result.user`
4. Saves to localStorage: `JSON.stringify(userData)`
5. Redirects to /account
6. Account page reads: `JSON.parse(localStorage.getItem('userSession'))`

## Debug Steps

### 1. Check API Response

In browser Network tab, check the login API request:
- Request URL: `/api/auth/login`
- Status: Should be 200
- Response body should have:
  ```json
  {
    "success": true,
    "data": {
      "id": "...",
      "email": "...",
      "name": "...",
      "role": "user"
    },
    "user": {
      "id": "...",
      "email": "...",
      "name": "...",
      "role": "user"
    }
  }
  ```

### 2. Check Console Logs

After login attempt, check for these logs:

**Login Page:**
- ✅ `✅ Login successful` with result object
- ✅ `✅ User session saved to localStorage`

**Account Page:**
- ✅ `Parsing user session:` with session string
- ✅ `Parsed session data:` with parsed object

If any are missing or show errors, note which step fails.

### 3. Check LocalStorage

In browser console, run:
```javascript
localStorage.getItem('userSession')
```

Should return valid JSON string, not `"undefined"` or `undefined`.

### 4. Check if Role Detection is Working

The login API now checks for both email and role. If you're registering from one path but logging in from another, the role might not match.

Example:
- Registered at `/merchant/auth/register` → role: `merchant`
- Login at `/auth/login` → tries to find role: `user`
- Result: Not found

**Solution**: Make sure you're logging in from the same portal where you registered.

## Temporary Workaround

If login still fails, you can manually check localStorage:

```javascript
// In browser console
console.log('Current session:', localStorage.getItem('userSession'))

// If it shows "undefined", manually set it (for testing only):
const testSession = { id: 'your-user-id', email: 'your@email.com', name: 'Your Name', role: 'user' }
localStorage.setItem('userSession', JSON.stringify(testSession))

// Then refresh the page
```

## Next Steps After Adding Logs

1. Clear browser cache and localStorage
2. Try login again
3. Copy all console logs
4. Share logs for further debugging

