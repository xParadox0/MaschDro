@echo off
echo 🌳 Starting Sengon Monitoring System...
echo =====================================

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
echo 🐳 Starting Docker services...
docker-compose up -d

if %errorlevel% neq 0 (
    echo ❌ Failed to start Docker services
    echo    This might be due to:
    echo    - Docker Desktop not running
    echo    - Port conflicts (5432, 1883, 6379, 3001)
    echo    - Missing Docker images
    pause
    exit /b 1
)

echo.
echo ⏳ Waiting for services to be ready...
timeout /t 10 /nobreak

echo.
echo 🔍 Checking service status...

REM Check PostgreSQL
echo | set /p="Checking PostgreSQL... "
powershell -command "& {$socket = New-Object Net.Sockets.TcpClient; try {$socket.Connect('localhost', 5432); $socket.Close(); Write-Host '✅'} catch {Write-Host '❌'}}"

REM Check MQTT
echo | set /p="Checking MQTT Broker... "
powershell -command "& {$socket = New-Object Net.Sockets.TcpClient; try {$socket.Connect('localhost', 1883); $socket.Close(); Write-Host '✅'} catch {Write-Host '❌'}}"

REM Check Redis
echo | set /p="Checking Redis... "
powershell -command "& {$socket = New-Object Net.Sockets.TcpClient; try {$socket.Connect('localhost', 6379); $socket.Close(); Write-Host '✅'} catch {Write-Host '❌'}}"

echo.
echo 🎉 Docker services are running!
echo.
echo 📊 Service URLs:
echo   - Backend API: http://localhost:8080
echo   - Frontend: http://localhost:5173
echo   - MQTT Broker: mqtt://localhost:1883  
echo   - PostgreSQL: postgresql://localhost:5432/sengon_monitoring
echo   - Grafana: http://localhost:3001 (admin/sengon_admin)
echo.
echo 🚀 Starting backend server...
cd /d "%~dp0backend"
start "Sengon Backend" cmd /c "echo Starting backend on http://localhost:8080 && go run main.go"

echo.
echo ⏳ Waiting for backend to start...
timeout /t 3 /nobreak >nul

echo.
echo 🌐 Starting frontend development server...
cd /d "%~dp0frontend"
start "Sengon Frontend" cmd /c "echo Starting frontend on http://localhost:5173 && npm run dev"

echo.
echo ✅ All services are starting up!
echo.
echo 🌍 Access points:
echo   - Frontend Dashboard: http://localhost:5173
echo   - Backend API: http://localhost:8080
echo   - Grafana: http://localhost:3001 (admin/sengon_admin)
echo.
echo 📝 Next steps:
echo   1. Wait for all services to fully start
echo   2. Open http://localhost:5173 in your browser
echo   3. Upload ESP32 firmware if needed
echo.
pause