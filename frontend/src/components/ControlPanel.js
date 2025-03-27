import React, { useState } from 'react';

const ControlPanel = ({ socket, addLog }) => {
  const [systemArmed, setSystemArmed] = useState(true);
  
  const sendCommand = (command) => {
    if (socket) {
      socket.emit('command', { command });
      addLog(`Sent command: ${command}`, 'info');
      
      if (command === 'ARM_SYSTEM') {
        setSystemArmed(true);
      } else if (command === 'DISARM_SYSTEM') {
        setSystemArmed(false);
      }
    } else {
      addLog('Socket not connected, cannot send command', 'error');
    }
  };
  
  return (
    <div className="container">
      <h2>Security Control Panel</h2>
      
      <div className="system-status-indicator">
        <div className={`status-circle ${systemArmed ? 'armed' : 'disarmed'}`}></div>
        <span>System is currently: <strong>{systemArmed ? 'ARMED' : 'DISARMED'}</strong></span>
      </div>
      
      <div className="controls-group">
        <h3>System Controls</h3>
        <div className="controls">
          <button 
            className={`arm-button ${systemArmed ? 'active' : ''}`}
            onClick={() => sendCommand('ARM_SYSTEM')}
            disabled={systemArmed}
          >
            <span className="icon">🔒</span> Arm System
          </button>
          <button 
            className={`disarm-button ${!systemArmed ? 'active' : ''}`}
            onClick={() => sendCommand('DISARM_SYSTEM')}
            disabled={!systemArmed}
          >
            <span className="icon">🔓</span> Disarm System
          </button>
          <button 
            className="reset-button"
            onClick={() => sendCommand('RESET')}
          >
            <span className="icon">🔄</span> Reset System
          </button>
        </div>
      </div>
      
      <div className="controls-group">
        <h3>Test Functions</h3>
        <div className="controls">
          <button 
            className="test-button"
            onClick={() => sendCommand('TEST_ALARM')}
          >
            <span className="icon">🔔</span> Test Alarm
          </button>
          <button 
            className="test-button"
            onClick={() => sendCommand('TEST_VALID')}
          >
            <span className="icon">✅</span> Test Valid Access
          </button>
          <button 
            className="test-button"
            onClick={() => sendCommand('TEST_INVALID')}
          >
            <span className="icon">❌</span> Test Invalid Access
          </button>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;