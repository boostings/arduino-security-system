#include <Servo.h>

// Pin definitions
const int redLED = 9;   // Red LED pin
const int greenLED = 10; // Green LED pin 
const int buzzerPin = 8; // Buzzer pin

// Variables to track state
bool validFaceDetected = false;
bool alarmActive = false;
unsigned long alarmStartTime = 0;
const unsigned long alarmDuration = 5000; // 5 seconds in milliseconds

void setup() {
  // Initialize serial communication
  Serial.begin(9600);
  
  // Initialize LED pins as outputs
  pinMode(redLED, OUTPUT);
  pinMode(greenLED, OUTPUT);
  pinMode(buzzerPin, OUTPUT);
  
  // Turn off all LEDs and buzzer initially
  digitalWrite(redLED, LOW);
  digitalWrite(greenLED, LOW);
  digitalWrite(buzzerPin, LOW);
  
  Serial.println("Arduino Security System Ready");
}

void loop() {
  // Check if there's data available to read
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    if (command == "VALID_FACE") {
      handleValidFace();
    } 
    else if (command == "INVALID_FACE") {
      handleInvalidFace();
    }
    else if (command == "RESET") {
      resetSystem();
    }
  }
  
  // Handle alarm timing
  if (alarmActive) {
    if (millis() - alarmStartTime < alarmDuration) {
      // Flash the red LED while alarm is active
      if ((millis() / 250) % 2 == 0) {
        digitalWrite(redLED, HIGH);
      } else {
        digitalWrite(redLED, LOW);
      }
    } else {
      // Alarm duration has passed, turn off alarm
      alarmActive = false;
      digitalWrite(redLED, LOW);
      digitalWrite(buzzerPin, LOW);
    }
  }
}

void handleValidFace() {
  Serial.println("Valid face detected");
  
  // Turn off any active alarm
  alarmActive = false;
  
  // Set valid face flag
  validFaceDetected = true;
  
  // Turn on green LED
  digitalWrite(redLED, LOW);
  digitalWrite(greenLED, HIGH);
  
  // Play "ding" sound
  tone(buzzerPin, 1000, 200); // 1kHz tone for 200ms
}

void handleInvalidFace() {
  Serial.println("Invalid face detected");
  
  // Only trigger the alarm if it's not already active
  if (!alarmActive) {
    validFaceDetected = false;
    alarmActive = true;
    alarmStartTime = millis();
    
    // Turn off green LED
    digitalWrite(greenLED, LOW);
    
    // Start the buzzer
    tone(buzzerPin, 400, alarmDuration); // 400Hz tone for alarm duration
  }
}

void resetSystem() {
  // Reset all states and turn off outputs
  validFaceDetected = false;
  alarmActive = false;
  
  digitalWrite(redLED, LOW);
  digitalWrite(greenLED, LOW);
  digitalWrite(buzzerPin, LOW);
  
  Serial.println("System reset");
}