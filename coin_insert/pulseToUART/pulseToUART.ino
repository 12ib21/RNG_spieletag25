#include <Arduino.h>

const int coinPin = 2; // Pin connected to the coin mechanism
volatile int coinCount = 0;

void setup() {
    Serial.begin(115200); // Start serial communication
    pinMode(coinPin, INPUT_PULLUP); // Set the coin pin as input with pull-up resistor
    attachInterrupt(digitalPinToInterrupt(coinPin), coinInserted, FALLING); // Interrupt on falling edge
}

void loop() {
    // Check if a coin was inserted
    if (coinCount > 0) {
        Serial.println("Coin inserted");
        coinCount--; // Decrement the coin count
    }
}

void coinInserted() {
    coinCount++; // Increment the coin count on pulse
}

