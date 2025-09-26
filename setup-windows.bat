@echo off
echo 🌳 Sengon Monitoring System - Windows Setup
echo ==========================================

echo.
echo 📋 Checking prerequisites...

REM Check Docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker not found. Please install Docker Desktop
    pause
    exit /b 1
) else (
    echo ✅ Docker found
)

REM Check Go
go version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Go not found. Please install Go
    pause
    exit /b 1
) else (
    echo ✅ Go found
)

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found. Please install Node.js
    pause
    exit /b 1
) else (
    echo ✅ Node.js found
)

REM Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python not found. Please install Python
    pause
    exit /b 1
) else (
    echo ✅ Python found
)

echo.
echo 🚀 Setting up project...

REM Backend setup
echo 📦 Setting up backend...
cd backend
go mod tidy
if %errorlevel% neq 0 (
    echo ❌ Go mod tidy failed
    pause
    exit /b 1
)
cd ..

REM Frontend setup
echo 📦 Setting up frontend...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo ❌ npm install failed
    pause
    exit /b 1
)
cd ..

REM ML setup
echo 📦 Setting up ML environment...
cd ml
if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
)
call venv\Scripts\activate.bat
echo Upgrading pip...
python -m pip install --upgrade pip
echo Installing ML dependencies (this may take a few minutes)...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ⚠️ Some ML packages failed to install. Trying alternative approach...
    echo Installing core packages individually...
    pip install tensorflow scikit-learn numpy pandas psycopg2-binary sqlalchemy
    pip install joblib scipy matplotlib seaborn tqdm python-dotenv
)
deactivate
cd ..

echo.
echo ✅ Setup completed successfully!
echo.
echo 📝 Next steps:
echo   1. Run: run-windows.bat
echo   2. Update ESP32 WiFi credentials
echo   3. Upload ESP32 firmware
echo.
pause