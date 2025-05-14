/**
 * Live Class Module
 * Handles WebRTC and Socket.IO connections for live classes
 */
class LiveClassManager {
    constructor() {
        // DOM Elements
        this.liveClassPage = document.getElementById('live-class-page');
        this.teacherVideo = document.getElementById('teacher-video');
        this.studentsGrid = document.getElementById('students-grid');
        this.emotionsDashboard = document.getElementById('emotions-dashboard');
        this.emotionChart = document.getElementById('emotion-chart');
        this.emotionSummary = document.getElementById('emotion-summary');
        this.toggleVideoBtn = document.getElementById('toggle-video-btn');
        this.toggleAudioBtn = document.getElementById('toggle-audio-btn');
        this.shareScreenBtn = document.getElementById('share-screen-btn');
        this.leaveClassBtn = document.getElementById('leave-class-btn');
        
        // Add diagnostics button
        this.diagnosticsBtn = document.createElement('button');
        this.diagnosticsBtn.id = 'run-diagnostics-btn';
        this.diagnosticsBtn.className = 'control-btn';
        this.diagnosticsBtn.innerHTML = '<i class="fas fa-stethoscope"></i>';
        this.diagnosticsBtn.title = 'Run Media Diagnostics';
        
        // Insert the diagnostics button before the leave button
        const controlsBar = document.querySelector('.controls-bar');
        if (controlsBar) {
            controlsBar.insertBefore(this.diagnosticsBtn, this.leaveClassBtn);
        }
        
        // State
        this.socket = null;
        this.currentClass = null;
        this.localStream = null;
        this.screenStream = null;
        this.peerConnections = {};
        this.chart = null;
        this.chartData = {
            labels: ['Angry', 'Disgusted', 'Fearful', 'Happy', 'Neutral', 'Sad', 'Surprised'],
            datasets: [{
                label: 'Class Emotions',
                data: [0, 0, 0, 0, 0, 0, 0],
                backgroundColor: [
                    '#ff4d4d', // angry
                    '#9acd32', // disgusted
                    '#800080', // fearful
                    '#ffd700', // happy
                    '#a0a0a0', // neutral
                    '#6495ed', // sad
                    '#ff8c00'  // surprised
                ]
            }]
        };
        
        // Media settings
        this.isVideoEnabled = true;
        this.isAudioEnabled = true;
        this.isScreenSharing = false;
        
        // Server URL - determine dynamically based on current host
        const host = window.location.hostname;
        const port = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
        const protocol = window.location.protocol;
        
        // Use the same server that served the page
        this.serverUrl = `${protocol}//${host}${port ? ':'+port : ''}`;
        console.log('Server URL:', this.serverUrl);
        
        // API URL for backend requests
        this.apiUrl = this.serverUrl;
        
        // Emotion data
        this.classEmotions = {
            angry: 0,
            disgusted: 0,
            fearful: 0,
            happy: 0,
            neutral: 0,
            sad: 0,
            surprised: 0
        };
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    /**
     * Get current class ID
     */
    get currentClassId() {
        if (this.currentClass && this.currentClass._id) {
            return this.currentClass._id;
        }
        return null;
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Toggle video button
        this.toggleVideoBtn.addEventListener('click', () => {
            this.toggleVideo();
        });
        
        // Toggle audio button
        this.toggleAudioBtn.addEventListener('click', () => {
            this.toggleAudio();
        });
        
        // Share screen button
        this.shareScreenBtn.addEventListener('click', () => {
            this.toggleScreenShare();
        });
        
        // Leave class button
        this.leaveClassBtn.addEventListener('click', () => {
            this.leaveClass();
        });

        // Run diagnostics button
        this.diagnosticsBtn.addEventListener('click', () => {
            if (window.mediaDiagnostics) {
                window.mediaDiagnostics.showDiagnosticsDialog();
            } else {
                alert('Media diagnostics tool is not available. Please refresh the page and try again.');
            }
        });
    }
    
    /**
     * Initialize socket connection
     */
    initializeSocket() {
        console.log('Initializing socket connection to server:', this.serverUrl);
        
        // Create socket connection using dynamic server URL
        try {
            this.socket = io(this.serverUrl);
            console.log('Socket object created:', this.socket);
        } catch (error) {
            console.error('Error creating socket connection:', error);
            alert('Failed to establish real-time connection. Some features may not work correctly.');
            return;
        }
        
        // Setup socket event listeners
        this.socket.on('connect', () => {
            console.log('Socket connected to server with ID:', this.socket.id);
        });
        
        this.socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });
        
        this.socket.on('connect_timeout', () => {
            console.error('Socket connection timeout');
        });
        
