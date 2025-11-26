float readSoilMoisture(){
  int soilMoistureValue = analogRead(MoisturePin);
  float moisturePercent = map(soilMoistureValue, 4095, 0, 0, 100);

  Serial.print("Soil Moisture Level: ");
  Serial.print(moisturePercent);
  Serial.println("%");

  return moisturePercent;
}