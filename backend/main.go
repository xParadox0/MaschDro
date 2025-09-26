package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"context"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"github.com/redis/go-redis/v9"
)

// Configuration struct
type Config struct {
	DatabaseURL  string
	MQTTBroker   string
	MQTTUser     string
	MQTTPassword string
	RedisURL     string
	ServerPort   string
}

// Database models
type Device struct {
	DeviceID         string    `db:"device_id" json:"device_id"`
	DeviceName       string    `db:"device_name" json:"device_name"`
	Location         string    `db:"location" json:"location"`
	TreeSpecies      string    `db:"tree_species" json:"tree_species"`
	InstallationDate time.Time `db:"installation_date" json:"installation_date"`
	Status           string    `db:"status" json:"status"`
	Metadata         []byte    `db:"metadata" json:"metadata"`
}

type SensorData struct {
	Time                time.Time `db:"time" json:"time"`
	DeviceID            string    `db:"device_id" json:"device_id"`
	DiameterMm          *float64  `db:"diameter_mm" json:"diameter_mm"`
	GrowthRateMmPerHour *float64  `db:"growth_rate_mm_per_hour" json:"growth_rate_mm_per_hour"`
	TemperatureC        *float64  `db:"temperature_c" json:"temperature_c"`
	HumidityPercent     *float64  `db:"humidity_percent" json:"humidity_percent"`
	SoilMoisturePercent *float64  `db:"soil_moisture_percent" json:"soil_moisture_percent"`
	BatteryVoltage      *float64  `db:"battery_voltage" json:"battery_voltage"`
	SolarVoltage        *float64  `db:"solar_voltage" json:"solar_voltage"`
	WifiRssi            *int      `db:"wifi_rssi" json:"wifi_rssi"`
	FreeMemory          *int64    `db:"free_memory" json:"free_memory"`
	RawData             []byte    `db:"raw_data" json:"raw_data"`
}

type SystemStatus struct {
	Time          time.Time `db:"time" json:"time"`
	DeviceID      string    `db:"device_id" json:"device_id"`
	Status        string    `db:"status" json:"status"`
	Message       string    `db:"message" json:"message"`
	UptimeMs      int64     `db:"uptime_ms" json:"uptime_ms"`
	WifiConnected bool      `db:"wifi_connected" json:"wifi_connected"`
	MqttConnected bool      `db:"mqtt_connected" json:"mqtt_connected"`
	RawData       []byte    `db:"raw_data" json:"raw_data"`
}

type Alert struct {
	ID             int        `db:"id" json:"id"`
	Time           time.Time  `db:"time" json:"time"`
	DeviceID       string     `db:"device_id" json:"device_id"`
	AlertType      string     `db:"alert_type" json:"alert_type"`
	Severity       string     `db:"severity" json:"severity"`
	Message        string     `db:"message" json:"message"`
	Acknowledged   bool       `db:"acknowledged" json:"acknowledged"`
	AcknowledgedBy *string    `db:"acknowledged_by" json:"acknowledged_by"`
	AcknowledgedAt *time.Time `db:"acknowledged_at" json:"acknowledged_at"`
	RawData        []byte     `db:"raw_data" json:"raw_data"`
}

type CarbonMetrics struct {
	Time                 time.Time `db:"time" json:"time"`
	DeviceID             string    `db:"device_id" json:"device_id"`
	DiameterMm           *float64  `db:"diameter_mm" json:"diameter_mm"`
	EstimatedHeightM     *float64  `db:"estimated_height_m" json:"estimated_height_m"`
	AboveGroundBiomassKg *float64  `db:"above_ground_biomass_kg" json:"above_ground_biomass_kg"`
	CarbonStockKg        *float64  `db:"carbon_stock_kg" json:"carbon_stock_kg"`
	Co2EquivalentKg      *float64  `db:"co2_equivalent_kg" json:"co2_equivalent_kg"`
	CarbonCreditsTons    *float64  `db:"carbon_credits_tons" json:"carbon_credits_tons"`
}

// Application struct
type App struct {
	DB         *sqlx.DB
	Redis      *redis.Client
	MQTTClient mqtt.Client
	Config     Config
}

