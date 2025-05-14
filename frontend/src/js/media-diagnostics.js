/**
 * Media Diagnostics Utility
 * Helps diagnose and fix camera/microphone access issues
 */
class MediaDiagnostics {
    constructor() {
        this.diagnosisResults = {
            secureContext: null,
            mediaDevicesAvailable: null,
            hasVideoDevices: null,
            hasAudioDevices: null,
            browserSupported: null,
            permissionsGranted: null,
            devicesBusy: null
        };
    }

    /**
     * Run a complete media device diagnostic
     * @returns {Promise<Object>} Diagnosis results
     */
    async runDiagnostic() {
        console.log('Running media diagnostics...');
        
        // Check if we're in a secure context
        this.diagnosisResults.secureContext = window.isSecureContext;
        console.log('Secure context:', this.diagnosisResults.secureContext);
        
        // Check browser support
        const browser = this.detectBrowser();
        this.diagnosisResults.browserSupported = this.isBrowserSupported(browser);
        console.log('Browser:', browser.name, browser.version);
        console.log('Browser supported:', this.diagnosisResults.browserSupported);
        
        // Check if MediaDevices API is available
        this.diagnosisResults.mediaDevicesAvailable = !!navigator.mediaDevices;
        console.log('MediaDevices API available:', this.diagnosisResults.mediaDevicesAvailable);
        
        if (!this.diagnosisResults.mediaDevicesAvailable) {
            return this.diagnosisResults;
        }
        
        try {
            // Check available devices
            const devices = await navigator.mediaDevices.enumerateDevices();
            
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            const audioDevices = devices.filter(device => device.kind === 'audioinput');
            
            this.diagnosisResults.hasVideoDevices = videoDevices.length > 0;
            this.diagnosisResults.hasAudioDevices = audioDevices.length > 0;
            
            console.log('Video devices:', videoDevices.length);
            console.log('Audio devices:', audioDevices.length);
            
            // Check if we have permissions (devices with labels)
            const hasLabels = devices.some(device => device.label !== '');
            this.diagnosisResults.permissionsGranted = hasLabels;
            console.log('Permissions granted:', hasLabels);
            
            // If devices have no labels, try to request permissions
            if (!hasLabels && (this.diagnosisResults.hasVideoDevices || this.diagnosisResults.hasAudioDevices)) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ 
                        video: this.diagnosisResults.hasVideoDevices, 
                        audio: this.diagnosisResults.hasAudioDevices 
                    });
                    
                    // Stop all tracks immediately
                    stream.getTracks().forEach(track => track.stop());
                    
                    // Recheck devices to see if we now have labels
                    const devicesAfterPermission = await navigator.mediaDevices.enumerateDevices();
                    const hasLabelsNow = devicesAfterPermission.some(device => device.label !== '');
                    
