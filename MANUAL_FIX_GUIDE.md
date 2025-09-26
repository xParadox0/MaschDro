# 🚨 Manual Fix Guide - Port Conflict Resolution

## Problem
- Go backend process (main.exe, PID 2524) is using port 8080
- Docker container cannot start because port is occupied
- Frontend may also have issues

## Step-by-Step Manual Solution

### Step 1: Kill the Conflicting Process
**Option A: Using Task Manager**
1. Press `Ctrl + Shift + Esc` to open Task Manager
2. Go to "Details" tab
3. Look for `main.exe` process (PID 2524)
4. Right-click → "End task"

**Option B: Using Command Prompt (Run as Administrator)**
```cmd
taskkill /F /PID 2524
```

**Option C: Using PowerShell (Run as Administrator)**
```powershell
Stop-Process -Id 2524 -Force
```

### Step 2: Verify Port is Free
```cmd
netstat -ano | findstr :8080
```
Should return nothing if port is free.

### Step 3: Clean Start Docker Deployment
```cmd
cd C:\Users\YonaSurya\OneDrive - Bina Nusantara\Skripsi\MaschDro\sengon-monitoring

# Clean up any existing containers
docker-compose -f docker-compose.minimal.yml down

# Start infrastructure first
docker-compose -f docker-compose.minimal.yml up -d timescaledb mqtt_broker redis grafana

# Wait 30 seconds for database to be ready
timeout /t 30

# Start backend
docker-compose -f docker-compose.minimal.yml up -d backend

# Wait 10 seconds
timeout /t 10

# Start frontend
docker-compose -f docker-compose.minimal.yml up -d frontend
```

### Step 4: Verify Deployment
```cmd
# Check container status
docker-compose -f docker-compose.minimal.yml ps

# Test backend health
curl http://localhost:8080/health

# Test frontend
# Open browser to http://localhost:3000
```

## Alternative: Use Different Ports

If you can't kill the process, modify the docker-compose file to use different ports:

### Edit `docker-compose.minimal.yml`:
```yaml
backend:
  ports:
    - "8081:8080"  # Change to 8081

frontend:
  ports:
    - "3001:80"    # Change to 3001 (but Grafana uses this)
    # OR
    - "3002:80"    # Use 3002 instead
```

Then access:
- Backend: http://localhost:8081
- Frontend: http://localhost:3002

## Why This Happened

1. **Previous Go Backend**: You previously ran `go run main.go` which started a backend server
2. **Process Not Terminated**: The process didn't terminate when you closed the terminal
3. **Port Binding**: Windows process is holding the port, preventing Docker from using it

## Prevention for Future

1. **Always stop services properly**: Use `Ctrl+C` to stop Go processes
2. **Check ports before deployment**: `netstat -ano | findstr :8080`
3. **Use development vs production modes**:
   - Development: `run-windows.bat` (local processes)
   - Production: `run-docker-full.bat` (all containerized)

## If Problems Persist

1. **Restart your computer** - This will kill all processes and free all ports
2. **Use development mode instead**: Run `run-windows.bat` which doesn't containerize the backend
3. **Check Windows Firewall**: Make sure Docker is allowed through firewall

## Quick Commands Reference

```cmd
# Kill all main.exe processes
taskkill /F /IM main.exe

# Kill specific PID
taskkill /F /PID 2524

# Check what's using a port
netstat -ano | findstr :8080

# Stop all Docker containers
docker stop $(docker ps -q)

# Remove all Docker containers
docker rm $(docker ps -aq)

# Clean Docker system
docker system prune -f
```

Try Step 1 first - killing the main.exe process should resolve the issue immediately!