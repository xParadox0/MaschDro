# Quick Start - Fixed Deployment

## TL;DR - What Was Wrong & What's Fixed

**Problems Found:**
1. Database tables weren't created (empty init-db directory)
2. Frontend pointing to wrong API port (8080 instead of 8083)
3. Backend environment variables had wrong internal ports

**Files Fixed:**
- `docker/init-db/01-init.sql` - Database initialization
- `frontend/src/App.jsx` - API endpoint
- `frontend/.env` - Environment config
- `docker-compose.full.yml` - Backend environment variables

## Deploy Now

### Option 1: Complete Fresh Start (Recommended)

```bash
cd c:\Source Code\Binus\MaschDro

# Stop and remove everything
docker-compose -f docker-compose.full.yml down
docker volume rm timescale_data redis_data grafana_data

# Start fresh
docker-compose -f docker-compose.full.yml up -d

# Wait for services to start
timeout /t 15

# Verify
docker-compose -f docker-compose.full.yml ps
```

### Option 2: Just Restart Backend

```bash
cd c:\Source Code\Binus\MaschDro
docker-compose -f docker-compose.full.yml restart backend frontend
```

## Access Dashboard

- **Frontend:** http://localhost:3001
- **Backend API:** http://localhost:8083/health
- **Database:** localhost:5434 (user: sengon_user, pass: sengon_password)

## What You Should See

1. Dashboard loads with "ESP32-001" device visible
2. Device status shows:
   - Diameter: 120.5 mm
   - Temperature: 28.5°C
   - Humidity: 75%
   - Soil Moisture: 60%
   - Battery: 3.8V

## Troubleshooting

### Backend not running?
```bash
docker-compose -f docker-compose.full.yml logs backend
```

### Still connection refused?
```bash
# Check if backend is listening
docker exec sengon_backend curl http://localhost:8080/health
```

### No devices showing?
```bash
# Check database has data
docker exec sengon_timescaledb psql -U sengon_user -d sengon_monitoring -c "SELECT * FROM devices;"
```

## Port Reference

- Frontend web: `localhost:3001`
- Backend API: `localhost:8083`
- Database: `localhost:5434`
- MQTT: `localhost:1884`
- Grafana: `localhost:3002`

---

For detailed info, see:
- [BACKEND_CONNECTION_FIX.md](BACKEND_CONNECTION_FIX.md) - Backend configuration details
- [API_CONNECTION_FIX.md](API_CONNECTION_FIX.md) - Frontend API configuration
- [DEPLOYMENT_FIX.md](DEPLOYMENT_FIX.md) - Database setup details
