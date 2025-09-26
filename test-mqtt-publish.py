#!/usr/bin/env python3
import json
import time
import paho.mqtt.client as mqtt
from datetime import datetime

# MQTT settings
MQTT_BROKER = "localhost"
MQTT_PORT = 1883
MQTT_USER = "sengon_user"
MQTT_PASSWORD = "sengon_pass"

# MQTT topics
SENSOR_DATA_TOPIC = "sengon/sensor/data"
SYSTEM_STATUS_TOPIC = "sengon/system/status"

def on_connect(client, userdata, flags, rc):
    print(f"Connected to MQTT broker with result code {rc}")

def on_publish(client, userdata, mid):
    print(f"Message {mid} published successfully")

def create_sensor_data():
    """Create a sample sensor data message matching ESP32 format"""
    return {
        "device_id": "SENGON_001",
        "location": "Test_Site_Python",
        "timestamp": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        "uptime_ms": int(time.time() * 1000) % 1000000,
        "sensors": {
            "dendrometer": {
                "diameter_mm": 152.3,
                "growth_rate_mm_per_hour": 0.008,
                "resolution": 0.1,
                "status": "active"
            },
            "environment": {
                "temperature_c": 28.5,
                "humidity_percent": 75.2,
                "soil_moisture_percent": 68.1
            }
        },
        "system": {
            "battery_voltage": 4.05,
            "wifi_rssi": -45,
            "free_memory": 234567,
            "solar_voltage": 5.15
        }
    }

def create_system_status():
    """Create a system status message"""
    return {
        "device_id": "SENGON_001",
        "timestamp": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        "status": "online",
        "message": "Test message from Python script",
        "uptime_ms": int(time.time() * 1000) % 1000000,
        "wifi_connected": True,
        "mqtt_connected": True
    }

def main():
    # Create MQTT client
    client = mqtt.Client()
    client.username_pw_set(MQTT_USER, MQTT_PASSWORD)
    client.on_connect = on_connect
    client.on_publish = on_publish

    try:
        # Connect to MQTT broker
        print(f"Connecting to MQTT broker at {MQTT_BROKER}:{MQTT_PORT}")
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        client.loop_start()

        time.sleep(2)  # Wait for connection

        # Publish sensor data
        sensor_data = create_sensor_data()
        sensor_payload = json.dumps(sensor_data)
        print(f"Publishing sensor data: {sensor_payload}")
        client.publish(SENSOR_DATA_TOPIC, sensor_payload)

        time.sleep(1)

        # Publish system status
        system_status = create_system_status()
        system_payload = json.dumps(system_status)
        print(f"Publishing system status: {system_payload}")
        client.publish(SYSTEM_STATUS_TOPIC, system_payload)

        time.sleep(2)  # Wait for publishing

        print("Test messages sent successfully!")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.loop_stop()
        client.disconnect()

if __name__ == "__main__":
    main()