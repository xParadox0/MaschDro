@echo off
echo 🔍 Sengon Monitoring System - Validation
echo ========================================

echo.
echo 📊 Checking Docker containers...
docker ps --format "table {{.Names}}\t{{.Status}}"

echo.
echo 🔗 Testing service connectivity...

REM Test PostgreSQL
echo | set /p="PostgreSQL (5432): "
powershell -command "& {$socket = New-Object Net.Sockets.TcpClient; try {$socket.Connect('localhost', 5432); $socket.Close(); Write-Host '✅ Connected'} catch {Write-Host '❌ Not accessible'}}"

REM Test MQTT
echo | set /p="MQTT Broker (1883): "  
powershell -command "& {$socket = New-Object Net.Sockets.TcpClient; try {$socket.Connect('localhost', 1883); $socket.Close(); Write-Host '✅ Connected'} catch {Write-Host '❌ Not accessible'}}"

REM Test Redis
echo | set /p="Redis (6379): "
powershell -command "& {$socket = New-Object Net.Sockets.TcpClient; try {$socket.Connect('localhost', 6379); $socket.Close(); Write-Host '✅ Connected'} catch {Write-Host '❌ Not accessible'}}"

REM Test Backend API
echo | set /p="Backend API (8080): "
powershell -command "& {try {$response = Invoke-WebRequest -Uri 'http://localhost:8080/health' -TimeoutSec 5; if($response.StatusCode -eq 200) {Write-Host '✅ API responding'} else {Write-Host '❌ API error'}} catch {Write-Host '❌ Not accessible'}}"

REM Test Frontend
echo | set /p="Frontend (5173): "
powershell -command "& {try {$response = Invoke-WebRequest -Uri 'http://localhost:5173' -TimeoutSec 5; if($response.StatusCode -eq 200) {Write-Host '✅ Frontend responding'} else {Write-Host '❌ Frontend error'}} catch {Write-Host '❌ Not accessible'}}"

echo.
echo 📊 Database status...
docker exec sengon_timescaledb psql -U sengon_user -d sengon_monitoring -c "SELECT 'sensor_data' as table_name, COUNT(*) as records FROM sensor_data UNION ALL SELECT 'devices', COUNT(*) FROM devices;"

echo.
pause