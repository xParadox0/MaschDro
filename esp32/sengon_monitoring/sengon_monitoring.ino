#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <time.h>

// Increase MQTT buffer size to handle larger sensor data payloads
#define MQTT_MAX_PACKET_SIZE 1024

// WiFi credentials - UPDATE THESE
const char* ssid = "masch.internal";
const char* password = "jlsrbz20@3";

// MQTT Broker settings - UPDATE THESE
const char* mqtt_server = "192.168.1.44"; // Change to your MQTT broker
const int mqtt_port = 1883;
const char* mqtt_user = "sengon_user";
const char* mqtt_password = "sengon_pass";

// MQTT Topics
const char* topic_sensor_data = "sengon/sensor/data";
const char* topic_system_status = "sengon/system/status";
const char* topic_alerts = "sengon/alerts";

// Device identification
const String device_id = "SENGON_001";
const String location = "Test_Site_Jawa_Barat";

// Simulation parameters for realistic sengon data
float base_diameter = 150.0; // Starting diameter in mm (15 cm)
float daily_growth_rate = 0.205; // mm/day (average of 0.14-0.27 range)
unsigned long last_measurement = 0;
unsigned long simulation_start = 0;

// Environmental simulation parameters
float base_temperature = 26.5; // Average tropical temp
float base_humidity = 77.5; // Average tropical humidity
float base_soil_moisture = 65.0; // Optimal soil moisture for sengon

// Diurnal variation parameters (expansion/contraction)
float diurnal_amplitude = 0.15; // mm amplitude for daily diameter variation
float temperature_amplitude = 8.0; // °C daily temperature variation
float humidity_amplitude = 25.0; // % daily humidity variation

WiFiClient espClient;
PubSubClient client(espClient);

void setup() {
  Serial.begin(115200);
  Serial.println("Starting Sengon Monitoring System...");
  
  // Initialize random seed
  randomSeed(analogRead(0));
  
  // Record simulation start time
  simulation_start = millis();
  last_measurement = millis();
  
  setupWiFi();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);

  // Set buffer size to handle larger sensor data payloads (default is 256 bytes)
  client.setBufferSize(1024);
  
  // Configure NTP for timestamps
  configTime(7 * 3600, 0, "pool.ntp.org", "time.nist.gov");
  
  Serial.println("System initialized. Starting monitoring...");
}

void setupWiFi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}

