import React, { useRef, useEffect, useState } from 'react';

const LogPanel = ({ logs }) => {
  const logContainerRef = useRef(null);
  const [filter, setFilter] = useState('all');
  
  // Auto-scroll to bottom when logs update
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);
  
  // Filter logs based on selected type
  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.type === filter;
  });
  
  // Get counts by type
  const counts = logs.reduce((acc, log) => {
    acc[log.type] = (acc[log.type] || 0) + 1;
    return acc;
  }, {});
  
  return (
    <div className="container log-panel">
      <div className="log-header">
        <h2>System Logs</h2>
        <div className="log-filters">
          <button 
            className={`log-filter ${filter === 'all' ? 'active' : ''}`} 
            onClick={() => setFilter('all')}
          >
            All ({logs.length})
          </button>
          <button 
            className={`log-filter ${filter === 'info' ? 'active' : ''}`} 
            onClick={() => setFilter('info')}
          >
            Info ({counts.info || 0})
          </button>
          <button 
            className={`log-filter ${filter === 'success' ? 'active' : ''}`} 
            onClick={() => setFilter('success')}
          >
            Success ({counts.success || 0})
          </button>
          <button 
            className={`log-filter ${filter === 'error' ? 'active' : ''}`} 
            onClick={() => setFilter('error')}
          >
            Error ({counts.error || 0})
          </button>
        </div>
      </div>
      
      <div className="log-container" ref={logContainerRef}>
        {filteredLogs.length > 0 ? (
          filteredLogs.map((log, index) => (
            <div key={index} className={`log-entry log-${log.type}`}>
              <span className="log-time">[{new Date(log.timestamp).toLocaleTimeString()}] </span>
              <span className="log-message">{log.message}</span>
            </div>
          ))
        ) : (
          <div className="no-logs">
            <p>No logs to display</p>
          </div>
        )}
      </div>
      
      <div className="log-footer">
        <button 
          className="clear-logs-button" 
          onClick={() => logContainerRef.current.scrollTop = 0}
        >
          Scroll to Top
        </button>
        <span className="log-count">
          Showing {filteredLogs.length} of {logs.length} logs
        </span>
      </div>
    </div>
  );
};

export default LogPanel;