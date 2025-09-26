# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sengon Monitoring System is an AIoT-based forest monitoring solution that combines IoT sensors, machine learning, and web dashboard for real-time tree growth monitoring and carbon footprint calculation. The system tracks Sengon tree growth using dendrometer sensors and environmental monitoring.

## Architecture

This is a multi-component system with:

- **Frontend**: React + Vite dashboard with TailwindCSS for data visualization
- **Backend**: Go REST API server with MQTT integration for sensor data collection
- **ML Pipeline**: Python-based machine learning for growth predictions and carbon calculations
- **ESP32 Firmware**: IoT sensors for dendrometer and environmental data collection
- **Database**: PostgreSQL for persistent storage, Redis for caching
- **Message Broker**: MQTT for real-time sensor data communication

## Development Commands

### Setup (Windows)
```bash
setup-windows.bat  # Initial project setup and dependency installation
```

### Running the System
```bash
run-windows.bat    # Start all services (frontend, backend, database, MQTT)
stop-windows.bat   # Stop all services
```

### Frontend Development
```bash
cd frontend/
npm run dev        # Start development server (http://localhost:5173)
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # Run ESLint
```

### Backend Development
```bash
cd backend/
go run main.go     # Start Go server (http://localhost:8080)
go mod tidy        # Update dependencies
```

### ML Pipeline
```bash
cd ml/
# Activate virtual environment first
venv\Scripts\activate.bat  # Windows
source venv/bin/activate   # Linux/Mac
python ml_pipeline.py      # Run ML pipeline
pip install -r requirements.txt  # Install Python dependencies
```

## Database Schema

Key database models (see backend/main.go:35-93):
- `devices`: IoT device registration and metadata
- `sensor_data`: Dendrometer readings, environmental data, system metrics
- `system_status`: Device health and connectivity status
- `alerts`: System alerts and notifications
- `carbon_metrics`: Calculated carbon stock and credits

## API Endpoints

REST API available at `http://localhost:8080/api/v1/`:
- `GET /devices` - List all registered devices
- `GET /devices/{id}/latest` - Latest sensor reading for device
- `GET /devices/{id}/history?hours=24` - Historical sensor data
- `GET /devices/{id}/carbon` - Carbon metrics for device
- `GET /alerts?device_id=x&acknowledged=false` - System alerts
- `PUT /alerts/{id}/acknowledge` - Acknowledge alert

## MQTT Topics

The system uses MQTT for real-time communication:
- `sengon/sensor/data` - Sensor readings from ESP32 devices
- `sengon/system/status` - Device health and connectivity status
- `sengon/alerts` - System alerts and notifications

## Configuration

- Database: PostgreSQL on localhost:5432 (credentials in backend/main.go:503)
- MQTT Broker: localhost:1883 (credentials in backend/main.go:505-506)
- Redis: localhost:6379
- Backend server: localhost:8080
- Frontend dev server: localhost:5173

## Key Dependencies

**Frontend:**
- React 18 with Vite build tool
- Recharts for data visualization
- Lucide React for icons
- Axios for HTTP requests
- TailwindCSS for styling

**Backend:**
- Gin web framework
- Paho MQTT client for IoT communication
- SQLx for database operations (PostgreSQL)
- Go-Redis for caching

**ML:**
- Python-based pipeline in `ml/` directory
- Models stored in `ml/models/`
- Virtual environment in `ml/venv/`

## ESP32 Firmware

ESP32 code located in `esp32/sengon_monitoring/` directory. The firmware handles:
- Dendrometer sensor readings
- Environmental sensors (temperature, humidity, soil moisture)
- WiFi and MQTT connectivity
- Power management (battery + solar)

## Docker Services

The system can be orchestrated using docker-compose.yml which includes:
- PostgreSQL database
- Redis cache
- MQTT broker
- Application services

Use `docker-compose up -d` to start all infrastructure services.