// MQTT message handlers
func (app *App) handleSensorData(client mqtt.Client, msg mqtt.Message) {
	log.Printf("Received sensor data: %s", string(msg.Payload()))

	var data map[string]interface{}
	if err := json.Unmarshal(msg.Payload(), &data); err != nil {
		log.Printf("Error parsing sensor data: %v", err)
		return
	}

	// Extract data from JSON
	deviceID, _ := data["device_id"].(string)
	timestampStr, _ := data["timestamp"].(string)

	var timestamp time.Time
	if timestampStr != "" {
		if t, err := time.Parse("2006-01-02T15:04:05", timestampStr); err == nil {
			timestamp = t
		} else {
			timestamp = time.Now()
		}
	} else {
		timestamp = time.Now()
	}

	sensorData := SensorData{
		Time:     timestamp,
		DeviceID: deviceID,
		RawData:  msg.Payload(),
	}

	// Extract sensor readings
	if sensors, ok := data["sensors"].(map[string]interface{}); ok {
		// Dendrometer data
		if dendrometer, ok := sensors["dendrometer"].(map[string]interface{}); ok {
			if diameter, ok := dendrometer["diameter_mm"].(float64); ok {
				sensorData.DiameterMm = &diameter
			}
			if growthRate, ok := dendrometer["growth_rate_mm_per_hour"].(float64); ok {
				sensorData.GrowthRateMmPerHour = &growthRate
			}
		}

		// Environmental data
		if environment, ok := sensors["environment"].(map[string]interface{}); ok {
			if temp, ok := environment["temperature_c"].(float64); ok {
				sensorData.TemperatureC = &temp
			}
			if humidity, ok := environment["humidity_percent"].(float64); ok {
				sensorData.HumidityPercent = &humidity
			}
			if soilMoisture, ok := environment["soil_moisture_percent"].(float64); ok {
				sensorData.SoilMoisturePercent = &soilMoisture
			}
		}
	}

	// Extract system data
	if system, ok := data["system"].(map[string]interface{}); ok {
		if battery, ok := system["battery_voltage"].(float64); ok {
			sensorData.BatteryVoltage = &battery
		}
		if solar, ok := system["solar_voltage"].(float64); ok {
			sensorData.SolarVoltage = &solar
		}
		if rssi, ok := system["wifi_rssi"].(float64); ok {
			rssiInt := int(rssi)
			sensorData.WifiRssi = &rssiInt
		}
		if memory, ok := system["free_memory"].(float64); ok {
			memoryInt := int64(memory)
			sensorData.FreeMemory = &memoryInt
		}
	}

	// Insert into database
	if err := app.insertSensorData(sensorData); err != nil {
		log.Printf("Error inserting sensor data: %v", err)
		return
	}

	// Cache latest reading in Redis
	app.cacheLatestReading(deviceID, sensorData)

	log.Printf("Successfully processed sensor data for device: %s", deviceID)
}

func (app *App) handleSystemStatus(client mqtt.Client, msg mqtt.Message) {
	log.Printf("Received system status: %s", string(msg.Payload()))

	var data map[string]interface{}
	if err := json.Unmarshal(msg.Payload(), &data); err != nil {
		log.Printf("Error parsing system status: %v", err)
		return
	}

	deviceID, _ := data["device_id"].(string)
	status, _ := data["status"].(string)
	message, _ := data["message"].(string)
	uptimeMs, _ := data["uptime_ms"].(float64)
	wifiConnected, _ := data["wifi_connected"].(bool)
	mqttConnected, _ := data["mqtt_connected"].(bool)

	systemStatus := SystemStatus{
		Time:          time.Now(),
		DeviceID:      deviceID,
		Status:        status,
		Message:       message,
		UptimeMs:      int64(uptimeMs),
		WifiConnected: wifiConnected,
		MqttConnected: mqttConnected,
		RawData:       msg.Payload(),
	}

	if err := app.insertSystemStatus(systemStatus); err != nil {
		log.Printf("Error inserting system status: %v", err)
	}
}

