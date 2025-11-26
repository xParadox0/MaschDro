// =========================
// MQTT Callback for Configuration Messages
// =========================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("]: ");

  // Convert payload to string
  char message[length + 1];
  memcpy(message, payload, length);
  message[length] = '\0';
  Serial.println(message);

  // Parse JSON configuration
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, message);

  if (error) {
    Serial.print("JSON parse failed: ");
    Serial.println(error.c_str());
    return;
  }

  // Update configuration from JSON
  if (doc.containsKey("sleep_time")) {
    rtc_sleep_time = doc["sleep_time"];
    Serial.print("Updated sleep_time: ");
    Serial.println(rtc_sleep_time);
  }

  if (doc.containsKey("force_send_interval")) {
    rtc_force_send_interval = doc["force_send_interval"];
    Serial.print("Updated force_send_interval: ");
    Serial.println(rtc_force_send_interval);
  }

  if (doc.containsKey("temp_threshold")) {
    rtc_temp_threshold = doc["temp_threshold"];
    Serial.print("Updated temp_threshold: ");
    Serial.println(rtc_temp_threshold);
  }

  if (doc.containsKey("humidity_threshold")) {
    rtc_humidity_threshold = doc["humidity_threshold"];
    Serial.print("Updated humidity_threshold: ");
    Serial.println(rtc_humidity_threshold);
  }

  if (doc.containsKey("moisture_threshold")) {
    rtc_moisture_threshold = doc["moisture_threshold"];
    Serial.print("Updated moisture_threshold: ");
    Serial.println(rtc_moisture_threshold);
  }

  if (doc.containsKey("dendro_threshold")) {
    rtc_dendro_threshold = doc["dendro_threshold"];
    Serial.print("Updated dendro_threshold: ");
    Serial.println(rtc_dendro_threshold);
  }

  rtc_config_received = true;
  Serial.println("Configuration updated successfully!");

  // Check for calibration commands
  processCalibrationCommand(doc);
}

// =========================
// Check if Should Send Data
// =========================
bool checkIfShouldSend(DHT22Data dhtData, float moisture, float dendro) {
  // Always send on first run
  if (rtc_first_run) {
    Serial.println("First run - will send data");
    return true;
  }

  // Force send after interval (uses RTC variable now)
  unsigned long currentUptime = rtc_boot_count * rtc_sleep_time;
  if (currentUptime - rtc_last_force_send >= rtc_force_send_interval) {
    Serial.println("Force send interval reached");
    return true;
  }

  // Check for significant changes (uses RTC thresholds)
  bool tempChanged = false;
  bool humidityChanged = false;
  bool moistureChanged = false;
  bool dendroChanged = false;

  if (dhtData.valid) {
    tempChanged = abs(dhtData.temperature - rtc_last_temp) >= rtc_temp_threshold;
    humidityChanged = abs(dhtData.humidity - rtc_last_humidity) >= rtc_humidity_threshold;
  }
  moistureChanged = abs(moisture - rtc_last_moisture) >= rtc_moisture_threshold;
  dendroChanged = abs(dendro - rtc_last_dendro) >= rtc_dendro_threshold;

  if (tempChanged) {
    Serial.print("Temperature changed: ");
    Serial.print(rtc_last_temp);
    Serial.print(" -> ");
    Serial.println(dhtData.temperature);
  }
  if (humidityChanged) {
    Serial.print("Humidity changed: ");
    Serial.print(rtc_last_humidity);
    Serial.print(" -> ");
    Serial.println(dhtData.humidity);
  }
  if (moistureChanged) {
    Serial.print("Soil moisture changed: ");
    Serial.print(rtc_last_moisture);
    Serial.print(" -> ");
    Serial.println(moisture);
  }
  if (dendroChanged) {
    Serial.print("Dendrometer changed: ");
    Serial.print(rtc_last_dendro, 4);
    Serial.print(" -> ");
    Serial.println(dendro, 4);
  }

  return tempChanged || humidityChanged || moistureChanged || dendroChanged;
}

// =========================
// WiFi Connection Function (Optimized for Low Power)
// =========================
void setupWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(false);
  WiFi.persistent(false);  // Don't save WiFi config to flash

  Serial.println();
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {  // 15 seconds max
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("WiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal strength (RSSI): ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println();
    Serial.println("WiFi connection failed!");
  }
}

