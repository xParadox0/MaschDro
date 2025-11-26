# IP Address Access Solution - Fully Resolved ✅

## Problem Overview
Dashboard was accessible via `localhost:3001` but NOT via IP addresses:
- ❌ `http://192.168.18.176:3001` (Ethernet IP) - Not working
- ❌ `http://192.168.18.12:3001` (WiFi IP) - Not working
- ✅ `http://localhost:3001` - Working

## Root Cause Analysis

### Issue 1: Frontend Code Hardcoding ✅ FIXED
**Problem**: Frontend hardcoded API URL to `http://localhost:8083/api/v1`
- When accessing via IP address (192.168.18.176:3001), the browser couldn't reach localhost:8083
- **Solution**: Modified frontend to use dynamic API URL selection based on hostname

**File**: `frontend/src/App.jsx` (Lines 5-20)
```javascript
const getAPIBaseURL = () => {
  if (window.location.hostname === '192.168.18.176' ||
      window.location.hostname === '192.168.18.12' ||
      window.location.hostname !== 'localhost') {
    // Using IP address - use relative path for nginx proxy
    return '/api/v1';
  }
  // Using localhost - use full URL to backend
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8083/api/v1';
};
const API_BASE_URL = getAPIBaseURL();
```

### Issue 2: nginx Configuration ✅ FIXED
**Problem**: nginx only accepted `localhost` as hostname
- **Solution**: Changed to wildcard pattern to accept any hostname/IP

**File**: `frontend/nginx.conf` (Line 3)
```nginx
server_name _;  # Accept any hostname/IP address (was: localhost)
```

### Issue 3: Docker Port Binding in WSL2 ✅ FIXED
**Problem**: Docker in WSL2 only bound ports to `127.0.0.1` and `::1` (localhost)
- Not bound to actual Windows network IP addresses (192.168.18.176, 192.168.18.12)
- This is a known WSL2/Docker Desktop limitation

**Root Cause**: `netstat -ano | findstr 3001` showed:
```
127.0.0.1:3001    LISTEN  (Docker)
::1:3001          LISTEN  (Docker)
0.0.0.0:3001      NOT LISTENING ❌
```

**Solution**: Windows `netsh` port proxy to forward traffic from IP addresses to WSL

## Solution Implemented

### Step 1: Update Frontend Code ✅
Modified `frontend/src/App.jsx` to use dynamic API URL based on access method
- Redeployed frontend container with updated code
- Container now serves API calls via relative paths (/api/v1) when accessed via IP

### Step 2: Update nginx Configuration ✅
Changed `server_name` from `localhost` to `_` (wildcard)
- Allows nginx to accept requests from any hostname/IP address
- nginx now properly forwards API calls to backend

### Step 3: Configure Windows netsh Port Proxy ✅
Added Windows port forwarding rules to bridge WSL Docker to Windows network:

```
Listen on ipv4:             Connect to ipv4:
Address         Port        Address         Port
192.168.18.176  3001   -->  172.22.131.85   3001  (Ethernet)
192.168.18.176  8083   -->  172.22.131.85   8083
192.168.18.176  1884   -->  172.22.131.85   1884

192.168.18.12   3001   -->  172.22.131.85   3001  (WiFi)
192.168.18.12   8083   -->  172.22.131.85   8083
192.168.18.12   1884   -->  172.22.131.85   1884
```

**Commands Used**:
```powershell
# Ethernet IP forwarding
netsh interface portproxy add v4tov4 listenport=3001 listenaddress=192.168.18.176 connectport=3001 connectaddress=172.22.131.85
netsh interface portproxy add v4tov4 listenport=8083 listenaddress=192.168.18.176 connectport=8083 connectaddress=172.22.131.85
netsh interface portproxy add v4tov4 listenport=1884 listenaddress=192.168.18.176 connectport=1884 connectaddress=172.22.131.85

# WiFi IP forwarding
netsh interface portproxy add v4tov4 listenport=3001 listenaddress=192.168.18.12 connectport=3001 connectaddress=172.22.131.85
netsh interface portproxy add v4tov4 listenport=8083 listenaddress=192.168.18.12 connectport=8083 connectaddress=172.22.131.85
netsh interface portproxy add v4tov4 listenport=1884 listenaddress=192.168.18.12 connectport=1884 connectaddress=172.22.131.85
```

## Verification Results

### All Access Methods Now Working ✅

#### Frontend Dashboard
```
✅ http://localhost:3001                  Status: 200 OK
✅ http://192.168.18.176:3001             Status: 200 OK (Ethernet)
✅ http://192.168.18.12:3001              Status: 200 OK (WiFi)
```

