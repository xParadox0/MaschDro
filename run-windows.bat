@echo off
echo 🌳 Starting Sengon Monitoring System...
echo =====================================

echo.
echo 🐳 Starting Docker services...
docker-compose up -d

if %errorlevel% neq 0 (
    echo ❌ Failed to start Docker services
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
echo   - Frontend: http://localhost:3000
echo   - MQTT Broker: mqtt://localhost:1883  
echo   - PostgreSQL: postgresql://localhost:5432/sengon_monitoring
echo   - Grafana: http://localhost:3001 (admin/sengon_admin)
echo.
echo 📝 Manual steps remaining:
echo   1. Start backend: cd backend ^&^& go run main.go
echo   2. Start frontend: cd frontend ^&^& npm run dev
echo   3. Upload ESP32 firmware
echo.
pause