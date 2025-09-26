# Sengon Monitoring System - Deployment Guide

## Prerequisites

Before deploying, make sure you have the following installed on your Windows system:

1. **Docker Desktop** - Download from https://docker.com/
2. **Go 1.21+** - Download from https://golang.org/
3. **Node.js 18+** - Download from https://nodejs.org/
4. **Python 3.8+** - Download from https://python.org/

## Quick Start

### Step 1: Validate System
Run the validation script to check if all prerequisites are met:
```bash
validate-system-windows.bat
```

### Step 2: Initial Setup
Run the setup script to install dependencies:
```bash
setup-windows.bat
```

### Step 3: Start Services
Run the deployment script to start all services:
```bash
run-windows.bat
```

### Step 4: Access the Application
- **Frontend Dashboard**: http://localhost:5173
- **Backend API**: http://localhost:8080
- **API Health Check**: http://localhost:8080/health
- **Grafana Dashboard**: http://localhost:3001 (admin/sengon_admin)

## Manual Deployment

If the automated scripts fail, follow these manual steps:

### 1. Start Infrastructure Services
```bash
# Make sure Docker Desktop is running
docker info

# Start database, MQTT, and Redis
docker-compose up -d

# Wait for services to be ready (30-60 seconds)
timeout /t 30 /nobreak

# Check services are running
docker-compose ps
```

### 2. Start Backend Server
```bash
cd backend
go mod tidy
go run main.go
```
Backend will start on http://localhost:8080

### 3. Start Frontend Development Server
```bash
cd frontend
npm install
npm run dev
```
Frontend will start on http://localhost:5173

## Troubleshooting

### Common Issues and Solutions

#### 1. Docker Desktop Not Running
**Error**: `docker: error during connect`
**Solution**:
- Open Docker Desktop application
- Wait for the whale icon to show "Docker Desktop is running"
- Try again

#### 2. Port Already in Use
**Error**: `bind: address already in use`
**Solution**:
- Check what's using the ports:
  ```bash
  netstat -ano | findstr :5432
  netstat -ano | findstr :8080
  netstat -ano | findstr :5173
  ```
- Kill processes using required ports or change port configurations

#### 3. Database Connection Failed
**Error**: `failed to connect to database`
**Solution**:
- Wait longer for PostgreSQL to fully start (up to 60 seconds)
- Check if TimescaleDB container is running: `docker ps`
- Check container logs: `docker logs sengon_timescaledb`

#### 4. MQTT Connection Issues
**Error**: `failed to connect to MQTT`
**Solution**:
- Check if MQTT broker is running: `docker ps`
- Verify MQTT broker logs: `docker logs sengon_mqtt`
- Test MQTT connectivity: Use MQTT client to connect to localhost:1883

#### 5. Frontend Build Issues
**Error**: npm installation or build failures
**Solution**:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

#### 6. Go Module Issues
**Error**: Go dependency problems
**Solution**:
```bash
cd backend
go clean -modcache
go mod tidy
go mod download
```

#### 7. Python ML Dependencies Issues
**Error**: `ERROR: Could not find a version that satisfies the requirement tensorflow==2.13.0`
**Solution**:
```bash
# Option 1: Use the fix script
fix-ml-deps.bat

# Option 2: Manual fix
cd ml
rmdir /s /q venv
python -m venv venv
venv\Scripts\activate.bat
pip install --upgrade pip
pip install -r requirements.txt

# Option 3: Use minimal requirements
pip install -r requirements-minimal.txt
```

**Note**: Python 3.13 is very new, some packages may need latest versions. The fix script handles this automatically.

### Service Status Check

Use the validation script to check all services:
```bash
validate-system-windows.bat
```

Or manually check each service:

**Database**:
```bash
docker exec sengon_timescaledb pg_isready -U sengon_user
```

**MQTT Broker**:
```bash
# Test with mosquitto client (if installed)
mosquitto_pub -h localhost -p 1883 -t test -m "hello"
```

**Backend API**:
```bash
curl http://localhost:8080/health
```

**Frontend**:
Open http://localhost:5173 in browser

## Configuration

### Environment Variables (.env)
- `DATABASE_URL`: PostgreSQL connection string
- `MQTT_BROKER`: MQTT broker URL
- `API_BASE_URL`: Backend API base URL
- `FRONTEND_PORT`: Frontend development server port (5173)
- `BACKEND_PORT`: Backend server port (8080)

### Database Configuration
- Host: localhost:5432
- Database: sengon_monitoring
- Username: sengon_user
- Password: sengon_password

### MQTT Configuration
- Broker: localhost:1883
- Username: sengon_user
- Password: sengon_pass
- WebSocket: localhost:9001

## Stopping Services

To stop all services:
```bash
stop-windows.bat
```

Or manually:
```bash
# Stop Docker services
docker-compose down

# Close frontend and backend terminal windows
# Or use Ctrl+C in their respective terminals
```

## Development Mode

For development with hot reload:

1. Keep Docker services running: `docker-compose up -d`
2. Start backend in development mode: `cd backend && go run main.go`
3. Start frontend in development mode: `cd frontend && npm run dev`

## Production Deployment

For production deployment:

1. Build frontend: `cd frontend && npm run build`
2. Build backend binary: `cd backend && go build -o sengon-backend.exe main.go`
3. Configure environment variables for production
4. Use reverse proxy (nginx) for serving static files
5. Configure proper database credentials
6. Enable HTTPS/TLS

## Logs and Monitoring

- **Backend logs**: Check terminal running `go run main.go`
- **Frontend logs**: Check terminal running `npm run dev`
- **Database logs**: `docker logs sengon_timescaledb`
- **MQTT logs**: `docker logs sengon_mqtt`
- **Redis logs**: `docker logs sengon_redis`
- **Grafana**: Access monitoring at http://localhost:3001

## ESP32 Integration

1. Configure ESP32 WiFi credentials
2. Set MQTT broker to your machine's IP address
3. Upload firmware using Arduino IDE or PlatformIO
4. Monitor device connection in backend logs