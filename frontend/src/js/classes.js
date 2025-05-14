/**
 * Classes Module
 * Handles class management and UI
 */
class ClassesManager {
    constructor() {
        // DOM Elements
        this.classesPage = document.getElementById('classes-page');
        this.classesList = document.getElementById('classes-list');
        this.teacherControls = document.getElementById('teacher-controls');
        this.createClassBtn = document.getElementById('create-class-btn');
        this.createClassModal = document.getElementById('create-class-modal');
        this.createClassForm = document.getElementById('create-class-form');
        this.createClassError = document.getElementById('create-class-error');
        
        // Class detail elements
        this.classDetailPage = document.getElementById('class-detail-page');
        this.className = document.getElementById('class-name');
        this.classDescription = document.getElementById('class-description');
        this.classTeacher = document.getElementById('class-teacher');
        this.classSchedule = document.getElementById('class-schedule');
        this.studentList = document.getElementById('student-list');
        this.classControls = document.getElementById('class-controls');
        this.backToClassesBtn = document.getElementById('back-to-classes-btn');
        
        // Current class data
        this.classes = [];
        this.currentClass = null;
        
        // Debug flag
        this.debug = true;
        this.logDebug('Classes Manager initialized');
        
        // Initialize
        this.init();
    }
    
    /**
     * Log debug information
     * @param {string} message - Debug message
     * @param {Object} data - Optional data to log
     */
    logDebug(message, data) {
        if (this.debug) {
            console.log(`[Classes] ${message}`, data || '');
            
            // Add to mobile debug overlay if it exists
            if (window.innerWidth < 768) {
                const debugElement = document.getElementById('mobile-debug');
                if (debugElement) {
                    const logEntry = document.createElement('div');
                    logEntry.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
                    debugElement.appendChild(logEntry);
                    
                    // Keep only the last 10 messages
                    while (debugElement.children.length > 10) {
                        debugElement.removeChild(debugElement.firstChild);
                    }
                }
            }
        }
    }
    
