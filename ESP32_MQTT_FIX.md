# ESP32 MQTT Publish Fix

## 🐛 **Problem Identified**

Your ESP32 was failing to publish sensor data with this error:
```
Failed to publish sensor data
{"device_id":"SENGON_001","location":"Test_Site_Jawa_Barat",...}
```

## 🔍 **Root Cause**

The **PubSubClient library** has a default MQTT buffer size of **256 bytes**, but your sensor data JSON payload is approximately **500 bytes**, causing the publish to fail.

**Payload Size Analysis:**
- System status messages: ~200 bytes ✅ (works)
- Sensor data messages: ~500 bytes ❌ (fails)

## ✅ **Solution Applied**

### 1. **Increased Buffer Size**
Added these lines to your ESP32 code:

```cpp
// At the top after includes
#define MQTT_MAX_PACKET_SIZE 1024

// In setup() function after client.setCallback()
client.setBufferSize(1024);
```

### 2. **Added Debug Information**
Enhanced debugging to show:
- Payload size vs buffer size
- MQTT connection state
- Clear success/failure indicators

## 📋 **What You Need To Do**

### **Step 1: Upload Updated Firmware**
1. Open Arduino IDE
2. Load the updated `sengon_monitoring.ino` file
3. Upload to your ESP32
4. Open Serial Monitor (115200 baud)

### **Step 2: Verify the Fix**
You should now see these debug messages:
```
Buffer size set to: 1024 bytes
Payload size: 487 bytes
Buffer size: 1024 bytes
✅ Sensor data published successfully:
```

Instead of:
```
❌ Failed to publish sensor data
MQTT State: X
```

## 🔧 **Technical Details**

### **Buffer Size Configuration**
- **Before**: 256 bytes (default)
- **After**: 1024 bytes (sufficient for your payload)

### **MQTT State Codes Reference**
If you still see failures, the MQTT State number means:
- `-4`: Connection timeout
- `-3`: Connection lost
- `-2`: Connect failed
- `-1`: Disconnected
- `0`: Connected
- `1`: Bad protocol version
- `2`: Client ID rejected
- `3`: Server unavailable
- `4`: Bad username/password
- `5`: Not authorized

## 🧪 **Testing the Complete Flow**

After uploading the fixed firmware:

1. **ESP32 Serial Monitor** - Should show successful publishes
2. **Backend Logs** - Should show "Received sensor data" messages
3. **Database** - Should contain sensor_data records
4. **Frontend** - Should display live sensor data

### **Check Backend Logs**
```bash
docker logs sengon_backend --tail 20
```

### **Check Database Data**
```bash
docker exec sengon_timescaledb psql -U sengon_user -d sengon_monitoring -c "SELECT COUNT(*) FROM sensor_data WHERE device_id='SENGON_001';"
```

## 🚨 **If Still Failing**

If the fix doesn't work completely:

### **Option 1: Reduce Payload Size**
Remove some fields from the JSON to make it smaller.

### **Option 2: Split Into Multiple Messages**
Send dendrometer data and environmental data separately.

### **Option 3: Use Compression**
Implement JSON compression before sending.

The buffer size increase should solve the issue completely. Your ESP32 will now be able to publish the full sensor data payload successfully!