        this.socket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
        });
        
        this.socket.on('user-joined', async (data) => {
            console.log('User joined:', data.userId);
            await this.handleUserJoined(data.userId);
        });
        
        this.socket.on('user-left', (data) => {
            console.log('User left:', data.userId);
            this.handleUserLeft(data.userId);
        });
        
        this.socket.on('offer', async (data) => {
            console.log('Received offer from:', data.userId);
            await this.handleOffer(data.userId, data.offer);
        });
        
        this.socket.on('answer', (data) => {
            console.log('Received answer from:', data.userId);
            this.handleAnswer(data.userId, data.answer);
        });
        
        this.socket.on('ice-candidate', (data) => {
            console.log('Received ICE candidate from:', data.userId);
            this.handleIceCandidate(data.userId, data.candidate);
        });
        
        this.socket.on('emotion-update', (data) => {
            console.log('Received emotion update from socket:', data);
            
            // Force update emotions for teacher
            if (auth.isTeacher()) {
                console.log('Teacher received emotion update via socket:', data);
                
                // Check that data is valid
                if (!data.emotion) {
                    console.error('Invalid emotion data received:', data);
                    return;
                }
                
                // Make sure the emotion exists in our tracking object
                const emotion = data.emotion.toLowerCase();
                if (!this.classEmotions.hasOwnProperty(emotion)) {
                    console.log(`Adding new emotion type: ${emotion}`);
                    this.classEmotions[emotion] = 0;
                }
                
                // Increment emotion count
                this.classEmotions[emotion]++;
                console.log(`Updated emotion counts:`, this.classEmotions);
                
                // Force update chart to show the emotion
                if (this.chart) {
                    this.chartData.datasets[0].data = [
                        this.classEmotions.angry || 0,
                        this.classEmotions.disgusted || 0,
                        this.classEmotions.fearful || 0,
                        this.classEmotions.happy || 0, 
                        this.classEmotions.neutral || 0,
                        this.classEmotions.sad || 0,
                        this.classEmotions.surprised || 0
                    ];
                    
                    console.log('Updated chart data from socket:', this.chartData.datasets[0].data);
                    this.chart.update();
                    
                    // Update emotion summary with the new data
                    this.updateEmotionSummary();
                } else {
                    console.warn('Chart not found - initializing now');
                    this.initializeChart();
                    this.updateEmotionSummary();
                }
            }
            
            // Always update the emotion badge
            if (data.userId && data.emotion) {
                this.handleEmotionUpdate(data.userId, data.emotion, data.confidence || 0.5);
            }
        });
    }
    
    /**
     * Get local media stream
     * @returns {Promise<MediaStream>} Local media stream
     */
    async getLocalStream() {
        // Check if we're in a secure context - required for modern browsers
        if (!window.isSecureContext) {
            console.error('Not in a secure context - MediaDevices API requires HTTPS');
            alert('This application requires a secure connection (HTTPS) to access your camera and microphone. Please use HTTPS or localhost.');
            return new MediaStream();
        }
        
        // Extra debug logging to diagnose issues
        console.log('Starting getLocalStream function');
        
        // First, check if the MediaDevices API is available
        if (!navigator.mediaDevices) {
            console.error('MediaDevices API is not available in this browser');
            
            // Create a polyfill for older browsers
            // Based on adapter.js approach
            const oldGetUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
                                   navigator.mozGetUserMedia || navigator.msGetUserMedia;
                
            if (oldGetUserMedia) {
                console.log('Setting up MediaDevices polyfill with legacy APIs');
                navigator.mediaDevices = {};
                
                navigator.mediaDevices.getUserMedia = function(constraints) {
                    return new Promise((resolve, reject) => {
                        oldGetUserMedia.call(navigator, constraints, resolve, reject);
                    });
                };
                
                console.log('MediaDevices polyfill created');
            } else {
                alert('Your browser does not support accessing media devices. Please use Chrome, Firefox, or Edge and ensure you have camera/microphone hardware available.');
                return new MediaStream();
            }
        }

        console.log('Navigator media devices available:', !!navigator.mediaDevices);
        
        // Detect mobile device and browser
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isAndroid = /Android/.test(navigator.userAgent);
        
        console.log('Device detection:', { 
            isMobile, 
            isIOS, 
            isAndroid, 
            userAgent: navigator.userAgent 
        });
        
        try {
            // Mobile-specific constraints based on device type
            let videoConstraints;
            
            if (isMobile) {
                if (isIOS) {
                    // iOS devices often perform better with more restricted settings
                    videoConstraints = {
                        facingMode: "user",
                        width: { ideal: 320, max: 480 },
                        height: { ideal: 240, max: 360 },
                        frameRate: { ideal: 15, max: 24 }
                    };
                } else if (isAndroid) {
                    // Android devices can often handle slightly higher resolutions
                    videoConstraints = {
                        facingMode: "user",
                        width: { ideal: 480, max: 640 },
                        height: { ideal: 360, max: 480 },
                        frameRate: { ideal: 15, max: 30 }
                    };
                } else {
                    // Generic mobile device
                    videoConstraints = {
                        facingMode: "user",
                        width: { ideal: 320 },
                        height: { ideal: 240 },
                        frameRate: { ideal: 15 }
                    };
                }
            } else {
                // Desktop constraints
                videoConstraints = {
                    width: { ideal: 640, max: 1280 },
                    height: { ideal: 480, max: 720 },
                    frameRate: { ideal: 30 }
                };
            }
            
            // Audio constraints with echo cancellation
            const audioConstraints = {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            };
            
            const constraints = {
                audio: audioConstraints,
                video: videoConstraints
            };
            
            console.log('Requesting media with constraints:', JSON.stringify(constraints));
            
            try {
                // First try with the optimized constraints
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                console.log('Successfully obtained media stream with tracks:', stream.getTracks().length);
                
                // Log details about track settings
                stream.getTracks().forEach(track => {
                    console.log(`Track ${track.kind} settings:`, track.getSettings());
                });
                
                return stream;
            } catch (initialError) {
                console.error('Initial getUserMedia failed:', initialError);
                
                // If that fails, try with minimal constraints
                if (initialError.name === 'NotAllowedError') {
                    alert('Camera/microphone access was denied. Please grant permission when prompted and try again.');
                    return new MediaStream();
                }
                
                // Try a fallback for mobile devices
                if (isMobile) {
                    try {
                        console.log('Trying mobile fallback with environment camera...');
                        const fallbackStream = await navigator.mediaDevices.getUserMedia({
                            video: { 
                                facingMode: "environment",
                                width: { ideal: 320 },
                                height: { ideal: 240 }
                            },
                            audio: true
                        });
                        console.log('Mobile fallback successful');
                        return fallbackStream;
                    } catch (fallbackError) {
                        console.error('Mobile fallback failed:', fallbackError);
                    }
                    
                    // Try with even more simplified constraints
                    try {
                        console.log('Trying with minimal mobile video constraints...');
                        const minimalStream = await navigator.mediaDevices.getUserMedia({
                            video: true,
                            audio: true
                        });
                        console.log('Minimal video constraints successful');
                        return minimalStream;
                    } catch (minimalError) {
                        console.error('Minimal video constraints failed:', minimalError);
                    }
                }
                
                // Try with just audio as last resort
                try {
                    console.log('Trying audio-only as last resort');
                    const audioOnlyStream = await navigator.mediaDevices.getUserMedia({
                        audio: true,
                        video: false
                    });
                    alert('Could not access your camera, but audio is working. You will join with audio only.');
                    return audioOnlyStream;
                } catch (audioError) {
                    console.error('Audio-only fallback failed:', audioError);
                    alert('Could not access your camera or microphone. Please check your device permissions and try again.');
                    return new MediaStream();
                }
            }
        } catch (error) {
            console.error('Error getting local media stream:', error);
            
            if (error.name === 'NotAllowedError') {
                alert('Camera and microphone access was denied. Please grant permission when prompted and try again.');
            } else if (error.name === 'NotFoundError') {
                alert('No camera or microphone found. Please check your device connections.');
            } else if (error.name === 'NotReadableError') {
                alert('Your camera or microphone is already in use by another application.');
            } else {
                alert(`Error accessing media devices: ${error.message}`);
            }
            
            return new MediaStream();
        }
    }
    
    /**
     * Start a live class as a teacher
     * @param {Object} classData - Class data
     */
    async startLiveClass(classData) {
        this.currentClass = classData;
        
        // Show camera help for mobile devices
        this.showMobileCameraHelpIfNeeded();
        
        await this.initializeClass(true);
    }
    
    /**
     * Join a live class as a student
     * @param {Object} classData - Class data
     */
    async joinLiveClass(classData) {
        this.currentClass = classData;
        
        // Show camera help for mobile devices
        this.showMobileCameraHelpIfNeeded();
        
        await this.initializeClass(false);
    }
    
    /**
     * Show mobile camera help if on a mobile device
     */
    showMobileCameraHelpIfNeeded() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
            const mobileHelp = document.getElementById('mobile-camera-help');
            if (mobileHelp) {
                mobileHelp.style.display = 'flex';
                
                // Add event listener to dismiss button
                const dismissBtn = document.getElementById('dismiss-mobile-help');
                if (dismissBtn) {
                    dismissBtn.addEventListener('click', () => {
                        mobileHelp.style.display = 'none';
                    });
                }
            }
        }
    }
    
    /**
     * Initialize class
     * @param {boolean} isTeacher - Whether current user is the teacher
     */
    async initializeClass(isTeacher) {
        try {
            // Check for WebRTC compatibility
            if (!window.RTCPeerConnection) {
                throw new Error('WebRTC is not supported by your browser. Please use a modern browser like Chrome, Firefox, or Edge.');
            }
            
            // Check if running on a mobile device
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            const isAndroid = /Android/.test(navigator.userAgent);
            
            console.log(`Device detection: Mobile=${isMobile}, iOS=${isIOS}, Android=${isAndroid}`);
            
            // Apply mobile-specific optimizations
            if (isMobile) {
                console.log('Applying mobile-specific optimizations');
                
                // Configure WebRTC for mobile
                this.configureMobileWebRTC();
                
                // Optimize main video container layout for mobile
                const videoContainer = document.querySelector('.video-container');
                if (videoContainer) {
                    videoContainer.style.flexDirection = 'column';
                    videoContainer.style.height = 'auto';
                }
                
                // Optimize teacher video for mobile
                if (this.teacherVideo) {
                    this.teacherVideo.style.width = '100%';
                    this.teacherVideo.style.maxHeight = isTeacher ? '30vh' : '40vh';
                    this.teacherVideo.style.objectFit = 'contain';
                    
                    // Enable playsinline attribute
                    this.teacherVideo.playsInline = true;
                    this.teacherVideo.setAttribute('webkit-playsinline', 'true');
                    // Force low latency playback mode
                    this.teacherVideo.muted = false;
                }
                
                // Optimize students grid for mobile
                if (this.studentsGrid) {
                    this.studentsGrid.style.gridTemplateColumns = isTeacher ? 'repeat(auto-fill, minmax(150px, 1fr))' : 'repeat(auto-fill, minmax(120px, 1fr))';
                    this.studentsGrid.style.gap = '5px';
                    this.studentsGrid.style.maxHeight = isTeacher ? '60vh' : '45vh';
                }
                
                // Make sure controls are accessible on mobile
                const controlsBar = document.querySelector('.controls-bar');
                if (controlsBar) {
                    controlsBar.style.position = 'fixed';
                    controlsBar.style.bottom = '10px';
                    controlsBar.style.left = '0';
                    controlsBar.style.right = '0';
                    controlsBar.style.padding = '5px';
                    controlsBar.style.background = 'rgba(0,0,0,0.7)';
                    controlsBar.style.zIndex = '1000';
                }
                
                // For student view, ensure emotion dashboard is properly sized
                if (!isTeacher && this.emotionsDashboard) {
                    this.emotionsDashboard.style.display = 'none';
                }
                
                // Add device-specific fixes
                if (isIOS) {
                    // iOS specific fixes
                    this.applyIOSSpecificFixes();
                } else if (isAndroid) {
                    // Android specific fixes
                    this.applyAndroidSpecificFixes();
                }
            }
            
            // Initialize socket connection if not already connected
            if (!this.socket) {
                this.initializeSocket();
            }
            
            console.log('Initializing class as', isTeacher ? 'teacher' : 'student');
            
            // Reset emotion data
            if (isTeacher) {
                console.log('Resetting emotion data for teacher view');
                this.classEmotions = {
                    angry: 0,
                    disgusted: 0,
                    fearful: 0,
                    happy: 0,
                    neutral: 0,
                    sad: 0,
                    surprised: 0
                };
                
                // Make sure emotions dashboard is visible for teachers
                if (this.emotionsDashboard) {
                    this.emotionsDashboard.style.display = 'block';
                    console.log('Showing emotions dashboard for teacher');
                } else {
                    console.warn('Emotions dashboard element not found');
                }
                
                // Initialize chart
                this.initializeChart();
                console.log('Emotion chart initialized for teacher');
                
                // Update initial emotion summary
                this.updateEmotionSummary();
            } else {
                // Hide emotions dashboard for students
                if (this.emotionsDashboard) {
                    this.emotionsDashboard.style.display = 'none';
                    console.log('Hiding emotions dashboard for student');
                }
            }
            
            // Get local stream
            console.log('Getting local stream...');
            try {
                this.localStream = await this.getLocalStream();
                console.log('Local stream obtained with tracks:', this.localStream.getTracks().length);
            } catch (streamError) {
                console.error('Error getting local stream:', streamError);
                alert('There was an error accessing your camera and microphone. You will join in view-only mode.');
                this.localStream = new MediaStream();
            }
            
            // Display local video
            if (isTeacher) {
                console.log('Setting teacher video');
                if (this.localStream.getVideoTracks().length > 0) {
                    this.teacherVideo.srcObject = this.localStream;
                    
                    // Explicitly play with error handling
                    try {
                        await this.teacherVideo.play();
                        console.log('Teacher video playing');
                    } catch (playError) {
                        console.error('Error playing teacher video:', playError);
                        // Use our new helper method
                        this.playVideoWithRetry(this.teacherVideo, 'teacher');
                    }
                } else {
                    // No video tracks available
                    const videoContainer = this.teacherVideo.parentElement;
                    const placeholderDiv = document.createElement('div');
                    placeholderDiv.className = 'video-placeholder';
                    placeholderDiv.innerHTML = '<i class="fas fa-video-slash"></i><p>Camera unavailable</p>';
                    videoContainer.appendChild(placeholderDiv);
                }
            } else {
                console.log('Setting student video');
                // Create student video element
                const videoElement = this.createVideoElement(auth.getCurrentUser().id, auth.getCurrentUser().name);
                
                if (this.localStream.getVideoTracks().length > 0) {
                    videoElement.srcObject = this.localStream;
                    
                    // Explicitly play with error handling
                    try {
                        await videoElement.play();
                        console.log('Student video playing');
                    } catch (playError) {
                        console.error('Error playing student video:', playError);
                        // Use our new helper method
                        this.playVideoWithRetry(videoElement, 'student-local');
                    }
                } else {
                    // No video tracks available
                    const videoContainer = videoElement.parentElement;
                    const placeholderDiv = document.createElement('div');
                    placeholderDiv.className = 'video-placeholder';
                    placeholderDiv.innerHTML = '<i class="fas fa-video-slash"></i><p>Camera unavailable</p>';
                    videoContainer.appendChild(placeholderDiv);
                }
                
                this.studentsGrid.appendChild(videoElement.parentElement);
            }
            
            // Initialize emotion detector if video tracks are available
            if (this.localStream.getVideoTracks().length > 0) {
                console.log('Initializing emotion detector...');
                const videoElement = isTeacher ? this.teacherVideo : document.getElementById(`video-${auth.getCurrentUser().id}`);
                
                try {
                    await emotionDetector.initialize(videoElement, (emotionData) => {
                        this.handleLocalEmotionDetected(emotionData);
                    });
                    
                    // Start emotion detection
                    emotionDetector.start();
                    console.log('Emotion detection started');
                } catch (emotionError) {
                    console.error('Error initializing emotion detector:', emotionError);
                    // Continue even if emotion detection fails
                }
            } else {
                console.log('Skipping emotion detection - no video available');
            }
            
            // Get current user info
            const currentUser = auth.getCurrentUser();
            if (!currentUser || !currentUser.id) {
                console.error('No current user found - cannot join class');
                throw new Error('User authentication required to join class');
            }
            
            // Make sure we have a valid class ID
            if (!this.currentClass || !this.currentClass._id) {
                console.error('No valid class ID found - cannot join class');
                throw new Error('Invalid class data');
            }
            
            // Wait to make sure socket is connected
            if (!this.socket.connected) {
                console.log('Socket not connected yet, waiting...');
                await new Promise(resolve => {
                    this.socket.once('connect', () => {
                        console.log('Socket connected, proceeding with join');
                        resolve();
                    });
                    
                    // Timeout after 5 seconds
                    setTimeout(() => {
                        console.warn('Socket connection timeout, proceeding anyway');
                        resolve();
                    }, 5000);
                });
            }
            
            // Join class room with detailed info
            const joinData = {
                classId: this.currentClass._id,
                userId: currentUser.id,
                name: currentUser.name || 'Anonymous',
                isTeacher
            };
            
            console.log(`Joining class room with data:`, joinData);
            this.socket.emit('join-class', joinData);
            
            // Show live class page
            this.showLiveClassPage();
        } catch (error) {
            console.error('Error initializing class:', error);
            alert(`Failed to initialize class: ${error.message}. Please refresh the page and try again.`);
        }
    }
    
    /**
     * Configure WebRTC for mobile devices
     */
    configureMobileWebRTC() {
        console.log('Configuring WebRTC for mobile device');
        
        // Set global options for WebRTC on mobile
        if (window.RTCPeerConnection) {
            // Add adapter.js if not present
            if (!window.adapter && window.RTCPeerConnection.prototype.addTransceiver) {
                console.log('Configuring transceivers for mobile');
                
                // Optimize transceiver for mobile
                const originalAddTransceiver = RTCPeerConnection.prototype.addTransceiver;
                RTCPeerConnection.prototype.addTransceiver = function(...args) {
                    if (args.length > 0 && typeof args[1] === 'object') {
                        // Force lower bitrates for mobile
                        if (!args[1].sendEncodings) {
                            args[1].sendEncodings = [{
                                maxBitrate: 250000, // 250kbps
                                priority: 'high',
                                networkPriority: 'high'
                            }];
                        }
                    }
                    return originalAddTransceiver.apply(this, args);
                };
            }
        }
    }
    
    /**
     * Apply iOS specific fixes
     */
    applyIOSSpecificFixes() {
        console.log('Applying iOS specific fixes');
        
        // Fix iOS video playback issues
        const videoElements = document.querySelectorAll('video');
        videoElements.forEach(video => {
            // Enable playsinline for all videos (crucial for iOS)
            video.playsInline = true;
            video.setAttribute('webkit-playsinline', 'true');
            
            // Prevent audio issues on iOS
            video.muted = false;
            
            // Add click handler for iOS requiring user interaction
            video.addEventListener('loadedmetadata', function() {
                video.play().catch(err => {
                    console.log('iOS autoplay prevented, waiting for user interaction');
                    document.addEventListener('touchstart', function initPlay() {
                        video.play();
                        document.removeEventListener('touchstart', initPlay);
                    }, {once: true});
                });
            });
        });
    }
    
    /**
     * Apply Android specific fixes
     */
    applyAndroidSpecificFixes() {
        console.log('Applying Android specific fixes');
        
        // Fix Android Chrome video playback issues
        const videoElements = document.querySelectorAll('video');
        videoElements.forEach(video => {
            // Enable hardware acceleration where possible
            video.style.transform = 'translateZ(0)';
            
            // Add specific attribute for some Android browsers
            video.setAttribute('crossorigin', 'anonymous');
            
            // Ensure proper playback
            video.addEventListener('loadedmetadata', function() {
                // Force play on metadataloaded
                video.play().catch(err => console.log('Android autoplay prevented:', err));
            });
        });
    }
    
    /**
     * Initialize emotion chart
     */
    initializeChart() {
        const ctx = this.emotionChart.getContext('2d');
        
        this.chart = new Chart(ctx, {
            type: 'doughnut',
            data: this.chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        });
    }
    
    /**
     * Create video element for a user
     * @param {string} userId - User ID
     * @param {string} userName - User name
     * @returns {HTMLVideoElement} Video element
     */
    createVideoElement(userId, userName) {
        const videoFrame = document.createElement('div');
        videoFrame.className = 'video-frame';
        videoFrame.id = `video-container-${userId}`;
        
        const video = document.createElement('video');
        video.id = `video-${userId}`;
        video.autoplay = true;
        video.playsInline = true;
        
        const label = document.createElement('div');
        label.className = 'video-label';
        label.textContent = userName;
        
        const emotionBadge = document.createElement('div');
        emotionBadge.className = 'emotion-badge';
        emotionBadge.id = `emotion-${userId}`;
        
        videoFrame.appendChild(video);
        videoFrame.appendChild(label);
        videoFrame.appendChild(emotionBadge);
        
        return video;
    }
    
    /**
     * Handle remote stream
     * @param {MediaStream} stream - Remote media stream
     * @param {string} userId - User ID of the remote user
     */
    handleRemoteStream(stream, userId) {
        console.log(`Handling remote stream from user ${userId} with ${stream.getTracks().length} tracks`);
        
        // Log detailed information about tracks for debugging
        stream.getTracks().forEach(track => {
            console.log(`Remote track: ${track.kind}, enabled: ${track.enabled}, muted: ${track.muted}, readyState: ${track.readyState}`);
        });
        
        // Check if user is a teacher
        const isTeacher = auth.isTeacher();
        
        if (!isTeacher) {
            // STUDENT viewing TEACHER's video
            console.log('Student is receiving teacher video');
            
            // Force teacher video to play properly
            if (this.teacherVideo) {
                console.log('Setting teacher video source for student');
                
                // Detach any existing stream
                if (this.teacherVideo.srcObject) {
                    const oldStream = this.teacherVideo.srcObject;
                    if (oldStream) {
                        oldStream.getTracks().forEach(track => track.stop());
                    }
                    this.teacherVideo.srcObject = null;
                }
                
                // Assign new stream
                this.teacherVideo.srcObject = stream;
                
                // Set proper mobile optimizations
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                if (isMobile) {
                    console.log('Applying mobile optimizations for teacher video');
                    this.teacherVideo.style.width = '100%';
                    this.teacherVideo.style.maxHeight = '40vh';
                    this.teacherVideo.style.objectFit = 'contain';
                }
                
                // Force play with error handling and retry on failure
                this.playVideoWithRetry(this.teacherVideo, 'teacher');
                
                return; // Exit early since we've handled the teacher's video
            } else {
                console.error('Teacher video element not found!');
                return;
            }
        }
        
        // TEACHER viewing STUDENT video or STUDENT viewing another STUDENT
        
        // Create or get video element
        let videoElement = document.getElementById(`video-${userId}`);
        let videoContainer = document.getElementById(`video-container-${userId}`);
        
        if (!videoElement) {
            console.log(`Creating new video element for user ${userId}`);
            const userInfo = {
                id: userId,
                name: userId.substring(0, 8) // Use shortened ID as name if we don't have the real name
            };
            
            videoElement = this.createVideoElement(userId, userInfo.name);
            videoContainer = videoElement.parentElement;
            
            // Add to students grid
            this.studentsGrid.appendChild(videoContainer);
        }
        
        console.log(`Setting remote stream to video element for user ${userId}`);
        videoElement.srcObject = stream;
        
        // Optimize video display for mobile
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
            videoElement.style.width = '100%';
            videoElement.style.objectFit = 'contain';
        }
        
        // Play video with retry mechanism
        this.playVideoWithRetry(videoElement, `user-${userId}`);
    }
    
    /**
     * Helper method to play a video element with retry logic
     * @param {HTMLVideoElement} videoElement - The video element to play
     * @param {string} videoLabel - Label for logging
     */
    playVideoWithRetry(videoElement, videoLabel) {
        console.log(`Attempting to play ${videoLabel} video`);
        
        const playWithFallback = async () => {
            try {
                await videoElement.play();
                console.log(`${videoLabel} video playing successfully`);
            } catch (err) {
                console.error(`Error playing ${videoLabel} video:`, err);
                
                // Add click handler to play on user interaction
                videoElement.onclick = async () => {
                    try {
                        await videoElement.play();
                        console.log(`${videoLabel} video playing after click`);
                    } catch (clickErr) {
                        console.error(`Still cannot play ${videoLabel} video after click:`, clickErr);
                    }
                };
                
                // Add visual indicator to inform user to click
                const videoContainer = videoElement.parentElement;
                if (videoContainer) {
                    const playPrompt = document.createElement('div');
                    playPrompt.className = 'play-prompt';
                    playPrompt.innerHTML = '<i class="fas fa-play-circle"></i><span>Tap to play</span>';
                    playPrompt.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); ' +
                        'background: rgba(0,0,0,0.7); color: white; padding: 10px; border-radius: 5px; ' +
                        'display: flex; flex-direction: column; align-items: center; z-index: 10;';
                    videoContainer.appendChild(playPrompt);
                    
                    // Remove prompt when video plays
                    videoElement.onplaying = () => {
                        const prompt = videoContainer.querySelector('.play-prompt');
                        if (prompt) prompt.remove();
                    };
                }
            }
        };
        
        // Try to play immediately
        playWithFallback();
        
        // Also try after a short delay (gives more time for stream to initialize)
        setTimeout(playWithFallback, 1000);
    }
    
    /**
     * Handle user joined event
     * @param {string} userId - User ID
     */
    async handleUserJoined(userId) {
        console.log(`Setting up WebRTC connection with user ${userId}`);
        
        // Create peer connection with more comprehensive ICE server config
        const peerConnection = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' },
                // Add free TURN servers for better connectivity
                {
                    urls: 'turn:openrelay.metered.ca:80',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                },
                {
                    urls: 'turn:openrelay.metered.ca:443',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                },
                {
                    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                }
            ],
            iceCandidatePoolSize: 10,
            // Add additional options for better compatibility
            iceTransportPolicy: 'all',
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require',
            sdpSemantics: 'unified-plan'
        });
        
        this.peerConnections[userId] = peerConnection;
        console.log(`Created peer connection for user ${userId}`);
        
        // Add tracks from local stream to peer connection if available
        if (this.localStream) {
            const tracks = this.localStream.getTracks();
            console.log(`Adding ${tracks.length} local tracks to peer connection`);
            
            if (tracks.length > 0) {
                try {
                    tracks.forEach(track => {
                        try {
                            console.log(`Adding ${track.kind} track to peer connection`);
                            peerConnection.addTrack(track, this.localStream);
                        } catch (trackError) {
                            console.error(`Error adding ${track.kind} track:`, trackError);
                        }
                    });
                } catch (tracksError) {
                    console.error('Error adding tracks to peer connection:', tracksError);
                }
            } else {
                console.warn('No tracks in local stream to add to peer connection');
            }
        } else {
            console.warn('No local stream available to add to peer connection');
        }
        
        // Handle connection state changes
        peerConnection.onconnectionstatechange = () => {
            console.log(`Connection state changed to: ${peerConnection.connectionState} for user ${userId}`);
            
            if (peerConnection.connectionState === 'connected') {
                console.log(`Successfully connected to user ${userId}`);
            } else if (peerConnection.connectionState === 'failed' || 
                       peerConnection.connectionState === 'disconnected' || 
                       peerConnection.connectionState === 'closed') {
                console.log(`Connection with user ${userId} is ${peerConnection.connectionState}`);
                
                // Try to reconnect after a delay if failed or disconnected
                if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') {
                    setTimeout(() => {
                        if (this.peerConnections[userId]) {
                            console.log(`Attempting to reconnect with user ${userId}`);
                            // Clean up old connection
                            peerConnection.close();
                            delete this.peerConnections[userId];
                            
                            // Emit a rejoin event
                            this.socket.emit('rejoin-class', {
                                classId: this.currentClass._id,
                                userId: auth.getCurrentUser().id
                            });
                        }
                    }, 5000);
                }
            }
        };
        
        // Handle ICE connection state changes
        peerConnection.oniceconnectionstatechange = () => {
            console.log(`ICE connection state changed to: ${peerConnection.iceConnectionState} for user ${userId}`);
        };
        
        // Handle ICE gathering state changes
        peerConnection.onicegatheringstatechange = () => {
            console.log(`ICE gathering state changed to: ${peerConnection.iceGatheringState} for user ${userId}`);
        };
        
        // Handle signaling state changes
        peerConnection.onsignalingstatechange = () => {
            console.log(`Signaling state changed to: ${peerConnection.signalingState} for user ${userId}`);
        };
        
        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log(`Generated ICE candidate for user ${userId}:`, event.candidate.candidate.substring(0, 50) + '...');
                this.socket.emit('ice-candidate', {
                    userId: auth.getCurrentUser().id,
                    targetUserId: userId,
                    candidate: event.candidate
                });
            } else {
                console.log(`Finished generating ICE candidates for user ${userId}`);
            }
        };
        
        // Handle remote stream
        peerConnection.ontrack = (event) => {
            console.log(`Received track from user ${userId}:`, event.track.kind);
            
            if (!event.streams || event.streams.length === 0) {
                console.warn('Received track without stream');
                const stream = new MediaStream([event.track]);
                this.handleRemoteStream(stream, userId);
                return;
            }
            
            const remoteStream = event.streams[0];
            console.log(`Remote stream has ${remoteStream.getTracks().length} tracks`);
            
            // Handle the remote stream
            this.handleRemoteStream(remoteStream, userId);
        };
        
        // Create offer or wait for offer based on a consistent rule
        // We'll use user ID comparison to ensure only one side creates the offer
        const shouldCreateOffer = auth.getCurrentUser().id.localeCompare(userId) > 0;
        
        if (shouldCreateOffer) {
            try {
                console.log(`Creating offer for user ${userId}`);
                
                // Create offer with specific options for better compatibility
                const offer = await peerConnection.createOffer({
                    offerToReceiveAudio: true,
                    offerToReceiveVideo: true,
                    voiceActivityDetection: true,
                    iceRestart: true
                });
                
                console.log(`Offer created for user ${userId}`);
                
                // Set local description
                console.log(`Setting local description for user ${userId}`);
                await peerConnection.setLocalDescription(offer);
                
                // Send offer via socket
                console.log(`Sending offer to user ${userId}`);
                this.socket.emit('offer', {
                    userId: auth.getCurrentUser().id,
                    targetUserId: userId,
                    offer
                });
            } catch (error) {
                console.error(`Error creating offer for user ${userId}:`, error);
                alert(`Failed to establish connection with another user. Please try refreshing the page.`);
            }
        } else {
            console.log(`Waiting for offer from user ${userId}`);
        }
    }
    
    /**
     * Handle user left event
     * @param {string} userId - User ID
     */
    handleUserLeft(userId) {
        // Close peer connection
        if (this.peerConnections[userId]) {
            this.peerConnections[userId].close();
            delete this.peerConnections[userId];
        }
        
        // Remove video element
        const videoContainer = document.getElementById(`video-container-${userId}`);
        if (videoContainer) {
            videoContainer.remove();
        }
    }
    
    /**
     * Handle offer from another user
     * @param {string} userId - User ID
     * @param {RTCSessionDescriptionInit} offer - WebRTC offer
     */
    async handleOffer(userId, offer) {
        console.log(`Received offer from user ${userId}`);
        
        try {
            // Check if we already have a connection with this user
            if (!this.peerConnections[userId]) {
                console.log(`Creating new peer connection for user ${userId}`);
                
                // Create peer connection with more comprehensive ICE server config
                const peerConnection = new RTCPeerConnection({
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' },
                        { urls: 'stun:stun2.l.google.com:19302' },
                        { urls: 'stun:stun3.l.google.com:19302' },
                        { urls: 'stun:stun4.l.google.com:19302' },
                        // Add free TURN servers for better connectivity
                        {
                            urls: 'turn:openrelay.metered.ca:80',
                            username: 'openrelayproject',
                            credential: 'openrelayproject'
                        },
                        {
                            urls: 'turn:openrelay.metered.ca:443',
                            username: 'openrelayproject',
                            credential: 'openrelayproject'
                        },
                        {
                            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                            username: 'openrelayproject',
                            credential: 'openrelayproject'
                        }
                    ],
                    iceCandidatePoolSize: 10,
                    iceTransportPolicy: 'all',
                    bundlePolicy: 'max-bundle',
                    rtcpMuxPolicy: 'require',
                    sdpSemantics: 'unified-plan'
                });
                
                this.peerConnections[userId] = peerConnection;
                
                // Add tracks from local stream to peer connection if available
                if (this.localStream) {
                    const tracks = this.localStream.getTracks();
                    console.log(`Adding ${tracks.length} local tracks to peer connection`);
                    
                    tracks.forEach(track => {
                        try {
                            console.log(`Adding ${track.kind} track to peer connection`);
                            peerConnection.addTrack(track, this.localStream);
                        } catch (trackError) {
                            console.error(`Error adding ${track.kind} track:`, trackError);
                        }
                    });
                }
                
                // Handle connection state changes
                peerConnection.onconnectionstatechange = () => {
                    console.log(`Connection state changed to: ${peerConnection.connectionState} for user ${userId}`);
                };
                
                // Handle ICE connection state changes
                peerConnection.oniceconnectionstatechange = () => {
                    console.log(`ICE connection state changed to: ${peerConnection.iceConnectionState} for user ${userId}`);
                };
                
                // Handle ICE gathering state changes
                peerConnection.onicegatheringstatechange = () => {
                    console.log(`ICE gathering state changed to: ${peerConnection.iceGatheringState} for user ${userId}`);
                };
                
                // Handle signaling state changes
                peerConnection.onsignalingstatechange = () => {
                    console.log(`Signaling state changed to: ${peerConnection.signalingState} for user ${userId}`);
                };
                
                // Handle ICE candidates
                peerConnection.onicecandidate = (event) => {
                    if (event.candidate) {
                        console.log(`Generated ICE candidate for user ${userId}:`, event.candidate.candidate.substring(0, 50) + '...');
                        this.socket.emit('ice-candidate', {
                            userId: auth.getCurrentUser().id,
                            targetUserId: userId,
                            candidate: event.candidate
                        });
                    } else {
                        console.log(`Finished generating ICE candidates for user ${userId}`);
                    }
                };
                
                // Handle remote stream
                peerConnection.ontrack = (event) => {
                    console.log(`Received track from user ${userId}:`, event.track.kind);
                    
                    if (!event.streams || event.streams.length === 0) {
                        console.warn('Received track without stream');
                        const stream = new MediaStream([event.track]);
                        this.handleRemoteStream(stream, userId);
                        return;
                    }
                    
                    const remoteStream = event.streams[0];
                    console.log(`Remote stream has ${remoteStream.getTracks().length} tracks`);
                    
                    // Handle the remote stream
                    this.handleRemoteStream(remoteStream, userId);
                };
            }
            
            const peerConnection = this.peerConnections[userId];
            
            // Validate offer
            if (!offer || !offer.sdp) {
                throw new Error(`Invalid offer received from ${userId}`);
            }
            
            // Reset connection if in a problematic state
            if (peerConnection.signalingState !== 'stable' && 
                peerConnection.signalingState !== 'have-remote-offer') {
                console.log(`Resetting connection for ${userId} - current state: ${peerConnection.signalingState}`);
                await peerConnection.setLocalDescription({type: "rollback"});
            }
            
            // Set remote description
            console.log(`Setting remote description for ${userId}`);
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            console.log(`Remote description set for ${userId}. Creating answer...`);
            
            // Create and send answer
            const answer = await peerConnection.createAnswer();
            console.log(`Answer created for ${userId}`);
            
            await peerConnection.setLocalDescription(answer);
            console.log(`Local description (answer) set for ${userId}`);
            
            // Send answer to the user
            this.socket.emit('answer', {
                userId: auth.getCurrentUser().id, 
                targetUserId: userId, 
                answer: peerConnection.localDescription
            });
            console.log(`Answer sent to ${userId}`);
            
            // Log connection status after a short delay
            setTimeout(() => {
                if (peerConnection) {
                    console.log(`Connection status for ${userId} after 2s: 
                        ICE state: ${peerConnection.iceConnectionState}
                        Signaling state: ${peerConnection.signalingState}
                        Connection state: ${peerConnection.connectionState || 'unknown'}`);
                }
            }, 2000);
            
        } catch (error) {
            console.error(`Error handling offer from ${userId}:`, error);
        }
    }
    
    /**
     * Handle answer from another user
     * @param {string} userId - User ID
     * @param {RTCSessionDescription} answer - WebRTC answer
     */
    async handleAnswer(userId, answer) {
        console.log(`Received answer from user ${userId}`);
        
        try {
            if (!this.peerConnections[userId]) {
                console.error(`Received answer from user ${userId} but no peer connection exists`);
                return;
            }
            
            const peerConnection = this.peerConnections[userId];
            
            // Skip if already in stable state
            if (peerConnection.signalingState === 'stable') {
                console.warn(`Peer connection for user ${userId} is already in 'stable' state, skipping answer processing`);
                return;
            }
            
            // Validate answer
            if (!answer || !answer.sdp) {
                console.error(`Invalid answer received from ${userId}`);
                return;
            }
            
            console.log(`Setting remote description (answer) for user ${userId}`);
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            console.log(`Remote description set for user ${userId}, signaling state: ${peerConnection.signalingState}`);
            
            // Verify connection status and log
            setTimeout(() => {
                const connState = peerConnection.connectionState || 'unknown';
                const iceState = peerConnection.iceConnectionState;
                const signState = peerConnection.signalingState;
                
                console.log(`Connection status after 2s for user ${userId}:
                    Connection state: ${connState}
                    ICE state: ${iceState}
                    Signaling state: ${signState}`);
                
                if (connState !== 'connected' && iceState !== 'connected') {
                    console.warn(`Connection may not be fully established with user ${userId}, attempting to restart ICE`);
                    
                    // Try to restart ICE if connection hasn't been established
                    if (peerConnection.signalingState === 'stable') {
                        this.restartIceForPeer(userId, peerConnection);
                    }
                }
            }, 2000);
            
        } catch (error) {
            console.error(`Error handling answer from user ${userId}:`, error);
        }
    }
    
    /**
     * Restart ICE for a peer connection
     * @param {string} userId - User ID
     * @param {RTCPeerConnection} peerConnection - The peer connection
     */
    async restartIceForPeer(userId, peerConnection) {
        try {
            console.log(`Attempting to restart ICE for peer ${userId}`);
            
            // Only the offer creator should restart ICE
            const shouldCreateOffer = auth.getCurrentUser().id.localeCompare(userId) > 0;
            
            if (shouldCreateOffer) {
                console.log(`Creating new offer with ICE restart for ${userId}`);
                
                const offer = await peerConnection.createOffer({
                    iceRestart: true,
                    offerToReceiveAudio: true,
                    offerToReceiveVideo: true
                });
                
                await peerConnection.setLocalDescription(offer);
                
                this.socket.emit('offer', {
                    userId: auth.getCurrentUser().id,
                    targetUserId: userId,
                    offer
                });
                
                console.log(`ICE restart offer sent to ${userId}`);
            } else {
                console.log(`Waiting for ICE restart from ${userId}`);
            }
        } catch (error) {
            console.error(`Error restarting ICE for ${userId}:`, error);
        }
    }
    
    /**
     * Handle ICE candidate from another user
     * @param {string} userId - User ID
     * @param {RTCIceCandidate} candidate - ICE candidate
     */
    async handleIceCandidate(userId, candidate) {
        console.log(`Received ICE candidate from user ${userId}`, candidate ? candidate.candidate : 'null candidate');
        
        try {
            if (!this.peerConnections[userId]) {
                console.error(`Received ICE candidate for user ${userId} but no peer connection exists`);
                return;
            }
            
            const peerConnection = this.peerConnections[userId];
            
            // Skip null candidates
            if (!candidate || !candidate.candidate) {
                console.log(`Skipping null or empty ICE candidate from user ${userId}`);
                return;
            }
            
            console.log(`Adding ICE candidate for user ${userId}`);
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            console.log(`ICE candidate added for user ${userId}, current ICE connection state: ${peerConnection.iceConnectionState}`);
            
        } catch (error) {
            console.error(`Error handling ICE candidate from user ${userId}:`, error);
        }
    }
    
    /**
     * Handle local emotion detected
     * @param {Object} emotionData - The emotion data with emotion and confidence properties
     */
    handleLocalEmotionDetected(emotionData) {
        console.log('Local emotion detected:', emotionData);
        
        // Get current user ID
        const currentUser = auth.getCurrentUser();
        if (!currentUser || !currentUser._id) {
            console.error('No current user found - cannot process emotion');
            return;
        }
        
        const userId = currentUser._id;
        const { emotion, confidence } = emotionData;
        
        console.log('Updating local emotion badge:', userId, emotion, confidence);
        this.handleEmotionUpdate(userId, emotion, confidence);
        
        // Get current class ID
        const classId = this.currentClassId;
        if (!classId) {
            console.error('No class ID found, cannot send emotion data');
            return;
        }
        
        // Send to server via socket
        const socketData = { 
            userId,
            classId, 
            emotion, 
            confidence
        };
        
        console.log('Emitting emotion data via socket:', socketData);
        
        if (!this.socket || !this.socket.connected) {
            console.error('Socket not connected - cannot send emotion data');
            return;
        }
        
        this.socket.emit('emotion-data', socketData);
        
        // If this is a teacher, update the teacher's dashboard directly 
        if (auth.isTeacher()) {
            console.log('Teacher detected own emotion, updating dashboard');
            if (!this.classEmotions[emotion]) {
                this.classEmotions[emotion] = 0;
            }
            this.classEmotions[emotion]++;
            this.updateEmotionSummary();
        }
        
        // Record emotion in the database
        fetch(`${this.apiUrl}/api/class/${classId}/emotion`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth.getToken()}`
            },
            body: JSON.stringify({
                emotion: emotion,
                confidence: confidence
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to record emotion data');
            }
            return response.json();
        })
        .then(data => {
            console.log('Emotion recorded successfully:', data);
        })
        .catch(error => {
            console.error('Error recording emotion:', error);
        });
    }
    
    /**
     * Handle emotion update from another user
     * @param {string} userId - User ID
     * @param {string} emotion - Emotion name
     * @param {number} confidence - Confidence score
     */
    handleEmotionUpdate(userId, emotion, confidence) {
        console.log(`Processing emotion update: ${emotion} (${confidence.toFixed(2)}) from user ${userId}`);
        
        // Update emotion badge
        const emotionBadge = document.getElementById(`emotion-${userId}`);
        if (emotionBadge) {
            emotionBadge.textContent = emotion;
            emotionBadge.style.backgroundColor = EmotionDetector.getEmotionColor(emotion);
            console.log(`Updated emotion badge for user ${userId}`);
        } else {
            console.warn(`Emotion badge not found for user: ${userId}`);
        }
        
        // Update class emotions (for teachers only)
        if (auth.isTeacher()) {
            console.log(`Teacher view: updating class emotions for ${emotion}`);
            
            // Initialize emotion if not already in the map
            if (typeof this.classEmotions[emotion] === 'undefined') {
                console.warn(`Emotion ${emotion} was undefined in classEmotions, initializing to 0`);
                this.classEmotions[emotion] = 0;
            }
            
            // Increment emotion count
            this.classEmotions[emotion]++;
            console.log(`Current emotion counts:`, this.classEmotions);
            
            // Update chart data
            this.chartData.datasets[0].data = [
                this.classEmotions.angry || 0,
                this.classEmotions.disgusted || 0,
                this.classEmotions.fearful || 0,
                this.classEmotions.happy || 0,
                this.classEmotions.neutral || 0,
                this.classEmotions.sad || 0,
                this.classEmotions.surprised || 0
            ];
            
            // Update chart
            if (this.chart) {
                console.log(`Updating emotion chart with data:`, this.chartData.datasets[0].data);
                this.chart.update();
            } else {
                console.warn('Chart not initialized, initializing now');
                this.initializeChart();
            }
            
            // Update emotion summary
            this.updateEmotionSummary();
            
            // Make sure the emotions dashboard is visible
            if (this.emotionsDashboard) {
                this.emotionsDashboard.style.display = 'block';
            }
        } else {
            console.log('Student view: not updating class emotions');
        }
    }
    
    /**
     * Update emotion summary
     */
    updateEmotionSummary() {
        if (!this.emotionSummary) {
            console.warn('Emotion summary element not found');
            return;
        }
        
        // Get dominant emotion
        let dominantEmotion = 'neutral';
        let maxCount = 0;
        
        console.log('Updating emotion summary with data:', this.classEmotions);
        
        for (const [emotion, count] of Object.entries(this.classEmotions)) {
            if (count > maxCount) {
                maxCount = count;
                dominantEmotion = emotion;
            }
        }
        
        // Get total emotion count - make sure we're treating values correctly
        const totalCount = Object.values(this.classEmotions).reduce((sum, count) => sum + (Number(count) || 0), 0);
        console.log(`Total emotion count: ${totalCount}, dominant emotion: ${dominantEmotion}`);
        
        // Calculate percentages - ensure division by zero protection and proper rounding
        const percentages = {};
        for (const emotion of ['angry', 'disgusted', 'fearful', 'happy', 'neutral', 'sad', 'surprised']) {
            const count = Number(this.classEmotions[emotion] || 0);
            percentages[emotion] = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
            console.log(`Emotion ${emotion}: count=${count}, percentage=${percentages[emotion]}%`);
        }
        
        // Generate summary HTML
        let summaryHtml = `
            <div class="emotion-summary-header">
                <h3>Class Emotions</h3>
                <p><strong>Dominant Emotion:</strong> <span class="dominant-emotion" style="background-color: ${EmotionDetector.getEmotionColor(dominantEmotion)}">${dominantEmotion.charAt(0).toUpperCase() + dominantEmotion.slice(1)}</span></p>
            </div>
            <div class="emotion-breakdown">
                <p><strong>Emotion Breakdown:</strong></p>
                <ul class="emotion-list">
        `;
        
        for (const emotion of ['happy', 'neutral', 'sad', 'angry', 'fearful', 'surprised', 'disgusted']) {
            summaryHtml += `
                <li class="emotion-item">
                    <i class="${EmotionDetector.getEmotionIcon(emotion)}" style="color: ${EmotionDetector.getEmotionColor(emotion)}"></i>
                    <span class="emotion-name">${emotion.charAt(0).toUpperCase() + emotion.slice(1)}</span>
                    <div class="progress-bar">
                        <div class="progress" style="width: ${percentages[emotion]}%; background-color: ${EmotionDetector.getEmotionColor(emotion)}"></div>
                    </div>
                    <span class="percentage">${percentages[emotion]}%</span>
                </li>
            `;
        }
        
        summaryHtml += `
                </ul>
            </div>
        `;
        
        // Set summary HTML
        this.emotionSummary.innerHTML = summaryHtml;
        console.log('Updated emotion summary with total count:', totalCount);
    }
    
    /**
     * Toggle video
     */
    toggleVideo() {
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            
            if (videoTrack) {
                this.isVideoEnabled = !this.isVideoEnabled;
                videoTrack.enabled = this.isVideoEnabled;
                
                // Update button icon
                const icon = this.toggleVideoBtn.querySelector('i');
                icon.className = this.isVideoEnabled ? 'fas fa-video' : 'fas fa-video-slash';
            }
        }
    }
    
    /**
     * Toggle audio
     */
    toggleAudio() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            
            if (audioTrack) {
                this.isAudioEnabled = !this.isAudioEnabled;
                audioTrack.enabled = this.isAudioEnabled;
                
                // Update button icon
                const icon = this.toggleAudioBtn.querySelector('i');
                icon.className = this.isAudioEnabled ? 'fas fa-microphone' : 'fas fa-microphone-slash';
            }
        }
    }
    
    /**
     * Toggle screen sharing
     */
    async toggleScreenShare() {
        if (this.isScreenSharing) {
            // Stop screen sharing
            if (this.screenStream) {
                this.screenStream.getTracks().forEach(track => track.stop());
                this.screenStream = null;
            }
            
            // Switch back to camera
            if (this.localStream) {
                const videoTrack = this.localStream.getVideoTracks()[0];
                
                // Replace track in all peer connections
                for (const connection of Object.values(this.peerConnections)) {
                    const sender = connection.getSenders().find(s => s.track && s.track.kind === 'video');
                    if (sender) {
                        sender.replaceTrack(videoTrack);
                    }
                }
                
                // Update local video
                if (auth.isTeacher()) {
                    this.teacherVideo.srcObject = this.localStream;
                } else {
                    const videoElement = document.getElementById(`video-${auth.getCurrentUser().id}`);
                    if (videoElement) {
                        videoElement.srcObject = this.localStream;
                    }
                }
            }
            
            // Update button
            const icon = this.shareScreenBtn.querySelector('i');
            icon.className = 'fas fa-desktop';
            
            this.isScreenSharing = false;
        } else {
            try {
                // Start screen sharing
                this.screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: { cursor: 'always' },
                    audio: false
                });
                
                const screenTrack = this.screenStream.getVideoTracks()[0];
                
                // Replace track in all peer connections
                for (const connection of Object.values(this.peerConnections)) {
                    const sender = connection.getSenders().find(s => s.track && s.track.kind === 'video');
                    if (sender) {
                        sender.replaceTrack(screenTrack);
                    }
                }
                
                // Update local video
                if (auth.isTeacher()) {
                    this.teacherVideo.srcObject = this.screenStream;
                } else {
                    const videoElement = document.getElementById(`video-${auth.getCurrentUser().id}`);
                    if (videoElement) {
                        videoElement.srcObject = this.screenStream;
                    }
                }
                
                // Handle screen sharing ending
                screenTrack.onended = () => {
                    this.toggleScreenShare();
                };
                
                // Update button
                const icon = this.shareScreenBtn.querySelector('i');
                icon.className = 'fas fa-stop';
                
                this.isScreenSharing = true;
            } catch (error) {
                console.error('Error sharing screen:', error);
            }
        }
    }
    
    /**
     * Leave class
     */
    leaveClass() {
        // Stop emotion detection
        emotionDetector.stop();
        
        // Stop local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        // Stop screen sharing
        if (this.screenStream) {
            this.screenStream.getTracks().forEach(track => track.stop());
            this.screenStream = null;
        }
        
        // Close all peer connections
        for (const connection of Object.values(this.peerConnections)) {
            connection.close();
        }
        this.peerConnections = {};
        
        // Leave socket room
        if (this.socket) {
            this.socket.emit('leave-class', {
                classId: this.currentClass._id,
                userId: auth.getCurrentUser().id
            });
        }
        
        // Clear class data
        this.currentClass = null;
        
        // Reset emotion data
        this.classEmotions = {
            angry: 0,
            disgusted: 0,
            fearful: 0,
            happy: 0,
            neutral: 0,
            sad: 0,
            surprised: 0
        };
        
        // Reset chart data
        if (this.chart) {
            this.chartData.datasets[0].data = [0, 0, 0, 0, 0, 0, 0];
            this.chart.update();
            this.chart.destroy();
            this.chart = null;
        }
        
        // Clear video elements
        this.teacherVideo.srcObject = null;
        this.studentsGrid.innerHTML = '';
        
        // Go back to class detail page
        this.hideLiveClassPage();
        window.classesManager.showClassDetailPage();
    }
    
    /**
     * Show live class page
     */
    showLiveClassPage() {
        this.liveClassPage.style.display = 'block';
        window.classesManager.classDetailPage.style.display = 'none';
    }
    
    /**
     * Hide live class page
     */
    hideLiveClassPage() {
        this.liveClassPage.style.display = 'none';
    }

    /**
     * Start emotion detection for local stream
     */
    startEmotionDetection() {
        if (!this.isTeacher) {
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            // Adjust timing based on device type
            const detectionInterval = isMobile ? 3000 : 1500; // Less frequent on mobile to save resources
            
            console.log(`Starting emotion detection with ${detectionInterval}ms interval`);
            
            // Clear any existing interval
            if (this.emotionInterval) {
                clearInterval(this.emotionInterval);
            }
            
            this.emotionInterval = setInterval(async () => {
                try {
                    if (!this.localVideoEl || !this.socket || !this.socket.connected) {
                        console.warn('Missing requirements for emotion detection, skipping cycle');
                        return;
                    }
                    
                    // Capture frame from video
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    
                    // Resize for more efficient analysis on mobile
                    const width = isMobile ? 160 : 320;
                    const height = isMobile ? 120 : 240;
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    // Draw video frame to canvas, potentially resizing it
                    context.drawImage(this.localVideoEl, 0, 0, width, height);
                    
                    // Convert to base64 with reduced quality for mobile
                    const quality = isMobile ? 0.6 : 0.8;
                    const imageData = canvas.toDataURL('image/jpeg', quality);
                    
                    // Get current user data
                    const userId = this.userId;
                    const userName = this.userName || 'Student';
                    
                    // Check if we have valid data and connection
                    if (!userId || !imageData || !this.socket.connected) {
                        console.warn('Missing data for emotion analysis:', { 
                            hasUserId: !!userId, 
                            hasImageData: !!imageData,
                            socketConnected: this.socket && this.socket.connected
                        });
                        return;
                    }
                    
                    // Update UI to show processing state
                    this.updateEmotionBadge('processing');
                    
                    // Send frame for emotion detection with user data
                    console.log(`Sending frame for emotion detection for user ${userId}`);
                    this.socket.emit('analyze-emotion', {
                        userId: userId,
                        userName: userName,
                        imageData: imageData,
                        timestamp: Date.now(),
                        roomId: this.roomId
                    });
                } catch (error) {
                    console.error('Error in emotion detection cycle:', error);
                }
            }, detectionInterval);
        }
    }

    /**
     * Update emotion badge display
     * @param {string} emotion The detected emotion
     */
    updateEmotionBadge(emotion) {
        if (!this.emotionBadgeEl) {
            // Create emotion badge if it doesn't exist
            this.emotionBadgeEl = document.createElement('div');
            this.emotionBadgeEl.className = 'emotion-badge';
            this.emotionBadgeEl.style.cssText = 'position: absolute; bottom: 10px; left: 10px; padding: 5px 10px; ' +
                'border-radius: 20px; font-size: 12px; color: white; z-index: 5; text-transform: capitalize;';
            
            // Add to local video container
            const videoContainer = document.querySelector('.local-video-container');
            if (videoContainer) {
                videoContainer.appendChild(this.emotionBadgeEl);
            } else {
                console.warn('Local video container not found for emotion badge');
                return;
            }
        }
        
        // Maps emotions to colors
        const emotionColors = {
            'angry': '#FF4136',
            'disgust': '#B10DC9',
            'fear': '#FF851B',
            'happy': '#2ECC40',
            'sad': '#0074D9',
            'surprise': '#FFDC00',
            'neutral': '#AAAAAA',
            'processing': '#DDDDDD'
        };
        
        // Handle processing state
        if (emotion === 'processing') {
            this.emotionBadgeEl.textContent = '...';
            this.emotionBadgeEl.style.backgroundColor = emotionColors.processing;
            return;
        }
        
        const color = emotionColors[emotion] || '#AAAAAA';
        
        // Update badge text and color
        this.emotionBadgeEl.textContent = emotion;
        this.emotionBadgeEl.style.backgroundColor = color;
        
        // Add a small animation for feedback
        this.emotionBadgeEl.style.transition = 'transform 0.2s';
        this.emotionBadgeEl.style.transform = 'scale(1.2)';
        setTimeout(() => {
            if (this.emotionBadgeEl) {
                this.emotionBadgeEl.style.transform = 'scale(1)';
            }
        }, 200);
    }

    /**
     * Setup the emotion dashboard for teachers
     * @param {HTMLElement} container The container element for the dashboard
     */
    setupEmotionDashboard(container) {
        if (!this.isTeacher || !container) return;
        
        console.log('Setting up emotion dashboard for teacher');
        
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Create dashboard elements
        const dashboardEl = document.createElement('div');
        dashboardEl.className = 'emotion-dashboard';
        dashboardEl.style.cssText = 'background-color: rgba(0,0,0,0.7); border-radius: 10px; ' +
            'padding: 15px; margin-top: 15px; color: white; width: 100%; overflow-y: auto; ' +
            `max-height: ${isMobile ? '150px' : '300px'};`;
        
        // Dashboard title
        const titleEl = document.createElement('h3');
        titleEl.textContent = 'Class Emotion Dashboard';
        titleEl.style.cssText = 'font-size: 16px; margin-bottom: 10px; text-align: center;';
        dashboardEl.appendChild(titleEl);
        
        // Chart container for emotion breakdown
        const chartContainer = document.createElement('div');
        chartContainer.id = 'emotion-chart-container';
        chartContainer.style.cssText = 'width: 100%; height: 150px; margin-bottom: 10px;';
        dashboardEl.appendChild(chartContainer);
        
        // Student emotions list
        const listEl = document.createElement('div');
        listEl.className = 'student-emotions-list';
        listEl.style.cssText = 'display: flex; flex-direction: column; gap: 5px; ' +
            'font-size: 12px; max-height: 150px; overflow-y: auto;';
        dashboardEl.appendChild(listEl);
        
        // Append to main container
        container.appendChild(dashboardEl);
        
        // Store references
        this.emotionDashboardEl = dashboardEl;
        this.studentEmotionsListEl = listEl;
        
        // Initialize chart if Chart.js is available
        if (window.Chart) {
            this.initializeEmotionChart();
        } else {
            console.warn('Chart.js not available for emotion dashboard');
        }
        
        // Setup emotion data processing
        this.setupEmotionDataHandling();
    }

    /**
     * Initialize emotion chart for the teacher dashboard
     */
    initializeEmotionChart() {
        if (!window.Chart) {
            console.warn('Chart.js is required for emotion visualization');
            return;
        }
        
        const ctx = document.createElement('canvas');
        ctx.id = 'emotion-chart';
        ctx.style.cssText = 'width: 100%; height: 100%;';
        
        const chartContainer = document.getElementById('emotion-chart-container');
        if (chartContainer) {
            chartContainer.appendChild(ctx);
            
            // Initialize Chart.js instance
            this.emotionChart = new window.Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Happy', 'Neutral', 'Sad', 'Angry', 'Fear', 'Surprise', 'Disgust'],
                    datasets: [{
                        data: [0, 0, 0, 0, 0, 0, 0],
                        backgroundColor: [
                            '#2ECC40', // Happy
                            '#AAAAAA', // Neutral
                            '#0074D9', // Sad
                            '#FF4136', // Angry
                            '#FF851B', // Fear
                            '#FFDC00', // Surprise
                            '#B10DC9'  // Disgust
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    legend: {
                        position: 'bottom',
                        labels: {
                            fontColor: 'white',
                            fontSize: 10
                        }
                    },
                    animation: {
                        duration: 500
                    }
                }
            });
        }
    }

    /**
     * Setup handlers for emotion data received from students
     */
    setupEmotionDataHandling() {
        if (!this.isTeacher || !this.socket) return;
        
        // Reset emotion data
        this.emotionData = {};
        
        // Listen for emotion-data events
        this.socket.on('emotion-data', (data) => {
            if (!data || !data.userId || !data.emotion) {
                console.warn('Received invalid emotion data:', data);
                return;
            }
            
            console.log('Received emotion data:', data);
            
            // Update emotion data with timestamp
            this.emotionData[data.userId] = {
                emotion: data.emotion,
                userName: data.userName || 'Student',
                timestamp: data.timestamp || Date.now()
            };
            
            // Update dashboard
            this.updateEmotionDashboard();
        });
    }

    /**
     * Update the emotion dashboard with the latest data
     */
    updateEmotionDashboard() {
        if (!this.isTeacher || !this.studentEmotionsListEl) return;
        
        // Clear current list
        this.studentEmotionsListEl.innerHTML = '';
        
        const emotionCounts = {
            'happy': 0,
            'neutral': 0,
            'sad': 0,
            'angry': 0,
            'fear': 0,
            'surprise': 0,
            'disgust': 0
        };
        
        const emotionColors = {
            'angry': '#FF4136',
            'disgust': '#B10DC9',
            'fear': '#FF851B',
            'happy': '#2ECC40',
            'sad': '#0074D9',
            'surprise': '#FFDC00',
            'neutral': '#AAAAAA'
        };
        
        // Process all student emotion data
        const now = Date.now();
        const dataAge = 60000; // Consider data valid for 1 minute
        
        Object.keys(this.emotionData).forEach(userId => {
            const data = this.emotionData[userId];
            
            // Skip old data
            if (now - data.timestamp > dataAge) return;
            
            // Count emotions for chart
            if (emotionCounts.hasOwnProperty(data.emotion)) {
                emotionCounts[data.emotion]++;
            }
            
            // Create user emotion indicator
            const userEmotionEl = document.createElement('div');
            userEmotionEl.className = 'student-emotion-item';
            userEmotionEl.style.cssText = 'display: flex; justify-content: space-between; ' +
                'align-items: center; padding: 3px 8px; border-radius: 5px; ' +
                'background-color: rgba(255,255,255,0.1);';
            
            // Student name
            const nameEl = document.createElement('span');
            nameEl.textContent = data.userName;
            nameEl.style.cssText = 'flex: 1;';
            userEmotionEl.appendChild(nameEl);
            
            // Emotion badge
            const emotionEl = document.createElement('span');
            emotionEl.textContent = data.emotion;
            emotionEl.style.cssText = `background-color: ${emotionColors[data.emotion] || '#AAAAAA'}; ` +
                'padding: 2px 6px; border-radius: 10px; font-size: 10px; text-transform: capitalize;';
            userEmotionEl.appendChild(emotionEl);
            
            // Add to list
            this.studentEmotionsListEl.appendChild(userEmotionEl);
        });
        
        // Update chart if available
        if (this.emotionChart) {
            this.emotionChart.data.datasets[0].data = [
                emotionCounts.happy,
                emotionCounts.neutral,
                emotionCounts.sad,
                emotionCounts.angry,
                emotionCounts.fear,
                emotionCounts.surprise,
                emotionCounts.disgust
            ];
            this.emotionChart.update();
        }
        
        // Show message if no data
        if (this.studentEmotionsListEl.children.length === 0) {
            const noDataEl = document.createElement('div');
            noDataEl.textContent = 'No emotion data available yet';
            noDataEl.style.cssText = 'text-align: center; opacity: 0.6; padding: 5px;';
            this.studentEmotionsListEl.appendChild(noDataEl);
        }
    }
}

// Create live class manager instance
const liveClassManager = new LiveClassManager();

// Export live class manager
window.liveClassManager = liveClassManager; 