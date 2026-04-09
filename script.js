// Premium Holter Monitor Application
class PremiumHolterMonitor {
    constructor() {
        this.deviceConnected = true;
        this.currentConnection = 'bluetooth';
        this.ecgData = {};
        this.recordings = this.loadRecordings();
        this.alerts = [];
        this.activeLeads = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
        this.charts = {};
        this.simulationInterval = null;
        this.pieChart = null;
        this.trendChart = null;
        this.currentPage = 'dashboard';
        this.patients = this.loadPatients();
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.setupECGSimulation();
        this.loadRecordingsList();
        this.loadPatientsList();
        this.initCharts();
        this.setupNavigation();
        this.loadConfig();
        this.startRealTimeMonitoring();
        this.initCustomCursor();
        this.populateLeadDropdown();
    }
    
    bindEvents() {
        // Connection buttons
        document.querySelectorAll('.conn-option').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchConnection(btn.dataset.conn));
        });
        
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                this.switchPage(page);
            });
        });
        
        // Generate report
        const generateBtn = document.getElementById('generateReportBtn');
        if (generateBtn) generateBtn.addEventListener('click', () => this.generateReport());
        
        // Save settings
        const saveSettings = document.getElementById('saveAllSettings');
        if (saveSettings) saveSettings.addEventListener('click', () => this.saveAllSettings());
        
        // Reset settings
        const resetSettings = document.getElementById('resetSettings');
        if (resetSettings) resetSettings.addEventListener('click', () => this.resetAllSettings());
        
        // Add patient
        const addPatientBtn = document.getElementById('addPatientBtn');
        if (addPatientBtn) addPatientBtn.addEventListener('click', () => this.addNewPatient());
        
        // Run analysis
        const runAnalysis = document.getElementById('runAnalysisBtn');
        if (runAnalysis) runAnalysis.addEventListener('click', () => this.runDeepAnalysis());
        
        // Lead selector
        const leadSelectorBtn = document.getElementById('leadSelectorBtn');
        if (leadSelectorBtn) {
            leadSelectorBtn.addEventListener('click', () => {
                const dropdown = document.getElementById('leadDropdown');
                dropdown.classList.toggle('show');
            });
        }
        
        // Alert filters
        document.querySelectorAll('.alert-filter').forEach(filter => {
            filter.addEventListener('click', (e) => {
                document.querySelectorAll('.alert-filter').forEach(f => f.classList.remove('active'));
                filter.classList.add('active');
                this.filterAlerts(filter.dataset.filter);
            });
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('leadDropdown');
            if (dropdown && !e.target.closest('.lead-selector')) {
                dropdown.classList.remove('show');
            }
        });
        
        // PVC threshold slider
        const pvcSlider = document.getElementById('pvcThreshold');
        if (pvcSlider) {
            pvcSlider.addEventListener('input', (e) => {
                document.getElementById('pvcThresholdValue').textContent = e.target.value;
            });
        }
        
        // Search recordings
        const searchInput = document.getElementById('searchRecordings');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.searchRecordings(e.target.value));
        }
    }
    
    initCustomCursor() {
        const cursorDot = document.querySelector('.cursor-dot');
        const cursorGlow = document.querySelector('.cursor-glow');
        
        if (cursorDot && cursorGlow) {
            document.addEventListener('mousemove', (e) => {
                cursorDot.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
                cursorGlow.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
            });
            
            document.addEventListener('mousedown', () => {
                cursorDot.style.width = '12px';
                cursorDot.style.height = '12px';
            });
            
            document.addEventListener('mouseup', () => {
                cursorDot.style.width = '8px';
                cursorDot.style.height = '8px';
            });
        }
    }
    
    switchPage(page) {
        this.currentPage = page;
        
        // Update active states
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(`${page}Page`).classList.add('active');
        
        document.querySelectorAll('.nav-item').forEach(item => {
            if (item.dataset.page === page) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        // Refresh data when switching pages
        if (page === 'recordings') this.loadRecordingsList();
        if (page === 'patients') this.loadPatientsList();
        if (page === 'analysis') this.refreshAnalysis();
    }
    
    switchConnection(type) {
        this.currentConnection = type;
        
        document.querySelectorAll('.conn-option').forEach(btn => {
            btn.classList.remove('active');
            const status = btn.querySelector('.conn-status');
            if (status) status.classList.remove('active');
            
            if (btn.dataset.conn === type) {
                btn.classList.add('active');
                if (status) status.classList.add('active');
            }
        });
        
        this.deviceConnected = true;
        this.addAlert(`Connected via ${type.toUpperCase()}`, 'success', 'Connection established');
        
        // Update connection status display
        const connText = document.querySelector('.connection-text');
        if (connText) connText.textContent = `${type.toUpperCase()} Connected`;
    }
    
    setupECGSimulation() {
        const waveformsGrid = document.getElementById('waveformsGrid');
        if (!waveformsGrid) return;
        
        waveformsGrid.innerHTML = '';
        
        this.activeLeads.forEach((lead, index) => {
            this.ecgData[lead] = this.generateECGWaveform();
            
            const card = document.createElement('div');
            card.className = 'waveform-card-premium';
            card.dataset.lead = lead;
            card.innerHTML = `
                <div class="waveform-header-premium">
                    <span>Lead ${lead}</span>
                    <span class="heart-rate-premium">-- BPM</span>
                </div>
                <canvas id="canvas-${lead}" class="waveform-canvas-premium" width="500" height="180"></canvas>
            `;
            waveformsGrid.appendChild(card);
            
            const ctx = document.getElementById(`canvas-${lead}`).getContext('2d');
            this.charts[lead] = new Chart(ctx, {
                type: 'line',
                data: {
                    datasets: [{
                        data: this.ecgData[lead],
                        borderColor: '#6366F1',
                        backgroundColor: 'rgba(99, 102, 241, 0.05)',
                        borderWidth: 2,
                        pointRadius: 0,
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: false }
                    },
                    scales: {
                        x: { display: false },
                        y: { 
                            display: false,
                            min: -2,
                            max: 2
                        }
                    },
                    elements: {
                        line: { borderJoin: 'round' }
                    }
                }
            });
        });
    }
    
    generateECGWaveform() {
        const points = 300;
        const data = [];
        for (let i = 0; i < points; i++) {
            let value = Math.sin(i * 0.08) * 0.3;
            
            // P wave
            if (i % 120 > 25 && i % 120 < 40) {
                value += 0.5;
            }
            // QRS complex
            if (i % 120 > 55 && i % 120 < 70) {
                value += 1.0;
            }
            // T wave
            if (i % 120 > 85 && i % 120 < 110) {
                value += 0.4;
            }
            
            value += (Math.random() - 0.5) * 0.08;
            data.push(value);
        }
        return data;
    }
    
    startRealTimeMonitoring() {
        this.simulationInterval = setInterval(() => {
            if (this.deviceConnected && this.currentPage === 'dashboard') {
                this.updateECGData();
                this.detectArrhythmias();
                this.updateStats();
            }
        }, 100);
    }
    
    updateECGData() {
        for (const lead of this.activeLeads) {
            const data = this.ecgData[lead] || [];
            data.shift();
            
            let newPoint = Math.sin(Date.now() * 0.012) * 0.3;
            if (Math.random() < 0.03) {
                newPoint += 1.2;
            }
            newPoint += (Math.random() - 0.5) * 0.1;
            
            data.push(newPoint);
            this.ecgData[lead] = data;
            
            if (this.charts[lead]) {
                this.charts[lead].data.datasets[0].data = data;
                this.charts[lead].update('none');
            }
        }
        
        // Update heart rates
        const heartRate = Math.floor(60 + Math.random() * 40);
        document.querySelectorAll('.heart-rate-premium').forEach(el => {
            el.textContent = `${heartRate} BPM`;
        });
    }
    
    detectArrhythmias() {
        const heartRate = Math.floor(60 + Math.random() * 40);
        const random = Math.random();
        
        if (random < 0.04) {
            const arrhythmias = [
                { type: 'Atrial Fibrillation', severity: 'warning', message: 'Irregular rhythm detected', icon: 'fa-heartbeat' },
                { type: 'Ventricular Tachycardia', severity: 'critical', message: 'Rapid ventricular rate', icon: 'fa-exclamation-triangle' },
                { type: 'PVC', severity: 'warning', message: 'Premature ventricular contraction', icon: 'fa-bolt' },
                { type: 'SVT', severity: 'critical', message: 'Supraventricular tachycardia', icon: 'fa-heart' }
            ];
            
            const arrhythmia = arrhythmias[Math.floor(Math.random() * arrhythmias.length)];
            this.addAlert(arrhythmia.type, arrhythmia.severity, `${arrhythmia.message} at ${heartRate} BPM`);
            
            this.alerts.unshift({
                type: arrhythmia.type,
                severity: arrhythmia.severity,
                message: arrhythmia.message,
                timestamp: new Date(),
                heartRate: heartRate
            });
            
            // Keep only last 50 alerts
            if (this.alerts.length > 50) this.alerts.pop();
        }
    }
    
    addAlert(title, severity, message) {
        const alertsContainer = document.getElementById('alertsContainer');
        if (!alertsContainer) return;
        
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert-card ${severity}`;
        alertDiv.innerHTML = `
            <div class="alert-icon">
                <i class="fas ${severity === 'critical' ? 'fa-skull-crosswalk' : severity === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
            </div>
            <div class="alert-content">
                <div class="alert-title">${title}</div>
                <div class="alert-message">${message}</div>
            </div>
            <div class="alert-time">Just now</div>
        `;
        
        alertsContainer.insertBefore(alertDiv, alertsContainer.firstChild);
        
        // Keep only last 20 alerts
        while (alertsContainer.children.length > 20) {
            alertsContainer.removeChild(alertsContainer.lastChild);
        }
        
        // Show browser notification
        if (Notification.permission === 'granted' && severity !== 'info') {
            new Notification('CardioVision Alert', { body: `${title}: ${message}` });
        }
        
        // Update alert count
        this.updateAlertCount();
    }
    
    filterAlerts(filter) {
        const alerts = document.querySelectorAll('.alert-card');
        alerts.forEach(alert => {
            if (filter === 'all') {
                alert.style.display = 'flex';
            } else if (alert.classList.contains(filter)) {
                alert.style.display = 'flex';
            } else {
                alert.style.display = 'none';
            }
        });
    }
    
    updateAlertCount() {
        const badge = document.querySelector('.badge');
        if (badge) {
            const criticalAlerts = this.alerts.filter(a => a.severity === 'critical').length;
            badge.textContent = criticalAlerts;
            badge.style.display = criticalAlerts > 0 ? 'block' : 'none';
        }
    }
    
    updateStats() {
        // Update signal quality randomly
        const signalQuality = 95 + Math.random() * 5;
        const signalEl = document.getElementById('signalQuality');
        if (signalEl) signalEl.innerHTML = `${Math.floor(signalQuality)}<span class="stat-unit">%</span>`;
        
        // Update monitoring time
        const now = new Date();
        const hours = now.getHours();
        const monitoringEl = document.getElementById('monitoringTime');
        if (monitoringEl) monitoringEl.innerHTML = `${hours}<span class="stat-unit">h</span>`;
        
        // Update current patient
        const patientEl = document.getElementById('currentPatient');
        if (patientEl && this.patients.length > 0) {
            const activePatient = this.patients.find(p => p.active) || this.patients[0];
            if (activePatient) {
                patientEl.textContent = `${activePatient.name} (ID: ${activePatient.id})`;
            }
        }
        
        // Update session date
        const dateEl = document.getElementById('sessionDate');
        if (dateEl) {
            dateEl.textContent = new Date().toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
            });
        }
    }
    
    populateLeadDropdown() {
        const dropdown = document.getElementById('leadDropdown');
        if (!dropdown) return;
        
        dropdown.innerHTML = '';
        this.activeLeads.forEach(lead => {
            const btn = document.createElement('button');
            btn.innerHTML = `<i class="fas fa-chart-line"></i> Lead ${lead}`;
            btn.onclick = () => this.toggleLeadVisibility(lead);
            dropdown.appendChild(btn);
        });
    }
    
    toggleLeadVisibility(lead) {
        const card = document.querySelector(`.waveform-card-premium[data-lead="${lead}"]`);
        if (card) {
            card.style.display = card.style.display === 'none' ? 'block' : 'none';
        }
    }
    
    saveCurrentRecording() {
        const recording = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            duration: '24 hours',
            data: this.ecgData,
            alerts: this.alerts.slice(0, 20),
            patientId: this.getCurrentPatientId(),
            size: Math.floor(Math.random() * 50) + 10
        };
        
        this.recordings.unshift(recording);
        this.saveRecordings();
        this.loadRecordingsList();
        this.addAlert('Recording Saved', 'success', 'ECG data stored successfully');
    }
    
    loadRecordings() {
        const saved = localStorage.getItem('cardio_vision_recordings');
        return saved ? JSON.parse(saved) : [];
    }
    
    saveRecordings() {
        localStorage.setItem('cardio_vision_recordings', JSON.stringify(this.recordings.slice(0, 100)));
    }
    
    loadRecordingsList() {
        const tbody = document.getElementById('recordingsTableBody');
        if (!tbody) return;
        
        if (this.recordings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No recordings found</td></tr>';
            return;
        }
        
        tbody.innerHTML = this.recordings.map(rec => {
            const patient = this.patients.find(p => p.id === rec.patientId) || { name: 'Unknown' };
            return `
                <tr onclick="app.viewRecording(${rec.id})">
                    <td>${new Date(rec.timestamp).toLocaleString()}</td>
                    <td>${patient.name}</td>
                    <td>${rec.duration}</td>
                    <td>${rec.alerts.length} events</td>
                    <td>${rec.size} MB</td>
                    <td>
                        <button class="premium-btn-secondary" style="padding: 6px 12px;" onclick="event.stopPropagation(); app.deleteRecording(${rec.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    searchRecordings(query) {
        const filtered = this.recordings.filter(rec => {
            const patient = this.patients.find(p => p.id === rec.patientId);
            return patient?.name.toLowerCase().includes(query.toLowerCase()) ||
                   new Date(rec.timestamp).toLocaleString().includes(query);
        });
        
        const tbody = document.getElementById('recordingsTableBody');
        if (tbody) {
            tbody.innerHTML = filtered.map(rec => {
                const patient = this.patients.find(p => p.id === rec.patientId) || { name: 'Unknown' };
                return `
                    <tr>
                        <td>${new Date(rec.timestamp).toLocaleString()}</td>
                        <td>${patient.name}</td>
                        <td>${rec.duration}</td>
                        <td>${rec.alerts.length} events</td>
                        <td>${rec.size} MB</td>
                        <td><button class="premium-btn-secondary" onclick="app.deleteRecording(${rec.id})">Delete</button></td>
                    </tr>
                `;
            }).join('');
        }
    }
    
    viewRecording(id) {
        const recording = this.recordings.find(r => r.id === id);
        if (recording) {
            this.addAlert('Viewing Recording', 'info', `From ${new Date(recording.timestamp).toLocaleDateString()}`);
            this.switchPage('dashboard');
        }
    }
    
    deleteRecording(id) {
        this.recordings = this.recordings.filter(r => r.id !== id);
        this.saveRecordings();
        this.loadRecordingsList();
        this.addAlert('Recording Deleted', 'success', 'Recording removed from storage');
    }
    
    loadPatients() {
        const saved = localStorage.getItem('cardio_vision_patients');
        if (saved) return JSON.parse(saved);
        
        // Default patients
        return [
            { id: 'MC-7842', name: 'Michael Chen', age: 68, condition: 'Hypertension', active: true, lastVisit: '2026-03-10' },
            { id: 'MC-7843', name: 'Sarah Williams', age: 72, condition: 'AFib', active: false, lastVisit: '2026-03-12' },
            { id: 'MC-7844', name: 'James Rodriguez', age: 55, condition: 'PVC', active: false, lastVisit: '2026-03-08' }
        ];
    }
    
    savePatients() {
        localStorage.setItem('cardio_vision_patients', JSON.stringify(this.patients));
    }
    
    loadPatientsList() {
        const grid = document.getElementById('patientsGrid');
        if (!grid) return;
        
        grid.innerHTML = this.patients.map(patient => `
            <div class="patient-card" onclick="app.selectPatient('${patient.id}')">
                <div class="patient-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="patient-name">${patient.name}</div>
                <div class="patient-details">
                    <div>ID: ${patient.id}</div>
                    <div>Age: ${patient.age}</div>
                    <div>Condition: ${patient.condition}</div>
                </div>
                <div class="patient-stats">
                    <div><i class="fas fa-calendar"></i> Last: ${patient.lastVisit}</div>
                    <div><i class="fas fa-chart-line"></i> Active: ${patient.active ? 'Yes' : 'No'}</div>
                </div>
            </div>
        `).join('');
    }
    
    selectPatient(id) {
        this.patients = this.patients.map(p => ({ ...p, active: p.id === id }));
        this.savePatients();
        this.loadPatientsList();
        this.addAlert('Patient Selected', 'success', `Now monitoring ${this.patients.find(p => p.id === id)?.name}`);
        this.switchPage('dashboard');
    }
    
    addNewPatient() {
        const name = prompt('Enter patient name:');
        if (!name) return;
        
        const newId = `MC-${Math.floor(Math.random() * 9000) + 1000}`;
        const newPatient = {
            id: newId,
            name: name,
            age: parseInt(prompt('Enter age:', '65')) || 65,
            condition: prompt('Enter condition:', 'Monitoring'),
            active: false,
            lastVisit: new Date().toISOString().split('T')[0]
        };
        
        this.patients.push(newPatient);
        this.savePatients();
        this.loadPatientsList();
        this.addAlert('Patient Added', 'success', `${name} added to system`);
    }
    
    getCurrentPatientId() {
        const activePatient = this.patients.find(p => p.active);
        return activePatient ? activePatient.id : this.patients[0]?.id;
    }
    
    initCharts() {
        // Initialize pie chart
        const pieCtx = document.getElementById('arrhythmiaPieChart')?.getContext('2d');
        if (pieCtx) {
            this.pieChart = new Chart(pieCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Normal', 'AFib', 'PVC', 'VTach', 'SVT'],
                    datasets: [{
                        data: [65, 12, 15, 5, 3],
                        backgroundColor: ['#10B981', '#EF4444', '#F59E0B', '#8B5CF6', '#EC4899'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { position: 'bottom' }
                    }
                }
            });
        }
        
        // Initialize trend chart
        const trendCtx = document.getElementById('trendChart')?.getContext('2d');
        if (trendCtx) {
            this.trendChart = new Chart(trendCtx, {
                type: 'line',
                data: {
                    labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
                    datasets: [
                        {
                            label: 'Heart Rate',
                            data: [72, 68, 85, 78, 82, 75],
                            borderColor: '#6366F1',
                            backgroundColor: 'rgba(99, 102, 241, 0.1)',
                            tension: 0.4,
                            fill: true
                        },
                        {
                            label: 'PVC Count',
                            data: [2, 1, 8, 4, 6, 3],
                            borderColor: '#F59E0B',
                            backgroundColor: 'rgba(245, 158, 11, 0.1)',
                            tension: 0.4,
                            fill: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { position: 'top' }
                    }
                }
            });
        }
    }
    
    refreshAnalysis() {
        // Update risk score randomly
        const riskScore = Math.floor(Math.random() * 40) + 30;
        const riskEl = document.getElementById('riskScore');
        if (riskEl) {
            riskEl.textContent = riskScore;
            const riskFill = document.querySelector('.risk-fill');
            if (riskFill) riskFill.style.width = `${riskScore}%`;
        }
        
        // Update charts with new data
        if (this.pieChart) {
            this.pieChart.data.datasets[0].data = [
                Math.floor(Math.random() * 30) + 50,
                Math.floor(Math.random() * 20) + 5,
                Math.floor(Math.random() * 20) + 10,
                Math.floor(Math.random() * 10) + 2,
                Math.floor(Math.random() * 10) + 1
            ];
            this.pieChart.update();
        }
        
        if (this.trendChart) {
            this.trendChart.data.datasets[0].data = this.trendChart.data.datasets[0].data.map(() => Math.floor(Math.random() * 30) + 60);
            this.trendChart.update();
        }
    }
    
    runDeepAnalysis() {
        this.addAlert('AI Analysis', 'info', 'Running deep learning analysis on ECG data...');
        
        setTimeout(() => {
            this.refreshAnalysis();
            this.addAlert('Analysis Complete', 'success', 'AI analysis finished. View insights for details.');
        }, 2000);
    }
    
    generateReport() {
        const patientId = document.getElementById('reportPatientSelect')?.value;
        const patient = this.patients.find(p => p.id === patientId) || this.patients[0];
        const startDate = document.getElementById('reportStart')?.value || '2026-03-01';
        const endDate = document.getElementById('reportEnd')?.value || '2026-03-15';
        const template = document.getElementById('reportTemplate')?.value || 'standard';
        
        if (!patient) {
            this.addAlert('Report Error', 'warning', 'Please select a patient');
            return;
        }
        
        const reportHtml = `
            <div style="padding: 40px; font-family: 'Plus Jakarta Sans', sans-serif; max-width: 800px; margin: 0 auto;">
                <div style="text-align: center; margin-bottom: 40px;">
                    <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #6366F1, #4F46E5); border-radius: 15px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                        <i class="fas fa-heartbeat" style="color: white; font-size: 30px;"></i>
                    </div>
                    <h1 style="color: #1F2937; margin-bottom: 10px;">CardioVision Clinical Report</h1>
                    <p style="color: #6B7280;">Generated on ${new Date().toLocaleString()}</p>
                </div>
                
                <div style="background: #F3F4F6; padding: 20px; border-radius: 12px; margin-bottom: 30px;">
                    <h2 style="color: #4F46E5; margin-bottom: 15px;">Patient Information</h2>
                    <p><strong>Name:</strong> ${patient.name}</p>
                    <p><strong>ID:</strong> ${patient.id}</p>
                    <p><strong>Age:</strong> ${patient.age}</p>
                    <p><strong>Condition:</strong> ${patient.condition}</p>
                    <p><strong>Report Period:</strong> ${startDate} to ${endDate}</p>
                </div>
                
                <div style="margin-bottom: 30px;">
                    <h2 style="color: #4F46E5; margin-bottom: 15px;">Clinical Summary</h2>
                    <p>Based on the 24-hour Holter monitoring, the patient demonstrated:</p>
                    <ul style="margin-top: 10px; margin-left: 20px;">
                        <li>Average heart rate: 72 BPM (range: 58-98 BPM)</li>
                        <li>Total PVCs: 147 (0.6% of total beats)</li>
                        <li>Supraventricular ectopy: 23 events</li>
                        <li>No sustained ventricular tachycardia</li>
                        <li>Heart rate variability: Within normal limits</li>
                    </ul>
                </div>
                
                <div style="margin-bottom: 30px;">
                    <h2 style="color: #4F46E5; margin-bottom: 15px;">Arrhythmia Analysis</h2>
                    <div style="background: white; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr style="background: #F9FAFB;">
                                <th style="padding: 12px; text-align: left;">Event Type</th>
                                <th style="padding: 12px; text-align: left;">Count</th>
                                <th style="padding: 12px; text-align: left;">Frequency</th>
                            </tr>
                            <tr><td style="padding: 12px; border-top: 1px solid #E5E7EB;">Atrial Fibrillation</td><td style="padding: 12px; border-top: 1px solid #E5E7EB;">12</td><td style="padding: 12px; border-top: 1px solid #E5E7EB;">Rare</td></tr>
                            <tr><td style="padding: 12px; border-top: 1px solid #E5E7EB;">PVCs</td><td style="padding: 12px; border-top: 1px solid #E5E7EB;">147</td><td style="padding: 12px; border-top: 1px solid #E5E7EB;">Occasional</td></tr>
                            <tr><td style="padding: 12px; border-top: 1px solid #E5E7EB;">PACs</td><td style="padding: 12px; border-top: 1px solid #E5E7EB;">23</td><td style="padding: 12px; border-top: 1px solid #E5E7EB;">Rare</td></tr>
                        </table>
                    </div>
                </div>
                
                <div style="background: #FEF3C7; padding: 20px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #F59E0B;">
                    <h3 style="color: #92400E; margin-bottom: 10px;">Clinical Recommendations</h3>
                    <p>Based on the analysis, the following recommendations are made:</p>
                    <ul style="margin-top: 10px; margin-left: 20px;">
                        <li>Continue current medication regimen</li>
                        <li>Follow up in 3 months for repeat monitoring</li>
                        <li>Consider lifestyle modifications to reduce PVC burden</li>
                        <li>Monitor for symptoms of palpitations or dizziness</li>
                    </ul>
                </div>
                
                <div style="text-align: center; padding-top: 30px; border-top: 1px solid #E5E7EB; color: #6B7280; font-size: 12px;">
                    <p>This report is generated by CardioVision Pro Enterprise System</p>
                    <p>HIPAA Compliant | Reviewed by AI Clinical System</p>
                </div>
            </div>
        `;
        
        const preview = document.getElementById('reportPreview');
        if (preview) {
            preview.innerHTML = reportHtml;
        }
        
        // Generate PDF
        setTimeout(() => {
            const element = document.getElementById('reportPreview');
            if (element && typeof html2pdf !== 'undefined') {
                html2pdf().from(element).set({
                    margin: 0.5,
                    filename: `CardioVision_Report_${patient.name.replace(/\s/g, '_')}.pdf`,
                    html2canvas: { scale: 2, useCORS: true },
                    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
                }).save();
                this.addAlert('Report Generated', 'success', 'PDF report downloaded successfully');
            }
        }, 500);
    }
    
    loadConfig() {
        const saved = localStorage.getItem('cardio_vision_config');
        if (saved) {
            const config = JSON.parse(saved);
            if (document.getElementById('deviceChannels')) document.getElementById('deviceChannels').value = config.channels || '12';
            if (document.getElementById('samplingRate')) document.getElementById('samplingRate').value = config.samplingRate || '500';
            if (document.getElementById('filterMode')) document.getElementById('filterMode').value = config.filterMode || 'adaptive';
            if (document.getElementById('defaultPatientName')) document.getElementById('defaultPatientName').value = config.defaultPatientName || '';
            if (document.getElementById('defaultPhysician')) document.getElementById('defaultPhysician').value = config.defaultPhysician || '';
            if (document.getElementById('hrMin')) document.getElementById('hrMin').value = config.hrMin || '40';
            if (document.getElementById('hrMax')) document.getElementById('hrMax').value = config.hrMax || '120';
            if (document.getElementById('pvcThreshold')) document.getElementById('pvcThreshold').value = config.pvcThreshold || '10';
            if (document.getElementById('pvcThresholdValue')) document.getElementById('pvcThresholdValue').textContent = config.pvcThreshold || '10';
        }
    }
    
    saveAllSettings() {
        const config = {
            channels: document.getElementById('deviceChannels')?.value,
            samplingRate: document.getElementById('samplingRate')?.value,
            filterMode: document.getElementById('filterMode')?.value,
            defaultPatientName: document.getElementById('defaultPatientName')?.value,
            defaultContact: document.getElementById('defaultContact')?.value,
            defaultPhysician: document.getElementById('defaultPhysician')?.value,
            hrMin: document.getElementById('hrMin')?.value,
            hrMax: document.getElementById('hrMax')?.value,
            pvcThreshold: document.getElementById('pvcThreshold')?.value,
            afibSensitivity: document.getElementById('afibSensitivity')?.value
        };
        
        localStorage.setItem('cardio_vision_config', JSON.stringify(config));
        this.addAlert('Settings Saved', 'success', 'Configuration updated successfully');
    }
    
    resetAllSettings() {
        localStorage.removeItem('cardio_vision_config');
        this.loadConfig();
        this.addAlert('Settings Reset', 'info', 'Configuration restored to defaults');
    }
    
    setupNavigation() {
        // Populate patient select for reports
        const patientSelect = document.getElementById('reportPatientSelect');
        if (patientSelect) {
            patientSelect.innerHTML = this.patients.map(p => 
                `<option value="${p.id}">${p.name} (${p.id})</option>`
            ).join('');
        }
        
        // Set default dates
        const today = new Date().toISOString().split('T')[0];
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const startDateInput = document.getElementById('reportStart');
        const endDateInput = document.getElementById('reportEnd');
        if (startDateInput) startDateInput.value = weekAgo;
        if (endDateInput) endDateInput.value = today;
    }
}

// Request notification permission
if ('Notification' in window) {
    Notification.requestPermission();
}

// Initialize app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new PremiumHolterMonitor();
    window.app = app;
});