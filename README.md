# Arduino Security System with Face Recognition

An Arduino-based security system using TensorFlow.js for face recognition, controlled via a React web interface.

## Components

- **Hardware:** Arduino Uno (or similar), Red LED (Pin 9), Green LED (Pin 10), Buzzer (Pin 8)
- **Backend:** Node.js/Express, TensorFlow.js, SerialPort, Socket.io
- **Frontend:** React, WebRTC (camera access), TensorFlow.js

## Setup

### 1. Arduino

- Connect components: Red LED -> Pin 9, Green LED -> Pin 10, Buzzer -> Pin 8 (use resistors).
- Open `arduino/security_system.ino` in Arduino IDE.
- Select your board/port and upload the sketch.

### 2. Face Recognition Model (NOTE: you must import your own Teachable Machine model. Facial recognition is reliant upon your own model being imported with metadata.json, model.json, and weights.bin)

- Go to [Teachable Machine](https://teachablemachine.withgoogle.com/train/image).
- Create "authorized" and "unauthorized" classes.
- Train with your face ("authorized") and other images ("unauthorized").
- Export the model (TensorFlow.js format).
- Save the downloaded model files into the `backend/model/` directory.

### 3. Backend

```bash
cd backend
npm install
npm run dev
```

### 4. Frontend

```bash
cd frontend
npm install
npm start
```
- Open `http://localhost:3000` in your browser.

## How to Use

1.  The system should connect to the Arduino automatically if detected.
2.  Click "Start Recognition" on the web interface.
3.  **Authorized face detected:** Green LED lights up.
4.  **Unauthorized face detected:** Red LED flashes, buzzer sounds.
5.  Use the control panel for manual tests or system reset.

## Troubleshooting Tips

- **Arduino Connection:** Check the backend console output for the correct serial port.
- **Recognition Accuracy:** Ensure good lighting and a well-trained model (diverse images).
- **Web Issues:** Check the browser's JavaScript console for errors.

## License

MIT License