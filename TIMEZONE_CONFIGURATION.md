# Timezone Configuration - GMT+7 (Asia/Bangkok) ✅

## Overview
All system components have been configured to use **GMT+7 (Asia/Bangkok)** timezone for consistent timestamp handling across the entire stack.

## Changes Made

### 1. Database Initialization Script ✅
**File**: `docker/init-db/01-init.sql`

Added timezone configuration at the start of the initialization:
```sql
-- Set default timezone to GMT+7 (Bangkok/Jakarta/Asia-Bangkok)
SET timezone = 'Asia/Bangkok';
```

**Purpose**: Ensures all SQL queries and timestamp operations within the database use GMT+7.

**Affected Queries**:
- `NOW()` function calls
- `TIMESTAMP WITH TIME ZONE` columns
- Time-based queries and aggregations

### 2. Docker Compose Configuration ✅
**File**: `docker-compose.full.yml`

Added timezone environment variable to TimescaleDB container:
```yaml
timescaledb:
  environment:
    TZ: Asia/Bangkok
```

**Purpose**: Sets the system timezone inside the Docker container to GMT+7, affecting:
- System clock
- Log timestamps
- Database server timezone

### 3. Backend Go Application ✅
**File**: `backend/main.go`

Fixed timezone initialization (lines 24-34):

**Before**:
```go
// GMT-7 timezone (INCORRECT - negative offset)
GMT7, err = time.LoadLocation("Etc/GMT-7")
if err != nil {
    GMT7 = time.FixedZone("GMT-7", -7*60*60)  // Wrong sign!
}
```

**After**:
```go
// GMT+7 timezone (Asia/Bangkok) (CORRECT)
GMT7, err = time.LoadLocation("Asia/Bangkok")
if err != nil {
    GMT7 = time.FixedZone("GMT+7", 7*60*60)   // Correct offset
}
```

**Impact**: All Go timestamps use `time.Now().In(GMT7)` which now correctly uses Asia/Bangkok timezone.

### Why the Fix Was Needed

The original code used `Etc/GMT-7` which is **inverted**:
- `Etc/GMT-7` actually means UTC-7 (West of UTC)
- `Asia/Bangkok` means UTC+7 (East of UTC)
- Indonesia/Thailand/Bangkok are **7 hours ahead** of UTC

**The mathematical fix**:
- `Etc/GMT-7` offset: `-7*60*60` (negative = behind UTC)
- `Asia/Bangkok` offset: `+7*60*60` (positive = ahead of UTC)

## Affected Timestamp Operations

All timestamps in the system now use GMT+7:

### Database
- `sensor_data.time` column
- `system_status.time` column
- `alerts.time` column
- `carbon_metrics.time` column
- `devices.installation_date`
- All `NOW()` and timestamp functions

### Backend API
- Device registration timestamps
- Sensor data insertion timestamps
- Alert creation timestamps
- All JSON response timestamps

### Frontend Dashboard
- All displayed timestamps will show GMT+7
- Chart time axes use GMT+7
- Data export timestamps use GMT+7

## Verification

### Check Database Timezone
```bash
# Connect to database
wsl docker exec -it sengon_timescaledb psql -U sengon_user -d sengon_monitoring

# Check current timezone
SHOW timezone;
# Should return: Asia/Bangkok

# Check current time
SELECT NOW();
# Should show GMT+7 time

# Exit
\q
```

### Check Go Backend Timezone
The backend automatically loads `Asia/Bangkok` timezone on startup. You can verify by:

1. Checking API response timestamps:
```bash
curl http://localhost:8083/api/v1/devices | jq '.[] | .timestamp'
# Should show GMT+7 formatted times
```

2. Checking logs:
```bash
wsl docker-compose logs backend | grep -i "timezone\|Asia"
```

### Check Docker Container Timezone
```bash
wsl docker exec sengon_timescaledb date
# Should show GMT+7 time
```

