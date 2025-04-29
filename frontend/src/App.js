import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  
  // Ref to track the last command sent and its timeout
  const lastCommandRef = useRef({ command: null, user: null, timeoutId: null });
  const commandCooldownMs = 5000; // Only send the same command every 5 seconds
  
  // List of authorized individuals (wrapped in useMemo to prevent recreation on every render)
  const authorizedUsers = useMemo(() => ['Jimmy', 'Jackson', 'Sofia', 'Chris'], []);
  
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
    if (!socket || prediction.probability <= 0.8) {
      // If socket is not ready or confidence is too low, do nothing
      return;
    }
  
    let commandToSend = null;
    let userToSend = null;
    let logMessage = null;
    let logType = 'info';
  
    // Determine command based on prediction
    if (authorizedUsers.includes(prediction.className)) {
      commandToSend = 'VALID_FACE';
      userToSend = prediction.className;
      logMessage = `Authorized user detected: ${prediction.className} with confidence: ${(prediction.probability * 100).toFixed(2)}%`;
      logType = 'success';
    } else {
      commandToSend = 'INVALID_FACE';
      logMessage = `Unauthorized person detected with confidence: ${(prediction.probability * 100).toFixed(2)}%`;
      logType = 'error';
    }
  
    // Check if the command is different from the last one or if cooldown expired
    const now = Date.now();
    const lastCommand = lastCommandRef.current;
  
    // Clear any existing timeout if the command changes
    if (lastCommand.timeoutId && (lastCommand.command !== commandToSend || lastCommand.user !== userToSend)) {
      clearTimeout(lastCommand.timeoutId);
      lastCommandRef.current.timeoutId = null;
    }
  
    // Send command only if it's different or cooldown passed, and no timeout is pending
    if ((lastCommand.command !== commandToSend || lastCommand.user !== userToSend || !lastCommand.timeoutId)) {
      
      // Send the command
      socket.emit('command', { command: commandToSend, user: userToSend });
      addLog(logMessage, logType);
  
      // Set a timeout to prevent sending the same command again too soon
      const timeoutId = setTimeout(() => {
          lastCommandRef.current.timeoutId = null; // Clear timeoutId when it expires
      }, commandCooldownMs);
      
      // Update the ref with the latest command and timeout
      lastCommandRef.current = { command: commandToSend, user: userToSend, timeoutId: timeoutId };
    }
  
  }, [socket, addLog, authorizedUsers, commandCooldownMs]);

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