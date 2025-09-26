@echo off
echo 🐳 Sengon Monitoring - Robust Docker Deployment
echo ==============================================

echo.
echo 📋 Checking Docker status...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker Desktop first
    pause
    exit /b 1
) else (
    echo ✅ Docker is running
)

echo.
echo 🔄 Pre-pulling required base images...
echo This prevents network timeouts during build...

docker pull alpine:latest
if %errorlevel% neq 0 (
    echo ❌ Failed to pull Alpine image. Check your internet connection.
    echo Retrying in 5 seconds...
    timeout /t 5 /nobreak >nul
    docker pull alpine:latest
    if %errorlevel% neq 0 (
        echo ❌ Still failing. Please check network or try again later.
        pause
        exit /b 1
    )
)

docker pull golang:1.21-alpine
if %errorlevel% neq 0 (
    echo ⚠️ Failed to pull Go image, but continuing...
)

docker pull node:18-alpine
if %errorlevel% neq 0 (
    echo ⚠️ Failed to pull Node image, but continuing...
)

docker pull nginx:alpine
if %errorlevel% neq 0 (
    echo ⚠️ Failed to pull Nginx image, but continuing...
)

echo ✅ Base images ready

echo.
echo 🛑 Stopping existing services...
docker-compose -f docker-compose.full.yml down --remove-orphans

echo.
echo 🧹 Cleaning up old builds...
docker builder prune -f

echo.
echo 🏗️ Building services (this may take several minutes)...

echo   📦 Building backend...
docker-compose -f docker-compose.full.yml build backend --no-cache
if %errorlevel% neq 0 (
    echo ❌ Backend build failed
    echo 📋 Check logs above for errors
    pause
    exit /b 1
)

echo   🌐 Building frontend...
docker-compose -f docker-compose.full.yml build frontend --no-cache
if %errorlevel% neq 0 (
    echo ❌ Frontend build failed
    echo 📋 Check logs above for errors
    pause
    exit /b 1
)

echo   🐍 Building ML pipeline...
docker-compose -f docker-compose.full.yml build ml_pipeline --no-cache
if %errorlevel% neq 0 (
    echo ❌ ML pipeline build failed
    echo 📋 Check logs above for errors
    pause
    exit /b 1
)

echo.
echo ✅ All builds completed successfully!

echo.
echo 🚀 Starting all services...
docker-compose -f docker-compose.full.yml up -d

if %errorlevel% neq 0 (
    echo ❌ Failed to start services
    echo 📋 Check logs with: docker-compose -f docker-compose.full.yml logs
    pause
    exit /b 1
)

echo.
echo ⏳ Waiting for services to initialize (90 seconds)...
timeout /t 90 /nobreak >nul

echo.
echo 📊 Service status:
docker-compose -f docker-compose.full.yml ps

echo.
echo 🔍 Health checks:
echo.

echo Backend API:
powershell -command "& {try {$response = Invoke-WebRequest -Uri 'http://localhost:8080/health' -TimeoutSec 10; Write-Host 'Status:' $response.StatusCode; Write-Host 'Response:' $response.Content} catch {Write-Host 'Error:' $_.Exception.Message}}"

echo.
echo Frontend:
powershell -command "& {try {$response = Invoke-WebRequest -Uri 'http://localhost:3000' -TimeoutSec 10; Write-Host 'Status:' $response.StatusCode; Write-Host 'Title found:' ($response.Content -match 'Sengon')} catch {Write-Host 'Error:' $_.Exception.Message}}"

echo.
echo ✅ Deployment complete!
echo.
echo 🌍 Access points:
echo   - Frontend: http://localhost:3000
echo   - Backend API: http://localhost:8080
echo   - Health Check: http://localhost:8080/health
echo   - Grafana: http://localhost:3001
echo.
echo 📋 Useful commands:
echo   - View logs: docker-compose -f docker-compose.full.yml logs [service]
echo   - Stop: docker-compose -f docker-compose.full.yml down
echo   - Restart service: docker-compose -f docker-compose.full.yml restart [service]
echo.
pause