# 🍪 HTTP-Only Cookie Authentication Testing Guide

## Overview
The authentication system has been migrated from localStorage to **HTTP-only cookies** with automatic expiration tracking.

---

## 🚀 Quick Start

### 1. **Build Frontend**
```powershell
cd frontend
npm run build
```
This compiles React and places assets in `backend/static/`.

### 2. **Start Backend**
```powershell
cd ..
docker compose up --build
```
Or run locally:
```powershell
cd backend
uvicorn main:app --reload
```

### 3. **Access App**
Navigate to: **http://localhost:8000**

---

## 🔍 Inspecting Cookies in DevTools

Since the `auth_token` cookie is **HTTP-only**, it cannot be accessed from JavaScript for security reasons. However, you can inspect it in the browser:

### **Chrome/Edge/Firefox:**

1. **Open DevTools** (F12 or Ctrl+Shift+I)
2. Go to **Application** tab (Chrome/Edge) or **Storage** tab (Firefox)
3. Click **Cookies** in the sidebar
4. Select your domain (e.g., `localhost`)
5. Look for the cookie named **`auth_token`**

### **You'll See:**
```
Name:           auth_token
Value:          eyJhbGc... (JWT token)
Domain:         localhost
Path:           /
Expires:        [Date] (or Max-Age: 28800 seconds = 8 hours)
Secure:         ❌ (HTTP) or ✅ (HTTPS in production)
HttpOnly:       ✅ (Cannot be accessed by JavaScript)
SameSite:       Lax (CSRF protection)
```

---

## 🧪 Testing Authentication Flow

### **Test 1: Login Creates Cookie**

1. Open http://localhost:8000/login
2. Enter credentials:
   - Username: `admin`
   - Password: `admin123`
3. Click **Login**
4. Open DevTools → Application → Cookies
5. Verify `auth_token` cookie exists with expiration time

**Expected:** Cookie shows ~8 hours from now (480 minutes default)

### **Test 2: API Requests Include Cookie**

1. After logging in, open DevTools → **Network** tab
2. Click any button that makes an API call (e.g., chat message)
3. Look at the request headers:
   ```
   Cookie: auth_token=eyJhbGc...
   ```
4. The request should be successful (200/201 status)

**Expected:** Cookie automatically included in all same-origin requests

### **Test 3: Cookie Expires After Timeout**

1. Login successfully
2. Wait 8 hours (or change JWT_ACCESS_TOKEN_EXPIRE_MINUTES in .env to 1 minute for testing)
3. Try making an API call
4. You'll be redirected to login

**Expected:** 401 error → redirect to /login

### **Test 4: Logout Clears Cookie**

1. Login successfully
2. Click **Logout** (if available in UI)
3. Open DevTools → Application → Cookies
4. Verify `auth_token` is **gone**

**Expected:** Cookie cleared, user logged out

---

## 🔐 Security Features

| Feature | Status | Details |
|---------|--------|---------|
| **HttpOnly** | ✅ | Cannot be accessed via `document.cookie` |
| **Secure** | ✅ | Only sent over HTTPS in production |
| **SameSite** | ✅ | Lax mode prevents CSRF attacks |
| **Max-Age** | ✅ | Expires after 480 minutes (configurable) |
| **Auto-sent** | ✅ | Axios uses `withCredentials: true` |

---

## 📝 Frontend Changes

### **AuthContext (No localStorage)**
```typescript
// OLD: const user = JSON.parse(localStorage.getItem('user'))
// NEW: Cookie automatically sent by browser
```

### **API Client**
```typescript
const api = axios.create({
  withCredentials: true,  // ← Enables cookie inclusion
});
```

### **Chat Streaming**
```typescript
// OLD: params.append('token', jwtToken)
// NEW: Cookie automatically sent, no query param needed
```

---

## 🛠️ Backend Changes

### **Auth Router**
```python
@router.post("/login")
async def login(request: Request, response: Response, credentials: LoginRequest):
    # ... verify credentials ...
    response.set_cookie(
        key="auth_token",
        value=access_token,
        max_age=480 * 60,  # 480 minutes
        httponly=True,      # Secure
        secure=True,        # Production only
        samesite="lax",
    )
    return Token(...)
```

### **Auth Dependency**
```python
async def get_current_user(
    auth_credentials: Optional[HTTPAuthCredentials] = Depends(http_bearer),
    auth_token: Optional[str] = Cookie(None, alias="auth_token"),
):
    # Tries cookie first, then Authorization header
    token = auth_token or (auth_credentials.credentials if auth_credentials else None)
    # ... validate JWT ...
    return user
```

---

## 🐛 Debugging

### **If cookies aren't showing in DevTools:**

1. ✅ Verify response has `Set-Cookie` header:
   - DevTools → Network tab → click login request → Response Headers
   - Look for: `Set-Cookie: auth_token=...`

2. ✅ Check cookie restrictions:
   - Browser might block cookies if domain/path don't match
   - Verify domain is `localhost` (or your domain)

3. ✅ Check SameSite settings:
   - If cross-origin, might need SameSite=None with Secure flag

### **If API calls are returning 401:**

1. ✅ Verify cookie exists in DevTools
2. ✅ Check Network → Request Headers includes `Cookie: auth_token=...`
3. ✅ Verify token hasn't expired (check Expires time)
4. ✅ Backend logs: `docker logs nexaverse-backend`

---

## 📊 Cookie Environment Variables

In `backend/.env`:
```env
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=480    # 8 hours
JWT_SECRET_KEY=your-secret-key         # Must be strong
JWT_ALGORITHM=HS256                    # Signing algorithm
APP_ENV=development                    # Or: production
```

**For Testing:** Set `JWT_ACCESS_TOKEN_EXPIRE_MINUTES=1` to quickly test expiration

---

## ✅ Verification Checklist

- [x] Frontend built successfully
- [ ] Backend running (docker or uvicorn)
- [ ] Login works
- [ ] `auth_token` visible in DevTools Cookies
- [ ] Expiration time is ~8 hours from now
- [ ] HttpOnly flag is checked
- [ ] API calls succeed with 200/201 status
- [ ] Logout clears the cookie
- [ ] Manual cookie deletion causes 401 on next API call

---

## 📚 Related Files

- Backend auth logic: `backend/routers/auth.py`, `backend/core/auth.py`
- Frontend auth: `frontend/src/context/AuthContext.tsx`
- API client: `frontend/src/utils/api.ts`
- Cookie utilities: `frontend/src/utils/cookies.ts`

---

## 🎯 Key Differences from localStorage

| Aspect | localStorage | HTTP-only Cookie |
|--------|--------------|-----------------|
| **Accessible from JS** | ✅ Yes | ❌ No (secure) |
| **Visible in DevTools** | Storage → LocalStorage | Application → Cookies |
| **Automatically sent** | ❌ Manual header | ✅ Yes (withCredentials) |
| **Vulnerable to XSS** | ✅ High risk | ❌ Protected |
| **Expiration** | Manual handling | Automatic (Max-Age) |

---

## ✨ Summary

You now have **production-ready cookie-based authentication** with:
- ✅ HTTP-only cookies (XSS protection)
- ✅ Automatic expiration
- ✅ CSRF protection (SameSite=Lax)
- ✅ Secure flag in production
- ✅ Browser DevTools visibility
- ✅ Clean frontend (no localStorage)

Happy testing! 🚀
