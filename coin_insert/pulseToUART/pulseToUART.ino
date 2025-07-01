#include <Arduino.h>

void setup() {
  Serial.begin(115200);
  pinMode(D2, INPUT_PULLUP);
  pinMode(D5, INPUT_PULLUP);
  delay(500);
  Serial.println("Start");
}

void loop() {
  if (!digitalRead(D2)) {
    Serial.print("cns:1");
  }
  delay(500);
  if (!digitalRead(D5)) {
    Serial.print("ftpon");
  } else {
    Serial.print("ftpoff");
  }
  delay(500);
}