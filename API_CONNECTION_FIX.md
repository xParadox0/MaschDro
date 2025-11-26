# Dashboard API Connection Fix

## Problem
Dashboard data not appearing even though tables exist in the database. Root cause: **API endpoint URL mismatch**

The frontend was trying to connect to the backend at:
```
http://localhost:8080/api/v1
```

But the Docker configuration exposes the backend at:
```
http://localhost:8083/api/v1
```

## Solution Applied

### Files Modified

1. **[frontend/src/App.jsx:6](frontend/src/App.jsx#L6)**
   - Changed `API_BASE_URL` from port 8080 to port 8083
   - Now correctly points to the Docker-exposed backend

2. **[frontend/.env](frontend/.env)** (NEW)
   - Created environment configuration file
   - Sets `VITE_API_BASE_URL=http://localhost:8083/api/v1`

3. **[frontend/.env.example](frontend/.env.example)** (NEW)
   - Reference file for different deployment scenarios
   - Documents local dev vs Docker vs production URLs

## What Was Happening

```
Frontend              Backend
(Port 3001)           (Port 8080 inside container)
   |                         |
   +---> http://localhost:8080/api/v1  ❌ WRONG
         (This is localhost on frontend's network)

                      Docker Bridge
                      Maps 8080 -> 8083
                      on host machine
```

Now it correctly uses:
```
http://localhost:8083/api/v1  ✅ CORRECT
(This matches the host port mapping)
```

## Deployment Instructions

### For Docker (Current Setup)

**No changes needed** - the `.env` file already has the correct configuration.

Just rebuild the frontend container:
```bash
docker-compose -f docker-compose.full.yml down frontend
docker-compose -f docker-compose.full.yml up -d frontend
```

### For Local Development

If running frontend locally (npm dev) with Docker backend:
```bash
# Use the .env file as-is (port 8083)
npm run dev
```

Access dashboard at: `http://localhost:5173`

### For Local Development (All Local)

If running both frontend and backend locally:
1. Edit `frontend/.env`:
```bash
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

2. Start frontend:
```bash
npm run dev
```

3. Start backend in another terminal:
```bash
cd backend
go run main.go
```

## Verification

After deployment, check that the dashboard loads devices:

1. Open dashboard at `http://localhost:3001` (Docker) or `http://localhost:5173` (local dev)
2. You should see device "ESP32-001" in the dropdown
3. Dashboard shows:
   - Device status (Diameter, Growth rate)
   - Environmental data (Temperature, Humidity, Soil moisture)
   - Battery and WiFi status
   - Growth charts and analytics

If still no data:
1. Check browser console (F12) for API errors
2. Verify backend is running: `http://localhost:8083/health`
3. Check database has devices:
```bash
docker exec -it sengon_timescaledb psql -U sengon_user -d sengon_monitoring -c "SELECT * FROM devices;"
```

## Architecture Diagram

```
Internet
   |
   ├─ Frontend Container (Port 3001)
   |  └─ Requests to http://localhost:8083/api/v1
   |
   └─ Backend Container (Port 8083 on host, 8080 inside container)
      └─ Connects to Database (Port 5434)
         └─ Database Container (Port 5434)
```

## Environment Variables

The frontend uses Vite's environment variable system:
- `VITE_*` prefix variables are bundled at build time
- `VITE_API_BASE_URL` controls the backend API endpoint
- Defined in `frontend/.env` (local) or Docker build args

## Related Issues Fixed

1. ✅ Database tables created (from previous fix)
2. ✅ API endpoint URL mismatch (this fix)
3. ✅ Frontend can now fetch device data
4. ✅ Dashboard displays real data from database
