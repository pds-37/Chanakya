// Connect to the Node.js server (change 'localhost' to the server's IP if on another PC)
// Connect to the Node.js server (change 'localhost' to the server's IP if on another PC)
const socket = io("https://railway-simulation.onrender.com");
// =================================================================================
// GLOBAL STATE & CONFIGURATION
// =================================================================================
let trainMovementInterval;
let aiScanInterval;
let dashboardUpdateInterval; // Interval for updating charts
let scale = 1.7;
let translate = { x: -380, y: -350 };
let isPanning = false;
let panStart = { x: 0, y: 0 };
let trainDetailsTimeout;
let liveRecommendations = [];
let recommendationIdCounter = 0;
const SAFETY_DISTANCE = 0.15;
let finishedTrainTimestamps = []; // For dynamic throughput calculation
let recentlyHandledRecs = []; // Add this near the top of your file


// Add this helper object and function to station_master.js
const stationNamesMap = {
    'UMB': 'Ambala', 'PNP': 'Panipat', 'SZM': 'Sabzi Mandi', 'NDL': 'New Delhi',
    'NZM': 'Nizamuddin', 'FDB': 'Faridabad', 'PWL': 'Palwal', 'MTJ': 'Mathura Jn',
    'GZB': 'Ghaziabad', 'MRT': 'Meerut'
};

function buildLiveScheduleForTrain(train) {
    if (!train || !train.route) return [];
    
    const schedule = [{ code: train.source, name: stationNamesMap[train.source] }];
    
    // Create a simplified list of unique stations from the route
    const visitedStations = new Set([train.source]);
    train.route.forEach(trackId => {
        const parts = trackId.split('_'); // e.g., "S1", "up"
        if (parts.length > 1) {
            const trackNum = parts[0].substring(1); // e.g., "1"
            let stationCode = '';
            
            // This is a simplified lookup based on our map structure
            if (trackNum === '1') stationCode = 'PNP';
            if (trackNum === '2') stationCode = 'SZM';
            if (trackNum === '3') stationCode = 'NDL';
            if (trackNum === '4') stationCode = 'GZB';
            if (trackNum === '5') stationCode = 'MRT';
            if (trackNum === '6') stationCode = 'NZM';
            if (trackNum === '7') stationCode = 'FDB';
            if (trackNum === '8') stationCode = 'PWL';
            if (trackNum === '9') stationCode = 'MTJ';

            if (stationCode && !visitedStations.has(stationCode)) {
                schedule.push({ code: stationCode, name: stationNamesMap[stationCode] });
                visitedStations.add(stationCode);
            }
        }
    });

    if (!visitedStations.has(train.destination)) {
         schedule.push({ code: train.destination, name: stationNamesMap[train.destination] });
    }
    return schedule;
}


// =================================================================================
// DATASETS (with delay property for dynamic charts)
// =================================================================================
const stationData = {
    'NDL': {
        name: 'Delhi Main Corridor',
        stations: [
            { id: 'UMB', name: 'Ambala', coords: { x: 100, y: 200 } }, { id: 'PNP', name: 'Panipat', coords: { x: 250, y: 250 } },
            { id: 'SZM', name: 'Sabzi Mandi', coords: { x: 400, y: 300 } }, { id: 'NDL', name: 'New Delhi', coords: { x: 500, y: 500 } },
            { id: 'NZM', name: 'Nizamuddin', coords: { x: 600, y: 700 } }, { id: 'FDB', name: 'Faridabad', coords: { x: 700, y: 800 } },
            { id: 'PWL', name: 'Palwal', coords: { x: 800, y: 850 } }, { id: 'MTJ', name: 'Mathura Jn', coords: { x: 900, y: 900 } },
            { id: 'GZB', name: 'Ghaziabad', coords: { x: 750, y: 450 } }, { id: 'MRT', name: 'Meerut', coords: { x: 950, y: 350 } },
            { id: 'JUNC-S1-1', name: '', coords: { x: 150, y: 217 } }, { id: 'JUNC-S1-2', name: '', coords: { x: 200, y: 233 } },
            { id: 'JUNC-S2-1', name: '', coords: { x: 300, y: 267 } }, { id: 'JUNC-S2-2', name: '', coords: { x: 350, y: 283 } },
            { id: 'JUNC-S3-1', name: '', coords: { x: 433, y: 367 } }, { id: 'JUNC-S3-2', name: '', coords: { x: 466, y: 433 } },
            { id: 'JUNC-S6-1', name: '', coords: { x: 533, y: 567 } }, { id: 'JUNC-S6-2', name: '', coords: { x: 566, y: 633 } },
            { id: 'JUNC-S7-1', name: '', coords: { x: 633, y: 733 } }, { id: 'JUNC-S7-2', name: '', coords: { x: 666, y: 767 } },
        ],
        tracks: [
            { id: 'S1_down', d: 'M250,258 L100,208' }, { id: 'S1_up', d: 'M100,200 L250,250' }, { id: 'S1_buffer', d: 'M100,216 L250,266' },
            { id: 'S2_down', d: 'M400,308 L250,258' }, { id: 'S2_up', d: 'M250,250 L400,300' }, { id: 'S2_buffer', d: 'M250,266 L400,316' },
            { id: 'S3_down', d: 'M500,508 L400,308' }, { id: 'S3_up', d: 'M400,300 L500,500' }, { id: 'S3_buffer', d: 'M400,316 L500,516' },
            { id: 'S6_down', d: 'M600,708 L500,508' }, { id: 'S6_up', d: 'M500,500 L600,700' }, { id: 'S6_buffer', d: 'M500,516 L600,716' },
            { id: 'S7_down', d: 'M700,808 L600,708' }, { id: 'S7_up', d: 'M600,700 L700,800' }, { id: 'S7_buffer', d: 'M600,716 L700,816' },
            { id: 'S8_down', d: 'M800,858 L700,808' }, { id: 'S8_up', d: 'M700,800 L800,850' }, { id: 'S8_buffer', d: 'M700,816 L800,866' },
            { id: 'S9_down', d: 'M900,908 L800,858' }, { id: 'S9_up', d: 'M800,850 L900,900' }, { id: 'S9_buffer', d: 'M800,866 L900,916' },
            { id: 'S4_down', d: 'M750,458 L500,508' }, { id: 'S4_up', d: 'M500,500 L750,450' },
            { id: 'S5_down', d: 'M950,358 L750,458' }, { id: 'S5_up', d: 'M750,450 L950,350' },
            { id: 'LOOP_S1', d: 'M 150,217 A 28,28 0 0 1 200,233' }, { id: 'LOOP_S1_rev', d: 'M 200,233 A 28,28 0 0 0 150,217' },
            { id: 'LOOP_S2', d: 'M 300,267 A 28,28 0 0 1 350,283' }, { id: 'LOOP_S2_rev', d: 'M 350,283 A 28,28 0 0 0 300,267' },
            { id: 'LOOP_S3', d: 'M 433,367 A 40,40 0 0 1 466,433' }, { id: 'LOOP_S3_rev', d: 'M 466,433 A 40,40 0 0 0 433,367' },
            { id: 'LOOP_S6', d: 'M 533,567 A 40,40 0 0 1 566,633' }, { id: 'LOOP_S6_rev', d: 'M 566,633 A 40,40 0 0 0 533,567' },
            { id: 'LOOP_S7', d: 'M 633,733 A 20,20 0 0 1 666,767' }, { id: 'LOOP_S7_rev', d: 'M 666,767 A 20,20 0 0 0 633,733' },
        ]
    }
};

