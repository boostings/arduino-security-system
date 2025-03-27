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
      sendToArduino(data.command);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Initialize Arduino connection
function initializeArduino() {
  // List available ports
  SerialPort.list().then(ports => {
    console.log('Available ports:', ports);
    
    // Find Arduino port (usually contains 'Arduino' or 'CH340' in the description)
    const arduinoPortInfo = ports.find(port => 
      port.manufacturer?.toLowerCase().includes('arduino') ||
      port.manufacturer?.toLowerCase().includes('ch340')
    );

    if (arduinoPortInfo) {
      console.log('Found Arduino on port:', arduinoPortInfo.path);
      
      // Create new SerialPort instance
      arduinoPort = new SerialPort({
        path: arduinoPortInfo.path,
        baudRate: 9600
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
        console.log('Arduino connected');
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
    } else {
      console.log('No Arduino found');
      io.emit('arduinoStatus', { connected: false, error: 'No Arduino found' });
    }
  }).catch(err => {
    console.error('Error listing ports:', err);
    io.emit('arduinoStatus', { connected: false, error: err.message });
  });
}

// Send command to Arduino
function sendToArduino(command) {
  if (arduinoPort && isArduinoConnected) {
    arduinoPort.write(command + '\n', (err) => {
      if (err) {
        console.error('Error sending command to Arduino:', err);
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