                    this.diagnosisResults.permissionsGranted = hasLabelsNow;
                    console.log('Permissions granted after request:', hasLabelsNow);
                    
                } catch (err) {
                    console.error('Error requesting permissions:', err);
                    
                    // Check if devices are busy
                    this.diagnosisResults.devicesBusy = err.name === 'NotReadableError' || err.name === 'AbortError';
                    this.diagnosisResults.permissionsGranted = false;
                }
            }
        } catch (error) {
            console.error('Error running media diagnostics:', error);
        }
        
        return this.diagnosisResults;
    }
    
    /**
     * Get fix suggestions based on diagnosis results
     * @returns {Array<string>} List of suggestions
     */
    getSuggestions() {
        const suggestions = [];
        
        if (!this.diagnosisResults.secureContext) {
            suggestions.push('This app requires a secure context (HTTPS) to access your camera and microphone. Please use HTTPS or localhost.');
            suggestions.push('- Try accessing the app through http://localhost:5000 instead of opening the file directly.');
        }
        
        if (!this.diagnosisResults.browserSupported) {
            suggestions.push('Your browser may not fully support WebRTC. Please try using the latest version of Chrome, Firefox, or Edge.');
        }
        
        if (!this.diagnosisResults.mediaDevicesAvailable) {
            suggestions.push('Your browser does not support the MediaDevices API needed for camera/microphone access.');
            suggestions.push('- For Windows 10/11: Try restarting your browser and make sure it\'s up to date.');
            suggestions.push('- Check if you have any security software blocking camera access.');
        }
        
        if (!this.diagnosisResults.hasVideoDevices && !this.diagnosisResults.hasAudioDevices) {
            suggestions.push('No camera or microphone devices were detected. Please check your hardware connections.');
            suggestions.push('- For Windows 10/11: Open Windows Settings > Privacy > Camera and make sure "Allow apps to access your camera" is ON.');
            suggestions.push('- For Windows 10/11: Open Windows Settings > Privacy > Microphone and make sure "Allow apps to access your microphone" is ON.');
            suggestions.push('- Try plugging in an external webcam or microphone if available.');
        } else {
            if (!this.diagnosisResults.hasVideoDevices) {
                suggestions.push('No camera was detected. Please check your camera connection.');
                suggestions.push('- For Windows 10/11: Check Device Manager to ensure your webcam is properly installed and not disabled.');
            }
            
            if (!this.diagnosisResults.hasAudioDevices) {
                suggestions.push('No microphone was detected. Please check your microphone connection.');
                suggestions.push('- For Windows 10/11: Check Device Manager to ensure your microphone is properly installed and not disabled.');
            }
        }
        
        if (this.diagnosisResults.hasVideoDevices || this.diagnosisResults.hasAudioDevices) {
            if (!this.diagnosisResults.permissionsGranted) {
                suggestions.push('Permission to access camera/microphone was denied. Please check your browser permissions and ensure camera/microphone access is enabled for this site.');
                suggestions.push('- In Chrome: Click the lock/info icon in the address bar and ensure camera and microphone permissions are set to "Allow".');
                suggestions.push('- In Edge: Click the lock/info icon in the address bar and ensure camera and microphone permissions are set to "Allow".');
            }
            
            if (this.diagnosisResults.devicesBusy) {
                suggestions.push('Your camera or microphone might be in use by another application. Please close other applications that might be using your media devices.');
                suggestions.push('- Check for other video conferencing apps like Zoom, Teams, or Google Meet that might be running.');
                suggestions.push('- Try restarting your computer to free up any locked camera/microphone resources.');
            }
        }
        
        // Add Windows-specific troubleshooting steps
        const browser = this.detectBrowser();
        if (browser.name === 'Chrome' || browser.name === 'Edge') {
            suggestions.push('For advanced troubleshooting in Windows:');
            suggestions.push('- Open Windows Device Manager to check if your camera/mic shows any warning icons.');
            suggestions.push('- Try typing "camera" in Windows search and opening "Camera privacy settings".');
            suggestions.push('- Make sure "Allow desktop apps to access your camera" is also enabled.');
        }
        
        if (suggestions.length === 0) {
            suggestions.push('All media device checks passed. If you\'re still having issues, try reloading the page or restarting your browser.');
        }
        
        return suggestions;
    }
    
    /**
     * Detect browser name and version
     * @returns {Object} Browser info
     */
    detectBrowser() {
        const userAgent = navigator.userAgent;
        let browser = {
            name: 'unknown',
            version: 'unknown'
        };
        
        // Chrome
        if (/Chrome/.test(userAgent) && !/Chromium|Edge|Edg|OPR|Opera/.test(userAgent)) {
            browser.name = 'Chrome';
            browser.version = userAgent.match(/Chrome\/(\d+\.\d+)/)[1];
        }
        // Firefox
        else if (/Firefox/.test(userAgent)) {
            browser.name = 'Firefox';
            browser.version = userAgent.match(/Firefox\/(\d+\.\d+)/)[1];
        }
        // Edge (Chromium-based)
        else if (/Edg/.test(userAgent)) {
            browser.name = 'Edge';
            browser.version = userAgent.match(/Edg\/(\d+\.\d+)/)[1];
        }
        // Safari
        else if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) {
            browser.name = 'Safari';
            browser.version = userAgent.match(/Version\/(\d+\.\d+)/)[1];
        }
        // Internet Explorer
        else if (/MSIE|Trident/.test(userAgent)) {
            browser.name = 'Internet Explorer';
            browser.version = userAgent.match(/(?:MSIE |rv:)(\d+\.\d+)/)[1];
        }
        
        return browser;
    }
    
    /**
     * Check if the browser is supported for WebRTC
     * @param {Object} browser - Browser info
     * @returns {boolean} Whether the browser is supported
     */
    isBrowserSupported(browser) {
        const minimumVersions = {
            'Chrome': 55,
            'Firefox': 52,
            'Edge': 79,
            'Safari': 11,
            'Internet Explorer': Infinity // Not supported
        };
        
        const majorVersion = parseInt(browser.version);
        return !isNaN(majorVersion) && majorVersion >= (minimumVersions[browser.name] || Infinity);
    }
    
    /**
     * Run diagnostic and show results in a dialog
     */
    async showDiagnosticsDialog() {
        await this.runDiagnostic();
        const suggestions = this.getSuggestions();
        
        // Create dialog
        const dialog = document.createElement('div');
        dialog.className = 'media-diagnostics-dialog';
        dialog.innerHTML = `
            <div class="dialog-content">
                <h3>Media Device Diagnostics</h3>
                <div class="diagnostics-results">
                    <p><strong>Secure Context:</strong> ${this.diagnosisResults.secureContext ? '✅ Yes' : '❌ No'}</p>
                    <p><strong>Browser Support:</strong> ${this.diagnosisResults.browserSupported ? '✅ Supported' : '❌ Not fully supported'}</p>
                    <p><strong>Video Devices:</strong> ${this.diagnosisResults.hasVideoDevices ? '✅ Detected' : '❌ Not detected'}</p>
                    <p><strong>Audio Devices:</strong> ${this.diagnosisResults.hasAudioDevices ? '✅ Detected' : '❌ Not detected'}</p>
                    <p><strong>Permissions:</strong> ${this.diagnosisResults.permissionsGranted ? '✅ Granted' : '❌ Not granted'}</p>
                </div>
                <h4>Suggestions:</h4>
                <ul class="suggestions-list">
                    ${suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
                </ul>
                <div class="dialog-actions">
                    <button id="retry-permissions-btn" class="btn btn-primary">Request Permissions Again</button>
                    <button id="close-dialog-btn" class="btn btn-outline">Close</button>
                </div>
            </div>
        `;
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .media-diagnostics-dialog {
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
                max-width: 500px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            }
            .diagnostics-results p {
                margin: 8px 0;
            }
            .suggestions-list {
                margin-top: 10px;
            }
            .suggestions-list li {
                margin-bottom: 8px;
            }
            .dialog-actions {
                margin-top: 20px;
                display: flex;
                justify-content: flex-end;
                gap: 10px;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(dialog);
        
        // Add event listeners
        document.getElementById('close-dialog-btn').addEventListener('click', () => {
            dialog.remove();
        });
        
        document.getElementById('retry-permissions-btn').addEventListener('click', async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: this.diagnosisResults.hasVideoDevices, 
                    audio: this.diagnosisResults.hasAudioDevices 
                });
                
                // Stop tracks after successfully getting permissions
                stream.getTracks().forEach(track => track.stop());
                
                alert('Permissions successfully granted! Please try joining the class again.');
                dialog.remove();
            } catch (error) {
                alert(`Could not get permissions: ${error.message || error.name}. Please check your browser settings.`);
            }
        });
    }
}

// Create instance and expose to window
window.mediaDiagnostics = new MediaDiagnostics(); 