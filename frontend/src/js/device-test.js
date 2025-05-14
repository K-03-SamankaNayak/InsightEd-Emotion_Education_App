/**
 * Device Test Utility
 * Simple utility to test camera and microphone access
 */

// Create the test UI when the document is ready
document.addEventListener('DOMContentLoaded', () => {
    // Add test button to the header
    const header = document.querySelector('.header');
    if (header) {
        const testButton = document.createElement('button');
        testButton.id = 'test-devices-btn';
        testButton.className = 'btn btn-outline btn-sm';
        testButton.innerHTML = '<i class="fas fa-camera"></i> Test Devices';
        testButton.style.marginLeft = 'auto';
        testButton.style.marginRight = '10px';
        
        // Insert before user profile or auth buttons
        const profileDiv = document.getElementById('user-profile');
        const authButtons = document.getElementById('auth-section');
        if (profileDiv) {
            header.insertBefore(testButton, profileDiv);
        } else if (authButtons) {
            header.insertBefore(testButton, authButtons);
        } else {
            header.appendChild(testButton);
        }
        
        // Add click event
        testButton.addEventListener('click', showDeviceTestDialog);
    }
});

/**
 * Show device test dialog
 */
function showDeviceTestDialog() {
    // Create dialog
    const dialog = document.createElement('div');
    dialog.className = 'media-test-dialog';
    dialog.innerHTML = `
        <div class="dialog-content">
            <h3>Device Test</h3>
            <p>Test your camera and microphone before joining a class.</p>
            
            <div class="test-section">
                <h4>Camera Test</h4>
                <div class="video-container">
                    <video id="test-video" autoplay playsinline muted></video>
                    <div id="camera-status">Waiting for camera...</div>
                </div>
            </div>
            
            <div class="test-section">
                <h4>Microphone Test</h4>
                <div class="audio-container">
                    <div class="volume-meter">
                        <div id="volume-bar"></div>
                    </div>
                    <div id="mic-status">Waiting for microphone...</div>
                </div>
            </div>
            
            <div class="device-selector">
                <div class="form-group">
                    <label for="camera-select">Camera:</label>
                    <select id="camera-select" class="form-control"></select>
                </div>
                <div class="form-group">
                    <label for="mic-select">Microphone:</label>
                    <select id="mic-select" class="form-control"></select>
                </div>
            </div>
            
            <div class="test-results" id="test-results">
                <h4>Test Results</h4>
                <ul id="results-list"></ul>
            </div>
            
            <div class="dialog-actions">
                <button id="refresh-devices-btn" class="btn btn-outline">Refresh Devices</button>
                <button id="close-test-dialog-btn" class="btn btn-primary">Close</button>
            </div>
        </div>
    `;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .media-test-dialog {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        }
        .dialog-content {
            background-color: #fff;
            padding: 20px;
            border-radius: 8px;
            max-width: 600px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        .test-section {
            margin-bottom: 20px;
        }
        .video-container {
            width: 100%;
            height: 200px;
            background-color: #eee;
            border-radius: 4px;
            position: relative;
            overflow: hidden;
        }
        .video-container video {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .audio-container {
            width: 100%;
            height: 60px;
            padding: 10px;
            background-color: #eee;
            border-radius: 4px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        .volume-meter {
            width: 100%;
            height: 20px;
            background-color: #ddd;
            border-radius: 10px;
            overflow: hidden;
        }
        #volume-bar {
            height: 100%;
            width: 0%;
            background-color: #4CAF50;
            transition: width 0.1s ease;
        }
        #camera-status, #mic-status {
            font-size: 14px;
            text-align: center;
            margin-top: 10px;
        }
        .device-selector {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        .device-selector .form-group {
            flex: 1;
        }
        .test-results {
            background-color: #f5f5f5;
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 20px;
        }
        #results-list li {
            margin-bottom: 5px;
        }
        .dialog-actions {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(dialog);
    
    // Add event listeners
    document.getElementById('close-test-dialog-btn').addEventListener('click', () => {
        stopMediaTracks();
        dialog.remove();
    });
    
    document.getElementById('refresh-devices-btn').addEventListener('click', () => {
        stopMediaTracks();
        initializeDeviceTest();
    });
    
    // Initialize device test
    initializeDeviceTest();
}

// Global variables for device test
let videoStream = null;
let audioStream = null;
let audioContext = null;
let analyser = null;
let dataArray = null;
let volumeProcessor = null;

/**
 * Initialize device test
 */
function initializeDeviceTest() {
    // Clear previous test results
    const resultsList = document.getElementById('results-list');
    resultsList.innerHTML = '';
    
    // Add check for secure context
    addTestResult('Secure Context', window.isSecureContext ? 'Pass' : 'Fail');
    
    // Add check for mediaDevices API
    addTestResult('MediaDevices API', !!navigator.mediaDevices ? 'Pass' : 'Fail');
    
    // Check for WebRTC adapter
    addTestResult('WebRTC Support', !!window.RTCPeerConnection ? 'Pass' : 'Fail');
    
    // Get available devices
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        navigator.mediaDevices.enumerateDevices()
            .then(handleDevices)
            .catch(handleError);
    } else {
        addTestResult('List Devices', 'Fail - MediaDevices API not available');
        document.getElementById('camera-status').textContent = 'Camera API not available';
        document.getElementById('mic-status').textContent = 'Microphone API not available';
    }
    
    // Start camera test
    startCameraTest();
    
    // Start microphone test
    startMicrophoneTest();
}

/**
 * Handle enumerated devices
 */
function handleDevices(deviceInfos) {
    const cameraSelect = document.getElementById('camera-select');
    const micSelect = document.getElementById('mic-select');
    
    // Clear previous options
    cameraSelect.innerHTML = '';
    micSelect.innerHTML = '';
    
    // Count devices
    let videoCount = 0;
    let audioCount = 0;
    
    // Add options for each device
    deviceInfos.forEach(device => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        
        if (device.kind === 'videoinput') {
            option.text = device.label || `Camera ${++videoCount}`;
            cameraSelect.appendChild(option);
        } else if (device.kind === 'audioinput') {
            option.text = device.label || `Microphone ${++audioCount}`;
            micSelect.appendChild(option);
        }
    });
    
    // Add test results
    addTestResult('Video Devices', videoCount > 0 ? `Pass (${videoCount} found)` : 'Fail (No devices found)');
    addTestResult('Audio Devices', audioCount > 0 ? `Pass (${audioCount} found)` : 'Fail (No devices found)');
    
    // Handle device selection change
    cameraSelect.addEventListener('change', startCameraTest);
    micSelect.addEventListener('change', startMicrophoneTest);
}

