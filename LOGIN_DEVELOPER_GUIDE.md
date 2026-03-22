# Login System: Quick Reference for Developers

## Environment Variables to Check

### Backend (.env)
```env
JWT_SECRET=nepaldaan_super_secret_jwt_key_2026_change_me
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=900000
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
```

**Important:** These must match for login to work!

---

## Key Files Modified

| File | Changes |
|------|---------|
| `backend/src/controllers/authController.js` | Login controller: email lowercasing, better error messages |
| `backend/src/middleware/auth.js` | Better token validation, detailed error types |
| `frontend/src/pages/Login.jsx` | Client-side validation, smart error messages |
| `frontend/src/services/AuthContext.jsx` | Better error logging, token refresh handling |
| `frontend/src/services/api.js` | Request interceptor error handler |

---

## Flow Diagram: Successful Login

```
User enters email + password
          ↓
Frontend validates (not empty, email format)
          ↓
Frontend calls POST /api/auth/login
          ↓
Backend receives request
          ↓
Query: SELECT user WHERE LOWER(email) = LOWER(input)
          ↓
Email found? YES → Check bcrypt password match
          ↓
Password valid? YES → Generate JWT token
          ↓
Return { token, user { id, username, email, role } }
          ↓
Frontend stores in localStorage
          ↓
Navigate to /dashboard or requested page
          ↓
✅ Login Success
```

---

## Flow Diagram: Failed Login

```
User enters email + password
          ↓
Frontend validates inputs
          ↓
Call POST /api/auth/login
          ↓
Backend processes request
          ↓
User not found → 401 response
   OR
Password invalid → 401 response
          ↓
Frontend receives 401
          ↓
Show: "Invalid email or password. Please try again."
          ↓
❌ Login Failed (user can retry)
```

---

## API Endpoints

### POST /api/auth/login
**Request:**
```json
{
  "email": "admin@nepaldaan.com",
  "password": "admin123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@nepaldaan.com",
    "role": "admin",
    "wallet_address": null
  }
}
```

**Error (401):**
```json
{
  "message": "Invalid email or password"
}
```

**Error (429):**
```json
{
  "error": "Too many requests, please try again later."
}
```

---

### GET /api/auth/me
**Headers Required:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@nepaldaan.com",
  "role": "admin",
  "wallet_address": null,
  "created_at": "2026-03-22T10:30:00.000Z"
}
```

**Error (401):**
```json
{
  "message": "Token expired, please log in again"
}
```

---

## Common Debugging Tips

### Login fails with "Invalid email or password"
```bash
# Check backend logs
npm run dev  # in backend folder

# Look for login attempt messages:
# "Login attempt failed: user not found for email ad***"
# "Login attempt failed: invalid password for email ad***"
```

### Token not being sent with requests
```javascript
// Check if token is in localStorage
console.log(localStorage.getItem('nd_token'));

// Check API interceptor is adding header
// Should see: Authorization: Bearer <token>
```

### User stays logged in after refresh
```javascript
// AuthContext loadUser() should run on app mount
// Verify: Open DevTools Console, should see minimal errors
// Verify: User object should be set after 1-2 seconds
```

### "Token expired" appears
```bash
# Check JWT_EXPIRES_IN in backend .env
# Check system clock on both client and server
# Verify: Current time matches server time
```

---

## Code Review Checklist

When reviewing login-related changes:

- [ ] Email is lowercased: `email.toLowerCase()`
- [ ] Password trim only on input, not stored: `String(password)` (no trim)
- [ ] JWT_SECRET existence checked before signing
- [ ] All 401 errors trigger `localStorage.clear()` of tokens
- [ ] Token Bearer format validated: `authHeader.slice(7)`
- [ ] Error messages distinguish 401 from 429 from 500
- [ ] Passwords never logged, only first 5 chars of email for logs
- [ ] `Content-Type: application/json` header set
- [ ] CORS allows requests from `FRONTEND_URL`

---

## Performance Notes

- **Token fetch on app load:** ~500ms (network + DB query)
- **Login request:** ~800ms (bcrypt compare + token generation)
- **Rate limit window:** 900,000ms (15 minutes)
- **Rate limit threshold:** 100 requests per window

---

## Security Notes

- JWT tokens must not be exposed in URLs (use Bearer header)
- Passwords are hashed with bcrypt (salt rounds: 12)
- Email comparison is case-insensitive for usability
- Error messages don't reveal whether email exists (prevents enumeration)
- Tokens expire to prevent long-term compromise exposure

---

## Testing Commands

```bash
# Seed test database
node src/models/seed.js

# Run backend
npm run dev

# Run frontend (in different terminal)
cd ../frontend && npm run dev

# Test login via curl
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@nepaldaan.com","password":"admin123"}'
```

---

## Future Improvements

Potential enhancements for the login system:

1. **2FA (Two-Factor Authentication):** SMS/authenticator codes after password
2. **OAuth Integration:** Google/GitHub sign-in
3. **Passwordless Login:** Magic link via email
4. **Session Management:** List active sessions, logout from other devices
5. **Login History:** Audit log of login attempts with IP/UA
6. **Device Trust:** Remember device for 30 days
7. **Breach Detection:** Check against known password databases
8. **CAPTCHA:** On repeated failed attempts

---

## Links

- [JWT.io](https://jwt.io/) - Debug tokens
- [bcryptjs](https://www.npmjs.com/package/bcryptjs) - Password hashing
- [Axios](https://axios-http.com/) - HTTP client used
- [React Router](https://reactrouter.com/) - Navigation library
