@echo off
echo 🐍 Fixing Python ML Dependencies
echo ================================

echo.
echo 📋 Current Python version:
python --version

echo.
echo 🔧 Cleaning up old virtual environment...
cd ml
if exist "venv" (
    rmdir /s /q venv
    echo ✅ Removed old venv
)
if exist "test_venv" (
    rmdir /s /q test_venv
    echo ✅ Removed test_venv
)

echo.
echo 🆕 Creating fresh virtual environment...
python -m venv venv
if %errorlevel% neq 0 (
    echo ❌ Failed to create virtual environment
    echo Please check your Python installation
    pause
    exit /b 1
)

echo.
echo 🔧 Activating virtual environment and upgrading pip...
call venv\Scripts\activate.bat
python -m pip install --upgrade pip

echo.
echo 📦 Installing minimal ML dependencies...
echo This may take several minutes...
pip install --no-cache-dir tensorflow
if %errorlevel% neq 0 (
    echo ⚠️ TensorFlow installation failed, trying CPU version...
    pip install --no-cache-dir tensorflow-cpu
)

pip install --no-cache-dir scikit-learn numpy pandas
pip install --no-cache-dir psycopg2-binary sqlalchemy
pip install --no-cache-dir joblib python-dotenv
pip install --no-cache-dir matplotlib scipy

echo.
echo 🧪 Testing installation...
python -c "import tensorflow as tf; print(f'TensorFlow version: {tf.__version__}')"
python -c "import sklearn; print(f'Scikit-learn version: {sklearn.__version__}')"
python -c "import numpy as np; print(f'NumPy version: {np.__version__}')"
python -c "import pandas as pd; print(f'Pandas version: {pd.__version__}')"

echo.
echo ✅ ML environment setup complete!
echo.
echo 📝 To activate the environment later:
echo   cd ml
echo   venv\Scripts\activate.bat
echo.

deactivate
cd ..
pause