const initialTrainData = [
    // Data now includes a 'schedule' for each train
    { id: '12951', name: 'Rajdhani', type: 'express', source: 'MTJ', destination: 'UMB', route: ['S9_down', 'S8_down', 'S7_down', 'S6_down', 'S3_down', 'S2_down', 'S1_down'], delay: 0, schedule: [{code: 'MTJ', name: 'Mathura'}, {code: 'NDL', name: 'New Delhi'}, {code: 'UMB', name: 'Ambala'}] },
    { id: '12003', name: 'Shatabdi', type: 'express', source: 'UMB', destination: 'MTJ', route: ['S1_up', 'S2_up', 'S3_up', 'S6_up', 'S7_up', 'S8_up', 'S9_up'], delay: 0, schedule: [{code: 'UMB', name: 'Ambala'}, {code: 'PNP', name: 'Panipat'}, {code: 'NDL', name: 'New Delhi'}, {code: 'MTJ', name: 'Mathura'}] },
    { id: '22440', name: 'Vande Bharat', type: 'express', source: 'MRT', destination: 'NDL', route: ['S5_down', 'S4_down'], delay: 2, schedule: [{code: 'MRT', name: 'Meerut'}, {code: 'GZB', name: 'Ghaziabad'}, {code: 'NDL', name: 'New Delhi'}] },
    { id: '12015', name: 'Ajmer Shatabdi', type: 'express', source: 'NDL', destination: 'MRT', route: ['S4_up', 'S5_up'], delay: 0, schedule: [{code: 'NDL', name: 'New Delhi'}, {code: 'GZB', name: 'Ghaziabad'}, {code: 'MRT', name: 'Meerut'}] },
    { id: '12424', name: 'Dbrg Rajdhani', type: 'express', source: 'PNP', destination: 'FDB', route: ['S2_up', 'S3_up', 'S6_up', 'S7_up'], delay: 0, schedule: [{code: 'PNP', name: 'Panipat'}, {code: 'NDL', name: 'New Delhi'}, {code: 'FDB', name: 'Faridabad'}] },
    { id: '04408', name: 'MEMU', type: 'passenger', source: 'GZB', destination: 'NDL', route: ['S4_down'], delay: 5, schedule: [{code: 'GZB', name: 'Ghaziabad'}, {code: 'NDL', name: 'New Delhi'}] },
    { id: '14205', name: 'Express', type: 'passenger', source: 'NDL', destination: 'PWL', route: ['S6_up', 'S7_up', 'S8_up'], delay: 0, schedule: [{code: 'NDL', name: 'New Delhi'}, {code: 'NZM', name: 'Nizamuddin'}, {code: 'PWL', name: 'Palwal'}] },
    { id: '15014', name: 'Ranikhet Exp', type: 'passenger', source: 'SZM', destination: 'UMB', route: ['S2_down', 'S1_down'], delay: 8, schedule: [{code: 'SZM', name: 'Sabzi Mandi'}, {code: 'PNP', name: 'Panipat'}, {code: 'UMB', name: 'Ambala'}] },
    { id: '54321', name: 'Goods', type: 'freight', source: 'GZB', destination: 'MRT', route: ['S5_up'], delay: 12, schedule: [{code: 'GZB', name: 'Ghaziabad'}, {code: 'MRT', name: 'Meerut'}] },
    { id: '58812', name: 'Coal Wagon', type: 'freight', source: 'UMB', destination: 'SZM', route: ['S1_buffer', 'S2_buffer'], delay: 15, schedule: [{code: 'UMB', name: 'Ambala'}, {code: 'SZM', name: 'Sabzi Mandi'}] },
    { id: '22439', name: 'Vande Bharat', type: 'express', source: 'NDL', destination: 'MRT', route: ['S4_up', 'S5_up'], delay: 0, schedule: [{code: 'NDL', name: 'New Delhi'}, {code: 'GZB', name: 'Ghaziabad'}, {code: 'MRT', name: 'Meerut'}] },
    { id: '12952', name: 'BCT Rajdhani', type: 'express', source: 'NDL', destination: 'MTJ', route: ['S6_up', 'S7_up', 'S8_up', 'S9_up'], delay: 0, schedule: [{code: 'NDL', name: 'New Delhi'}, {code: 'FDB', name: 'Faridabad'}, {code: 'MTJ', name: 'Mathura'}] },
    { id: '04407', name: 'MEMU', type: 'passenger', source: 'PNP', destination: 'NDL', route: ['S2_up', 'S3_up'], delay: 3, schedule: [{code: 'PNP', name: 'Panipat'}, {code: 'SZM', name: 'Sabzi Mandi'}, {code: 'NDL', name: 'New Delhi'}] },
    { id: '04909', name: 'Local', type: 'passenger', source: 'NZM', destination: 'PWL', route: ['S7_up', 'S8_up'], delay: 0, schedule: [{code: 'NZM', name: 'Nizamuddin'}, {code: 'FDB', name: 'Faridabad'}, {code: 'PWL', name: 'Palwal'}] },
    { id: '14164', name: 'Sangam Express', type: 'passenger', source: 'MRT', destination: 'FDB', route: ['S5_down', 'S4_down', 'S6_up', 'S7_up'], delay: 7, schedule: [{code: 'MRT', name: 'Meerut'}, {code: 'NDL', name: 'New Delhi'}, {code: 'FDB', name: 'Faridabad'}] },
    { id: '15013', name: 'Ranikhet Exp', type: 'passenger', source: 'UMB', destination: 'SZM', route: ['S1_up', 'S2_up'], delay: 0, schedule: [{code: 'UMB', name: 'Ambala'}, {code: 'PNP', name: 'Panipat'}, {code: 'SZM', name: 'Sabzi Mandi'}] },
    { id: '58813', name: 'Cargo Runner', type: 'freight', source: 'FDB', destination: 'SZM', route: ['S7_up', 'S6_up', 'S3_up'], delay: 10, schedule: [{code: 'FDB', name: 'Faridabad'}, {code: 'NDL', name: 'New Delhi'}, {code: 'SZM', name: 'Sabzi Mandi'}] },
    { id: '54324', name: 'Goods Special', type: 'freight', source: 'NDL', destination: 'MRT', route: ['S4_up', 'S5_up'], delay: 5, schedule: [{code: 'NDL', name: 'New Delhi'}, {code: 'MRT', name: 'Meerut'}] },
    { id: '59002', name: 'Goods', type: 'freight', source: 'NZM', destination: 'FDB', route: ['S7_up'], delay: 18, schedule: [{code: 'NZM', name: 'Nizamuddin'}, {code: 'FDB', name: 'Faridabad'}] },
    { id: '58814', name: 'Container Spl', type: 'freight', source: 'MTJ', destination: 'PNP', route: ['S9_buffer', 'S8_buffer', 'S7_buffer', 'S6_buffer', 'S3_buffer', 'S2_buffer'], delay: 20, schedule: [{code: 'MTJ', name: 'Mathura'}, {code: 'NDL', name: 'New Delhi'}, {code: 'PNP', name: 'Panipat'}] },
];

