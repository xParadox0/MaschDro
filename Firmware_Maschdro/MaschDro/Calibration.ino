// =========================
// Load Calibration from NVS
// =========================
void loadCalibration() {
  preferences.begin("dendro", true);  // Read-only mode

  dendro_calibrated = preferences.getBool("calibrated", false);

  if (dendro_calibrated) {
    // Load from NVS
    dendro_min_voltage = preferences.getFloat("min_volt", 0.001463);
    dendro_max_voltage = preferences.getFloat("max_volt", 0.511875);
    dendro_min_diameter = preferences.getFloat("min_diam", 3.0);
    dendro_max_diameter = preferences.getFloat("max_diam", 23.3);

    Serial.println("\n=== Dendrometer Calibration Loaded from NVS ===");
    Serial.print("Min: ");
    Serial.print(dendro_min_voltage, 6);
    Serial.print(" V -> ");
    Serial.print(dendro_min_diameter);
    Serial.println(" mm");
    Serial.print("Max: ");
    Serial.print(dendro_max_voltage, 6);
    Serial.print(" V -> ");
    Serial.print(dendro_max_diameter);
    Serial.println(" mm");
  } else {
    // Use defaults (already set in global variables)
    Serial.println("\n=== Using Default Calibration ===");
    Serial.print("Min: ");
    Serial.print(dendro_min_voltage, 6);
    Serial.print(" V -> ");
    Serial.print(dendro_min_diameter);
    Serial.println(" mm");
    Serial.print("Max: ");
    Serial.print(dendro_max_voltage, 6);
    Serial.print(" V -> ");
    Serial.print(dendro_max_diameter);
    Serial.println(" mm");
    Serial.println("Note: Send 'save' command to make this permanent");

    // Set as calibrated since we have valid defaults
    dendro_calibrated = true;
  }

  preferences.end();
}

// =========================
// Save Calibration to NVS
// =========================
void saveCalibration() {
  preferences.begin("dendro", false);  // Read-write mode

  preferences.putBool("calibrated", true);
  preferences.putFloat("min_volt", dendro_min_voltage);
  preferences.putFloat("max_volt", dendro_max_voltage);
  preferences.putFloat("min_diam", dendro_min_diameter);
  preferences.putFloat("max_diam", dendro_max_diameter);

  preferences.end();

  Serial.println("Calibration saved to NVS!");
}

// =========================
// Apply Calibration to Reading
// =========================
float applyCalibration(float voltage) {
  if (!dendro_calibrated) {
    // Return raw voltage if not calibrated
    return voltage;
  }

  // Linear mapping: voltage -> diameter
  float diameter = map_float(voltage,
                             dendro_min_voltage, dendro_max_voltage,
                             dendro_min_diameter, dendro_max_diameter);

  return diameter;
}

// =========================
// Float mapping function
// =========================
float map_float(float x, float in_min, float in_max, float out_min, float out_max) {
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

// =========================
// Process Calibration Command
// =========================
void processCalibrationCommand(JsonDocument& doc) {
  if (doc.containsKey("calibrate")) {
    String command = doc["calibrate"].as<String>();

    if (command == "set_min") {
      // Set minimum point
      delay(100);  // Give sensor time to stabilize
      float current_voltage = readDendrometerRaw();
      dendro_min_voltage = current_voltage;

      if (doc.containsKey("diameter")) {
        dendro_min_diameter = doc["diameter"];
      }

      Serial.println("\n=== Calibration Min Point Set ===");
      Serial.print("Current reading: ");
      Serial.print(dendro_min_voltage, 6);
      Serial.println(" V");
      Serial.print("Mapped to diameter: ");
      Serial.print(dendro_min_diameter);
      Serial.println(" mm");

      // Mark as received
      rtc_config_received = true;

    } else if (command == "set_max") {
      // Set maximum point
      delay(100);  // Give sensor time to stabilize
      float current_voltage = readDendrometerRaw();
      dendro_max_voltage = current_voltage;

      if (doc.containsKey("diameter")) {
        dendro_max_diameter = doc["diameter"];
      }

      Serial.println("\n=== Calibration Max Point Set ===");
      Serial.print("Current reading: ");
      Serial.print(dendro_max_voltage, 6);
      Serial.println(" V");
      Serial.print("Mapped to diameter: ");
      Serial.print(dendro_max_diameter);
      Serial.println(" mm");

      // Mark as received
      rtc_config_received = true;

    } else if (command == "save") {
      // Save calibration
      dendro_calibrated = true;
      saveCalibration();

      Serial.println("\n=== Calibration Saved ===");
      Serial.println("Calibration will be applied on next sensor reading");

      // Publish status
      delay(100);
      publishCalibrationStatus();
      delay(500);
      mqttClient.loop();

      rtc_config_received = true;

    } else if (command == "clear") {
      // Clear calibration - revert to defaults
      preferences.begin("dendro", false);
      preferences.clear();
      preferences.end();

      dendro_calibrated = true;  // Still calibrated, using defaults
      dendro_min_voltage = 0.001463;
      dendro_max_voltage = 0.511875;
      dendro_min_diameter = 3.0;
      dendro_max_diameter = 23.3;

      Serial.println("\n=== Calibration Cleared (Reverted to Defaults) ===");

      // Publish status
      delay(100);
      publishCalibrationStatus();
      delay(500);
      mqttClient.loop();

      rtc_config_received = true;

    } else if (command == "status") {
      // Report calibration status
      Serial.println("\n=== Requesting Calibration Status ===");
      delay(100);
      publishCalibrationStatus();
      delay(500);
      mqttClient.loop();

      rtc_config_received = true;
    }
  }
}

// =========================
// Publish Calibration Status
// =========================
void publishCalibrationStatus() {
  if (!mqttClient.connected()) {
    Serial.println("MQTT not connected, cannot publish calibration status");
    return;
  }

  StaticJsonDocument<512> doc;

  doc["device_id"] = device_id;
  doc["calibrated"] = dendro_calibrated;
  doc["min_voltage"] = dendro_min_voltage;
  doc["max_voltage"] = dendro_max_voltage;
  doc["min_diameter"] = dendro_min_diameter;
  doc["max_diameter"] = dendro_max_diameter;

  delay(100);
  float current_voltage = readDendrometerRaw();
  doc["current_voltage"] = current_voltage;

  if (dendro_calibrated) {
    doc["current_diameter"] = applyCalibration(current_voltage);
  } else {
    doc["current_diameter"] = nullptr;
  }

  char jsonBuffer[512];
  serializeJson(doc, jsonBuffer);

  Serial.println("\n=== Calibration Status ===");
  Serial.println(jsonBuffer);

  bool published = mqttClient.publish("sengon/calibration/status", jsonBuffer);

  if (published) {
    Serial.println("Calibration status published successfully!");
  } else {
    Serial.println("Failed to publish calibration status!");
  }
}

// =========================
// Read Dendrometer Raw (without calibration)
// =========================
float readDendrometerRaw() {
  float analogValue = analogRead(DENDROMETER_PIN);
  for (int i=1; i<10; i++){
    float sensorValue = analogRead(DENDROMETER_PIN);
    analogValue = analogValue + sensorValue;
  }
  analogValue = analogValue/10;
  analogValue = (analogValue * volt_conversion);

  return analogValue;
}
