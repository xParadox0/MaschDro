# Database Table Creation Fix

## Problem
Tables were not created during Docker deployment because:
1. The `docker/init-db/` directory was empty
2. PostgreSQL init scripts only run on fresh database initialization
3. Existing Docker volumes prevent script re-execution

## Solution
Complete database initialization setup has been created in:
- `docker/init-db/01-init.sql` - SQL table creation scripts
- `docker/init-db/02-create-tables.sh` - Bash initialization script

## Steps to Fix (Choose One)

### Option A: Clean Restart (Recommended - Complete Reset)

```bash
# 1. Stop all containers
docker-compose -f docker-compose.full.yml down

# 2. Remove the existing PostgreSQL volume
docker volume rm sengon-monitoring_timescale_data

# 3. Restart with fresh initialization
docker-compose -f docker-compose.full.yml up -d

# 4. Wait for database to initialize (check logs)
docker-compose -f docker-compose.full.yml logs -f timescaledb
```

Once you see "database system is ready to accept connections", the tables are created.

### Option B: Manual Table Creation (Keep Existing Data)

If you have data you want to keep, manually run the SQL:

```bash
# 1. Open a shell in the database container
docker exec -it sengon_timescaledb bash

# 2. Run psql and execute the initialization script
psql -U sengon_user -d sengon_monitoring -f /docker-entrypoint-initdb.d/01-init.sql

# 3. Exit and check the tables
psql -U sengon_user -d sengon_monitoring -c "\dt"
```

### Option C: Using pgAdmin or DBeaver

If you prefer a GUI:
1. Connect to `localhost:5434` with credentials:
   - Username: `sengon_user`
   - Password: `sengon_password`
   - Database: `sengon_monitoring`

2. Create the tables by running `01-init.sql` or `database_setup.sql` in the SQL editor

## Verification

After setup, verify tables were created:

```bash
docker exec -it sengon_timescaledb psql -U sengon_user -d sengon_monitoring -c "\dt"
```

Expected output:
```
              List of relations
 Schema |        Name         | Type  |   Owner
--------+---------------------+-------+------------
 public | devices             | table | sengon_user
 public | sensor_data         | table | sengon_user
 public | system_status       | table | sengon_user
 public | alerts              | table | sengon_user
 public | carbon_metrics      | table | sengon_user
(5 rows)
```

Check sample device:
```bash
docker exec -it sengon_timescaledb psql -U sengon_user -d sengon_monitoring -c "SELECT * FROM devices;"
```

## Troubleshooting

### Tables still not created?

Check database logs:
```bash
docker-compose -f docker-compose.full.yml logs timescaledb
```

Look for any error messages about permission denied or syntax errors.

### Permission errors?

Ensure the `sengon_user` has the correct permissions. Run:
```sql
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO sengon_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO sengon_user;
```

### Still getting "table does not exist"?

The initialization script may not have executed. Use Option B (Manual Table Creation) to run it directly.

## What Changed

Files created:
- `docker/init-db/01-init.sql` - PostgreSQL initialization SQL
- `docker/init-db/02-create-tables.sh` - Shell wrapper for init

Files updated:
- `docker-compose.full.yml` - Already configured correctly
- This help file

## Architecture

The system uses:
- **TimescaleDB** (PostgreSQL extension) for time-series optimization
- **Hypertables** for efficient sensor data storage
- **Indexes** on (device_id, time) for fast queries
- **Foreign keys** to maintain data integrity
