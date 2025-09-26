@echo off
echo 🔍 Sengon Monitoring System - Prerequisites Check
echo ==============================================

set HAS_ERROR=0

echo.
echo 📋 Checking prerequisites...

REM Check Docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker not found. Please install Docker Desktop from https://docker.com/
    set HAS_ERROR=1
) else (
    for /f "tokens=3" %%i in ('docker --version') do echo ✅ Docker %%i found
)

REM Check Docker Compose
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Compose not found
    set HAS_ERROR=1
) else (
    for /f "tokens=4" %%i in ('docker-compose --version') do echo ✅ Docker Compose %%i found
)

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Docker is installed but not running. Please start Docker Desktop
    echo    1. Open Docker Desktop
    echo    2. Wait for it to start completely
    echo    3. Run this script again
    set HAS_ERROR=1
) else (
    echo ✅ Docker is running
)

REM Check Go
go version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Go not found. Please install Go 1.21+ from https://golang.org/
    set HAS_ERROR=1
) else (
    for /f "tokens=3" %%i in ('go version') do echo ✅ Go %%i found
)

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org/
    set HAS_ERROR=1
) else (
    for /f %%i in ('node --version') do echo ✅ Node.js %%i found
)

REM Check npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm not found
    set HAS_ERROR=1
) else (
    for /f %%i in ('npm --version') do echo ✅ npm v%%i found
)

REM Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python not found. Please install Python 3.8+ from https://python.org/
    set HAS_ERROR=1
) else (
    for /f "tokens=2" %%i in ('python --version') do echo ✅ Python %%i found
)

REM Check pip
pip --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ pip not found
    set HAS_ERROR=1
) else (
    for /f "tokens=2" %%i in ('pip --version') do echo ✅ pip %%i found
)

echo.
echo 🔍 Checking port availability...

REM Check critical ports
powershell -command "& {$ports = @(5432, 1883, 6379, 8080, 5173, 3001); foreach($port in $ports) { try { $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $port); $listener.Start(); $listener.Stop(); Write-Host \"✅ Port $port is available\" } catch { Write-Host \"⚠️  Port $port is in use\" } }}"

echo.
echo 📁 Checking project structure...

if exist "backend\main.go" (
    echo ✅ Backend Go source found
) else (
    echo ❌ Backend Go source not found
    set HAS_ERROR=1
)

if exist "frontend\package.json" (
    echo ✅ Frontend package.json found
) else (
    echo ❌ Frontend package.json not found
    set HAS_ERROR=1
)

if exist "docker-compose.yml" (
    echo ✅ Docker Compose configuration found
) else (
    echo ❌ Docker Compose configuration not found
    set HAS_ERROR=1
)

if exist "docker\init-db\001_init_sengon_monitoring.sql" (
    echo ✅ Database initialization script found
) else (
    echo ❌ Database initialization script not found
    set HAS_ERROR=1
)

echo.
if %HAS_ERROR% == 0 (
    echo ✅ All prerequisites are met!
    echo.
    echo 🚀 Ready to deploy! Run: setup-windows.bat
    echo.
) else (
    echo ❌ Some prerequisites are missing. Please install them and try again.
    echo.
    echo 📝 Installation links:
    echo   - Docker Desktop: https://docker.com/
    echo   - Go: https://golang.org/
    echo   - Node.js: https://nodejs.org/
    echo   - Python: https://python.org/
    echo.
)

pause