#### Backend API
```
✅ http://localhost:8083/api/v1/devices              Status: 200 OK
✅ http://192.168.18.176:8083/api/v1/devices        Status: 200 OK (Ethernet)
✅ http://192.168.18.12:8083/api/v1/devices         Status: 200 OK (WiFi)
```

## Network Architecture

```
┌─ Windows Host (192.168.18.176 & 192.168.18.12)
│  │
│  ├─ netsh port proxy
│  │  └─ 192.168.18.x:PORT --> WSL_IP:PORT
│  │
│  └─ WSL2 (172.22.131.85)
│     │
│     └─ Docker Containers
│        ├─ Frontend (port 3001)
│        ├─ Backend API (port 8083)
│        ├─ MQTT Broker (port 1884)
│        ├─ PostgreSQL (port 5434)
│        └─ Redis (port 6378)
```

## Files Modified

1. **frontend/src/App.jsx**
   - Added `getAPIBaseURL()` function for dynamic API URL selection
   - API URL now adapts based on hostname/IP

2. **frontend/nginx.conf**
   - Changed `server_name localhost;` → `server_name _;`
   - Added `/api/` proxy location block to backend

3. **Docker Container Rebuild**
   - Frontend rebuilt and redeployed with new code

## Firewall Rules Added

Created Windows Firewall rules to allow inbound traffic on ports:
- Port 3001 (Frontend Dashboard)
- Port 8083 (Backend API)
- Port 1884 (MQTT Broker)

## Setup Scripts Created

For future reference or if you need to recreate these rules:

1. **add-port-proxy.ps1** - Adds port proxy for Ethernet IP (192.168.18.176)
2. **add-wifi-port-proxy.ps1** - Adds port proxy for WiFi IP (192.168.18.12)
3. **setup-port-proxy.bat** - Batch version for command line

Run with administrator privileges:
```powershell
Start-Process powershell -ArgumentList '-ExecutionPolicy Bypass -File "C:\Path\To\add-port-proxy.ps1"' -Verb RunAs
```

## Summary

### Before
- ✅ Localhost: Working
- ❌ Ethernet IP: Not working (timeout)
- ❌ WiFi IP: Not working (timeout)
- ❌ API from IP: Not working (CORS errors)

### After
- ✅ Localhost: Working
- ✅ Ethernet IP: Working (port proxy configured)
- ✅ WiFi IP: Working (port proxy configured)
- ✅ API from IP: Working (dynamic URL selection)

## Next Steps

### 1. Test Dashboard Functionality
Open your browser and test:
```
http://192.168.18.176:3001
http://192.168.18.12:3001
```

### 2. Upload Firmware to ESP32
Your firmware is configured to send data to:
- MQTT Broker: 192.168.18.176:1884
- Device ID: SENGON_001

### 3. Verify Data Flow
Once ESP32 is running:
1. Check backend logs: `docker-compose logs -f backend`
2. Check MQTT messages: `docker exec sengon_mqtt mosquitto_sub -h localhost -p 1883 -t "sengon/#"`
3. Verify data in dashboard

### 4. Access from Other Devices
Other devices on your network can now access the dashboard via:
- Ethernet: `http://192.168.18.176:3001`
- WiFi: `http://192.168.18.12:3001`

## Troubleshooting

### Port Proxy Not Working?
Check if rules are still active:
```powershell
netsh interface portproxy show all
```

If missing, rerun the setup scripts with admin rights.

### Still Can't Access from IP?
1. Verify Docker containers are running: `wsl docker ps`
2. Check WSL network: `wsl ipconfig` (look for 172.22.x.x address)
3. Verify firewall rules: Windows Defender Firewall → Allow app through firewall
4. Check browser console: Press F12 → Console tab for errors

### IP Address Changed?
If your Windows IP address changes:
1. Remove old port proxy rules: `netsh interface portproxy delete all`
2. Update the setup scripts with new IP
3. Rerun the setup scripts

## Persistence Note

netsh port proxy rules **survive system restarts** by default. You don't need to reconfigure them unless:
- Your Windows IP address changes (DHCP)
- You reinstall WSL or Docker
- You manually delete the rules

To verify they're still active after restart:
```powershell
netsh interface portproxy show all
```

---

## ✅ SOLUTION COMPLETE

Your dashboard is now accessible from:
- **Localhost**: http://localhost:3001
- **Ethernet IP**: http://192.168.18.176:3001
- **WiFi IP**: http://192.168.18.12:3001
- **Backend API**: http://192.168.18.176:8083/api/v1
- **From other devices**: http://192.168.18.176:3001 or http://192.168.18.12:3001

All access methods fully functional! 🎉
