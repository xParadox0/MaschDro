# Quick Access Guide ✅

## Access Your Dashboard

### From Your Computer
- **Localhost**: http://localhost:3001
- **Ethernet**: http://192.168.18.176:3001
- **WiFi**: http://192.168.18.12:3001

### From Other Devices on Network
- **Via Ethernet**: http://192.168.18.176:3001
- **Via WiFi**: http://192.168.18.12:3001

## Backend API Endpoints

### All Methods Available At
- **Localhost**: http://localhost:8083/api/v1
- **Ethernet**: http://192.168.18.176:8083/api/v1
- **WiFi**: http://192.168.18.12:8083/api/v1

### Common Endpoints
```bash
# List all devices
GET /api/v1/devices

# Get device
GET /api/v1/devices/{device_id}/latest

# Get device history
GET /api/v1/devices/{device_id}/history?hours=24

# Get carbon metrics
GET /api/v1/devices/{device_id}/carbon

# Get system alerts
GET /api/v1/alerts
```

## MQTT Broker Configuration

**Address**: 192.168.18.176:1884 (or 192.168.18.12:1884)
**Username**: sengon_user
**Password**: sengon_pass

### Topics
- `sengon/sensor/data` - Sensor readings from devices
- `sengon/system/status` - Device health status
- `sengon/alerts` - System alerts
- `sengon/config/{device_id}` - Device configuration

## Docker Services

### Running Services
```bash
# Check all containers
wsl docker ps

# View logs
wsl docker-compose logs -f backend      # Backend API
wsl docker-compose logs -f frontend     # Frontend UI
wsl docker-compose logs timescaledb     # Database
wsl docker-compose logs mqtt_broker     # MQTT
```

### Start/Stop Services
```bash
# Start all services
wsl docker-compose -f docker-compose.full.yml up -d

# Stop all services
wsl docker-compose -f docker-compose.full.yml down

# Restart a service
wsl docker-compose -f docker-compose.full.yml restart backend
```

## Database Access

**Database**: PostgreSQL + TimescaleDB
**Host**: localhost:5434 (from Windows) or timescaledb:5432 (from containers)
**Username**: sengon_user
**Password**: sengon_password
**Database**: sengon_monitoring

## Firmware Configuration

### ESP32 Settings
Edit `Firmware_Maschdro/MaschDro/MaschDro.ino`:

```cpp
// WiFi
const char* ssid = "Quark";
const char* password = "!0MeinStadt0!";

// MQTT
const char* mqtt_server = "192.168.18.176";
const int mqtt_port = 1884;
const char* mqtt_user = "sengon_user";
const char* mqtt_password = "sengon_pass";

// Device
const char* device_id = "SENGON_001";
const char* location = "Greenhouse A";
```

## Troubleshooting Checklist

### Dashboard Not Loading?
1. ✅ Check Docker containers running: `wsl docker ps`
2. ✅ Check frontend logs: `wsl docker-compose logs frontend`
3. ✅ Hard refresh browser: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

### API Not Responding?
1. ✅ Check backend logs: `wsl docker-compose logs backend`
2. ✅ Check database connection: `wsl docker-compose logs timescaledb`
3. ✅ Verify database is initialized: Check tables in timescaledb

### Can't Access from IP?
1. ✅ Verify port proxy rules: `netsh interface portproxy show all`
2. ✅ Check firewall: Windows Defender Firewall → Allow apps through
3. ✅ Verify WSL IP: `wsl hostname -I` (should be 172.22.131.85)
4. ✅ Restart Docker: `wsl docker-compose restart`

### Firmware Not Sending Data?
1. ✅ Check MQTT messages: `docker exec sengon_mqtt mosquitto_sub -h localhost -p 1883 -t "sengon/#"`
2. ✅ Verify device is connected to WiFi (check serial monitor)
3. ✅ Check MQTT broker logs: `wsl docker-compose logs mqtt_broker`
4. ✅ Verify device config in firmware (server IP, port, credentials)

## Useful Commands

### View Database
```bash
# Connect to database
wsl docker exec -it sengon_timescaledb psql -U sengon_user -d sengon_monitoring

# List devices
SELECT device_id, device_name, location FROM devices;

# View latest sensor data
SELECT * FROM sensor_data ORDER BY time DESC LIMIT 10;

# Exit psql
\q
```

### Monitor MQTT
```bash
# Watch all MQTT messages
docker exec sengon_mqtt mosquitto_sub -h localhost -p 1883 -t "sengon/#" -v

# Publish test message
docker exec sengon_mqtt mosquitto_pub -h localhost -p 1883 -t "test" -m "hello"
```

### Check Container Health
```bash
# All containers
wsl docker ps --no-trunc

# Specific container
wsl docker inspect sengon_frontend | grep -A 5 '"Status"'

# Container stats (CPU, memory, etc)
wsl docker stats
```

## Port Reference

| Service | Port (Host) | Port (Container) |
|---------|-----------|-----------------|
| Frontend | 3001 | 80 |
| Backend API | 8083 | 8080 |
| MQTT Broker | 1884 | 1883 |
| MQTT WebSocket | 9001 | 9001 |
| PostgreSQL | 5434 | 5432 |
| Redis | 6378 | 6379 |

## Network Configuration

| IP Address | Use |
|-----------|-----|
| 127.0.0.1 | Localhost (current machine only) |
| 192.168.18.176 | Ethernet - all network access |
| 192.168.18.12 | WiFi - all network access |
| 172.22.131.85 | WSL internal IP (for port proxy) |

## Document Reference

- **Complete Solution**: IP_ADDRESS_ACCESS_SOLUTION.md
- **System Status**: SYSTEM_INTEGRATION_STATUS.md
- **Network Config**: NETWORK_ACCESS_CONFIG.md
- **Firmware Guide**: FIRMWARE_QUICK_START.md
- **Integration Docs**: FIRMWARE_INTEGRATION.md

---

**All access methods fully functional!** 🎉

Choose your preferred access method and start monitoring!
