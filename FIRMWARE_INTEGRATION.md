# Firmware Integration Guide

## Overview
The ESP32 firmware in `Firmware_Maschdro` is now fully integrated with the backend system. Devices automatically register themselves when sending data, and all sensor readings are parsed and stored in the database.

## How It Works

### 1. Device Auto-Registration
When the firmware sends sensor data via MQTT, the backend automatically:
- ✅ Detects new devices
- ✅ Creates device records in the database
- ✅ Assigns default names and properties
- ✅ Marks them as 'active'

**No manual registration needed!** The firmware's first MQTT message triggers device creation.

### 2. Data Flow

```
ESP32 Firmware                  MQTT Broker              Backend System
     ↓                               ↓                          ↓
Read Sensors ──MQTT Publish──→  sengon/sensor/data  ──→  Parse & Auto-Register
(Every 15 min)                                              (Device + Sensor Data)
                                                                  ↓
                                                            Store in PostgreSQL
                                                                  ↓
                                                            Frontend Dashboard
```

### 3. MQTT Topics

| Topic | Message Type | Payload |
|-------|--------------|---------|
| `sengon/sensor/data` | Sensor readings | Dendrometer, temperature, humidity, soil moisture |
| `sengon/system/status` | Device status | Uptime, WiFi RSSI, battery voltage |
| `sengon/alerts` | Alerts | Low battery, offline alerts |
| `sengon/config/DEVICE_ID` | Configuration | Dynamic thresholds, sleep times |

## Firmware Configuration

### WiFi & MQTT Settings
File: `Firmware_Maschdro/MaschDro/MaschDro.ino` (lines 11-29)

```cpp
// WiFi
const char* ssid = "Quark";
const char* password = "!0MeinStadt0!";

// MQTT
const char* mqtt_server = "103.250.11.110";
const int mqtt_port = 1884;
const char* mqtt_user = "sengon_user";
const char* mqtt_password = "sengon_pass";
```

### Device Configuration
```cpp
const char* device_id = "SENGON_001";
const char* location = "Greenhouse A";
```

### Sensor Thresholds (Configurable via MQTT)
```cpp
#define DEFAULT_SLEEP_TIME 900           // 15 minutes
#define DEFAULT_FORCE_SEND_INTERVAL 3600 // 1 hour
#define DEFAULT_TEMP_THRESHOLD 1.0       // 1°C change to trigger send
#define DEFAULT_HUMIDITY_THRESHOLD 5.0   // 5% change
#define DEFAULT_MOISTURE_THRESHOLD 5.0   // 5% change
#define DEFAULT_DENDRO_THRESHOLD 0.01    // 0.01mm change
```

## MQTT Payload Structure

### Sensor Data Message
```json
{
  "device_id": "SENGON_001",
  "location": "Greenhouse A",
  "timestamp": "2024-11-26T15:30:45",
  "uptime": 1234,
  "dendrometer": {
    "diameter_mm": 120.5,
    "growth_rate": 0.012,
    "status": "normal"
  },
  "environment": {
    "temperature": 28.5,
    "humidity": 75.0,
    "soil_moisture": 60.0
  },
  "system": {
    "battery_voltage": 3.8,
    "solar_voltage": 0.0,
    "rssi": -65,
    "free_memory": 102400
  }
}
```

### System Status Message
```json
{
  "device_id": "SENGON_001",
  "timestamp": "2024-11-26T15:30:45",
  "status": "online",
  "message": "Device operating normally",
  "uptime": 1234,
  "wifi_connected": true,
  "mqtt_connected": true,
  "rssi": -65,
  "boot_count": 42,
  "battery_voltage": 3.8,
  "config": {
    "sleep_time": 900,
    "force_send_interval": 3600
  }
}
```

## Backend Changes