function displayEmergencyAlert(data) {
    const container = document.getElementById('loco-pilot-updates-list');
    if (!container) return;

    // Remove placeholder text if it exists
    const placeholder = container.querySelector('.lp-update-placeholder');
    if (placeholder) placeholder.remove();

    const now = new Date(data.timestamp);
    const timeString = now.toTimeString().split(' ')[0];

    const alertDiv = document.createElement('div');
    alertDiv.className = 'lp-update-item emergency';
    alertDiv.innerHTML = `
        <div>🚨 EMERGENCY STOP 🚨<br>Initiated by Train ${data.trainId}</div>
        <div class="timestamp">Received: ${timeString}</div>
    `;
    // Add the new alert to the top of the list
    container.prepend(alertDiv);

    // Find the train on the map and apply the emergency status
    const train = currentTrains.find(t => t.id === data.trainId);
    if (train) {
        train.status = 'emergency_stop';
        const trainEl = document.getElementById(`train-${train.id}`);
        if(trainEl) trainEl.classList.add('emergency-stop');
        
        // Immediately stop the train's movement
        train.speedFactor = 0;
    }

    // Show a main pop-up box as well for immediate attention
    showMessageBox('🔴 EMERGENCY ALERT 🔴', `Emergency Stop signal received from Train ${data.trainId}. The train has been halted on the map.`);
}

let currentStations, currentTracks, currentTrains, stationName;


// =================================================================================
// INITIALIZATION & EVENT LISTENERS
// =================================================================================

