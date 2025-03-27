# Arduino Security System with Face Recognition

A security system that uses TensorFlow.js for face recognition, Arduino for hardware control, and a React-based web interface.

## Features

- Real-time face detection and tracking
- Face recognition using TensorFlow.js and Teachable Machine models
- Arduino-controlled LED indicators and sound feedback
- Web-based interface for monitoring and control
- Socket.io for real-time communication between components

## System Components

### Arduino Hardware

- Arduino board (Uno or similar)
- Red and Green LEDs for status indication
- Buzzer for sound alerts
- Connecting wires and resistors

### Backend Server

- Node.js Express server
- TensorFlow.js for face recognition
- SerialPort for Arduino communication
- Socket.io for real-time client updates

### Frontend Interface

- React.js web application
- WebRTC for camera access
- TensorFlow.js for face detection
- Real-time status monitoring
- Control panel for system operation

## Setup Instructions

### Arduino Setup

1. Connect the hardware components:
   - Connect Red LED to pin 9
   - Connect Green LED to pin 10
   - Connect Buzzer to pin 8
   - Use appropriate resistors for LEDs

2. Upload the Arduino code:
   - Open the `arduino/security_system.ino` file in Arduino IDE
   - Select your Arduino board and port
   - Upload the sketch

### Training Your Face Recognition Model

1. Visit [Teachable Machine](https://teachablemachine.withgoogle.com/train/image)
2. Create two classes: "authorized" and "unauthorized"
3. Train the model with your face images (authorized) and other images (unauthorized)
4. Export the model as a TensorFlow.js web model
5. Download and extract the model files to `backend/model/` directory

### Backend Setup

1. Install dependencies:
   ```
   cd backend
   npm install
   ```

2. Start the server:
   ```
   npm run dev
   ```

### Frontend Setup

1. Install dependencies:
   ```
   cd frontend
   npm install
   ```

2. Start the development server:
   ```
   npm start
   ```

3. Open your browser to http://localhost:3000

## Usage

1. The system automatically connects to the Arduino when available
2. Use the "Start Recognition" button to begin face detection and recognition
3. When a trained face is detected:
   - The system classifies it as authorized or unauthorized
   - The Arduino will light up green for authorized faces
   - The Arduino will flash red and sound an alarm for unauthorized faces
4. The control panel allows for manual testing and system reset

## Troubleshooting

- If Arduino doesn't connect, check the port in the console output
- Face recognition requires good lighting conditions
- Ensure your model is properly trained with varied samples
- Check JavaScript console for any errors in the web interface

## License

MIT License