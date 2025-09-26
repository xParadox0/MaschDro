@echo off
echo 🔄 Complete Docker Environment Restart
echo =====================================

echo.
echo 🛑 Step 1: Stopping ALL Docker containers...
docker stop $(docker ps -aq) 2>nul

echo.
echo 🗑️ Step 2: Removing ALL containers...
docker rm -f $(docker ps -aq) 2>nul

echo.
echo 🧹 Step 3: Pruning Docker system...
docker system prune -f

echo.
echo 🔪 Step 4: Force killing processes on ports...
echo Attempting to free port 8080...

REM Use PowerShell to kill processes by port
powershell -Command "Get-Process -Id (Get-NetTCPConnection -LocalPort 8080).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force"

echo.
echo ⏳ Step 5: Waiting for system cleanup...
timeout /t 5 /nobreak >nul

echo.
echo 🔍 Step 6: Verifying ports are free...
netstat -ano | findstr :8080
if %errorlevel% neq 0 (
    echo ✅ Port 8080 is free
) else (
    echo ❌ Port 8080 still in use
    echo Manual intervention required - please close any applications using port 8080
    echo Or restart your computer to fully clear the port
    pause
    exit /b 1
)

echo.
echo 🚀 Step 7: Starting fresh deployment...
echo Starting infrastructure services...
docker-compose -f docker-compose.minimal.yml up -d timescaledb mqtt_broker redis grafana

echo.
echo ⏳ Waiting for database to be ready...
timeout /t 45 /nobreak >nul

echo.
echo 🏗️ Building and starting backend...
docker-compose -f docker-compose.minimal.yml build backend
docker-compose -f docker-compose.minimal.yml up -d backend

echo.
echo ⏳ Waiting for backend...
timeout /t 15 /nobreak >nul

echo.
echo 🌐 Building and starting frontend...
docker-compose -f docker-compose.minimal.yml build frontend
docker-compose -f docker-compose.minimal.yml up -d frontend

echo.
echo ⏳ Waiting for frontend...
timeout /t 10 /nobreak >nul

echo.
echo 📊 Final status check...
docker-compose -f docker-compose.minimal.yml ps

echo.
echo 🔍 Testing services...
echo.

echo Backend Health:
powershell -Command "try { $r = Invoke-WebRequest 'http://localhost:8080/health' -TimeoutSec 5; Write-Host 'Status:' $r.StatusCode } catch { Write-Host 'Error:' $_.Exception.Message }"

echo.
echo Frontend Access:
powershell -Command "try { $r = Invoke-WebRequest 'http://localhost:3000' -TimeoutSec 5; Write-Host 'Status:' $r.StatusCode } catch { Write-Host 'Error:' $_.Exception.Message }"

echo.
echo ✅ Complete restart finished!
echo.
echo 🌍 Access your application:
echo   - Frontend: http://localhost:3000
echo   - Backend API: http://localhost:8080
echo   - Health Check: http://localhost:8080/health
echo   - Grafana: http://localhost:3001 (admin/sengon_admin)
echo.
pause