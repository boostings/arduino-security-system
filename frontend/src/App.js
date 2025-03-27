import React, { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';

// Components
import StatusPanel from './components/StatusPanel';
import ControlPanel from './components/ControlPanel';
import LogPanel from './components/LogPanel';
import TeachableMachineModel from './components/TeachableMachineModel';

function App() {
  // State
  const [socket, setSocket] = useState(null);
  const [status, setStatus] = useState({
    modelLoaded: false,
    arduinoConnected: false,
    activeConnections: 0
  });
  const [logs, setLogs] = useState([]);
  
  // Add log entry
  const addLog = useCallback((message, type = 'info') => {
    setLogs(prevLogs => [
      ...prevLogs,
      {
        message,
        type,
        timestamp: new Date()
      }
    ]);
  }, []);
  
  // Handle Teachable Machine model load
  const handleModelLoad = useCallback((isLoaded) => {
    setStatus(prev => ({
      ...prev,
      modelLoaded: isLoaded
    }));
    addLog(`Face recognition model ${isLoaded ? 'loaded successfully' : 'failed to load'}`, isLoaded ? 'success' : 'error');
  }, [addLog]);
  
  // Handle Teachable Machine predictions
  const handlePrediction = useCallback((prediction) => {
    if (socket) {
      // Assuming your model has classes "valid" and "invalid"
      if (prediction.className === "valid" && prediction.probability > 0.8) {
        socket.emit('command', { command: 'VALID_FACE' });
        addLog(`Valid face detected with confidence: ${(prediction.probability * 100).toFixed(2)}%`, 'success');
      } else if (prediction.className === "invalid" && prediction.probability > 0.8) {
        socket.emit('command', { command: 'INVALID_FACE' });
        addLog(`Invalid face detected with confidence: ${(prediction.probability * 100).toFixed(2)}%`, 'error');
      }
    }
  }, [socket, addLog]);

  // Fetch system status from API
  const fetchStatus = useCallback(async () => {
    try {
      const response = await axios.get('/api/status');
      setStatus(prev => ({
        ...prev,
        arduinoConnected: response.data.arduinoConnected,
        activeConnections: response.data.activeConnections
      }));
    } catch (error) {
      console.error('Error fetching status:', error);
      addLog(`Error fetching system status: ${error.message}`, 'error');
    }
  }, [addLog]);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io('http://localhost:3001', {
      transports: ['websocket']
    });
    
    // Socket event handlers
    newSocket.on('connect', () => {
      addLog('Connected to server', 'success');
    });
    
    newSocket.on('disconnect', () => {
      addLog('Disconnected from server', 'error');
      setStatus(prev => ({
        ...prev,
        arduinoConnected: false
      }));
    });
    
    newSocket.on('status', (data) => {
      setStatus(prev => ({
        ...prev,
        arduinoConnected: data.arduinoConnected,
        activeConnections: data.activeConnections
      }));
      addLog(`Status update: Arduino ${data.arduinoConnected ? 'connected' : 'disconnected'}`, 'info');
    });
    
    newSocket.on('arduinoStatus', (data) => {
      setStatus(prev => ({
        ...prev,
        arduinoConnected: data.connected
      }));
      
      if (data.connected) {
        addLog('Arduino connected', 'success');
      } else {
        const errorMsg = data.error ? `: ${data.error}` : '';
        addLog(`Arduino disconnected${errorMsg}`, 'error');
      }
    });
    
    newSocket.on('arduinoData', (data) => {
      addLog(`Arduino: ${data.message}`, 'info');
    });
    
    // Save socket to state
    setSocket(newSocket);
    
    // Fetch initial system status
    fetchStatus();
    
    // Initial logs
    addLog('System initialized', 'info');
    addLog('Waiting for camera permissions...', 'info');
    
    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
    };
  }, [addLog, fetchStatus]);
  
  return (
    <div className="app">
      <header>
        <h1>Arduino Security System</h1>
      </header>
      
      <StatusPanel status={status} />
      
      <TeachableMachineModel 
        onPrediction={handlePrediction} 
        onModelLoad={handleModelLoad}
      />
      
      <ControlPanel socket={socket} addLog={addLog} />
      
      <LogPanel logs={logs} />
    </div>
  );
}

export default App;