/**
 * Start camera test
 */
function startCameraTest() {
    const videoElement = document.getElementById('test-video');
    const statusElement = document.getElementById('camera-status');
    const cameraSelect = document.getElementById('camera-select');
    
    // Stop any existing video tracks
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
    }
    
    // Update status
    statusElement.textContent = 'Initializing camera...';
    
    // Check if MediaDevices API is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        statusElement.textContent = 'Camera API not supported by your browser';
        return;
    }
    
    // Get selected device ID
    const deviceId = cameraSelect.value;
    
    // Set video constraints
    const constraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : true
    };
    
    // Request camera access
    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            videoStream = stream;
            videoElement.srcObject = stream;
            
            statusElement.textContent = 'Camera working!';
            addTestResult('Camera Access', 'Pass');
        })
        .catch(error => {
            console.error('Error accessing camera:', error);
            statusElement.textContent = `Camera error: ${error.name}`;
            addTestResult('Camera Access', `Fail (${error.name})`);
        });
}

/**
 * Start microphone test
 */
function startMicrophoneTest() {
    const statusElement = document.getElementById('mic-status');
    const volumeBar = document.getElementById('volume-bar');
    const micSelect = document.getElementById('mic-select');
    
    // Stop any existing audio tracks
    if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
    }
    
    // Clean up audio context
    if (audioContext) {
        if (audioContext.state !== 'closed') {
            audioContext.close();
        }
        audioContext = null;
    }
    
    // Update status
    statusElement.textContent = 'Initializing microphone...';
    
    // Check if MediaDevices API is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        statusElement.textContent = 'Microphone API not supported by your browser';
        return;
    }
    
    // Get selected device ID
    const deviceId = micSelect.value;
    
    // Set audio constraints
    const constraints = {
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
        video: false
    };
    
    // Request microphone access
    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            audioStream = stream;
            
            // Create audio context
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create analyser
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            
            // Create source
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);
            
            // Set up data array for volume meter
            dataArray = new Uint8Array(analyser.frequencyBinCount);
            
            // Start volume meter
            volumeProcessor = setInterval(() => {
                analyser.getByteFrequencyData(dataArray);
                
                // Calculate volume level (0-100)
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i];
                }
                const average = sum / dataArray.length;
                const volume = Math.min(100, Math.max(0, average * 3)); // Scale to 0-100
                
                // Update volume bar
                volumeBar.style.width = `${volume}%`;
                
                // Update status based on volume
                if (volume > 5) {
                    statusElement.textContent = 'Microphone working!';
                } else {
                    statusElement.textContent = 'Microphone connected (no sound detected)';
                }
            }, 100);
            
            addTestResult('Microphone Access', 'Pass');
        })
        .catch(error => {
            console.error('Error accessing microphone:', error);
            statusElement.textContent = `Microphone error: ${error.name}`;
            addTestResult('Microphone Access', `Fail (${error.name})`);
        });
}

/**
 * Add test result to the results list
 */
function addTestResult(testName, result) {
    const resultsList = document.getElementById('results-list');
    const listItem = document.createElement('li');
    
    // Determine if the test passed or failed
    const isPassed = result.startsWith('Pass');
    
    // Set the text and style based on the result
    listItem.innerHTML = `<strong>${testName}:</strong> ${result}`;
    listItem.style.color = isPassed ? '#4CAF50' : '#F44336';
    
    // Add to the list
    resultsList.appendChild(listItem);
}

/**
 * Handle errors
 */
function handleError(error) {
    console.error('Error:', error);
    addTestResult('Device Enumeration', `Fail (${error.name})`);
}

/**
 * Stop all media tracks
 */
function stopMediaTracks() {
    // Stop video tracks
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    
    // Stop audio tracks
    if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        audioStream = null;
    }
    
    // Stop volume processor
    if (volumeProcessor) {
        clearInterval(volumeProcessor);
        volumeProcessor = null;
    }
    
    // Close audio context
    if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
        audioContext = null;
    }
} 