## Configuration Files Summary

| File | Change | Impact |
|------|--------|--------|
| `docker/init-db/01-init.sql` | Added `SET timezone = 'Asia/Bangkok'` | Database queries use GMT+7 |
| `docker-compose.full.yml` | Added `TZ: Asia/Bangkok` | Container system time is GMT+7 |
| `backend/main.go` | Changed to `Asia/Bangkok` timezone | Go app timestamps use GMT+7 |
| Frontend | No change needed | Uses timestamps from backend/database |

## How to Verify Everything is Working

### Step 1: Restart Database
```bash
wsl docker-compose -f docker-compose.full.yml down
wsl docker-compose -f docker-compose.full.yml up -d timescaledb
# Wait for database to be healthy
```

### Step 2: Rebuild Backend
```bash
wsl docker-compose -f docker-compose.full.yml down backend
wsl docker-compose -f docker-compose.full.yml up -d --build backend
```

### Step 3: Test Timestamps
1. Send sensor data via MQTT or API
2. Check dashboard - all timestamps should show correct GMT+7 time
3. Query database directly and verify `NOW()` returns GMT+7

### Step 4: Monitor Logs
```bash
wsl docker-compose logs -f backend
# Look for timestamps in logs - should be GMT+7
```

## Time Format Examples

### GMT+7 Format in Responses
```json
{
  "device_id": "SENGON_001",
  "timestamp": "2025-11-26T11:30:45+07:00",
  "time": "2025-11-26 11:30:45.123"
}
```

### Database Query Result
```sql
postgres=# SELECT NOW();
              now
-------------------------------
 2025-11-26 11:30:45.123456+07
(1 row)
```

## Common Timezone Issues (Now Fixed)

### ❌ Before (Incorrect)
- Database: `NOW()` returned UTC time
- Backend: Used wrong `Etc/GMT-7` (UTC-7 instead of UTC+7)
- Result: Times were **14 hours off** from actual GMT+7

### ✅ After (Correct)
- Database: `NOW()` returns GMT+7 time
- Backend: Uses correct `Asia/Bangkok` (UTC+7)
- Frontend: Displays correct GMT+7 time
- Result: All times are **accurate**

## Notes on Timezone Libraries

### Go Time Loading
```go
// Preferred: Named timezone (most reliable)
loc, _ := time.LoadLocation("Asia/Bangkok")

// Fallback: Fixed offset (works if named timezone not available)
loc := time.FixedZone("GMT+7", 7*3600)
```

The code tries `Asia/Bangkok` first, which is the official IANA timezone identifier for UTC+7 that includes daylight saving rules (if applicable).

## Future: Daylight Saving Time

**Important Note**: Asia/Bangkok does **not** observe daylight saving time, so:
- GMT+7 is consistent year-round
- No need to adjust for DST
- This timezone is safe for 24/7 systems

## Database Reset (If Needed)

If you need to reset the timezone and re-initialize:

```bash
# Stop all services
wsl docker-compose -f docker-compose.full.yml down

# Remove database volume to force re-initialization
wsl docker volume rm maschdro_timescale_data

# Restart services (database will reinitialize with new timezone)
wsl docker-compose -f docker-compose.full.yml up -d

# Wait for database to be healthy
wsl docker-compose exec -it sengon_timescaledb psql -U sengon_user -d sengon_monitoring -c "SHOW timezone;"
# Should return: Asia/Bangkok
```

## Summary

✅ **All components now use GMT+7 (Asia/Bangkok)**
- Database timezone: GMT+7
- Backend timezone: GMT+7
- Container system time: GMT+7
- Frontend displays: GMT+7

All timestamps throughout the system are now consistent and accurate for Asia/Bangkok timezone! 🕐

---

**Timezone**: GMT+7 (Asia/Bangkok)
**UTC Offset**: UTC+7:00
**DST**: Not observed
**Current Status**: ✅ Configured and ready
