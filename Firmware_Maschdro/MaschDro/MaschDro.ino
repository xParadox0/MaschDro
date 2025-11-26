#include <DHT.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <time.h>
#include <Preferences.h>

// =========================
// WiFi Configuration
// =========================
const char* ssid = "Quark";
const char* password = "!0MeinStadt0!";

// =========================
// MQTT Configuration
// =========================
const char* mqtt_server = "103.250.11.110";
const int mqtt_port = 1884;
const char* mqtt_user = "sengon_user";
const char* mqtt_password = "sengon_pass";

// const char* mqtt_server = "192.168.18.176";
// const int mqtt_port = 1884;
// const char* mqtt_user = "sengon_user";
// const char* mqtt_password = "sengon_pass";

const char* mqtt_topic_data = "sengon/sensor/data";
const char* mqtt_topic_status = "sengon/system/status";
const char* mqtt_topic_alerts = "sengon/alerts";
const char* mqtt_topic_config = "sengon/config/SENGON_001";  // Device-specific config topic

// =========================
// Device Configuration
// =========================
const char* device_id = "SENGON_001";
const char* location = "Greenhouse A";

// =========================
// Deep Sleep Configuration (Configurable via MQTT)
// =========================
#define uS_TO_S_FACTOR 1000000ULL  // Conversion factor for micro seconds to seconds

// Default values (can be overridden via MQTT)
#define DEFAULT_SLEEP_TIME 900           // 15 minutes
#define DEFAULT_FORCE_SEND_INTERVAL 3600 // 1 hour
#define DEFAULT_TEMP_THRESHOLD 1.0
#define DEFAULT_HUMIDITY_THRESHOLD 5.0
#define DEFAULT_MOISTURE_THRESHOLD 5.0
#define DEFAULT_DENDRO_THRESHOLD 0.01

// =========================
// RTC Memory Structure
// =========================
RTC_DATA_ATTR float rtc_last_temp = 0;
RTC_DATA_ATTR float rtc_last_humidity = 0;
RTC_DATA_ATTR float rtc_last_moisture = 0;
RTC_DATA_ATTR float rtc_last_dendro = 0;
RTC_DATA_ATTR unsigned long rtc_last_force_send = 0;
RTC_DATA_ATTR int rtc_boot_count = 0;
RTC_DATA_ATTR bool rtc_first_run = true;

// Configurable parameters in RTC memory (survive deep sleep)
RTC_DATA_ATTR unsigned long rtc_sleep_time = DEFAULT_SLEEP_TIME;
RTC_DATA_ATTR unsigned long rtc_force_send_interval = DEFAULT_FORCE_SEND_INTERVAL;
RTC_DATA_ATTR float rtc_temp_threshold = DEFAULT_TEMP_THRESHOLD;
RTC_DATA_ATTR float rtc_humidity_threshold = DEFAULT_HUMIDITY_THRESHOLD;
RTC_DATA_ATTR float rtc_moisture_threshold = DEFAULT_MOISTURE_THRESHOLD;
RTC_DATA_ATTR float rtc_dendro_threshold = DEFAULT_DENDRO_THRESHOLD;
RTC_DATA_ATTR bool rtc_config_received = false;

// =========================
// DHT22 Section
// =========================
#define DHT22_PIN 13
DHT dht22(DHT22_PIN, DHT22);

// DHT22 Data Structure
struct DHT22Data {
  float temperature;
  float humidity;
  bool valid;
};

// =========================
// Soil Moisture Section
// =========================
#define MoisturePin 12

// =========================
// Dendrometer Section
// =========================
#define DENDROMETER_PIN 14
float volt_conversion = 0.000125;

// Dendrometer calibration (stored in NVS)
// Default calibration values based on actual measurements
float dendro_min_voltage = 0.001463;   // Minimum diameter voltage (3mm)
float dendro_max_voltage = 0.511875;   // Maximum diameter voltage (23.3mm)
float dendro_min_diameter = 3.0;       // Minimum diameter (mm)
float dendro_max_diameter = 23.3;      // Maximum diameter (mm)
bool dendro_calibrated = false;

// =========================
// WiFi and MQTT Clients
// =========================
WiFiClient espClient;
PubSubClient mqttClient(espClient);

// =========================
// Preferences (NVS Storage)
// =========================
Preferences preferences;