func (app *App) handleAlert(client mqtt.Client, msg mqtt.Message) {
	log.Printf("Received alert: %s", string(msg.Payload()))

	var data map[string]interface{}
	if err := json.Unmarshal(msg.Payload(), &data); err != nil {
		log.Printf("Error parsing alert: %v", err)
		return
	}

	deviceID, _ := data["device_id"].(string)
	alertType, _ := data["alert_type"].(string)
	severity, _ := data["severity"].(string)
	message, _ := data["message"].(string)

	alert := Alert{
		Time:      time.Now(),
		DeviceID:  deviceID,
		AlertType: alertType,
		Severity:  severity,
		Message:   message,
		RawData:   msg.Payload(),
	}

	if err := app.insertAlert(alert); err != nil {
		log.Printf("Error inserting alert: %v", err)
	}
}

// Database operations
func (app *App) insertSensorData(data SensorData) error {
	query := `
		INSERT INTO sensor_data (
			time, device_id, diameter_mm, growth_rate_mm_per_hour,
			temperature_c, humidity_percent, soil_moisture_percent,
			battery_voltage, solar_voltage, wifi_rssi, free_memory, raw_data
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
		)`

	_, err := app.DB.Exec(query, data.Time, data.DeviceID, data.DiameterMm,
		data.GrowthRateMmPerHour, data.TemperatureC, data.HumidityPercent,
		data.SoilMoisturePercent, data.BatteryVoltage, data.SolarVoltage,
		data.WifiRssi, data.FreeMemory, data.RawData)

	return err
}

func (app *App) insertSystemStatus(status SystemStatus) error {
	query := `
		INSERT INTO system_status (
			time, device_id, status, message, uptime_ms,
			wifi_connected, mqtt_connected, raw_data
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`

	_, err := app.DB.Exec(query, status.Time, status.DeviceID, status.Status,
		status.Message, status.UptimeMs, status.WifiConnected,
		status.MqttConnected, status.RawData)

	return err
}

func (app *App) insertAlert(alert Alert) error {
	query := `
		INSERT INTO alerts (
			time, device_id, alert_type, severity, message, raw_data
		) VALUES ($1, $2, $3, $4, $5, $6)`

	_, err := app.DB.Exec(query, alert.Time, alert.DeviceID, alert.AlertType,
		alert.Severity, alert.Message, alert.RawData)

	return err
}

func (app *App) cacheLatestReading(deviceID string, data SensorData) {
	ctx := context.Background()
	dataJSON, _ := json.Marshal(data)
	app.Redis.Set(ctx, fmt.Sprintf("latest_reading:%s", deviceID), dataJSON, time.Hour)
}

// HTTP API handlers
func (app *App) getDevices(c *gin.Context) {
	var devices []Device
	err := app.DB.Select(&devices, "SELECT * FROM devices ORDER BY device_id")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"devices": devices})
}

func (app *App) getLatestReadings(c *gin.Context) {
	deviceID := c.Param("device_id")

	var reading SensorData
	query := `
		SELECT * FROM sensor_data 
		WHERE device_id = $1 
		ORDER BY time DESC 
		LIMIT 1`

	err := app.DB.Get(&reading, query, deviceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, reading)
}

func (app *App) getSensorHistory(c *gin.Context) {
	deviceID := c.Param("device_id")
	hoursStr := c.DefaultQuery("hours", "24")

	hours, err := strconv.Atoi(hoursStr)
	if err != nil {
		hours = 24
	}

	var readings []SensorData
	query := `
		SELECT * FROM sensor_data 
		WHERE device_id = $1 AND time >= NOW() - INTERVAL '%d hours'
		ORDER BY time ASC`

	err = app.DB.Select(&readings, fmt.Sprintf(query, hours), deviceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"readings": readings, "device_id": deviceID, "hours": hours})
}

func (app *App) getCarbonMetrics(c *gin.Context) {
	deviceID := c.Param("device_id")

	var metrics []CarbonMetrics
	query := `
		SELECT * FROM carbon_metrics 
		WHERE device_id = $1 
		ORDER BY time DESC 
		LIMIT 100`

	err := app.DB.Select(&metrics, query, deviceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"carbon_metrics": metrics})
}