void callback(char* topic, byte* payload, unsigned int length) {
  // Handle incoming MQTT messages (for future commands)
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  
  String message;
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println(message);
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    
    String client_id = "SengonESP32-" + String(random(0xffff), HEX);
    
    if (client.connect(client_id.c_str(), mqtt_user, mqtt_password)) {
      Serial.println("connected");
      Serial.printf("Buffer size set to: %d bytes\n", client.getBufferSize());

      // Send system startup message
      publishSystemStatus("online", "System started successfully");

    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

float simulateRealisticDiameter() {
  // Calculate elapsed time since simulation start
  unsigned long elapsed_ms = millis() - simulation_start;
  float elapsed_days = elapsed_ms / (1000.0 * 60.0 * 60.0 * 24.0);
  
  // Base growth (linear component)
  float growth_component = elapsed_days * daily_growth_rate;
  
  // Diurnal variation (expansion/contraction based on time of day)
  // Simulate daily cycle: expansion during day, contraction at night
  float hours_in_day = fmod(elapsed_ms / (1000.0 * 60.0 * 60.0), 24.0);
  float diurnal_component = diurnal_amplitude * sin(2 * PI * hours_in_day / 24.0);
  
  // Small random noise to simulate measurement variations
  float noise = (random(-10, 11) / 1000.0); // ±0.01mm noise
  
  // Environmental stress factor (reduces growth during extreme conditions)
  float current_temp = simulateTemperature();
  float stress_factor = 1.0;
  if (current_temp > 32.0 || current_temp < 20.0) {
    stress_factor = 0.7; // Reduced growth under stress
  }
  
  float current_diameter = base_diameter + (growth_component * stress_factor) + diurnal_component + noise;
  
  return current_diameter;
}

float simulateTemperature() {
  unsigned long elapsed_ms = millis() - simulation_start;
  float hours_in_day = fmod(elapsed_ms / (1000.0 * 60.0 * 60.0), 24.0);
  
  // Daily temperature cycle: peak around 14:00, minimum around 6:00
  float daily_cycle = temperature_amplitude * sin(2 * PI * (hours_in_day - 6.0) / 24.0);
  float random_variation = (random(-20, 21) / 10.0); // ±2°C random
  
  return base_temperature + daily_cycle + random_variation;
}

float simulateHumidity() {
  unsigned long elapsed_ms = millis() - simulation_start;
  float hours_in_day = fmod(elapsed_ms / (1000.0 * 60.0 * 60.0), 24.0);
  
  // Humidity inversely related to temperature
  float daily_cycle = -humidity_amplitude * sin(2 * PI * (hours_in_day - 6.0) / 24.0);
  float random_variation = (random(-50, 51) / 10.0); // ±5% random
  
  float humidity = base_humidity + daily_cycle + random_variation;
  return constrain(humidity, 40.0, 95.0); // Realistic bounds
}

float simulateSoilMoisture() {
  // Soil moisture changes more slowly, with some random daily variation
  float random_variation = (random(-30, 31) / 10.0); // ±3% variation
  float daily_drift = sin(2 * PI * millis() / (1000.0 * 60.0 * 60.0 * 24.0 * 7.0)) * 5.0; // Weekly cycle
  
  float moisture = base_soil_moisture + daily_drift + random_variation;
  return constrain(moisture, 30.0, 90.0); // Realistic bounds
}

String getTimestamp() {
  struct tm timeinfo;
  if(!getLocalTime(&timeinfo)){
    return String(millis()); // Fallback to millis if NTP fails
  }
  
  char timeStringBuff[50];
  strftime(timeStringBuff, sizeof(timeStringBuff), "%Y-%m-%dT%H:%M:%S", &timeinfo);
  return String(timeStringBuff);
}

void publishSensorData() {
  StaticJsonDocument<512> doc;
  
  // Device info
  doc["device_id"] = device_id;
  doc["location"] = location;
  doc["timestamp"] = getTimestamp();
  doc["uptime_ms"] = millis();
  
  // Sensor readings
  JsonObject sensors = doc.createNestedObject("sensors");
  
  // Dendrometer data (main measurement)
  JsonObject dendrometer = sensors.createNestedObject("dendrometer");
  float current_diameter = simulateRealisticDiameter();
  dendrometer["diameter_mm"] = round(current_diameter * 10) / 10.0; // Round to 0.1mm
  dendrometer["resolution"] = 0.1;
  dendrometer["status"] = "active";
  
  // Calculate growth rate (mm/hour) based on last measurement
  if (last_measurement > 0) {
    float time_diff_hours = (millis() - last_measurement) / (1000.0 * 60.0 * 60.0);
    if (time_diff_hours > 0) {
      static float previous_diameter = current_diameter;
      float growth_rate = (current_diameter - previous_diameter) / time_diff_hours;
      dendrometer["growth_rate_mm_per_hour"] = round(growth_rate * 1000) / 1000.0;
      previous_diameter = current_diameter;
    }
  }
  
  // Environmental sensors
  JsonObject environment = sensors.createNestedObject("environment");
  environment["temperature_c"] = round(simulateTemperature() * 10) / 10.0;
  environment["humidity_percent"] = round(simulateHumidity() * 10) / 10.0;
  environment["soil_moisture_percent"] = round(simulateSoilMoisture() * 10) / 10.0;
  
  // System status
  JsonObject system = doc.createNestedObject("system");
  system["battery_voltage"] = 4.1 + (random(-5, 6) / 100.0); // Simulate battery level
  system["wifi_rssi"] = WiFi.RSSI();
  system["free_memory"] = ESP.getFreeHeap();
  system["solar_voltage"] = 5.2 + (random(-10, 11) / 100.0); // Simulate solar panel
  
  String payload;
  serializeJson(doc, payload);
  
  // Debug: Print payload size
  Serial.printf("Payload size: %d bytes\n", payload.length());
  Serial.printf("Buffer size: %d bytes\n", client.getBufferSize());

  if (client.publish(topic_sensor_data, payload.c_str())) {
    Serial.println("✅ Sensor data published successfully:");
    Serial.println(payload);
  } else {
    Serial.println("❌ Failed to publish sensor data");
    Serial.printf("MQTT State: %d\n", client.state());
    Serial.println("Payload:");
    Serial.println(payload);
  }
  
  last_measurement = millis();
}

void publishSystemStatus(String status, String message) {
  StaticJsonDocument<256> doc;
  
  doc["device_id"] = device_id;
  doc["timestamp"] = getTimestamp();
  doc["status"] = status;
  doc["message"] = message;
  doc["uptime_ms"] = millis();
  doc["wifi_connected"] = WiFi.status() == WL_CONNECTED;
  doc["mqtt_connected"] = client.connected();
  
  String payload;
  serializeJson(doc, payload);
  
  client.publish(topic_system_status, payload.c_str());
  Serial.println("System status: " + status + " - " + message);
}

void checkForAlerts() {
  // Simulate anomaly detection
  float current_diameter = simulateRealisticDiameter();
  static float last_diameter = current_diameter;
  
  // Alert if growth rate is abnormal
  float growth_diff = current_diameter - last_diameter;
  if (abs(growth_diff) > 0.5) { // Alert if change > 0.5mm in one cycle
    StaticJsonDocument<256> alert;
    alert["device_id"] = device_id;
    alert["timestamp"] = getTimestamp();
    alert["alert_type"] = "abnormal_growth";
    alert["severity"] = "warning";
    alert["message"] = "Unusual growth rate detected";
    alert["current_diameter"] = current_diameter;
    alert["growth_change"] = growth_diff;
    
    String payload;
    serializeJson(alert, payload);
    client.publish(topic_alerts, payload.c_str());
  }
  
  // Environmental alerts
  float temp = simulateTemperature();
  if (temp > 35.0 || temp < 15.0) {
    StaticJsonDocument<256> alert;
    alert["device_id"] = device_id;
    alert["timestamp"] = getTimestamp();
    alert["alert_type"] = "environmental_stress";
    alert["severity"] = "high";
    alert["message"] = "Temperature outside optimal range";
    alert["temperature"] = temp;
    
    String payload;
    serializeJson(alert, payload);
    client.publish(topic_alerts, payload.c_str());
  }
  
  last_diameter = current_diameter;
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();
  
  // Publish sensor data every 60 seconds (1 Hz average, but practical for MQTT)
  static unsigned long lastSensorPublish = 0;
  if (millis() - lastSensorPublish > 60000) {
    publishSensorData();
    checkForAlerts();
    lastSensorPublish = millis();
  }
  
  // Publish system status every 5 minutes
  static unsigned long lastStatusPublish = 0;
  if (millis() - lastStatusPublish > 300000) {
    publishSystemStatus("running", "System operating normally");
    lastStatusPublish = millis();
  }
  
  delay(1000); // Main loop delay
}