function initializeData() {
    // Read the desired number of trains from the slider
    const trainCountSlider = document.querySelector('#simulation input[type="range"]');
    const desiredTrainCount = trainCountSlider ? parseInt(trainCountSlider.value) : 20;

    let station = stationData['NDL'];
    currentStations = station.stations;
    currentTracks = station.tracks;
    stationName = station.name;

    // Slice the initial data to get the desired number of trains
    const trainsToLoad = initialTrainData.slice(0, desiredTrainCount);

    currentTrains = JSON.parse(JSON.stringify(trainsToLoad)).map(train => ({ 
        ...train, 
        status: 'running', 
        position: 0, 
        currentTrackIndex: 0, 
        speedFactor: 1.0, 
        originalRoute: JSON.parse(JSON.stringify(train.route)) 
    }));
    finishedTrainTimestamps = [];
}

// Ensure the `resetSimulation` function calls this correctly
function resetSimulation() {
    initializeData(); // This will now use the slider's value
    renderNetwork();
    startFullSimulation();
    showMessageBox('Simulation', 'Simulation has been reset.');
}

document.addEventListener('DOMContentLoaded', function () {
    // --- Initial Data and UI Setup ---
    initializeData();
    updateSvgTransform();
    document.getElementById('header-status-section').innerHTML = `<div class="status-indicator"><div class="status-dot"></div><span>AI System Active</span></div><div style="font-size: 14px;"><div>Real-time: <span id="current-time"></span></div><div style="font-size: 12px; opacity: 0.7;">Section: ${stationName}</div></div><button class="logout-btn" onclick="handleLogout()">Logout</button>`;
    
    // --- Tab Switching Logic ---
    document.querySelectorAll('.tab-item').forEach(item => {
        item.addEventListener('click', function () {
            const targetTab = this.getAttribute('data-tab');
            document.querySelectorAll('.tab-item, .tab-content').forEach(el => el.classList.remove('active'));
            this.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
            // Initialize charts when their tab is clicked
            if (targetTab === 'dashboard') initDashboardCharts();
            if (targetTab === 'analytics') initAnalyticsCharts();
        });
    });

    // --- Master Event Listener for AI Recommendation Buttons ---
    const suggestionsContainer = document.getElementById('ai-suggestions-list');
    if (suggestionsContainer) {
        suggestionsContainer.addEventListener('click', function(event) {
            const target = event.target;
            if (target.classList.contains('btn-yes') || target.classList.contains('btn-no')) {
                const recId = parseInt(target.getAttribute('data-id'));
                const accepted = target.classList.contains('btn-yes');
                applySuggestion(recId, accepted);
            }
        });
    }

    
     // --- Loco Pilot Signal Listeners ---
    // ✅ CORRECT: Listen for events directly from the socket connection.
    socket.on('emergencyAlert', (data) => {
        console.log("Emergency Alert Received:", data); // For debugging
        displayEmergencyAlert(data);
    });

    socket.on('resumeRequestAlert', (data) => {
        console.log("Resume Request Received:", data); // For debugging
        handleResumeRequest(data);
    });

    

    // --- Initial Render ---
    document.getElementById('network').classList.add('active');
    renderNetwork();
    setupMapControls();
    
    // Initialize charts for the default view
    initDashboardCharts();
    initAnalyticsCharts();

    // Start the main simulation loops
    startFullSimulation();
    
    // Start the clock
    updateTime();
    setInterval(updateTime, 1000);
});
// =================================================================================
// CORE SIMULATION LOGIC
// =================================================================================

function startFullSimulation() {
    if (trainMovementInterval) clearInterval(trainMovementInterval);
    if (aiScanInterval) clearInterval(aiScanInterval);
    if (dashboardUpdateInterval) clearInterval(dashboardUpdateInterval);
    trainMovementInterval = setInterval(updateTrainPositions, 50);
    aiScanInterval = setInterval(generateAIRecommendations, 5000);
    dashboardUpdateInterval = setInterval(updateDashboardCharts, 5000);
}

function updateTrainPositions() {
    // The problematic auto-clearing filter has been removed from here.

    const simulationSpeedEl = document.querySelector('.network-controls select.input-field');
    let speedMultiplier = simulationSpeedEl ? (parseInt(simulationSpeedEl.value) || 1) : 1;
    
    currentTrains.forEach(train => {
        if (train.status === 'held' || train.status === 'finished' || train.status === 'emergency_stop') {
            if (train.status === 'held' && Date.now() > train.holdUntil) { train.status = 'running'; }
            return;
        }
        
        const trackId = train.route[train.currentTrackIndex];
        const trackPath = document.getElementById(trackId);
        if (!trackPath) return;
        
        let effectiveSpeedFactor = train.speedFactor;
        const trainOnSameTrack = currentTrains.find(other => other.id !== train.id && other.route[other.currentTrackIndex] === trackId && other.position > train.position);
        if (trainOnSameTrack) {
            const distance = trackPath.getTotalLength() * (trainOnSameTrack.position - train.position);
            if (distance < SAFETY_DISTANCE) effectiveSpeedFactor = Math.min(effectiveSpeedFactor, trainOnSameTrack.speedFactor * 0.9);
        }
        
        const loopSpeedMultiplier = trackId.startsWith('LOOP') ? 1.5 : 1.0;
        const baseSpeed = 0.0005;
        const prioritySpeed = train.type === 'express' ? 1.8 : 1.2;
        const increment = baseSpeed * prioritySpeed * effectiveSpeedFactor * speedMultiplier * loopSpeedMultiplier;
        
        train.position += increment;
        
        if (train.position >= 1.0) {
            if (train.route[train.currentTrackIndex].startsWith('LOOP')) {
                train.route[train.currentTrackIndex] = train.originalRoute[train.currentTrackIndex];
            }
            if (train.currentTrackIndex >= train.route.length - 1) {
                train.status = 'finished';
                finishedTrainTimestamps.push(Date.now());
                if(document.getElementById(`train-fo-${train.id}`)) document.getElementById(`train-fo-${train.id}`).style.display = 'none';
                return;
            }
            train.currentTrackIndex++;
            train.position = 0;
        }
        
        const currentTrack = document.getElementById(train.route[train.currentTrackIndex]);
        if (!currentTrack) return;
        
        const currentPathLength = currentTrack.getTotalLength();
        const currentPoint = currentTrack.getPointAtLength(train.position * currentPathLength);
        const nextPoint = currentTrack.getPointAtLength(Math.min(train.position + 0.01, 1.0) * currentPathLength);
        const angle = Math.atan2(nextPoint.y - currentPoint.y, nextPoint.x - currentPoint.x) * (180 / Math.PI);
        const fo = document.getElementById(`train-fo-${train.id}`);
        
        if (fo) {
            fo.setAttribute('x', currentPoint.x - 20);
            fo.setAttribute('y', currentPoint.y - 10);
            fo.firstElementChild.style.transform = `rotate(${angle}deg)`;
        }
    });

    updateTrackStatus();

     // ✅ MODIFIED: Broadcast now includes the simplified live schedule for each train
    // THIS IS THE CORRECTED BROADCAST
    const broadcastState = currentTrains.map(train => ({...train, liveSchedule: train.schedule}));
    socket.emit('broadcastState', broadcastState);

     // ✅ ADD THIS LINE AT THE VERY END OF THE FUNCTION
     
}

