# Timezone Quick Check ✅

## Verify GMT+7 Configuration

### Quick Verification Steps

#### 1. Check Database Timezone
```bash
wsl docker exec sengon_timescaledb psql -U sengon_user -d sengon_monitoring -c "SHOW timezone;"
```
✅ Should return: `Asia/Bangkok`

#### 2. Check Database Server Time
```bash
wsl docker exec sengon_timescaledb date
```
✅ Should show current time in GMT+7

#### 3. Check Container Time
```bash
wsl docker-compose ps
wsl docker exec sengon_timescaledb timedatectl
```
✅ Time should match your local GMT+7 time

#### 4. Check Backend API Response
```bash
# Get current timestamp from API
curl -s http://localhost:8083/api/v1/devices | jq '.[0].timestamp'
```
✅ Should show timestamp with `+07:00` offset

#### 5. Query Database Time
```bash
wsl docker exec -it sengon_timescaledb psql -U sengon_user -d sengon_monitoring << EOF
SELECT NOW();
EOF
```
✅ Should show time ending with `+07`

## Expected Output Examples

### Correct GMT+7
```
2025-11-26 11:30:45.123456+07
2025-11-26T11:30:45+07:00
Asia/Bangkok
```

### Incorrect (Would be wrong)
```
2025-11-26 04:30:45.123456+00  (UTC time - 7 hours behind!)
2025-11-26T04:30:45Z           (UTC time)
UTC
```

## Dashboard Verification

1. Open dashboard: http://192.168.18.176:3001
2. Check any timestamp displayed
3. Should match your local GMT+7 time (or close to it)
4. All device data timestamps should be GMT+7

## Files Modified

✅ `docker/init-db/01-init.sql` - Added timezone SQL command
✅ `docker-compose.full.yml` - Added TZ environment variable
✅ `backend/main.go` - Fixed Asia/Bangkok timezone in Go code

## Restart Services (If Needed)

If timestamps still look wrong after redeploying:

```bash
# Stop all services
wsl docker-compose -f docker-compose.full.yml down

# Start database first (wait for it to be healthy)
wsl docker-compose -f docker-compose.full.yml up -d timescaledb

# Then start backend
wsl docker-compose -f docker-compose.full.yml up -d backend

# Verify
wsl docker-compose logs timescaledb | grep -i timezone
```

## Troubleshooting

### Timestamps still wrong?
1. Restart database: `docker-compose restart timescaledb`
2. Check database: `SELECT NOW();`
3. Check if TZ env var is set: `docker inspect sengon_timescaledb`
4. Rebuild backend: `docker-compose down backend && docker-compose up -d --build backend`

### Still not working?
Delete and reinitialize database:
```bash
wsl docker-compose down
wsl docker volume rm maschdro_timescale_data
wsl docker-compose up -d
```

## Timezone Details

- **Name**: Asia/Bangkok
- **UTC Offset**: +7 hours
- **Standard Name**: Indochina Time (ICT)
- **DST**: Not observed
- **Region**: Thailand, Cambodia, Laos, Vietnam, Myanmar

This timezone covers the Southeast Asia region where your monitoring system is deployed.

---

**Status**: ✅ GMT+7 (Asia/Bangkok) configured across all components
