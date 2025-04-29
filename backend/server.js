const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const path = require('path');

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the trainedModel directory
app.use('/trainedModel', express.static(path.join(__dirname, '../trainedModel')));

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Arduino connection
let arduinoPort = null;
let isArduinoConnected = false;
let lastCommandTime = 0;
let lastCommand = '';
const COMMAND_COOLDOWN = 2000; // 2 seconds between same commands

// API endpoints
app.get('/api/status', (req, res) => {
  res.json({
    modelLoaded: true, // Since we're using Teachable Machine in frontend
    arduinoConnected: isArduinoConnected,
    activeConnections: io.engine.clientsCount
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected');
  
  // Send initial status
  socket.emit('status', {
    modelLoaded: true, // Since we're using Teachable Machine in frontend
    arduinoConnected: isArduinoConnected,
    activeConnections: io.engine.clientsCount
  });

  // Handle commands from client
  socket.on('command', (data) => {
    if (data.command) {
      sendToArduino(data.command, data.user);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Initialize Arduino connection
function initializeArduino() {
  // List available ports for logging purposes
  SerialPort.list().then(ports => {
    console.log('Available ports:', ports);
    
    // Use specified port for your Arduino
    const arduinoPath = '/dev/tty.usbserial-10';
    console.log('Attempting to connect to Arduino on port:', arduinoPath);
    
    // Create new SerialPort instance
    arduinoPort = new SerialPort({
      path: arduinoPath,
      baudRate: 115200
    });

    // Create parser
    const parser = arduinoPort.pipe(new ReadlineParser({ delimiter: '\n' }));

    // Handle data from Arduino
    parser.on('data', (data) => {
      console.log('Arduino:', data);
      io.emit('arduinoData', { message: data });
    });

    // Handle Arduino connection
    arduinoPort.on('open', () => {
      console.log('Arduino connected successfully');
      isArduinoConnected = true;
      io.emit('arduinoStatus', { connected: true });
    });

    // Handle Arduino disconnection
    arduinoPort.on('close', () => {
      console.log('Arduino disconnected');
      isArduinoConnected = false;
      io.emit('arduinoStatus', { connected: false });
    });

    // Handle errors
    arduinoPort.on('error', (err) => {
      console.error('Arduino error:', err);
      isArduinoConnected = false;
      io.emit('arduinoStatus', { connected: false, error: err.message });
    });
  }).catch(err => {
    console.error('Error listing ports:', err);
    io.emit('arduinoStatus', { connected: false, error: err.message });
  });
}

// Send command to Arduino
function sendToArduino(command, user) {
  if (arduinoPort && isArduinoConnected) {
    // If the command includes user information, add it to the command string
    const commandToSend = user ? `${command}:${user}` : command;
    const currentTime = Date.now();
    
    // Debounce same commands to prevent flooding the Arduino
    if (commandToSend === lastCommand && currentTime - lastCommandTime < COMMAND_COOLDOWN) {
      console.log(`Command "${commandToSend}" ignored (sent too recently)`);
      return;
    }
    
    console.log(`Sending command to Arduino: ${commandToSend}`);
    arduinoPort.write(commandToSend + '\n', (err) => {
      if (err) {
        console.error('Error sending command to Arduino:', err);
      } else {
        // Update last command info
        lastCommand = commandToSend;
        lastCommandTime = currentTime;
      }
    });
  } else {
    console.log('Arduino not connected');
  }
}

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initializeArduino();
});