function displayEmergencyAlert(data) {
    const container = document.getElementById('loco-pilot-updates-list');
    if (!container) return;

    const placeholder = container.querySelector('.lp-update-placeholder');
    if (placeholder) placeholder.remove();

    const now = new Date(data.timestamp);
    const timeString = now.toTimeString().split(' ')[0];

    const alertDiv = document.createElement('div');
    alertDiv.className = 'lp-update-item emergency';
    alertDiv.innerHTML = `
        <div>🚨 EMERGENCY STOP 🚨<br>Initiated by Train ${data.trainId}</div>
        <div class="timestamp">Received: ${timeString}</div>
    `;
    container.prepend(alertDiv);

    const train = currentTrains.find(t => t.id === data.trainId);
    if (train) {
        train.status = 'emergency_stop';
        const trainEl = document.getElementById(`train-${train.id}`);
        if(trainEl) trainEl.classList.add('emergency-stop');
        train.speedFactor = 0;
    }
    showMessageBox('🔴 EMERGENCY ALERT 🔴', `Emergency Stop signal received from Train ${data.trainId}. The train has been halted on the map.`);
}

function handleResumeRequest(data) {
    const train = currentTrains.find(t => t.id === data.trainId);
    if (train && (train.status === 'held' || train.status === 'emergency_stop')) {
        // Restart the train
        train.status = 'running';
        train.speedFactor = 1.0; // Reset speed to normal
        const trainEl = document.getElementById(`train-${train.id}`);
        if(trainEl) trainEl.classList.remove('emergency-stop');

        // Post a log message to the Station Master's own UI
        const container = document.getElementById('loco-pilot-updates-list');
        if (container) {
            const placeholder = container.querySelector('.lp-update-placeholder');
            if (placeholder) placeholder.remove();
            
            const now = new Date(data.timestamp);
            const timeString = now.toTimeString().split(' ')[0];
            const updateDiv = document.createElement('div');
            updateDiv.className = 'lp-update-item';
            updateDiv.innerHTML = `
                <div>🟢 Resume request from Train ${data.trainId} has been automatically approved.</div>
                <div class="timestamp">Received: ${timeString}</div>
            `;
            container.prepend(updateDiv);
        }
        
        // ✅ NEW: Send confirmation message back to the Loco Pilot
        const confirmationMessage = {
            trainId: train.id,
            message: 'Control: Your request to resume has been approved. Proceed with caution.',
            timestamp: new Date().toISOString()
        };
        socket.emit('controlMessageToPilot', confirmationMessage);
    }
}
// =================================================================================
// AI & UI Functions
// =================================================================================

// =================================================================================
// AI & UI Functions
// =================================================================================

// [The full, most advanced version of station_master.js code from our previous interactions would go here]
// For brevity, I will assume you have the final version. The critical function is:

async function generateAIRecommendations() {
    // This part that prepares the data is correct and remains the same.
    const simulationState = {
        trains: currentTrains.filter(t => t.status !== 'finished').map(train => ({
            id: train.id,
            type: train.type,
            status: train.status,
            position: train.position,
            speedFactor: train.speedFactor,
            stuckBehind: currentTrains.find(other =>
                other.id !== train.id &&
                other.status !== 'finished' &&
                other.route[other.currentTrackIndex] === train.route[train.currentTrackIndex] &&
                other.position > train.position
            )?.id || null,
            currentTrack: train.route[train.currentTrackIndex],
            currentTrackIndex: train.currentTrackIndex,
            route: train.route,
        })),
        timestamp: new Date().toISOString()
    };

    try {
            const response = await fetch('https://railway-ai-brain.onrender.com/get_recommendation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(simulationState)
        });
        if (!response.ok) return;
        let recommendationsFromServer = await response.json();

        // ✅ --- START OF THE FIX ---

        // Filter out any recommendations we've already handled recently
        const thirtySecondsAgo = Date.now() - 30000;
        recentlyHandledRecs = recentlyHandledRecs.filter(rec => rec.timestamp > thirtySecondsAgo);

        const newFilteredRecs = recommendationsFromServer.filter(serverRec => {
            return !recentlyHandledRecs.some(handledRec => 
                handledRec.trainId === serverRec.trainId && handledRec.action === serverRec.action
            );
        });
        
        // Instead of replacing the array, let's merge it.
        newFilteredRecs.forEach(newRec => {
            // Check if a visually identical recommendation already exists
            const alreadyExists = liveRecommendations.some(existingRec => 
                existingRec.trainId === newRec.trainId && existingRec.action === newRec.action
            );

            // If it doesn't exist, add it to our live list.
            if (!alreadyExists) {
                liveRecommendations.push({
                    ...newRec,
                    id: recommendationIdCounter++ // Assign a new unique ID
                });
            }
        });

        // ✅ --- END OF THE FIX ---

        renderAIRecommendations(); // Re-render the list with any new additions

    } catch (error) {
        console.error("AI Server is unreachable:", error);
    }
}

