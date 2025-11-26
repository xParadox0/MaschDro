# Firmware Quick Start

## What Just Happened
✅ Backend now auto-registers devices from MQTT data
✅ Sensor data automatically parsed and stored
✅ No manual device registration needed
✅ Dashboard receives real-time updates

## 3-Step Deployment

### Step 1: Rebuild Backend (5 minutes)

```bash
cd c:\Source Code\Binus\MaschDro
docker-compose -f docker-compose.full.yml down backend
docker-compose -f docker-compose.full.yml up -d backend
```

Wait 10 seconds. Verify:
```bash
curl http://localhost:8083/health
```

### Step 2: Update Firmware Configuration (2 minutes)

Edit file: `Firmware_Maschdro/MaschDro/MaschDro.ino`

**Line 11-12:** Update WiFi credentials
```cpp
const char* ssid = "Your_WiFi_SSID";
const char* password = "Your_WiFi_Password";
```

**Line 22-23:** MQTT broker (leave as is if running locally)
```cpp
const char* mqtt_server = "103.250.11.110";  // Your broker IP
const int mqtt_port = 1884;
```

**Line 35-36:** Device name and location
```cpp
const char* device_id = "SENGON_001";     // Unique ID
const char* location = "Greenhouse A";     // Your location
```

### Step 3: Upload to ESP32 (5 minutes)

1. Open Arduino IDE
2. File → Open → `Firmware_Maschdro/MaschDro/MaschDro.ino`
3. Tools → Board → Search "ESP32" → Select "ESP32 Dev Module"
4. Tools → Port → Select your COM port
5. Click **Upload** button
6. Wait for "Upload complete"
7. Open Tools → Serial Monitor (115200 baud)

## Expected Behavior

### Serial Monitor Output (15 min cycle)
```
=== Wake Up ===
Boot count: 42

=== Reading Sensors ===
DHT22 Temperature: 28.5°C, Humidity: 75%
Soil Moisture: 60%
Dendrometer Voltage: 0.245V (120.5mm)

=== Connecting to WiFi ===
Connecting to WiFi: Quark
...
WiFi connected!

=== Publishing Sensor Data ===
JSON Payload: {...}
Sensor data published successfully!

=== Entering Deep Sleep ===
Deep sleep configured for: 900 seconds
```

### Backend Logs
```bash
docker-compose logs -f backend | grep SENGON
```

Look for:
```
Received sensor data: {...}
Device SENGON_001 registered successfully
Successfully processed sensor data for device: SENGON_001
```

### Dashboard
1. Open http://localhost:3001
2. Device "SENGON_001" appears in dropdown
3. Sensor data displays:
   - Diameter: 120.5 mm
   - Temperature: 28.5°C
   - Humidity: 75%
   - Soil Moisture: 60%
   - Battery: 3.8V

## Verify Everything Works

### 1. Check Device Registered
```bash
curl http://localhost:8083/api/v1/devices
```

Response should include:
```json
{
  "devices": [
    {
      "device_id": "SENGON_001",
      "device_name": "Device SENGON_001",
      "location": "Greenhouse A",
      ...
    }
  ]
}
```

### 2. Check Latest Reading
```bash
curl http://localhost:8083/api/v1/devices/SENGON_001/latest
```

### 3. Check 24-Hour History
```bash
curl http://localhost:8083/api/v1/devices/SENGON_001/history?hours=24
```

### 4. Manual Device Registration
```bash
curl -X POST http://localhost:8083/api/v1/devices \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "SENGON_002",
    "device_name": "Sengon Tree #2",
    "location": "Forest Plot B",
    "tree_species": "Albizia chinensis"
  }'
```

## Troubleshooting

### Issue: Serial Monitor shows nothing
- **Check:** USB cable connected?
- **Check:** COM port selected correctly?
- **Check:** 115200 baud rate selected?
- **Fix:** Unplug/replug ESP32, click reset button

### Issue: WiFi connection fails
- **Check:** SSID and password correct?
- **Check:** Device is 2.4GHz (not 5GHz)?
- **Check:** WiFi signal strength good?
- **Serial output:** "WiFi connection failed!"

### Issue: MQTT connection fails
- **Check:** Broker IP/port correct?
- **Check:** Credentials correct (sengon_user / sengon_pass)?
- **Check:** MQTT broker running?
```bash
docker-compose ps | grep mqtt
```

### Issue: Device not in dashboard
1. **Check logs:**
```bash
docker-compose logs backend | tail -20
```

2. **Check database:**
```bash
docker exec sengon_timescaledb psql -U sengon_user -d sengon_monitoring \
  -c "SELECT * FROM devices WHERE device_id='SENGON_001';"
```

3. **Check MQTT messages:**
```bash
docker exec sengon_mqtt mosquitto_sub -h localhost -p 1883 -t "sengon/#"
```

## Configuration Options

### Change Wake-up Interval
In `MaschDro.ino` line 44:
```cpp
#define DEFAULT_SLEEP_TIME 900  // Change to 600 for 10 min, 1800 for 30 min
```

### Change Sensor Thresholds
Lines 46-49:
```cpp
#define DEFAULT_TEMP_THRESHOLD 1.0        // 1°C change triggers send
#define DEFAULT_HUMIDITY_THRESHOLD 5.0    // 5% change
#define DEFAULT_MOISTURE_THRESHOLD 5.0    // 5% change
#define DEFAULT_DENDRO_THRESHOLD 0.01     // 0.01mm change
```

### Update via MQTT at Runtime
Publish JSON to `sengon/config/SENGON_001`:
```json
{
  "sleep_time": 600,
  "force_send_interval": 3600,
  "temp_threshold": 0.5
}
```

## Power Consumption

### Battery Life Estimates
- **2000mAh battery** (typical):
  - With 15-min sleep cycle: ~3-6 months
  - With 30-min sleep cycle: ~6-12 months

### Current Draw
- **Deep sleep:** ~100µA
- **WiFi+MQTT:** ~80-120mA (2-5 seconds per cycle)
- **Sensors reading:** ~10mA (1 second)

## Next Steps

1. ✅ Deploy backend changes
2. ✅ Configure and upload firmware
3. ⏳ Wait 15 minutes for first data
4. ✅ Verify in dashboard
5. 🎉 Monitor real-time tree growth!

---

**Need Help?** See `FIRMWARE_INTEGRATION.md` for detailed documentation.