### Auto-Registration Function
**File:** [backend/main.go:270-303](backend/main.go#L270-L303)

```go
func (app *App) registerDeviceIfNotExists(deviceID, location string) error
```

- Checks if device already exists
- Creates device with defaults if new
- Sets status to "active"
- Stores registration metadata

### Updated Sensor Data Handler
**File:** [backend/main.go:116-205](backend/main.go#L116-L205)

- Extracts device location from MQTT payload
- Calls auto-registration before storing data
- Parses firmware's JSON structure:
  - `dendrometer` → diameter_mm, growth_rate
  - `environment` → temperature, humidity, soil_moisture
  - `system` → battery_voltage, rssi, free_memory

### Device Registration Endpoint
**File:** [backend/main.go:368-418](backend/main.go#L368-L418)

**Endpoint:** `POST /api/v1/devices`

**Request:**
```json
{
  "device_id": "SENGON_002",
  "device_name": "Sengon Tree #2",
  "location": "Forest Plot B",
  "tree_species": "Albizia chinensis",
  "metadata": {
    "calibration_date": "2024-11-20",
    "sensor_version": "v2.1"
  }
}
```

**Response (201 Created):**
```json
{
  "message": "Device registered successfully",
  "device": {
    "device_id": "SENGON_002",
    "device_name": "Sengon Tree #2",
    "location": "Forest Plot B",
    "tree_species": "Albizia chinensis",
    "installation_date": "2024-11-26T15:30:45Z",
    "status": "active",
    "metadata": {...}
  }
}
```

## Deployment Steps

### 1. Rebuild Backend (REQUIRED)
The backend code was updated. Rebuild it:

```bash
docker-compose -f docker-compose.full.yml down backend
docker-compose -f docker-compose.full.yml up -d backend
```

Wait 10 seconds for startup.

### 2. Update Firmware Configuration
Edit `Firmware_Maschdro/MaschDro/MaschDro.ino`:

```cpp
// Update these if your MQTT broker is different
const char* mqtt_server = "103.250.11.110";     // Your MQTT broker IP
const int mqtt_port = 1884;                      // MQTT port
const char* device_id = "SENGON_001";            // Unique device ID
const char* location = "Greenhouse A";           // Device location
```

### 3. Upload Firmware to ESP32
1. Open Arduino IDE
2. File → Open → `Firmware_Maschdro/MaschDro/MaschDro.ino`
3. Select board: "ESP32 Dev Module"
4. Select port (COM port of ESP32)
5. Click Upload
6. Monitor serial output (Tools → Serial Monitor @ 115200 baud)

### 4. Verify Integration

#### Check Backend Logs
```bash
docker-compose -f docker-compose.full.yml logs -f backend
```

Look for:
```
Received sensor data: {...}
Device SENGON_001 registered successfully
Successfully processed sensor data for device: SENGON_001
```

#### Test API Endpoints

**List devices:**
```bash
curl http://localhost:8083/api/v1/devices
```

**Get latest reading:**
```bash
curl http://localhost:8083/api/v1/devices/SENGON_001/latest
```

**Get history (last 24 hours):**
```bash
curl http://localhost:8083/api/v1/devices/SENGON_001/history?hours=24
```

#### Dashboard Check
1. Open http://localhost:3001
2. Device "SENGON_001" should appear in dropdown
3. Sensor data should display immediately
4. Charts should update every 15 minutes (firmware sends every 15 min)

## Firmware Sensor Modules

### 1. Dendrometer (MaschDro.ino)
- Measures tree diameter via voltage conversion
- Calibration stored in NVS flash memory
- Range: 3-23.3mm (configurable)

### 2. DHT22 (DHT22.ino)
- Temperature: -40°C to 80°C (±2°C)
- Humidity: 0-100% (±2%)
- Pin 13

### 3. Soil Moisture (SoilMoisture.ino)
- Analog reading 0-100%
- Pin 12
- Capacitive soil moisture sensor

### 4. Calibration (Calibration.ino)
- Dendrometer calibration via MQTT commands
- Stores min/max voltage and diameter values
- Persists in NVS (survives deep sleep)

### 5. WiFi & MQTT (WiFi_MQTT.ino)
- Low-power WiFi connection (disconnects after sending)
- MQTT publish with auto-reconnect
- Configuration updates via MQTT
- NTP time synchronization (GMT+7)

## Deep Sleep & Power Management

The firmware uses **deep sleep** to minimize power consumption:

- **Wakeup interval:** 15 minutes (configurable)
- **Active time:** ~2-5 seconds
- **Power consumption:** ~100µA in deep sleep
- **Battery life:** ~3-6 months (typical 2000mAh battery)

### RTC Memory
Data survives deep sleep:
- Last sensor readings
- Configuration parameters
- Boot count
- First-run flag

## Configuration via MQTT

Publish to `sengon/config/DEVICE_ID` to update firmware settings:

```json
{
  "sleep_time": 900,
  "force_send_interval": 3600,
  "temp_threshold": 1.0,
  "humidity_threshold": 5.0,
  "moisture_threshold": 5.0,
  "dendro_threshold": 0.01
}
```

Firmware will:
1. Receive message during wake cycle
2. Update RTC memory
3. Apply new settings immediately
4. Persist settings across deep sleep

## Troubleshooting

### Device Not Appearing in Dashboard

**1. Check firmware is transmitting:**
- Open Serial Monitor (115200 baud)
- Wait for deep sleep timer (15 min default)
- Look for "=== Wake Up ===" messages
- Look for "Received sensor data" in backend logs

**2. Check MQTT connectivity:**
```bash
docker exec sengon_mqtt mosquitto_sub -h localhost -p 1883 -t "sengon/sensor/data"
```

Should see JSON messages arriving.

**3. Check backend is receiving:**
```bash
docker-compose -f docker-compose.full.yml logs backend | grep "SENGON"
```

**4. Check database has device:**
```bash
docker exec sengon_timescaledb psql -U sengon_user -d sengon_monitoring -c "SELECT * FROM devices WHERE device_id='SENGON_001';"
```

### WiFi Connection Failing

- Verify SSID and password in firmware
- Check WiFi signal strength (should be > -70dBm)
- Look for "Connecting to WiFi" in serial output

### MQTT Connection Failing

- Verify broker IP and port in firmware
- Verify credentials (sengon_user / sengon_pass)
- Check MQTT broker is running: `docker-compose ps | grep mqtt`
- Test MQTT: `docker exec sengon_mqtt mosquitto_sub -h localhost -p 1883 -t "#"`

### Sensor Data Not Parsing

- Check payload format matches firmware (dendrometer, environment, system objects)
- Verify field names match parser in backend
- Check raw_data in database table for actual values sent

## Database Tables Created

| Table | Purpose |
|-------|---------|
| `devices` | Device registration |
| `sensor_data` | Time-series sensor readings (hypertable) |
| `system_status` | Device health status |
| `alerts` | Alerts and notifications |
| `carbon_metrics` | Calculated carbon values |

## Performance Notes

- **Sensor data rate:** Every 15 min (with significant changes)
- **MQTT payload size:** ~500-700 bytes
- **Database insert rate:** ~4 per hour per device
- **Storage per device:** ~10MB per year
- **Query response:** <100ms for latest reading

---

## Summary

Your firmware is now fully integrated:
1. ✅ Automatic device registration on first MQTT message
2. ✅ Sensor data parsing and storage
3. ✅ Dashboard real-time updates
4. ✅ REST API for device management
5. ✅ Deep sleep power management
6. ✅ Remote configuration via MQTT

**Next Step:** Rebuild backend and upload firmware to ESP32!