    /**
     * Initialize classes manager
     */
    init() {
        // Setup event listeners
        this.setupEventListeners();
        
        // Listen for auth state changes
        auth.addAuthListener((isAuthenticated, user) => {
            this.logDebug(`Auth state changed: Authenticated=${isAuthenticated}`, user);
            if (isAuthenticated) {
                this.teacherControls.style.display = auth.isTeacher() ? 'block' : 'none';
                this.loadClasses();
            } else {
                this.classes = [];
                this.renderClasses();
            }
        });
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Create class button
        this.createClassBtn.addEventListener('click', () => {
            this.showCreateClassModal();
        });
        
        // Create class form
        this.createClassForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleCreateClass();
        });
        
        // Back to classes button
        this.backToClassesBtn.addEventListener('click', () => {
            this.showClassesPage();
        });
    }
    
    /**
     * Show create class modal
     */
    showCreateClassModal() {
        this.createClassModal.classList.add('active');
    }
    
    /**
     * Handle create class form submission
     */
    async handleCreateClass() {
        const name = document.getElementById('class-name-input').value;
        const description = document.getElementById('class-description-input').value;
        const day = document.getElementById('class-day-input').value;
        const startTime = document.getElementById('class-start-time-input').value;
        const endTime = document.getElementById('class-end-time-input').value;
        
        try {
            const response = await api.createClass({
                name,
                description,
                schedule: {
                    day,
                    startTime,
                    endTime,
                    recurring: true
                }
            });
            
            // Add new class to list
            this.classes.push(response.class);
            
            // Render classes
            this.renderClasses();
            
            // Clear form and close modal
            this.createClassForm.reset();
            this.createClassModal.classList.remove('active');
            
        } catch (error) {
            this.createClassError.textContent = error.message || 'Failed to create class. Please try again.';
        }
    }
    
    /**
     * Load classes from API
     */
    async loadClasses() {
        try {
            this.logDebug('Loading classes...');
            this.classesList.innerHTML = '<div class="loading">Loading your classes...</div>';
            
            const response = await api.getClasses();
            this.logDebug('Classes loaded successfully', response);
            
            this.classes = response.classes || [];
            this.renderClasses();
        } catch (error) {
            this.logDebug('Failed to load classes', error);
            console.error('Failed to load classes:', error);
            this.classesList.innerHTML = `
                <div class="error">
                    Failed to load classes. Please try again later.
                    <button class="btn btn-primary" id="retry-load-classes">Retry</button>
                    <div class="error-details">Error: ${error.message}</div>
                </div>
            `;
            
            // Add retry button event listener
            document.getElementById('retry-load-classes').addEventListener('click', () => {
                this.loadClasses();
            });
        }
    }
    
    /**
     * Render classes list
     */
    renderClasses() {
        if (!auth.getIsAuthenticated()) {
            this.logDebug('User not authenticated, showing login message');
            this.classesList.innerHTML = '<div class="loading">Please login to view your classes</div>';
            return;
        }
        
        // Always add a Join Class with Code box for students at the top
        let html = '';
        if (auth.isStudent()) {
            html += `
                <div class="join-class-by-code">
                    <h3>Join a Class</h3>
                    <p class="join-class-help">Ask your teacher for the Class ID to join their class</p>
                    <form id="join-class-form" class="join-class-form">
                        <div class="form-group">
                            <label for="class-code-input">Enter Class ID</label>
                            <input type="text" id="class-code-input" class="form-control" placeholder="Enter the Class ID provided by your teacher" required>
                            <small class="form-text text-muted">The Class ID looks like: 64a7b8c9d0e1f2g3h4i5j6k7</small>
                        </div>
                        <button type="submit" class="btn btn-primary">Join Class</button>
                    </form>
                </div>
            `;
        }
        
        if (!this.classes || this.classes.length === 0) {
            this.logDebug('No classes found');
            this.classesList.innerHTML = html + '<div class="loading">No classes found. ' + 
                (auth.isTeacher() ? 'Create a class to get started.' : 'Join a class using the form above.') + '</div>';
            
            // Add event listener for join class form if student
            if (auth.isStudent()) {
                document.getElementById('join-class-form').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const classId = document.getElementById('class-code-input').value.trim();
                    if (classId) {
                        try {
                            this.logDebug(`Joining class with ID: ${classId}`);
                            await api.joinClass(classId);
                            this.loadClasses(); // Reload classes after joining
                        } catch (error) {
                            this.logDebug('Failed to join class', error);
                            alert(`Failed to join class: ${error.message}`);
                        }
                    }
                });
            }
            
            return;
        }
        
        this.logDebug(`Rendering ${this.classes.length} classes`);
        
        html += '<div class="classes-grid">';
        this.classes.forEach(classItem => {
            html += `
                <div class="class-card" data-id="${classItem._id}">
                    <div class="class-card-header">
                        <h3>${classItem.name}</h3>
                    </div>
                    <div class="class-card-body">
                        <p>${classItem.description}</p>
                        <p><strong>Day:</strong> ${classItem.schedule.day}</p>
                        <p><strong>Time:</strong> ${classItem.schedule.startTime} - ${classItem.schedule.endTime}</p>
                        ${auth.isTeacher() && classItem.teacher._id === auth.getCurrentUser().id ? 
                        `<p class="class-id-info"><strong>Class ID:</strong> <span class="class-id">${classItem._id}</span></p>` : ''}
                    </div>
                    <div class="class-card-footer">
                        <button class="btn btn-primary view-class-btn" data-id="${classItem._id}">View Class</button>
                        ${classItem.active ? '<span class="active-class-badge">Live</span>' : ''}
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        this.classesList.innerHTML = html;
        
        // Add event listeners to view class buttons
        document.querySelectorAll('.view-class-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const classId = e.target.getAttribute('data-id');
                this.viewClass(classId);
            });
        });
    }
    
    /**
     * View class details
     * @param {string} classId - Class ID
     */
    async viewClass(classId) {
        try {
            const response = await api.getClass(classId);
            this.currentClass = response.class;
            this.renderClassDetails();
            this.showClassDetailPage();
        } catch (error) {
            console.error('Failed to load class details:', error);
            alert('Failed to load class details. Please try again.');
        }
    }
    
    /**
     * Render class details
     */
    renderClassDetails() {
        const classItem = this.currentClass;
        
        if (!classItem) {
            return;
        }
        
        // Set class details
        this.className.textContent = classItem.name;
        this.classDescription.textContent = classItem.description;
        this.classTeacher.textContent = classItem.teacher.name;
        this.classSchedule.textContent = `${classItem.schedule.day}, ${classItem.schedule.startTime} - ${classItem.schedule.endTime}`;
        
        // Add class ID section for teachers to share
        if (auth.isTeacher() && classItem.teacher._id === auth.getCurrentUser().id) {
            const classIdSection = `
                <div class="class-id-section">
                    <h4>Class ID (Share with students)</h4>
                    <div class="class-id-display">
                        <span id="class-id-value">${classItem._id}</span>
                        <button id="copy-class-id" class="btn btn-sm btn-secondary">Copy</button>
                    </div>
                    <p class="class-id-help">Students need this ID to join your class</p>
                </div>
            `;
            // Insert after class schedule
            const scheduleElement = this.classSchedule.parentNode;
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = classIdSection;
            scheduleElement.parentNode.insertBefore(tempDiv.firstElementChild, scheduleElement.nextSibling);
            
            // Add copy functionality
            document.getElementById('copy-class-id').addEventListener('click', () => {
                const classId = document.getElementById('class-id-value').textContent;
                navigator.clipboard.writeText(classId)
                    .then(() => {
                        alert('Class ID copied to clipboard!');
                    })
                    .catch(err => {
                        console.error('Could not copy text: ', err);
                    });
            });
        }
        
        // Render student list
        let studentListHtml = '';
        
        if (classItem.students.length === 0) {
            studentListHtml = '<li>No students enrolled yet</li>';
        } else {
            classItem.students.forEach(student => {
                studentListHtml += `<li>${student.name}</li>`;
            });
        }
        
        this.studentList.innerHTML = studentListHtml;
        
        // Render class controls based on user role
        let controlsHtml = '';
        
        if (auth.isTeacher() && classItem.teacher._id === auth.getCurrentUser().id) {
            // Teacher controls
            if (classItem.active) {
                controlsHtml = `
                    <button id="enter-class-btn" class="btn btn-primary">Enter Live Class</button>
                    <button id="end-class-btn" class="btn btn-danger">End Class</button>
                `;
            } else {
                controlsHtml = `
                    <button id="start-class-btn" class="btn btn-primary">Start Class</button>
                `;
            }
        } else if (auth.isStudent()) {
            // Student controls
            const isEnrolled = classItem.students.some(student => student._id === auth.getCurrentUser().id);
            
            if (isEnrolled) {
                if (classItem.active) {
                    controlsHtml = `
                        <button id="join-live-class-btn" class="btn btn-primary">Join Live Class</button>
                    `;
                } else {
                    controlsHtml = `
                        <span class="class-status">Class not in session</span>
                    `;
                }
            } else {
                controlsHtml = `
                    <button id="join-class-btn" class="btn btn-primary">Join Class</button>
                `;
            }
        }
        
        this.classControls.innerHTML = controlsHtml;
        
        // Add event listeners to control buttons
        this.setupClassControlListeners();
    }
    
    /**
     * Setup class control button listeners
     */
    setupClassControlListeners() {
        // Start class button
        const startClassBtn = document.getElementById('start-class-btn');
        if (startClassBtn) {
            startClassBtn.addEventListener('click', async () => {
                await this.startClass();
            });
        }
        
        // End class button
        const endClassBtn = document.getElementById('end-class-btn');
        if (endClassBtn) {
            endClassBtn.addEventListener('click', async () => {
                await this.endClass();
            });
        }
        
        // Join class button
        const joinClassBtn = document.getElementById('join-class-btn');
        if (joinClassBtn) {
            joinClassBtn.addEventListener('click', async () => {
                await this.joinClass();
            });
        }
        
        // Enter live class button (for teachers)
        const enterClassBtn = document.getElementById('enter-class-btn');
        if (enterClassBtn) {
            enterClassBtn.addEventListener('click', () => {
                window.liveClassManager.startLiveClass(this.currentClass);
            });
        }
        
        // Join live class button (for students)
        const joinLiveClassBtn = document.getElementById('join-live-class-btn');
        if (joinLiveClassBtn) {
            joinLiveClassBtn.addEventListener('click', () => {
                window.liveClassManager.joinLiveClass(this.currentClass);
            });
        }
    }
    
    /**
     * Start a class
     */
    async startClass() {
        try {
            await api.startClass(this.currentClass._id);
            
            // Update current class
            const response = await api.getClass(this.currentClass._id);
            this.currentClass = response.class;
            
            // Refresh class details
            this.renderClassDetails();
            
            // Enter live class
            window.liveClassManager.startLiveClass(this.currentClass);
        } catch (error) {
            console.error('Failed to start class:', error);
            alert('Failed to start class. Please try again.');
        }
    }
    
    /**
     * End a class
     */
    async endClass() {
        try {
            await api.endClass(this.currentClass._id);
            
            // Update current class
            const response = await api.getClass(this.currentClass._id);
            this.currentClass = response.class;
            
            // Refresh class details
            this.renderClassDetails();
        } catch (error) {
            console.error('Failed to end class:', error);
            alert('Failed to end class. Please try again.');
        }
    }
    
    /**
     * Join a class (for students)
     */
    async joinClass() {
        try {
            await api.joinClass(this.currentClass._id);
            
            // Update current class
            const response = await api.getClass(this.currentClass._id);
            this.currentClass = response.class;
            
            // Refresh class details
            this.renderClassDetails();
        } catch (error) {
            console.error('Failed to join class:', error);
            alert('Failed to join class. Please try again.');
        }
    }
    
    /**
     * Show classes page
     */
    showClassesPage() {
        this.classesPage.style.display = 'block';
        this.classDetailPage.style.display = 'none';
        
        // Reload classes to get updated data
        this.loadClasses();
    }
    
    /**
     * Show class detail page
     */
    showClassDetailPage() {
        this.classesPage.style.display = 'none';
        this.classDetailPage.style.display = 'block';
    }
}

// Create classes manager instance
const classesManager = new ClassesManager();

// Export classes manager
window.classesManager = classesManager; 