func (app *App) getAlerts(c *gin.Context) {
	deviceID := c.Query("device_id")
	acknowledgedStr := c.DefaultQuery("acknowledged", "false")

	acknowledged := acknowledgedStr == "true"

	var alerts []Alert
	var query string
	var args []interface{}

	if deviceID != "" {
		query = `SELECT * FROM alerts WHERE device_id = $1 AND acknowledged = $2 ORDER BY time DESC LIMIT 50`
		args = []interface{}{deviceID, acknowledged}
	} else {
		query = `SELECT * FROM alerts WHERE acknowledged = $1 ORDER BY time DESC LIMIT 50`
		args = []interface{}{acknowledged}
	}

	err := app.DB.Select(&alerts, query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"alerts": alerts})
}

func (app *App) acknowledgeAlert(c *gin.Context) {
	alertIDStr := c.Param("id")
	alertID, err := strconv.Atoi(alertIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid alert ID"})
		return
	}

	var req struct {
		AcknowledgedBy string `json:"acknowledged_by"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	query := `
		UPDATE alerts 
		SET acknowledged = true, acknowledged_by = $1, acknowledged_at = NOW()
		WHERE id = $2`

	_, err = app.DB.Exec(query, req.AcknowledgedBy, alertID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Alert acknowledged successfully"})
}

// Setup functions
func (app *App) setupMQTT() error {
	opts := mqtt.NewClientOptions()
	opts.AddBroker(app.Config.MQTTBroker)
	opts.SetClientID("sengon_backend")
	opts.SetUsername(app.Config.MQTTUser)
	opts.SetPassword(app.Config.MQTTPassword)
	opts.SetCleanSession(true)

	opts.OnConnect = func(client mqtt.Client) {
		log.Println("Connected to MQTT broker")

		// Subscribe to topics
		client.Subscribe("sengon/sensor/data", 0, app.handleSensorData)
		client.Subscribe("sengon/system/status", 0, app.handleSystemStatus)
		client.Subscribe("sengon/alerts", 0, app.handleAlert)

		log.Println("Subscribed to MQTT topics")
	}

	opts.OnConnectionLost = func(client mqtt.Client, err error) {
		log.Printf("MQTT connection lost: %v", err)
	}

	app.MQTTClient = mqtt.NewClient(opts)
	if token := app.MQTTClient.Connect(); token.Wait() && token.Error() != nil {
		return fmt.Errorf("failed to connect to MQTT: %v", token.Error())
	}

	return nil
}

func (app *App) setupRoutes() *gin.Engine {
	r := gin.Default()

	// CORS middleware
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://localhost:5173"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":         "healthy",
			"timestamp":      time.Now(),
			"mqtt_connected": app.MQTTClient.IsConnected(),
		})
	})

	// API routes
	api := r.Group("/api/v1")
	{
		api.GET("/devices", app.getDevices)
		api.GET("/devices/:device_id/latest", app.getLatestReadings)
		api.GET("/devices/:device_id/history", app.getSensorHistory)
		api.GET("/devices/:device_id/carbon", app.getCarbonMetrics)
		api.GET("/alerts", app.getAlerts)
		api.PUT("/alerts/:id/acknowledge", app.acknowledgeAlert)
	}

	return r
}

func main() {
	// Load configuration
	config := Config{
		DatabaseURL:  "postgres://sengon_user:sengon_password@localhost:5432/sengon_monitoring?sslmode=disable",
		MQTTBroker:   "tcp://localhost:1883",
		MQTTUser:     "sengon_user",
		MQTTPassword: "sengon_pass",
		RedisURL:     "localhost:6379",
		ServerPort:   "8080",
	}

	// Initialize database
	db, err := sqlx.Connect("postgres", config.DatabaseURL)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// Initialize Redis
	rdb := redis.NewClient(&redis.Options{
		Addr: config.RedisURL,
	})

	// Initialize application
	app := &App{
		DB:     db,
		Redis:  rdb,
		Config: config,
	}

	// Setup MQTT
	if err := app.setupMQTT(); err != nil {
		log.Fatal("Failed to setup MQTT:", err)
	}
	defer app.MQTTClient.Disconnect(250)

	// Setup HTTP server
	router := app.setupRoutes()

	// Start server in goroutine
	server := &http.Server{
		Addr:    ":" + config.ServerPort,
		Handler: router,
	}

	go func() {
		log.Printf("Starting server on port %s", config.ServerPort)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("Failed to start server:", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")
}
