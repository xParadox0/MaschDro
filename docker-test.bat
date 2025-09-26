@echo off
echo 🧪 Docker Test Deployment
echo ========================

echo.
echo 🔍 Checking for port conflicts...
echo Port 8080 (Backend):
netstat -ano | findstr :8080
echo.

echo Port 3000 (Frontend):
netstat -ano | findstr :3000
echo.

echo 🛑 Stopping any conflicting processes...
echo Stopping Docker containers...
docker-compose -f docker-compose.minimal.yml down

echo.
echo Checking if ports are free now...
echo Port 8080:
netstat -ano | findstr :8080

echo Port 3000:
netstat -ano | findstr :3000

echo.
echo 🚀 Starting infrastructure first...
docker-compose -f docker-compose.minimal.yml up -d timescaledb mqtt_broker redis grafana

echo.
echo ⏳ Waiting for database to be ready (30 seconds)...
timeout /t 30 /nobreak >nul

echo.
echo 🏗️ Building and starting backend...
docker-compose -f docker-compose.minimal.yml up -d backend

echo.
echo 📊 Checking service status...
docker-compose -f docker-compose.minimal.yml ps

echo.
echo 🔍 Testing backend health...
timeout /t 5 /nobreak >nul
powershell -command "& {try {$response = Invoke-WebRequest -Uri 'http://localhost:8080/health' -TimeoutSec 5; Write-Host 'Backend Status:' $response.StatusCode} catch {Write-Host 'Backend Error:' $_.Exception.Message}}"

echo.
echo 🌐 Starting frontend...
docker-compose -f docker-compose.minimal.yml up -d frontend

echo.
echo ⏳ Waiting for frontend (10 seconds)...
timeout /t 10 /nobreak >nul

echo.
echo 🔍 Testing frontend...
powershell -command "& {try {$response = Invoke-WebRequest -Uri 'http://localhost:3000' -TimeoutSec 5; Write-Host 'Frontend Status:' $response.StatusCode} catch {Write-Host 'Frontend Error:' $_.Exception.Message}}"

echo.
echo ✅ Test deployment complete!
echo.
echo 🌍 Access points:
echo   - Frontend: http://localhost:3000
echo   - Backend: http://localhost:8080
echo   - Health: http://localhost:8080/health
echo.
pause