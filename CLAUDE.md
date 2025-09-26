# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## System Overview

MaschDro is a Smart Dendrometer IoT system for forest monitoring that combines ESP32 hardware, Go backend, React frontend, Python ML pipeline, and supporting infrastructure. The system monitors tree growth through dendrometer sensors and provides AI-powered growth predictions and health classifications.

## Architecture

The system consists of 5 main components:

### 1. ESP32 Firmware (`esp32/sengon_monitoring/`)
- Arduino-based firmware for ESP32 microcontrollers
- Collects dendrometer sensor data and environmental metrics
- Communicates via MQTT to the backend
- Main file: `sengon_monitoring.ino`

### 2. Go Backend (`backend/`)
- REST API server using Gin framework
- MQTT broker integration for IoT data collection
- PostgreSQL (TimescaleDB) for time-series data storage
- Redis for caching and real-time data
- WebSocket support for live dashboard updates
- Main file: `main.go`
- Dependencies managed via `go.mod`

### 3. React Frontend (`frontend/`)
- Vite-powered React dashboard with TypeScript support
- Real-time visualization using Recharts
- Tailwind CSS for styling
- Lucide React for icons
- Development server runs on port 3000
- Build system: Vite, linting: ESLint

### 4. Python ML Pipeline (`ml/`)
- TensorFlow LSTM models for growth prediction
- Random Forest for tree health classification
- Scikit-learn for preprocessing and evaluation
- Direct PostgreSQL integration for training data
- Model persistence with joblib
- Main file: `ml_pipeline.py`

### 5. Infrastructure (Docker Compose)
- TimescaleDB (PostgreSQL extension) for time-series data
- Eclipse Mosquitto MQTT broker
- Redis for caching
- Grafana for advanced analytics (port 3001)

## Development Commands

### Full System Setup
```bash
# Windows setup (installs all dependencies)
setup-windows.bat

# Start all Docker services
run-windows.bat

# Stop Docker services
stop-windows.bat

# Validate system prerequisites
validate-system-windows.bat
```

### Backend Development
```bash
cd backend

# Install dependencies
go mod tidy

# Run development server
go run main.go

# Server runs on http://localhost:8080
```

### Frontend Development
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### ML Pipeline
```bash
cd ml

# Create Python virtual environment
python -m venv venv

# Activate virtual environment (Windows)
venv\Scripts\activate.bat

# Install dependencies
pip install -r requirements.txt

# Run ML pipeline
python ml_pipeline.py
```

### ESP32 Development
- Use Arduino IDE or PlatformIO
- Configure WiFi credentials in the firmware
- Upload to ESP32 device via USB
- Main file: `esp32/sengon_monitoring/sengon_monitoring.ino`

## Database Schema

The system uses TimescaleDB with the following key tables:
- `devices` - Device registration and metadata
- `sensor_data` - Time-series sensor readings (hypertable)
- `device_status` - Real-time device health monitoring
- `growth_predictions` - ML model outputs
- `alerts` - System notifications and warnings

## Configuration

Environment variables are defined in `.env`:
- Database: PostgreSQL connection on port 5432
- MQTT: Broker on port 1883
- API: Backend on port 8080, Frontend on port 3000
- Grafana: Dashboard on port 3001

## Key Integrations

### MQTT Topics Structure
- `sengon/+/sensor_data` - Sensor readings from devices
- `sengon/+/status` - Device health and connectivity
- `sengon/+/alerts` - Critical notifications

### API Endpoints
The Go backend provides REST endpoints for:
- Device management (`/api/devices`)
- Sensor data queries (`/api/sensor-data`)
- Real-time WebSocket (`/api/ws`)
- ML predictions (`/api/predictions`)

### Machine Learning Features
- **Growth Prediction**: LSTM neural network using 72-hour sliding windows
- **Health Classification**: Random Forest classifier for tree health status
- **Anomaly Detection**: Isolation Forest for outlier identification
- **Model Retraining**: Scheduled pipeline for continuous learning

## Development Notes

- The system is Windows-optimized with `.bat` scripts for setup and management
- TimescaleDB is used for efficient time-series data handling
- Real-time updates flow: ESP32 → MQTT → Go Backend → WebSocket → React Frontend
- ML models are retrained periodically using historical sensor data
- Grafana provides advanced visualization and alerting capabilities