function applySuggestion(recId, accepted) {
    const recIndex = liveRecommendations.findIndex(r => r.id === recId);
    
    if (recIndex === -1) {
        console.error("Could not find recommendation in the list.");
        return;
    }

    const rec = liveRecommendations[recIndex];
    
    // Add to short-term memory to prevent this exact recommendation from reappearing immediately
    recentlyHandledRecs.push({
        trainId: rec.trainId,
        action: rec.action,
        timestamp: Date.now()
    });

    if (accepted) {
        const train = currentTrains.find(t => t.id === rec.trainId);
        if (train) {
            let actionMessageForPilot = ""; // To store the message for the pilot

            switch (rec.action) {
                case 'reroute_loop':
                    const originalIndex = train.originalRoute.indexOf(rec.decisionTrack);
                    if (originalIndex !== -1) {
                        train.route = [...train.originalRoute];
                        train.route.splice(originalIndex + 1, 0, ...rec.newRouteSegment);
                        actionMessageForPilot = `Rerouting to loop line ${rec.newRouteSegment[0]}. Please comply.`;
                        showMessageBox('Instruction Actioned', `Rerouting Train ${train.id} to loop line.`);
                    } else {
                        showMessageBox('Action Skipped', `Train ${train.id} has passed the decision point.`);
                    }
                    break;
                case 'speed_boost':
                    train.speedFactor = Math.min(2.0, train.speedFactor + 0.3);
                    actionMessageForPilot = "Track ahead is clear. You are cleared to increase speed.";
                    showMessageBox('Instruction Actioned', `Boosting speed for Train ${train.id}.`);
                    break;
                case 'speed_reduce':
                    train.speedFactor = Math.max(0.3, train.speedFactor - 0.3);
                    actionMessageForPilot = "Congestion reported ahead. Please reduce speed.";
                    showMessageBox('Instruction Actioned', `Reducing speed for Train ${train.id}.`);
                    break;
            }

             // THIS IS THE CORRECTED SEND LOGIC
            if (actionMessageForPilot) {
                const updateForPilot = {
                    trainId: train.id, // Target the specific train
                    message: `Control: ${actionMessageForPilot}`,
                    timestamp: new Date().toISOString()
                };
                socket.emit('controlMessageToPilot', updateForPilot);
            }
        }
    }

    // This part makes the recommendation disappear after a button is clicked
    liveRecommendations.splice(recIndex, 1);
    renderAIRecommendations();
}
function renderAIRecommendations() {
    const container = document.getElementById('ai-suggestions-list');
    if (!container) return;

    container.innerHTML = ''; // Clear previous recommendations

    if (liveRecommendations.length === 0) {
        container.innerHTML = '<div style="font-size:12px; color:#94a3b8; text-align:center;">No recommendations from AI.</div>';
        return;
    }

    liveRecommendations.forEach(rec => {
        const suggestionDiv = document.createElement('div');
        suggestionDiv.className = 'ai-suggestion';
        
        // ✅ CHANGE: Add a 'data-id' to each button to store its unique ID.
        suggestionDiv.innerHTML = `
            <div class="suggestion-header">${rec.type || '🤖 AI Recommendation'}</div>
            <div>${rec.text}</div>
            <div class="suggestion-buttons">
                <button class="btn-yes" data-id="${rec.id}">✔️ Yes</button>
                <button class="btn-no" data-id="${rec.id}">❌ No</button>
            </div>
        `;

        // ✅ CHANGE: The old, unreliable .onclick lines are removed.
        
        container.appendChild(suggestionDiv);
    });
}
function renderNetwork() {
    const tracksGroup = document.getElementById('tracks-group');
    const dynamicGroup = document.getElementById('stations-and-trains-group');
    tracksGroup.innerHTML = ''; dynamicGroup.innerHTML = '';
    currentTracks.forEach(track => {
        const railPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        railPath.setAttribute('d', track.d); railPath.setAttribute('id', track.id); railPath.setAttribute('class', `track-rail rail-${track.id}`);
        railPath.style.stroke = 'url(#freeGradient)';
        railPath.style.strokeWidth = track.id.startsWith('LOOP') ? '2.5' : '3.5';
        if (track.id.startsWith('LOOP')) railPath.setAttribute('stroke-dasharray', '10, 10');
        railPath.style.opacity = track.id.startsWith('LOOP') ? '0.7' : '1.0';
        tracksGroup.appendChild(railPath);
    });
    currentStations.forEach(station => {
        if (station.id.startsWith('JUNC')) {
            const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            dot.setAttribute('cx', station.coords.x); dot.setAttribute('cy', station.coords.y); dot.setAttribute('r', '5'); dot.setAttribute('fill', '#94a3b8');
            dynamicGroup.appendChild(dot);
        } else {
            const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
            fo.setAttribute('x', station.coords.x - 40); fo.setAttribute('y', station.coords.y - 20); fo.setAttribute('width', 80); fo.setAttribute('height', 40);
            const stationDiv = document.createElement('div');
            stationDiv.className = 'station';
            stationDiv.innerHTML = `<div class="station-code">${station.id}</div><div class="station-name">${station.name}</div>`;
            fo.appendChild(stationDiv);
            dynamicGroup.appendChild(fo);
        }
    });
    currentTrains.forEach(spawnTrainElement);
}
function spawnTrainElement(train) {
    const dynamicGroup = document.getElementById('stations-and-trains-group');
    const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    fo.id = `train-fo-${train.id}`; fo.setAttribute('width', 40); fo.setAttribute('height', 20);
    const div = document.createElement('div');
    div.id = `train-${train.id}`; div.className = `train train-${train.type}`; div.textContent = train.id;
    div.onmouseover = (event) => showTrainDetails(event, train); div.onmouseout = () => hideTrainDetails();
    fo.appendChild(div);
    dynamicGroup.appendChild(fo);
}
function updateTrackStatus() {
    currentTracks.forEach(track => { track.occupiedBy = null; });
    currentTrains.forEach(train => { if (train.status !== 'finished') { const track = currentTracks.find(t => t.id === train.route[train.currentTrackIndex]); if (track) track.occupiedBy = train.id; }});
    currentTracks.forEach(track => { const railEl = document.querySelector(`.rail-${track.id}`); if(railEl) railEl.style.stroke = track.occupiedBy ? 'url(#occupiedGradient)' : 'url(#freeGradient)';});
    if (document.getElementById('track-status').classList.contains('active')) {
        renderTrackStatusTab();
    }
}
function renderTrackStatusTab() {
    const container = document.getElementById('track-status-container');
    if (!container) return;
    let html = ``;
    currentTracks.forEach(track => {
        let status = 'Free', statusClass = 'free-text', statusDotClass = 'free';
        if (track.occupiedBy) { status = `Occupied by ${track.occupiedBy}`; statusClass = 'occupied-text'; statusDotClass = 'occupied'; }
        html += `<div class="track-status-card"><div class="status-dot-lg ${statusDotClass}"></div><div class="track-details"><div style="font-weight: bold;">Track ID: ${track.id}</div><div class="track-status-text ${statusClass}">${status}</div></div></div>`;
    });
    container.innerHTML = html;
}
function setupMapControls() { const networkMain = document.getElementById('network-main'); networkMain.addEventListener('wheel', handleZoom); networkMain.addEventListener('mousedown', startPan); networkMain.addEventListener('mousemove', doPan); networkMain.addEventListener('mouseup', endPan); networkMain.addEventListener('mouseleave', endPan); }
function handleZoom(event) {
    event.preventDefault();

    // 1. Get the mouse position relative to the SVG canvas
    const svg = document.getElementById('network-main');
    const rect = svg.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // 2. Calculate the point on the map (world coordinates) under the mouse before zooming
    const worldX = (mouseX - translate.x) / scale;
    const worldY = (mouseY - translate.y) / scale;

    // 3. Calculate the new scale
    const scaleAmount = -event.deltaY * 0.001;
    scale = Math.min(Math.max(0.5, scale + scaleAmount), 3);

    // 4. Calculate the new translation to keep the world point under the mouse
    translate.x = mouseX - worldX * scale;
    translate.y = mouseY - worldY * scale;

    // 5. Apply the new transform
    updateSvgTransform();
}
function startPan(event) { event.preventDefault(); isPanning = true; panStart.x = event.clientX - translate.x; panStart.y = event.clientY - translate.y; }
function doPan(event) { if (isPanning) { event.preventDefault(); translate.x = event.clientX - panStart.x; translate.y = event.clientY - panStart.y; updateSvgTransform(); } }
function endPan() { isPanning = false; }
function updateSvgTransform() { const transformGroup = document.getElementById('map-transform-group'); if (transformGroup) transformGroup.setAttribute('transform', `translate(${translate.x}, ${translate.y}) scale(${scale})`); }
function handleLogout() { window.location.href = 'index.html'; }
function updateTime() { const timeElement = document.getElementById('current-time'); if (timeElement) timeElement.textContent = new Date().toTimeString().split(' ')[0]; }
function showTrainDetails(event, train) { clearTimeout(trainDetailsTimeout); const detailCard = document.getElementById('train-details-card'); const mainRect = document.getElementById('network-main').getBoundingClientRect(); const trainRect = event.currentTarget.parentElement.getBoundingClientRect(); detailCard.style.top = `${trainRect.bottom - mainRect.top + 10}px`; detailCard.style.left = `${trainRect.left - mainRect.left}px`; const currentTrackName = train.route[train.currentTrackIndex] || 'N/A'; detailCard.innerHTML = `<div class="title">${train.id} - ${train.name}</div><div class="info-line"><span>Type:</span> <span style="color: #60a_5fa;">${train.type}</span></div><div class="info-line"><span>Route:</span> <span>${train.source} → ${train.destination}</span></div><div class="info-line"><span>Status:</span> <span>${train.status}</span></div>`; detailCard.style.display = 'flex'; }
function hideTrainDetails() { trainDetailsTimeout = setTimeout(() => { document.getElementById('train-details-card').style.display = 'none'; }, 100); }
function showMessageBox(title, message) { document.getElementById('messageBoxTitle').textContent = title; document.getElementById('messageBoxContent').textContent = message; document.getElementById('messageBox').style.display = 'flex'; }
function hideMessageBox() { document.getElementById('messageBox').style.display = 'none'; }
function startSimulation() { showMessageBox('Simulation', 'Simulation is already running.'); }
function pauseSimulation() { clearInterval(trainMovementInterval); clearInterval(aiScanInterval); showMessageBox('Simulation', 'Simulation paused.'); }
function resetSimulation() { initializeData(); renderNetwork(); startFullSimulation(); showMessageBox('Simulation', 'Simulation has been reset.'); }

