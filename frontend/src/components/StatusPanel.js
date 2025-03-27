import React from 'react';

const StatusPanel = ({ status }) => {
  const { modelLoaded, arduinoConnected, activeConnections } = status;
  
  return (
    <div className="container">
      <h2>System Status</h2>
      <div className="status">
        <div className="status-item">
          <div className={`status-indicator ${modelLoaded ? 'status-connected' : 'status-disconnected'}`}></div>
          <span>Face Recognition Model: {modelLoaded ? 'Loaded' : 'Not Loaded'}</span>
        </div>
        
        <div className="status-item">
          <div className={`status-indicator ${arduinoConnected ? 'status-connected' : 'status-disconnected'}`}></div>
          <span>Arduino: {arduinoConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
        
        <div className="status-item">
          <div className={`status-indicator ${activeConnections > 0 ? 'status-connected' : 'status-disconnected'}`}></div>
          <span>Active Connections: {activeConnections}</span>
        </div>
      </div>
    </div>
  );
};

export default StatusPanel;