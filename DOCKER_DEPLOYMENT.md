# Docker Deployment Guide

## Two Deployment Options

### 1. Development Mode (Current)
**Command**: `run-windows.bat`

**Architecture**:
- ✅ Infrastructure in Docker (database, MQTT, Redis, Grafana)
- ❌ Frontend/Backend run as local processes
- ✅ Hot reload for development
- ✅ Easy debugging and development

**Services**:
```
Docker:
├── TimescaleDB (PostgreSQL) - Port 5432
├── MQTT Broker - Port 1883/9001
├── Redis - Port 6379
└── Grafana - Port 3001

Local Processes:
├── Go Backend - Port 8080
└── React Frontend - Port 5173
```

### 2. Production Mode (New)
**Command**: `run-docker-full.bat`

**Architecture**:
- ✅ All services containerized
- ✅ Production-ready builds
- ✅ Better isolation and security
- ✅ Easy scaling and deployment

**Services**:
```
Docker:
├── TimescaleDB (PostgreSQL) - Port 5432
├── MQTT Broker - Port 1883/9001
├── Redis - Port 6379
├── Grafana - Port 3001
├── Go Backend - Port 8080
├── React Frontend (Nginx) - Port 3000
└── ML Pipeline - Internal
```

## When to Use Which Mode

### Use Development Mode When:
- 🔧 Active development
- 🐛 Debugging code
- 🔄 Frequent code changes
- 🎯 Testing new features
- 🚀 Quick startup needed

### Use Production Mode When:
- 🌐 Deploying to staging/production
- 📦 Need full containerization
- 🔒 Security is important
- 📊 Load testing
- 🚀 Final deployment

## Key Differences

| Aspect | Development | Production |
|--------|-------------|------------|
| **Startup Time** | Fast (30s) | Slower (2-3 min) |
| **Build Required** | No | Yes |
| **Hot Reload** | ✅ Yes | ❌ No |
| **Debug Access** | ✅ Direct | ❌ Container logs |
| **Resource Usage** | Lower | Higher |
| **Isolation** | Partial | Complete |
| **Frontend Server** | Vite dev server | Nginx production |
| **API Calls** | Direct to backend | Through Nginx proxy |

## Files Added for Docker Support

### Backend Containerization
- `backend/Dockerfile` - Multi-stage Go build
- Environment variable support in `main.go`

### Frontend Containerization
- `frontend/Dockerfile` - React build + Nginx
- `frontend/nginx.conf` - Nginx configuration
- `frontend/.env.production` - Production API config
- `frontend/.env.development` - Development API config

### ML Pipeline Containerization
- `ml/Dockerfile` - Python ML environment

### Docker Compose
- `docker-compose.yml` - Infrastructure only (existing)
- `docker-compose.full.yml` - All services included (new)

### Deployment Scripts
- `run-windows.bat` - Development mode (existing, improved)
- `run-docker-full.bat` - Production mode (new)

## Quick Start

### Development Mode (Recommended for development)
```bash
# Check prerequisites
system-check.bat

# Setup dependencies
setup-windows.bat

# Run development mode
run-windows.bat
```
Access: http://localhost:5173

### Production Mode (Full Docker)
```bash
# Run full Docker deployment
run-docker-full.bat
```
Access: http://localhost:3000

## Troubleshooting Docker Issues

### Build Failures
```bash
# Clean build cache
docker system prune -a

# Rebuild specific service
docker-compose -f docker-compose.full.yml build backend --no-cache
```

### Port Conflicts
```bash
# Check what's using ports
netstat -ano | findstr :8080
netstat -ano | findstr :3000
netstat -ano | findstr :5432
```

### Container Logs
```bash
# View all logs
docker-compose -f docker-compose.full.yml logs

# View specific service logs
docker-compose -f docker-compose.full.yml logs backend
docker-compose -f docker-compose.full.yml logs frontend
```

### Service Health
```bash
# Check service status
docker-compose -f docker-compose.full.yml ps

# Check health
docker-compose -f docker-compose.full.yml exec backend wget -O- http://localhost:8080/health
```

## Migration Path

1. **Start with Development Mode** - Get familiar with the system
2. **Test Production Mode** - Once development is stable
3. **Deploy to Production** - Use production mode for final deployment

## Environment Variables

### Backend (.env or Docker environment)
- `DATABASE_URL` - PostgreSQL connection
- `MQTT_BROKER` - MQTT broker URL
- `MQTT_USER` / `MQTT_PASSWORD` - MQTT credentials
- `REDIS_URL` - Redis connection
- `SERVER_PORT` - Backend port

### Frontend (Vite environment)
- `VITE_API_BASE_URL` - Backend API URL

The containerized approach provides better production readiness while keeping development flexibility!