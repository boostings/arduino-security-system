// ESP32 Pin definitions - using more spread-out pins
const int redLED = 21;    // Red LED pin - ESP32 GPIO 21
const int greenLED = 12;  // Green LED pin - ESP32 GPIO 12
const int buzzerPin = 15; // Buzzer pin - ESP32 GPIO 15

// ESP32 buzzer configuration
#define BUZZER_CHANNEL 0
#define BUZZER_RESOLUTION 8
#define BUZZER_ALARM_FREQ 400 // Frequency for the continuous alarm

// Serial debugging options
#define ENABLE_DEBUG true   // Set to false to disable all serial output
#define SERIAL_BAUD 115200

// User recognition variables
String recognizedUser = "";

// Logging variables for tracking state changes (optional but can be helpful)
bool redLEDState = false;
bool greenLEDState = false;
bool buzzerState = false;

// Custom debug print function to ensure reliable serial output
void debugPrint(const char* message) {
  if (ENABLE_DEBUG) {
    Serial.println(message);
    Serial.flush(); // Wait for all data to be sent
  }
}

void debugPrintf(const char* format, ...) {
  if (ENABLE_DEBUG) {
    char buffer[256];
    va_list args;
    va_start(args, format);
    vsnprintf(buffer, sizeof(buffer), format, args);
    va_end(args);
    Serial.println(buffer);
    Serial.flush(); // Wait for all data to be sent
  }
}

// Function to play a continuous tone or a short beep
void playTone(int pin, int frequency, int duration = 0) { // Default duration 0 for continuous
  if (frequency <= 0) { // Stop tone if frequency is 0 or less
      stopTone();
      return;
  }

  debugPrintf("[BUZZER] Playing tone: %d Hz%s",
              frequency,
              duration > 0 ? " for " + String(duration) + " ms" : " continuously");

  ledcSetup(BUZZER_CHANNEL, frequency, BUZZER_RESOLUTION);
  ledcAttachPin(pin, BUZZER_CHANNEL);
  ledcWrite(BUZZER_CHANNEL, 128); // ~50% duty cycle (128 for 8-bit resolution)
  buzzerState = true;

  if (duration > 0) {
    delay(duration); // Use delay only for short beeps
    stopTone();      // Stop after duration
  }
}

// Function to stop the tone
void stopTone() {
  if (buzzerState) { // Only stop if it's actually on
    ledcWrite(BUZZER_CHANNEL, 0);
    buzzerState = false;
    debugPrint("[BUZZER] Stopped");
  }
}

// Set LED state with logging
void setLED(int pin, bool state) {
  digitalWrite(pin, state ? HIGH : LOW);

  if (pin == redLED) {
    if (redLEDState != state) {
      debugPrintf("[LED] Red LED: %s", state ? "ON" : "OFF");
      redLEDState = state;
    }
  } else if (pin == greenLED) {
    if (greenLEDState != state) {
      debugPrintf("[LED] Green LED: %s", state ? "ON" : "OFF");
      greenLEDState = state;
    }
  }
}

void setup() {
  // Initialize serial communication
  if (ENABLE_DEBUG) {
    Serial.begin(SERIAL_BAUD);
    delay(2000); // Allow time for serial connection
    while (Serial.available()) Serial.read(); // Flush initial garbage
    Serial.write(12); // Form feed (clear screen if supported)
    Serial.println("\n\n--- ESP32 SECURITY SYSTEM ---");
  }

  debugPrint("[INIT] Initializing...");
  debugPrintf("[CONFIG] Serial: %d baud", SERIAL_BAUD);
  debugPrintf("[CONFIG] Red LED: GPIO %d", redLED);
  debugPrintf("[CONFIG] Green LED: GPIO %d", greenLED);
  debugPrintf("[CONFIG] Buzzer: GPIO %d (PWM Chan %d)", buzzerPin, BUZZER_CHANNEL);

  // Initialize pins
  pinMode(redLED, OUTPUT);
  pinMode(greenLED, OUTPUT);
  // Buzzer pin setup is handled by ledcAttachPin in playTone/stopTone

  debugPrint("[INIT] Setting initial state (Unauthorized/Waiting)");
  // Initial state: Red ON, Green OFF, Buzzer OFF (Default armed state)
  setLED(redLED, true);
  setLED(greenLED, false);
  stopTone(); // Ensure buzzer is off initially

  debugPrint("--- System Ready ---");
  debugPrint("Waiting for commands...");
  debugPrint("--------------------");
}

void loop() {
  // Check if there's data available to read
  if (Serial.available() > 0) {
    String commandStr = Serial.readStringUntil('\n');
    commandStr.trim();

    // Parse command and user
    int colonIndex = commandStr.indexOf(':');
    String command = colonIndex != -1 ? commandStr.substring(0, colonIndex) : commandStr;
    recognizedUser = colonIndex != -1 ? commandStr.substring(colonIndex + 1) : "";

    debugPrint("\n--------------------");
    debugPrintf("[COMMAND] Received: '%s'", commandStr.c_str());
    if (!recognizedUser.isEmpty()) {
      debugPrintf("[COMMAND] User: '%s'", recognizedUser.c_str());
    }

    // Process commands
    if (command == "VALID_FACE") {
      debugPrint("[PROCESS] Setting state to AUTHORIZED");
      handleValidFace();
    }
    else if (command == "INVALID_FACE") {
      debugPrint("[PROCESS] Setting state to UNAUTHORIZED/ALARM");
      handleInvalidFace();
    }
    else if (command == "RESET") {
      debugPrint("[PROCESS] Resetting state to UNAUTHORIZED/WAITING");
      resetSystem();
    }
    else {
      debugPrintf("[ERROR] Unknown command: '%s'", command.c_str());
    }
    debugPrint("--------------------");
  }

  // No background tasks needed in loop for this simplified logic
}

// Set system to AUTHORIZED state
void handleValidFace() {
  debugPrintf("[STATE] Authorized access for: %s", recognizedUser.c_str());
  setLED(greenLED, true);
  setLED(redLED, false);
  stopTone(); // Ensure buzzer is off
}

// Set system to UNAUTHORIZED/ALARM state
void handleInvalidFace() {
  debugPrint("[STATE] Unauthorized access detected. Sounding alarm.");
  setLED(redLED, true);
  setLED(greenLED, false);
  playTone(buzzerPin, BUZZER_ALARM_FREQ); // Play continuous alarm tone
}

// Reset system to default UNAUTHORIZED/WAITING state
void resetSystem() {
  debugPrint("[STATE] System reset. Returning to waiting state.");
  setLED(redLED, true); // Default state is armed/waiting (Red ON)
  setLED(greenLED, false);
  stopTone();
  recognizedUser = "";

  // Optional short confirmation beep
  playTone(buzzerPin, 800, 100); // Short beep
}
// Removed test functions (testAlarm, testValidAccess, testInvalidAccess) 