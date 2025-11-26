# Network Access Configuration

## Issue
Dashboard accessible via `localhost:3001` but NOT via IP addresses like `192.168.18.176:3001`

## Root Cause
CORS (Cross-Origin Resource Sharing) security policy was blocking requests from IP addresses. Only `localhost` origins were whitelisted.

```
Request from localhost:3001          ✅ ALLOWED
Request from 192.168.18.176:3001     ❌ BLOCKED (CORS Policy)
Request from 192.168.18.12:3001      ❌ BLOCKED (CORS Policy)
```

## Solution Applied

**File:** [backend/main.go:576-586](backend/main.go#L576-L586)

Added your IP addresses to CORS whitelist:

```go
AllowOrigins: []string{
    // Localhost (development)
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:3001",
    // Local network IP addresses
    "http://192.168.18.176:3001",  // Ethernet IP
    "http://192.168.18.12:3001",   // WiFi IP
    "http://192.168.18.176:5173",  // Vite dev
    "http://192.168.18.12:5173",   // Vite dev
}
```

## Deployment

### Step 1: Rebuild Backend

```bash
docker-compose -f docker-compose.full.yml down backend
docker-compose -f docker-compose.full.yml up -d backend
```

Wait 10 seconds for startup.

### Step 2: Test Access

**Test via Ethernet IP:**
```bash
http://192.168.18.176:3001
```

**Test via WiFi IP:**
```bash
http://192.168.18.12:3001
```

**Test via localhost (still works):**
```bash
http://localhost:3001
```

All three should now work!

## Understanding CORS

### What is CORS?
CORS is a security mechanism that prevents malicious websites from accessing your APIs. Browsers enforce it by checking if the **server explicitly allows** requests from that origin.

### How Browser Checks CORS

```
User Access                Browser Action              Backend Check
─────────────              ───────────────             ──────────────
http://localhost:3001  →  Adds header:               Is localhost:3001
                           Origin: http://localhost:3001    in AllowOrigins?
                                                           YES ✅ → Allow
                                                           NO ❌ → Block

http://192.168.18.176:3001 → Adds header:            Is 192.168.18.176:3001
                              Origin: http://192.168.18.176:3001
                                                       in AllowOrigins?
                                                           YES ✅ → Allow
                                                           NO ❌ → Block
```

### CORS Headers Sent by Backend

```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: http://192.168.18.176:3001
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Origin, Content-Type, Accept, Authorization
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 43200
```

## Your Network Setup

### Your IP Addresses

| Connection | IP Address | Use |
|----------|------------|-----|
| Ethernet | 192.168.18.176 | Primary network |
| WiFi | 192.168.18.12 | Mobile/alternate access |
| Localhost | 127.0.0.1 / localhost | Development |

### Docker Port Mapping

```
HOST (192.168.18.176)          DOCKER CONTAINER
─────────────────────          ─────────────────
localhost:3001          →      frontend:80 (React)
192.168.18.176:3001     →      frontend:80 (React)
192.168.18.12:3001      →      frontend:80 (React)

localhost:8083          →      backend:8080 (Go API)
192.168.18.176:8083     →      backend:8080 (Go API)
192.168.18.12:8083      →      backend:8080 (Go API)
```

### Frontend Configuration

The frontend needs to know which backend URL to use. It's configured in [frontend/.env](frontend/.env):

```
VITE_API_BASE_URL=http://localhost:8083/api/v1
```

This works because:
- When accessed via `localhost:3001`, frontend can reach backend at `localhost:8083`
- When accessed via `192.168.18.176:3001`, frontend can also reach `localhost:8083` (Docker resolves correctly)

## Access Methods Now Available

### 1. Local Machine (localhost)
```
http://localhost:3001
http://localhost:5173 (if running Vite dev)
```

### 2. Same Network via Ethernet IP
```
http://192.168.18.176:3001
http://192.168.18.176:8083/api/v1 (API)
http://192.168.18.176:8083/health (Health check)
```

### 3. Same Network via WiFi IP
```
http://192.168.18.12:3001
http://192.168.18.12:8083/api/v1 (API)
http://192.168.18.12:8083/health (Health check)
```

## Verification

### Test Dashboard Access
```bash
# Via Ethernet
curl http://192.168.18.176:3001

# Via WiFi
curl http://192.168.18.12:3001

# Via localhost
curl http://localhost:3001
```

### Test API Access
```bash
# Check backend is responding
curl http://192.168.18.176:8083/health

# Get devices list
curl http://192.168.18.176:8083/api/v1/devices

# Get specific device
curl http://192.168.18.176:8083/api/v1/devices/SENGON_001/latest
```

### Test from Another Device

If you have another device on the network:

```bash
# From laptop/tablet on same WiFi
http://192.168.18.176:3001

# From phone on same WiFi
http://192.168.18.12:3001 (if on WiFi)
```

## Troubleshooting

### Still Getting CORS Error?

**Check 1: Backend restarted?**
```bash
docker-compose -f docker-compose.full.yml ps | grep backend
```

Should show backend running. If not, restart:
```bash
docker-compose -f docker-compose.full.yml restart backend
```

**Check 2: Correct IP in URL?**
```
✅ http://192.168.18.176:3001
❌ http://192.168.18.1:3001 (router, not your PC)
❌ http://192.168.1.176:3001 (wrong subnet)
```

**Check 3: Firewall blocking?**
- Windows Firewall may block Docker ports
- Check: Settings → Privacy & Security → Windows Defender Firewall
- Allow Docker through firewall (ports 3001, 8083, 5434, 1884)

**Check 4: Browser console error?**
Open F12 Developer Tools → Console
```
Access to fetch at 'http://192.168.18.176:8083/api/v1/devices'
from origin 'http://192.168.18.176:3001' has been blocked by CORS policy
```

This means backend CORS config needs updating again.

### IP Address Changed?

If your IP changes (DHCP), update backend CORS config:

1. Find your new IP:
```bash
ipconfig /all  # Windows
ifconfig       # Linux/Mac
```

2. Update [backend/main.go:582-585](backend/main.go#L582-L585)

3. Rebuild backend:
```bash
docker-compose -f docker-compose.full.yml restart backend
```

## Security Considerations

### Development (Current)
- CORS allows all your local network IPs
- Good for development and testing
- ⚠️ Not suitable for production

### Production
For public deployment, use:
```go
AllowOrigins: []string{
    "https://yourdomain.com",
    "https://www.yourdomain.com",
    "https://app.yourdomain.com",
}
```

Do NOT use:
```go
AllowOrigins: []string{"*"}  // Allows any origin (SECURITY RISK!)
```

## Architecture After Fix

```
┌─────────────────────────────────────────┐
│         USER'S LOCAL NETWORK            │
│                                         │
│  Other Devices                          │
│  ├─ Laptop: 192.168.?.?                │
│  ├─ Phone: 192.168.?.?                 │
│  └─ Tablet: 192.168.?.?                │
│         ↓                               │
│    Can access via:                      │
│    http://192.168.18.176:3001   ✅      │
│    http://192.168.18.12:3001    ✅      │
│                                         │
│  This Machine (Your PC)                 │
│  ├─ Ethernet: 192.168.18.176            │
│  ├─ WiFi: 192.168.18.12                 │
│  └─ Localhost: 127.0.0.1                │
│         ↓                               │
│    Can access via:                      │
│    http://localhost:3001        ✅      │
│    http://192.168.18.176:3001   ✅      │
│    http://192.168.18.12:3001    ✅      │
│                                         │
│  Docker Containers                      │
│  ├─ Frontend (port 80)                  │
│  ├─ Backend (port 8080)                 │
│  ├─ Database (port 5432)                │
│  └─ MQTT (port 1883)                    │
└─────────────────────────────────────────┘
```

## Summary

✅ **Backend CORS updated** to allow your IP addresses
✅ **Dashboard accessible via Ethernet IP** (192.168.18.176:3001)
✅ **Dashboard accessible via WiFi IP** (192.168.18.12:3001)
✅ **Dashboard still accessible via localhost** (localhost:3001)
✅ **Other devices on network** can access your system

**Next:** Rebuild backend and test all access methods!