// =========================
// NTP Configuration
// =========================
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 25200;  // GMT+7 (7 * 3600)
const int daylightOffset_sec = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);  // Give serial time to initialize

  // Load calibration from NVS
  loadCalibration();

  // Increment boot count
  rtc_boot_count++;
  Serial.println("\n=== Wake Up ===");
  Serial.print("Boot count: ");
  Serial.println(rtc_boot_count);

  // Configure deep sleep timer (using RTC variable)
  esp_sleep_enable_timer_wakeup(rtc_sleep_time * uS_TO_S_FACTOR);
  Serial.print("Deep sleep configured for: ");
  Serial.print(rtc_sleep_time);
  Serial.println(" seconds");

  // Print current configuration
  Serial.println("\n=== Current Configuration ===");
  Serial.print("Sleep time: ");
  Serial.print(rtc_sleep_time);
  Serial.println(" seconds");
  Serial.print("Force send interval: ");
  Serial.print(rtc_force_send_interval);
  Serial.println(" seconds");
  Serial.print("Temp threshold: ");
  Serial.println(rtc_temp_threshold);
  Serial.print("Humidity threshold: ");
  Serial.println(rtc_humidity_threshold);
  Serial.print("Moisture threshold: ");
  Serial.println(rtc_moisture_threshold);
  Serial.print("Dendro threshold: ");
  Serial.println(rtc_dendro_threshold);

  // Initialize sensors
  dht22.begin();
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH);  // LED on during active time

  // Read all sensors
  Serial.println("\n=== Reading Sensors ===");
  DHT22Data dhtData = readDHT22();
  float soilMoisture = readSoilMoisture();
  float dendrometerVoltage = readDendrometer();

  // Check if we should send data
  bool shouldSend = checkIfShouldSend(dhtData, soilMoisture, dendrometerVoltage);

  if (shouldSend) {
    Serial.println("\n=== Significant change detected or force send interval reached ===");

    // Connect to WiFi
    setupWiFi();

    // Configure NTP (only if WiFi connected)
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("Synchronizing time with NTP server...");

      // Configure NTP with multiple servers as fallback
      configTime(gmtOffset_sec, daylightOffset_sec, ntpServer, "time.google.com", "time.cloudflare.com");

      // Wait for time sync with longer timeout
      Serial.print("Waiting for time sync");
      int retry = 0;
      time_t now = 0;
      struct tm timeinfo;

      while (retry < 20) {  // 10 seconds max
        time(&now);
        if (now > 1609459200) {  // After Jan 1, 2021 (reasonable minimum time)
          localtime_r(&now, &timeinfo);
          Serial.println(" OK!");
          Serial.print("Current time: ");
          Serial.println(&timeinfo, "%Y-%m-%d %H:%M:%S");
          break;
        }
        Serial.print(".");
        delay(500);
        retry++;
      }

      if (retry >= 20) {
        Serial.println(" FAILED!");
        Serial.println("Continuing without time sync (timestamps will be empty)");
      }

      // Setup and connect MQTT
      mqttClient.setServer(mqtt_server, mqtt_port);
      mqttClient.setBufferSize(1024, 1024);
      mqttClient.setCallback(mqttCallback);

      if (reconnectMQTT()) {
        // Check for configuration updates first
        checkForConfigUpdates();

        // Publish sensor data
        publishSensorDataWithValues(dhtData, soilMoisture, dendrometerVoltage);

        // Publish status on first run or periodically
        if (rtc_first_run || (rtc_boot_count % 4 == 0)) {
          publishStatus();

          // Also publish calibration status on first run
          if (rtc_first_run) {
            delay(100);
            publishCalibrationStatus();
            delay(500);
            mqttClient.loop();
          }

          rtc_first_run = false;
        }

        // Wait for MQTT to send
        delay(500);
        mqttClient.loop();
        delay(500);
      }

      // Disconnect to save power
      mqttClient.disconnect();
      WiFi.disconnect(true);
      WiFi.mode(WIFI_OFF);
    }

    // Update RTC memory with current values
    rtc_last_temp = dhtData.temperature;
    rtc_last_humidity = dhtData.humidity;
    rtc_last_moisture = soilMoisture;
    rtc_last_dendro = dendrometerVoltage;
    rtc_last_force_send = rtc_boot_count * rtc_sleep_time;
  } else {
    Serial.println("\n=== No significant changes, skipping transmission ===");
  }

  // Turn off LED
  digitalWrite(LED_BUILTIN, LOW);

  // Go to deep sleep
  Serial.println("\n=== Entering Deep Sleep ===");
  Serial.flush();
  esp_deep_sleep_start();
}

void loop() {
  // Never reached due to deep sleep
  // If we somehow get here, go back to sleep
  esp_deep_sleep_start();
}
