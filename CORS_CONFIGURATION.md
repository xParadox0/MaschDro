# CORS Configuration Fix

## Problem
Dashboard returns CORS error:
```
Access to fetch at 'http://localhost:8083/api/v1/devices' from origin 'http://localhost:3001'
has been blocked by CORS policy
```

## Root Cause
The backend's CORS middleware was configured to allow only:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000` (wrong port)

But the Docker frontend runs on **port 3001**, which wasn't in the allowed list.

## Solution
Updated [backend/main.go:482](backend/main.go#L482) to include all frontend ports:

```go
AllowOrigins: []string{
    "http://localhost:5173",  // Vite dev server
    "http://localhost:3000",  // Alternative port
    "http://localhost:3001",  // Docker frontend (added)
}
```

## What is CORS?
CORS (Cross-Origin Resource Sharing) is a security feature that prevents malicious websites from accessing your API. Browsers enforce this by checking if the **server explicitly allows** requests from that origin.

**Allowed Origins Explained:**
```
Frontend Origin (localhost:3001)
         ↓
    Browser Check
         ↓
    Compare with backend's AllowOrigins list
         ↓
    If match → Allow request ✓
    If no match → Block request ✗ (CORS error)
```

## Deployment

### Option 1: Quick Restart (Recommended)
```bash
docker-compose -f docker-compose.full.yml restart backend
```

### Option 2: Rebuild Backend
```bash
docker-compose -f docker-compose.full.yml down backend
docker-compose -f docker-compose.full.yml up -d backend
```

Wait 5-10 seconds for backend to start, then refresh dashboard.

## Verification

### Check Backend is Running
```bash
curl http://localhost:8083/health
```

Expected response:
```json
{"status":"healthy","timestamp":"...","mqtt_connected":true}
```

### Test API Endpoint
```bash
curl http://localhost:8083/api/v1/devices
```

Expected response:
```json
{"devices":[{"device_id":"ESP32-001","device_name":"Sengon Tree #1",...}]}
```

### Dashboard Check
1. Open http://localhost:3001
2. Browser console (F12) should show NO CORS errors
3. Device "ESP32-001" should appear in dropdown
4. Sensor data should display

## Production Deployment

For production, update the allowed origins with your actual domain:

```go
AllowOrigins: []string{
    "https://yourdomain.com",
    "https://www.yourdomain.com",
    "https://api.yourdomain.com",  // If using subdomain
}
```

Or use a wildcard for development only (not secure for production):
```go
AllowOrigins: []string{"*"}  // Allow all origins (NOT RECOMMENDED for production)
```

## CORS Header Details

The backend returns these CORS headers:

| Header | Value | Purpose |
|--------|-------|---------|
| `Access-Control-Allow-Origin` | http://localhost:3001 | Indicates which origin is allowed |
| `Access-Control-Allow-Methods` | GET, POST, PUT, DELETE, OPTIONS | Allowed HTTP methods |
| `Access-Control-Allow-Headers` | Origin, Content-Type, Accept, Authorization | Allowed request headers |
| `Access-Control-Allow-Credentials` | true | Allows cookies/credentials |
| `Access-Control-Max-Age` | 43200 | Preflight cache time (12 hours) |

## Common CORS Errors & Solutions

### Error: "No 'Access-Control-Allow-Origin' header"
**Cause:** Origin not in `AllowOrigins` list
**Solution:** Add the frontend URL to `AllowOrigins`

### Error: "Method not allowed"
**Cause:** HTTP method not in `AllowMethods`
**Solution:** Add the method (GET, POST, PUT, DELETE) to `AllowMethods`

### Error: "Header not allowed"
**Cause:** Custom header not in `AllowHeaders`
**Solution:** Add the header to `AllowHeaders`

## Architecture

```
Browser (localhost:3001)
    ↓
    CORS Check: Is origin in AllowOrigins?
    ↓
Backend (localhost:8083)
    ↓
    Response includes Access-Control-Allow-Origin header
    ↓
Browser: Allows or blocks response based on header
```

## Files Changed

- [backend/main.go:482](backend/main.go#L482) - Added `http://localhost:3001` to AllowOrigins

## Next Steps

After deploying:
1. Refresh dashboard at http://localhost:3001
2. Check browser console (F12) - should be clean
3. Device data should load immediately
4. Dashboard should display all sensor readings

---

For more info on CORS: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
