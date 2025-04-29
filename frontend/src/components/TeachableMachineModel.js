import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as tmImage from '@teachablemachine/image';
import '../styles/PredictionMeter.css';

const TeachableMachineModel = ({ onPrediction, onModelLoad }) => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const modelRef = useRef(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [currentPrediction, setCurrentPrediction] = useState(null);
  const streamRef = useRef(null);
  const [error, setError] = useState(null);
  const hasInitialized = useRef(false);
  const [statusMessages, setStatusMessages] = useState([]);
  const isComponentMounted = useRef(true);
  const animationFrameRef = useRef(null);
  const cameraResetAttemptsRef = useRef(0);
  const lastCameraResetTimeRef = useRef(0);
  const isMacOS = /Mac/.test(navigator.platform);
  const loopFuncRef = useRef(null);
  const startWebcamFuncRef = useRef(null);
  // Updated labels from metadata
  const modelLabels = ['Jimmy', 'Jackson', 'Sofia', 'Chris', 'Blank Wall/Unknown Person'];
  // List of authorized individuals
  const authorizedUsers = ['Jimmy', 'Jackson', 'Sofia', 'Chris'];

  // Add a log message to display in the UI
  const addStatusMessage = useCallback((message, type = 'info') => {
    console.log(`[${type}] ${message}`);
    if (isComponentMounted.current) {
      setStatusMessages(prev => [...prev, { message, type, time: new Date().toLocaleTimeString() }]);
    }
  }, []);

  const predict = useCallback(async () => {
    if (!modelRef.current || !webcamRef.current) return;
    
    try {
      const prediction = await modelRef.current.predict(webcamRef.current.canvas);
      if (!prediction || !prediction.length) {
        console.log("No prediction results returned");
        return;
      }
      
      const maxPrediction = prediction.reduce((prev, current) => 
        (prev.probability > current.probability) ? prev : current
      );

      if (isComponentMounted.current) {
        setCurrentPrediction(maxPrediction);

        if (maxPrediction.probability > 0.8) {
          onPrediction(maxPrediction);
        }
      }
    } catch (error) {
      console.error("Prediction error:", error);
      addStatusMessage(`Prediction error: ${error.message}`, 'error');
    }
  }, [onPrediction, addStatusMessage]);

  const updateCanvas = useCallback(() => {
    if (!webcamRef.current || !canvasRef.current) return;
    
    try {
      const ctx = canvasRef.current.getContext('2d');
      ctx.drawImage(webcamRef.current.canvas, 0, 0, canvasRef.current.width, canvasRef.current.height);
    } catch (error) {
      console.error("Canvas update error:", error);
      addStatusMessage(`Canvas update error: ${error.message}`, 'error');
    }
  }, [addStatusMessage]);

  const loop = useCallback(() => {
    if (!isComponentMounted.current) return;
    
    // Cancel any existing animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    const runLoop = async () => {
      if (!isWebcamActive || !modelRef.current || !webcamRef.current) return;
      
      try {
        webcamRef.current.update();
        updateCanvas();
        await predict();
      } catch (error) {
        console.error("Loop error:", error);
        addStatusMessage(`Loop error: ${error.message}`, 'error');
        
        // Check if we need to reset the camera
        const currentTime = Date.now();
        if (currentTime - lastCameraResetTimeRef.current > 10000) { // At least 10 seconds between resets
          if (startWebcamFuncRef.current) {
            startWebcamFuncRef.current();
            lastCameraResetTimeRef.current = currentTime;
          }
        }
      }
      
      if (isComponentMounted.current && isWebcamActive) {
        animationFrameRef.current = requestAnimationFrame(runLoop);
      }
    };
    
    // Start the loop
    animationFrameRef.current = requestAnimationFrame(runLoop);
    
    // Return cleanup function
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isWebcamActive, predict, updateCanvas, addStatusMessage]);

  // Store loop in ref
  useEffect(() => {
    loopFuncRef.current = loop;
  }, [loop]);

  // Try to open webcam with the given index
  const tryOpenWebcam = useCallback(async (index) => {
    if (!isComponentMounted.current) return null;
    
    addStatusMessage(`Trying camera at index ${index}...`);
    
    try {
      const constraints = {
        video: {
          width: 640,
          height: 480,
          deviceId: index === 'default' ? undefined : { exact: index },
          facingMode: 'user'
        },
        audio: false
      };
      
      // For macOS, reduce complexity of constraints for first attempt
      if (isMacOS && index === 'default') {
        constraints.video = { facingMode: 'user' };
      }
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (!isComponentMounted.current) {
        stream.getTracks().forEach(track => track.stop());
        return null;
      }
      
      addStatusMessage(`Camera ${index} opened successfully`, 'success');
      return stream;
    } catch (error) {
      console.error(`Error opening camera ${index}:`, error.message);
      addStatusMessage(`Camera ${index} failed: ${error.message}`, 'error');
      return null;
    }
  }, [addStatusMessage, isMacOS]);

  // Try all available devices
  const tryAllDevices = useCallback(async () => {
    if (!isComponentMounted.current) return null;
    
    try {
      addStatusMessage('Enumerating all video devices...');
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      addStatusMessage(`Found ${videoDevices.length} video devices`);
      
      // First try the default camera
      let stream = await tryOpenWebcam('default');
      if (stream) return stream;
      
      // Then try each device specifically
      for (const device of videoDevices) {
        addStatusMessage(`Trying device: ${device.label || device.deviceId}`);
        stream = await tryOpenWebcam(device.deviceId);
        if (stream) return stream;
      }
      
      // If all specific devices fail, try indices 0, 1, 2
      for (let i = 0; i < 3; i++) {
        if (!videoDevices.some(d => d.deviceId === `${i}`)) {
          stream = await tryOpenWebcam(i);
          if (stream) return stream;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error during device enumeration:', error);
      addStatusMessage(`Device enumeration error: ${error.message}`, 'error');
      
      // Fallback: try indices 0 and 1 without enumeration
      for (let i = 0; i < 2; i++) {
        const stream = await tryOpenWebcam(i);
        if (stream) return stream;
      }
      
      return null;
    }
  }, [tryOpenWebcam, addStatusMessage]);

  const startWebcam = useCallback(async () => {
    if (!isComponentMounted.current) return;
    
    try {
      addStatusMessage('Starting webcam initialization');
      setError(null);
      
      // Increment reset counter
      cameraResetAttemptsRef.current++;
      
      // Try to get a stream from any available camera
      const stream = await tryAllDevices();
      
      if (!stream) {
        throw new Error('Failed to open any camera. Please check permissions and try again.');
      }
      
      if (!isComponentMounted.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      
      addStatusMessage('Got media stream, creating video element', 'success');
      
      // Create a video element
      const videoEl = document.createElement('video');
      videoEl.id = 'webcam-' + Date.now(); // Add unique ID for debugging
      videoEl.width = 640;
      videoEl.height = 480;
      videoEl.autoplay = true;
      videoEl.playsInline = true;
      videoEl.muted = true;
      
      // Set srcObject only after all properties are set
      videoEl.srcObject = stream;
      
      // Wait for video to be ready
      addStatusMessage('Waiting for video metadata to load');
      await new Promise((resolve, reject) => {
        videoEl.onloadedmetadata = () => {
          resolve();
        };
        videoEl.onerror = (err) => {
          reject(new Error(`Video element error: ${err}`));
        };
        
        // Safety timeout
        setTimeout(() => {
          if (videoEl.readyState === 0) {
            reject(new Error('Video metadata load timeout'));
          }
        }, 5000);
      });
      
      if (!isComponentMounted.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      
      addStatusMessage('Starting video playback');
      try {
        await videoEl.play();
      } catch (playError) {
        throw new Error(`Failed to play video: ${playError.message}`);
      }
      
      if (!isComponentMounted.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      
      // Verify video is actually playing
      if (videoEl.paused) {
        throw new Error('Video element is paused after play() call');
      }
      
      addStatusMessage('Video playback started', 'success');
      
      // Create a canvas element
      addStatusMessage('Creating canvas for prediction');
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      
      // Create webcam object manually
      webcamRef.current = {
        canvas,
        webcamElement: videoEl,
        update: () => {
          try {
            if (videoEl.readyState === videoEl.HAVE_ENOUGH_DATA) {
              const ctx = canvas.getContext('2d');
              ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
            }
          } catch (err) {
            console.error('Error updating canvas from video:', err);
          }
        }
      };
      
      // Reset the camera reset counter
      cameraResetAttemptsRef.current = 0;
      
      streamRef.current = stream;
      setIsWebcamActive(true);
      setError(null);
      
      // Start the prediction loop
      addStatusMessage('Starting prediction loop...', 'success');
      
      // Start loop with a small delay to ensure state has updated
      setTimeout(() => {
        if (isComponentMounted.current && loopFuncRef.current) {
          loopFuncRef.current();
        }
      }, 100);
    } catch (error) {
      console.error('Detailed error starting webcam:', error);
      addStatusMessage(`Camera error: ${error.message}`, 'error');
      setError(`Failed to start camera: ${error.message}. Please ensure camera permissions are granted.`);
      setIsWebcamActive(false);
      
      // If we've tried too many times in quick succession, wait longer before trying again
      if (cameraResetAttemptsRef.current > 3) {
        addStatusMessage('Too many failed attempts. Will try again in 10 seconds...', 'warning');
        setTimeout(() => {
          if (isComponentMounted.current) {
            console.log("Starting webcam again");
            startWebcam();
          }
        }, 10000);
      }
    }
  }, [addStatusMessage, tryAllDevices]);

  // Store startWebcam in ref for use in loop to avoid circular dependency
  useEffect(() => {
    startWebcamFuncRef.current = startWebcam;
  }, [startWebcam]);

  // eslint-disable-next-line no-unused-vars
  const stopWebcam = useCallback(() => {
    // This function is not currently used in the component but is 
    // kept for future use and maintainability (e.g., clean shutdown)
    addStatusMessage('Stopping webcam');
    
    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => track.stop());
        webcamRef.current = null;
        streamRef.current = null;
        setIsWebcamActive(false);
      } catch (error) {
        console.error('Error stopping webcam:', error);
        addStatusMessage(`Error stopping webcam: ${error.message}`, 'error');
      }
    }
  }, [addStatusMessage]);

  const loadModel = useCallback(async () => {
    // Prevent multiple loads
    if (isModelLoading || isModelLoaded || hasInitialized.current || !isComponentMounted.current) {
      return;
    }
    
    try {
      setIsModelLoading(true);
      hasInitialized.current = true;
      
      const modelURL = "/trainedModel/tm-my-image-model/model.json";
      const metadataURL = "/trainedModel/tm-my-image-model/metadata.json";
      
      addStatusMessage(`Loading model from: ${modelURL}`);
      const loadedModel = await tmImage.load(modelURL, metadataURL);
      addStatusMessage('Model loaded successfully', 'success');
      
      if (!isComponentMounted.current) return;
      
      modelRef.current = loadedModel;
      setIsModelLoaded(true);
      setIsModelLoading(false);
      onModelLoad(true);
      
      // Automatically start webcam when model is loaded
      startWebcam();
    } catch (error) {
      console.error('Error loading model:', error);
      addStatusMessage(`Model loading error: ${error.message}`, 'error');
      if (isComponentMounted.current) {
        setIsModelLoading(false);
        onModelLoad(false);
        setError(`Failed to load model: ${error.message}. Please check network connection and refresh.`);
      }
    }
  }, [onModelLoad, startWebcam, isModelLoaded, isModelLoading, addStatusMessage]);

  // Main initialization effect
  useEffect(() => {
    isComponentMounted.current = true;
    
    // Log platform detection
    if (isMacOS) {
      addStatusMessage('Detected macOS platform, using optimized camera initialization', 'info');
    }
    
    if (!hasInitialized.current) {
      loadModel();
    }
    
    // Cleanup function that runs when component unmounts
    return () => {
      isComponentMounted.current = false;
      
      // Cancel animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [loadModel, addStatusMessage, isMacOS]);

  return (
    <div className="teachable-machine-container">
      <h2>Face Recognition System</h2>
      
      <div className="recognition-interface">
        <div className="webcam-section">
          {isWebcamActive && webcamRef.current ? (
            <div className="webcam-wrapper">
              <div 
                className="webcam-element" 
                ref={(el) => {
                  if (el && webcamRef.current?.webcamElement && !el.hasChildNodes()) {
                    try {
                      el.appendChild(webcamRef.current.webcamElement);
                    } catch (error) {
                      console.error('Error appending video element:', error);
                    }
                  }
                }}
              />
              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                className="prediction-canvas"
              />
            </div>
          ) : (
            <div className="camera-placeholder">
              <div className="camera-icon">📷</div>
              <p className="status-message">{error || (isModelLoading ? 'Loading model...' : 'Initializing camera...')}</p>
              
              <div className="status-log">
                <h3>Initialization Log:</h3>
                <div className="status-messages">
                  {statusMessages.length > 0 ? (
                    statusMessages.map((msg, index) => (
                      <div key={index} className={`status-message status-${msg.type}`}>
                        <span className="status-time">[{msg.time}]</span> {msg.message}
                      </div>
                    ))
                  ) : (
                    <div className="status-message">Waiting for initialization...</div>
                  )}
                </div>
              </div>
              
              <button 
                className="start-button" 
                style={{marginTop: '20px'}}
                onClick={() => {
                  hasInitialized.current = false;
                  setStatusMessages([]);
                  loadModel();
                }}
              >
                Reinitialize Camera
              </button>
            </div>
          )}
        </div>
        
        {/* Put the prediction meter side-by-side with camera */}
        <div className="prediction-meter">
          <div className="meter-header">
            <span className="meter-title">Recognition Results</span>
            {isWebcamActive && (
              <span className="connection-status active">Camera Active</span>
            )}
          </div>
          
          <div className="meter-bar">
            <div 
              className={`meter-fill ${currentPrediction?.className || ''}`}
              style={{ 
                width: currentPrediction ? `${currentPrediction.probability * 100}%` : '0%',
                backgroundColor: authorizedUsers.includes(currentPrediction?.className) ? '#4CAF50' : '#F44336'
              }}
            />
          </div>
          
          {currentPrediction && (
            <div className="prediction-results">
              <div className="prediction-text primary">
                <span className="prediction-label">Face Recognition:</span> 
                <span className={`prediction-value ${authorizedUsers.includes(currentPrediction.className) ? 'valid' : 'invalid'}`}>
                  {authorizedUsers.includes(currentPrediction.className) 
                    ? `Valid Person (${currentPrediction.className})` 
                    : 'Unauthorized Person'}
                </span>
              </div>
              
              <div className="prediction-text">
                <span className="prediction-label">Confidence:</span> 
                <span className="prediction-value">{(currentPrediction.probability * 100).toFixed(2)}%</span>
              </div>
              
              {/* Display all available predictions/labels from updated list */}
              <div className="all-predictions">
                <h4>All Predictions:</h4>
                {modelLabels.map((label) => {
                  // Find this label in the current prediction
                  let probability = 0;
                  
                  if (currentPrediction) {
                    if (currentPrediction.className === label) {
                      probability = currentPrediction.probability;
                    } else if (Array.isArray(currentPrediction)) {
                      const found = currentPrediction.find(p => p.className === label);
                      if (found) probability = found.probability;
                    }
                  }
                  
                  return (
                    <div key={label} className="label-prediction">
                      <span className="label-name">{label}:</span>
                      <div className="label-bar-container">
                        <div 
                          className="label-bar" 
                          style={{
                            width: `${probability * 100}%`,
                            backgroundColor: authorizedUsers.includes(label) ? '#4CAF50' : '#F44336'
                          }}
                        />
                      </div>
                      <span className="label-percentage">{(probability * 100).toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
              
              <div className="face-status">
                {currentPrediction.probability > 0.8 ? (
                  authorizedUsers.includes(currentPrediction.className) ? (
                    <div className="status valid-face">✅ Authorized User: {currentPrediction.className}</div>
                  ) : (
                    <div className="status invalid-face">❌ Unauthorized Person Detected</div>
                  )
                ) : (
                  <div className="status uncertain">⚠️ Low Confidence Detection</div>
                )}
              </div>
            </div>
          )}
          
          {!currentPrediction && (
            <div className="no-prediction-message">
              <p>Waiting for face detection...</p>
              <div className="loading-spinner"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeachableMachineModel;