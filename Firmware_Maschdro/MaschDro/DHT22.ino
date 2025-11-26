DHT22Data readDHT22(){
  DHT22Data data;
  data.humidity = dht22.readHumidity();
  data.temperature = dht22.readTemperature();

  if(isnan(data.temperature) || isnan(data.humidity)) {
    Serial.println("Failed to read from DHT22 sensor!");
    data.valid = false;
  } else {
    Serial.print("Humidity: ");
    Serial.print(data.humidity);
    Serial.print("%");
    Serial.print(" | ");
    Serial.print("Temperature: ");
    Serial.print(data.temperature);
    Serial.println("C");
    data.valid = true;
  }

  return data;
}