// =========================
// MQTT Reconnection Function (Returns success status)
// =========================
bool reconnectMQTT() {
  int attempts = 0;
  while (!mqttClient.connected() && attempts < 3) {
    Serial.print("Attempting MQTT connection...");

    String clientId = String(device_id) + "_" + String(random(0xffff), HEX);

    if (mqttClient.connect(clientId.c_str(), mqtt_user, mqtt_password)) {
      Serial.println("connected!");

      // Subscribe to configuration topic
      if (mqttClient.subscribe(mqtt_topic_config)) {
        Serial.print("Subscribed to config topic: ");
        Serial.println(mqtt_topic_config);
      } else {
        Serial.println("Failed to subscribe to config topic!");
      }

      return true;
    } else {
      Serial.print("failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" retrying in 2 seconds");
      delay(2000);
      attempts++;
    }
  }
  return false;
}

// =========================
// Check for Configuration Updates
// =========================
void checkForConfigUpdates() {
  Serial.println("Checking for configuration updates...");

  unsigned long startTime = millis();
  rtc_config_received = false;

  // Listen for config messages for 3 seconds
  while (millis() - startTime < 3000) {
    mqttClient.loop();
    if (rtc_config_received) {
      Serial.println("Configuration received and applied!");
      break;
    }
    delay(100);
  }

  if (!rtc_config_received) {
    Serial.println("No configuration updates received");
  }
}

// =========================
// Get Timestamp Function
// =========================
String getTimestamp() {
  time_t now;
  struct tm timeinfo;

  time(&now);

  // Check if time is valid (after Jan 1, 2021)
  if (now < 1609459200) {
    Serial.println("Time not synchronized, using uptime-based timestamp");
    // Return uptime-based timestamp instead
    unsigned long uptime = rtc_boot_count * rtc_sleep_time;
    char buffer[30];
    snprintf(buffer, sizeof(buffer), "uptime_%lu", uptime);
    return String(buffer);
  }

  localtime_r(&now, &timeinfo);
  char buffer[30];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%S", &timeinfo);
  return String(buffer);
}

// =========================
// Publish Sensor Data Function (with values)
// =========================
void publishSensorDataWithValues(DHT22Data dhtData, float soilMoisture, float dendrometerVoltage) {
  Serial.println("\n=== Publishing Sensor Data ===");

  // Create JSON document
  StaticJsonDocument<1024> doc;

  // Device info
  doc["device_id"] = device_id;
  doc["location"] = location;
  doc["timestamp"] = getTimestamp();
  doc["uptime"] = rtc_boot_count * rtc_sleep_time;

  // Dendrometer data
  JsonObject dendrometer = doc.createNestedObject("dendrometer");
  dendrometer["diameter_mm"] = dendrometerVoltage;

  // Calculate growth rate if we have previous data
  if (!rtc_first_run && rtc_last_dendro != 0) {
    float growth = dendrometerVoltage - rtc_last_dendro;
    dendrometer["growth_rate"] = growth;
  } else {
    dendrometer["growth_rate"] = 0.0;
  }
  dendrometer["status"] = "normal";

  // Environment data
  JsonObject environment = doc.createNestedObject("environment");
  if (dhtData.valid) {
    environment["temperature"] = dhtData.temperature;
    environment["humidity"] = dhtData.humidity;
  } else {
    environment["temperature"] = nullptr;
    environment["humidity"] = nullptr;
  }
  environment["soil_moisture"] = soilMoisture;

  // System data
  JsonObject system = doc.createNestedObject("system");
  system["battery_voltage"] = getBatteryVoltage();
  system["rssi"] = WiFi.RSSI();
  system["free_memory"] = ESP.getFreeHeap();
  system["solar_voltage"] = 0.0;  // Add solar monitoring if available

  // Serialize and publish
  char jsonBuffer[1024];
  serializeJson(doc, jsonBuffer);

  Serial.println("JSON Payload:");
  Serial.println(jsonBuffer);

  if (mqttClient.publish(mqtt_topic_data, jsonBuffer)) {
    Serial.println("Sensor data published successfully!");
  } else {
    Serial.println("Failed to publish sensor data!");
  }
}

// =========================
// Get Battery Voltage Function
// =========================
float getBatteryVoltage() {
  // If you have a battery voltage divider on a specific pin, read it here
  // For example: analogRead(BATTERY_PIN) * conversion_factor
  // For now, return a placeholder or estimate
  return 3.7;  // Replace with actual battery monitoring
}

// =========================
// Publish Status Function
// =========================
void publishStatus() {
  Serial.println("\n=== Publishing Status ===");

  StaticJsonDocument<768> doc;

  doc["device_id"] = device_id;
  doc["timestamp"] = getTimestamp();
  doc["status"] = "online";
  doc["message"] = "Device operating normally (deep sleep mode)";
  doc["uptime"] = rtc_boot_count * rtc_sleep_time;
  doc["wifi_connected"] = (WiFi.status() == WL_CONNECTED);
  doc["mqtt_connected"] = mqttClient.connected();
  doc["rssi"] = WiFi.RSSI();
  doc["boot_count"] = rtc_boot_count;
  doc["battery_voltage"] = getBatteryVoltage();

  // Include current configuration
  JsonObject config = doc.createNestedObject("config");
  config["sleep_time"] = rtc_sleep_time;
  config["force_send_interval"] = rtc_force_send_interval;
  config["temp_threshold"] = rtc_temp_threshold;
  config["humidity_threshold"] = rtc_humidity_threshold;
  config["moisture_threshold"] = rtc_moisture_threshold;
  config["dendro_threshold"] = rtc_dendro_threshold;

  char jsonBuffer[768];
  serializeJson(doc, jsonBuffer);

  Serial.println("Status Payload:");
  Serial.println(jsonBuffer);

  if (mqttClient.publish(mqtt_topic_status, jsonBuffer)) {
    Serial.println("Status published successfully!");
  } else {
    Serial.println("Failed to publish status!");
  }
}

// =========================
// Publish Alert Function
// =========================
void publishAlert(String alertType, String severity, String message) {
  Serial.println("\n=== Publishing Alert ===");

  StaticJsonDocument<512> doc;

  doc["device_id"] = device_id;
  doc["timestamp"] = getTimestamp();
  doc["alert_type"] = alertType;
  doc["severity"] = severity;
  doc["message"] = message;

  char jsonBuffer[512];
  serializeJson(doc, jsonBuffer);

  Serial.println("Alert Payload:");
  Serial.println(jsonBuffer);

  if (mqttClient.publish(mqtt_topic_alerts, jsonBuffer)) {
    Serial.println("Alert published successfully!");
  } else {
    Serial.println("Failed to publish alert!");
  }
}