// =================================================================================
// DYNAMIC CHARTING LOGIC
// =================================================================================

const chartConfigs = {
    // MODIFIED: Add this detailedMetricsChart configuration inside the object
    detailedMetricsChart: { 
        type: 'radar', 
        data: { 
            labels: ['Throughput', 'Delays', 'Safety', 'Efficiency', 'Cost', 'Satisfaction'], 
            datasets: [
                { 
                    label: 'Traditional System', 
                    data: [60, 40, 85, 55, 60, 50], 
                    borderColor: '#ef4444', 
                    backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                    pointBackgroundColor: '#ef4444' 
                }, 
                { 
                    label: 'AI-Optimized', 
                    data: [88, 85, 95, 90, 80, 85], 
                    borderColor: '#22c55e', 
                    backgroundColor: 'rgba(34, 197, 94, 0.1)', 
                    pointBackgroundColor: '#22c55e' 
                }
            ] 
        }, 
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { 
                legend: { labels: { color: '#cbd5e1' } } 
            }, 
            scales: { 
                r: { 
                    beginAtZero: true, 
                    max: 100, 
                    ticks: { color: '#94a3b8' }, 
                    grid: { color: '#334155' }, 
                    pointLabels: { color: '#cbd5e1' } 
                } 
            } 
        } 
    }
};

