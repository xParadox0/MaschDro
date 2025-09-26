@echo off
echo Cleaning up port conflicts...
echo ============================

echo.
echo Stopping all Docker containers...
docker stop sengon_backend 2>nul
docker stop sengon_frontend 2>nul
docker stop sengon_timescaledb 2>nul
docker stop sengon_mqtt 2>nul
docker stop sengon_redis 2>nul
docker stop sengon_grafana 2>nul
docker stop sengon_ml 2>nul

echo.
echo Removing stopped containers...
docker rm sengon_backend 2>nul
docker rm sengon_frontend 2>nul

echo.
echo Killing process on port 8080...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8080 ^| findstr LISTENING') do (
    echo Found PID %%a on port 8080
    wmic process where "ProcessId=%%a" delete
)

echo.
echo Killing any main.exe processes...
wmic process where "name='main.exe'" delete 2>nul

echo.
echo Waiting for cleanup...
timeout /t 3 /nobreak >nul

echo.
echo Checking ports now...
netstat -ano | findstr :8080
if %errorlevel% neq 0 echo Port 8080 is now free!

echo.
echo Cleanup complete!
pause