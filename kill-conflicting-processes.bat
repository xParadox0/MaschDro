@echo off
echo 🔧 Killing Conflicting Processes
echo =================================

echo.
echo 🔍 Checking what's using our ports...
echo.

echo Port 8080 (Backend):
netstat -ano | findstr :8080

echo.
echo Port 3000 (Frontend):
netstat -ano | findstr :3000

echo.
echo Port 5173 (Vite Dev):
netstat -ano | findstr :5173

echo.
echo 🛑 Stopping Docker containers first...
docker-compose -f docker-compose.full.yml down --remove-orphans 2>nul
docker-compose -f docker-compose.minimal.yml down --remove-orphans 2>nul
docker-compose down --remove-orphans 2>nul

echo.
echo 🔪 Killing Go backend processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8080') do (
    echo Killing process %%a on port 8080
    taskkill /F /PID %%a 2>nul
)

echo.
echo 🔪 Killing any main.exe processes...
taskkill /F /IM main.exe 2>nul

echo.
echo 🔪 Killing Node.js processes (if any)...
taskkill /F /IM node.exe 2>nul

echo.
echo 🔪 Killing any processes on port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    echo Killing process %%a on port 3000
    taskkill /F /PID %%a 2>nul
)

echo.
echo 🔪 Killing any processes on port 5173...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173') do (
    echo Killing process %%a on port 5173
    taskkill /F /PID %%a 2>nul
)

echo.
echo ⏳ Waiting for ports to be freed...
timeout /t 5 /nobreak >nul

echo.
echo 🔍 Checking if ports are now free...
echo.

echo Port 8080:
netstat -ano | findstr :8080
if %errorlevel% neq 0 echo ✅ Port 8080 is now free

echo.
echo Port 3000:
netstat -ano | findstr :3000
if %errorlevel% neq 0 echo ✅ Port 3000 is now free

echo.
echo Port 5173:
netstat -ano | findstr :5173
if %errorlevel% neq 0 echo ✅ Port 5173 is now free

echo.
echo ✅ Cleanup complete! Ports should now be available.
echo.
pause