function createOrUpdateChart(canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    if (canvas.chart) {
        canvas.chart.data = config.data;
        canvas.chart.update();
    } else {
        canvas.chart = new Chart(canvas, config);
    }

    
}

function initDashboardCharts() {
    chartConfigs.throughputChart = { type: 'line', data: { labels: [], datasets: [{ label: 'Trains/Hour', data: [], borderColor: '#22c55e', backgroundColor: 'rgba(34, 197, 94, 0.1)', tension: 0.4, fill: true }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#334155' } }, x: { grid: { color: '#334155' } } } } };
    chartConfigs.delayChart = { type: 'bar', data: { labels: ['Express', 'Passenger', 'Freight'], datasets: [{ label: 'Average Delay (min)', data: [0,0,0], backgroundColor: ['#ef4444', '#3b82f6', '#f59e0b'], borderRadius: 5 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#334155' } }, x: { grid: { display: false } } } } };
    chartConfigs.performanceChart = { type: 'doughnut', data: { labels: ['On Time', 'Minor Delay (<5m)', 'Major Delay (>=5m)'], datasets: [{ data: [1,1,1], backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#cbd5e1' } } } } };
    
    createOrUpdateChart('throughputChart', chartConfigs.throughputChart);
    createOrUpdateChart('delayChart', chartConfigs.delayChart);
    createOrUpdateChart('performanceChart', chartConfigs.performanceChart);
    
    updateDashboardCharts();
}

function initAnalyticsCharts() {
    createOrUpdateChart('detailedMetricsChart', chartConfigs.detailedMetricsChart);
}

// MODIFIED: This function now updates all three charts, including Throughput
function updateDashboardCharts() {
    if (!document.getElementById('dashboard').classList.contains('active')) return;

    // --- Throughput Chart Data ---
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    finishedTrainTimestamps = finishedTrainTimestamps.filter(t => t >= oneHourAgo);
    const trainsPerHour = finishedTrainTimestamps.length;
    
    const timeString = new Date().toTimeString().split(' ')[0];
    const throughputChart = document.getElementById('throughputChart')?.chart;
    if (throughputChart) {
        if (throughputChart.data.labels.length > 10) {
            throughputChart.data.labels.shift();
            throughputChart.data.datasets[0].data.shift();
        }
        throughputChart.data.labels.push(timeString);
        throughputChart.data.datasets[0].data.push(trainsPerHour);
        throughputChart.update(); // The missing call to redraw the chart
    }

    // --- Performance & Delay Chart Data ---
    let onTimeCount = 0, minorDelayCount = 0, majorDelayCount = 0;
    const delays = { express: [], passenger: [], freight: [] };
    currentTrains.forEach(train => {
        if (train.status === 'finished' || train.status === 'running') {
            if(train.delay > 0) {
                delays[train.type].push(train.delay);
                if(train.delay < 5) minorDelayCount++;
                else majorDelayCount++;
            } else {
                onTimeCount++;
            }
        }
    });
    
    // --- Update Chart Instances ---
    const performanceData = [onTimeCount, minorDelayCount, majorDelayCount];
    if (chartConfigs.performanceChart) {
        chartConfigs.performanceChart.data.datasets[0].data = performanceData.some(d => d > 0) ? performanceData : [1,0,0];
        createOrUpdateChart('performanceChart', chartConfigs.performanceChart);
    }
    
    const avgDelay = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const delayData = [avgDelay(delays.express), avgDelay(delays.passenger), avgDelay(delays.freight)];
     if (chartConfigs.delayChart) {
        chartConfigs.delayChart.data.datasets[0].data = delayData;
        createOrUpdateChart('delayChart', chartConfigs.delayChart);
    }
}



