float readDendrometer(){
  // Read raw voltage
  float voltage = readDendrometerRaw();

  // Apply calibration if available
  float diameter = applyCalibration(voltage);

  if (dendro_calibrated) {
    Serial.print("Dendrometer: ");
    Serial.print(voltage, 4);
    Serial.print(" V -> ");
    Serial.print(diameter);
    Serial.println(" mm");
  } else {
    Serial.print("Dendrometer (raw): ");
    Serial.print(voltage, 4);
    Serial.println(" V");
  }

  return diameter;
}