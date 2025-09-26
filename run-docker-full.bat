@echo off
echo 🐳 Sengon Monitoring System - Full Docker Deployment
echo ==================================================

echo.
echo 📋 Checking Docker status...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker Desktop first
    echo    1. Open Docker Desktop
    echo    2. Wait for Docker to start completely
    echo    3. Try again
    pause
    exit /b 1
) else (
    echo ✅ Docker is running
)

echo.
echo 🛑 Stopping existing services...
docker-compose -f docker-compose.full.yml down

echo.
echo 🏗️ Building and starting all services...
docker-compose -f docker-compose.full.yml up -d --build

if %errorlevel% neq 0 (
    echo ❌ Failed to start services
    echo.
    echo 🔍 Checking for common issues:
    echo   - Port conflicts (5432, 1883, 6379, 8080, 3000, 3001)
    echo   - Docker Desktop not running
    echo   - Build failures
    echo.
    echo 📋 Check logs with: docker-compose -f docker-compose.full.yml logs
    pause
    exit /b 1
)

echo.
echo ⏳ Waiting for services to be ready (60 seconds)...
timeout /t 60 /nobreak >nul

echo.
echo 📊 Checking service status...
docker-compose -f docker-compose.full.yml ps

echo.
echo 🔍 Testing service health...

REM Test Database
echo | set /p="PostgreSQL: "
docker exec sengon_timescaledb pg_isready -U sengon_user -d sengon_monitoring
if %errorlevel% neq 0 (echo ❌ Not ready) else (echo ✅ Ready)

REM Test Backend API
echo | set /p="Backend API: "
powershell -command "& {try {$response = Invoke-WebRequest -Uri 'http://localhost:8080/health' -TimeoutSec 5; if($response.StatusCode -eq 200) {Write-Host '✅ Ready'} else {Write-Host '❌ Error'}} catch {Write-Host '❌ Not accessible'}}"

REM Test Frontend
echo | set /p="Frontend: "
powershell -command "& {try {$response = Invoke-WebRequest -Uri 'http://localhost:3000' -TimeoutSec 5; if($response.StatusCode -eq 200) {Write-Host '✅ Ready'} else {Write-Host '❌ Error'}} catch {Write-Host '❌ Not accessible'}}"

echo.
echo ✅ Full Docker deployment complete!
echo.
echo 🌍 Access points:
echo   - Frontend Dashboard: http://localhost:3000
echo   - Backend API: http://localhost:8080
echo   - API Health Check: http://localhost:8080/health
echo   - Grafana: http://localhost:3001 (admin/sengon_admin)
echo   - Database: localhost:5432
echo   - MQTT Broker: localhost:1883
echo   - Redis: localhost:6379
echo.
echo 📋 Useful commands:
echo   - View logs: docker-compose -f docker-compose.full.yml logs
echo   - Stop services: docker-compose -f docker-compose.full.yml down
echo   - Rebuild: docker-compose -f docker-compose.full.yml up -d --build
echo.
pause