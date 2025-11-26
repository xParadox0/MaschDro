# Backend Connection & Configuration Fix

## Problem
Dashboard shows error: `net::ERR_CONNECTION_REFUSED` when trying to reach the backend API at `http://localhost:8083/api/v1`

The backend container was failing to start due to environment variable misconfigurations.

## Root Causes

### 1. Database URL Port Mismatch
**Before:**
```
DATABASE_URL=postgres://sengon_user:sengon_password@timescaledb:5434/sengon_monitoring
```
**Problem:** Backend tried to connect to port 5434, but the database listens on **5432 inside the container**. Port 5434 is the external host mapping only.

**Fixed:**
```
DATABASE_URL=postgres://sengon_user:sengon_password@timescaledb:5432/sengon_monitoring
```

### 2. MQTT Broker Port Mismatch
**Before:**
```
MQTT_BROKER=tcp://mqtt_broker:1884
```
**Problem:** MQTT service runs on port **1883 inside the container**. Port 1884 is external mapping only.

**Fixed:**
```
MQTT_BROKER=tcp://mqtt_broker:1883
```

### 3. Redis URL Port Mismatch
**Before:**
```
REDIS_URL=redis:6378
```
**Problem:** Redis runs on **6379 inside the container**. Port 6378 is external mapping only.

**Fixed:**
```
REDIS_URL=redis:6379
```

### 4. Backend Server Port Mismatch
**Before:**
```
SERVER_PORT=8081
```
**Problem:** Docker port mapping is `8083:8080`, meaning port 8080 inside the container maps to 8083 on the host. Setting SERVER_PORT to 8081 means the service listened on the wrong port.

**Fixed:**
```
SERVER_PORT=8080
```

## Docker Networking Explanation

```
HOST MACHINE                    DOCKER NETWORK (Internal)
─────────────────────────────────────────────────────────

localhost:8083 ───────────────→ backend:8080 ✓ (Now correct)
localhost:5434 ───────────────→ timescaledb:5432 ✓ (Internal port)
localhost:1884 ───────────────→ mqtt_broker:1883 ✓ (Internal port)
localhost:6378 ───────────────→ redis:6379 ✓ (Internal port)
```

When services communicate **inside Docker**, they use the **internal container ports**, not the host-mapped ports.

## Changes Made

**File:** [docker-compose.full.yml](docker-compose.full.yml:63-74)

```yaml
backend:
  environment:
    - DATABASE_URL=postgres://sengon_user:sengon_password@timescaledb:5432/sengon_monitoring?sslmode=disable  # 5434→5432
    - MQTT_BROKER=tcp://mqtt_broker:1883                                                                    # 1884→1883
    - REDIS_URL=redis:6379                                                                                   # 6378→6379
    - SERVER_PORT=8080                                                                                       # 8081→8080
```

## Deployment Instructions

### Complete Restart (Recommended)

```bash
# Stop all containers
docker-compose -f docker-compose.full.yml down

# Remove volumes to reset everything (optional - keeps data if skipped)
docker volume rm timescale_data redis_data grafana_data

# Start fresh
docker-compose -f docker-compose.full.yml up -d

# Wait 10-15 seconds for all services to start
sleep 15

# Check logs
docker-compose -f docker-compose.full.yml logs backend
```

### Just Restart Backend

If you want to keep your data:

```bash
docker-compose -f docker-compose.full.yml down backend
docker-compose -f docker-compose.full.yml up -d backend
```

## Verification

Check if backend is running and connected:

```bash
# 1. Check container status
docker ps | grep sengon_backend

# 2. Check backend logs
docker-compose -f docker-compose.full.yml logs backend

# 3. Test health endpoint
curl http://localhost:8083/health

# 4. Test device list endpoint
curl http://localhost:8083/api/v1/devices
```

Expected responses:
- Health check: `{"status":"healthy","timestamp":"...","mqtt_connected":true}`
- Devices: `{"devices":[{"device_id":"ESP32-001",...}]}`

## Frontend Dashboard Check

Once backend is running:

1. Open browser: `http://localhost:3001` (Docker) or `http://localhost:5173` (dev)
2. Check browser console (F12) - no more connection errors
3. Dashboard should load device "ESP32-001"
4. You should see:
   - Device status card
   - Environmental data (Temperature, Humidity, Soil moisture)
   - Battery voltage and WiFi signal
   - Growth charts (if sample data exists)

## Common Issues & Solutions

### Backend still won't start
Check the backend logs for detailed errors:
```bash
docker-compose -f docker-compose.full.yml logs -f backend
```

Common error causes:
- **"Failed to connect to database"** → Database not ready. Check `docker-compose logs timescaledb`
- **"Failed to setup MQTT"** → MQTT broker not running. Check `docker-compose logs mqtt_broker`
- **"connection refused"** → Check that services have correct internal ports

### Still getting connection refused on frontend
```bash
# Verify backend is listening on port 8080 inside container
docker exec sengon_backend netstat -tuln | grep 8080

# Or test from frontend container
docker exec sengon_frontend curl http://sengon_backend:8080/health
```

### Database isn't initialized
The database might not have been initialized properly. Manually run the init script:

```bash
docker exec -it sengon_timescaledb psql -U sengon_user -d sengon_monitoring < docker/init-db/01-init.sql
```

## Summary of Port Mappings

| Service | Internal Port | External Port | Purpose |
|---------|---------------|---------------|---------|
| Frontend | 80 | 3001 | Web dashboard |
| Backend | 8080 | 8083 | REST API |
| Database | 5432 | 5434 | PostgreSQL |
| MQTT | 1883 | 1884 | Message broker |
| Redis | 6379 | 6378 | Cache |
| Grafana | 3000 | 3002 | Monitoring |

## Related Fixes

1. ✅ Database tables created (`docker/init-db/01-init.sql`)
2. ✅ Frontend API URL corrected (`frontend/src/App.jsx`)
3. ✅ Backend environment variables fixed (`docker-compose.full.yml`)
4. ✅ Docker networking properly configured

The system should now work end-to-end: Frontend → Backend → Database → MQTT
