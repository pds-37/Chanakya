// Connect to the Node.js server (change 'localhost' to the server's IP if on another PC)
const socket = io("https://railway-simulation.onrender.com");

let trainDataFromServer = {}; // This will hold the LIVE train status

// Add this helper object
const stationNames = {
    'UMB': 'Ambala', 'PNP': 'Panipat', 'SZM': 'Sabzi Mandi', 'NDL': 'New Delhi',
    'NZM': 'Nizamuddin', 'FDB': 'Faridabad', 'PWL': 'Palwal', 'MTJ': 'Mathura Jn',
    'GZB': 'Ghaziabad', 'MRT': 'Meerut'
};

// Add this new function to render the map dynamically
function renderLiveMap(train) {
    const mapList = document.getElementById('map-station-list');
    if (!mapList) return;
    mapList.innerHTML = ''; // Clear previous map

    // Determine the train's current position in its schedule
    const currentStationIndex = train.liveCurrentStationIndex;

    // Render the schedule list in the Live Map panel
    train.liveSchedule.forEach((station, index) => {
        const li = document.createElement('li');
        let stationStatus = "Pending";
        let statusClass = "";

        if (train.status === 'finished' && index === train.liveSchedule.length - 1) {
             li.className = 'current';
             stationStatus = "Arrived";
        } else if (index < currentStationIndex) {
            stationStatus = "Departed";
        } else if (index === currentStationIndex) {
            li.className = 'current';
            stationStatus = "Approaching"; 
            statusClass = "on-time";
        }

        li.innerHTML = `
            <div class="station-details">
                <div class="station-code">${station.code} <span class="station-name">(${station.name})</span></div>
            </div>
            <div class="station-info">
                <div class="status ${statusClass}">${stationStatus}</div>
            </div>
        `;
        mapList.appendChild(li);
    });
}
const trainData = {
    // --- Existing Trains ---
    '12951': {
        id: '12951',
        type: 'express',
        name: 'Rajdhani Express',
        status: 'On Time',
        eta: '14:30',
        delay: '0 min',
        nextStation: 'Ghaziabad',
        routeDisplay: 'New Delhi -> Meerut',
        schedule: [
            { stationCode: 'NDL', stationName: 'New Delhi', arrival: 'Start', departure: '14:00', status: 'On Time' },
            { stationCode: 'GZB', stationName: 'Ghaziabad', arrival: '14:30', departure: '14:32', status: 'On Time' },
            { stationCode: 'MRT', stationName: 'Meerut', arrival: '15:10', departure: 'End', status: 'On Time' }
        ]
    },
    '12003': {
        id: '12003',
        type: 'express',
        name: 'Shatabdi Express',
        status: 'On Time',
        eta: '15:15',
        delay: '0 min',
        nextStation: 'Ghaziabad',
        routeDisplay: 'Meerut -> New Delhi',
        schedule: [
            { stationCode: 'MRT', stationName: 'Meerut', arrival: 'Start', departure: '15:00', status: 'On Time' },
            { stationCode: 'GZB', stationName: 'Ghaziabad', arrival: '15:40', departure: '15:42', status: 'On Time' },
            { stationCode: 'NDL', stationName: 'New Delhi', arrival: '16:15', departure: 'End', status: 'On Time' }
        ]
    },
    // --- Added 8 New Trains ---
    '22440': {
        id: '22440',
        type: 'express',
        name: 'Vande Bharat',
        status: 'On Time',
        eta: '17:00',
        delay: '0 min',
        nextStation: 'New Delhi',
        routeDisplay: 'Ambala -> New Delhi',
        schedule: [
            { stationCode: 'UMB', stationName: 'Ambala', arrival: 'Start', departure: '16:00', status: 'On Time' },
            { stationCode: 'NDL', stationName: 'New Delhi', arrival: '17:00', departure: 'End', status: 'On Time' }
        ]
    },
    '12424': {
        id: '12424',
        type: 'express',
        name: 'Dbrg Rajdhani',
        status: 'On Time',
        eta: '18:30',
        delay: '0 min',
        nextStation: 'New Delhi',
        routeDisplay: 'Jaipur -> New Delhi',
        schedule: [
            { stationCode: 'JP', stationName: 'Jaipur', arrival: 'Start', departure: '17:00', status: 'On Time' },
            { stationCode: 'NDL', stationName: 'New Delhi', arrival: '18:30', departure: 'End', status: 'On Time' }
        ]
    },
    '12015': {
        id: '12015',
        type: 'express',
        name: 'Ajmer Shatabdi',
        status: 'On Time',
        eta: '19:45',
        delay: '0 min',
        nextStation: 'Jaipur',
        routeDisplay: 'New Delhi -> Jaipur',
        schedule: [
            { stationCode: 'NDL', stationName: 'New Delhi', arrival: 'Start', departure: '18:15', status: 'On Time' },
            { stationCode: 'JP', stationName: 'Jaipur', arrival: '19:45', departure: 'End', status: 'On Time' }
        ]
    },
    '04408': {
        id: '04408',
        type: 'passenger',
        name: 'MEMU',
        status: 'On Time',
        eta: '14:50',
        delay: '0 min',
        nextStation: 'Sahibabad',
        routeDisplay: 'New Delhi -> Sahibabad',
        schedule: [
            { stationCode: 'NDL', stationName: 'New Delhi', arrival: 'Start', departure: '14:20', status: 'On Time' },
            { stationCode: 'SBD', stationName: 'Sahibabad', arrival: '14:50', departure: 'End', status: 'On Time' }
        ]
    },
    '14205': {
        id: '14205',
        type: 'passenger',
        name: 'Express',
        status: 'On Time',
        eta: '21:00',
        delay: '0 min',
        nextStation: 'Agra',
        routeDisplay: 'New Delhi -> Agra',
        schedule: [
            { stationCode: 'NDL', stationName: 'New Delhi', arrival: 'Start', departure: '20:00', status: 'On Time' },
            { stationCode: 'AGRA', stationName: 'Agra', arrival: '21:00', departure: 'End', status: 'On Time' }
        ]
    },
    '15014': {
        id: '15014',
        type: 'passenger',
        name: 'Ranikhet Exp',
        status: 'On Time',
        eta: '22:30',
        delay: '0 min',
        nextStation: 'New Delhi',
        routeDisplay: 'Ambala -> New Delhi',
        schedule: [
            { stationCode: 'UMB', stationName: 'Ambala', arrival: 'Start', departure: '21:20', status: 'On Time' },
            { stationCode: 'NDL', stationName: 'New Delhi', arrival: '22:30', departure: 'End', status: 'On Time' }
        ]
    },
    '54321': {
        id: '54321',
        type: 'freight',
        name: 'Goods',
        status: 'On Time',
        eta: '17:30',
        delay: '0 min',
        nextStation: 'Moradabad',
        routeDisplay: 'Ghaziabad -> Moradabad',
        schedule: [
            { stationCode: 'GZB', stationName: 'Ghaziabad', arrival: 'Start', departure: '16:30', status: 'On Time' },
            { stationCode: 'MRD', stationName: 'Moradabad', arrival: '17:30', departure: 'End', status: 'On Time' }
        ]
    },
    '54322': {
        id: '54322',
        type: 'freight',
        name: 'Goods',
        status: 'On Time',
        eta: '18:00',
        delay: '0 min',
        nextStation: 'Ghaziabad',
        routeDisplay: 'New Delhi -> Meerut',
        schedule: [
            { stationCode: 'NDL', stationName: 'New Delhi', arrival: 'Start', departure: '17:00', status: 'On Time' },
            { stationCode: 'GZB', stationName: 'Ghaziabad', arrival: '17:30', departure: '17:35', status: 'On Time' },
            { stationCode: 'MRT', stationName: 'Meerut', arrival: '18:15', departure: 'End', status: 'On Time' }
        ]
    }
};
let currentTrainId = null;

function handleLogout() {
    window.location.href = 'index.html';
}

function showMessageBox(title, message) {
    document.getElementById('messageBoxTitle').textContent = title;
    document.getElementById('messageBoxContent').textContent = message;
    document.getElementById('messageBox').style.display = 'flex';
}

function hideMessageBox() {
    document.getElementById('messageBox').style.display = 'none';
}

function updateTime() {
    const now = new Date();
    const timeElement = document.getElementById('current-time');
    if (timeElement) {
        timeElement.textContent = now.toTimeString().split(' ')[0];
    }
}
setInterval(updateTime, 1000);

// NEW FUNCTION TO HANDLE EMERGENCY STOP
function triggerEmergencyStop() {
    if (!currentTrainId) return;
    const alertData = { trainId: currentTrainId, timestamp: new Date().toISOString() };
    // Replaced localStorage with socket.emit
    socket.emit('emergencyStop', alertData);
    showMessageBox('Emergency Stop Activated', `Signal sent to control room.`);
}



// Replace your old updateLocoPilotDashboard function with this one.
function updateLocoPilotDashboard() {
    const train = trainDataFromServer;
    if (!train || !train.id) return; // Wait for the first live update

    // Update text fields using live data
    document.getElementById('lp-train-title').textContent = `${train.id} - ${train.name}`;
    document.getElementById('lp-train-route').textContent = `${train.source} → ${train.destination}`;
    document.getElementById('lp-delay').textContent = `${train.delay || 0} min`;
    
    // Determine Next Station from the live schedule
    let nextStationName = "Destination";
    if (train.liveSchedule && train.liveCurrentStationIndex < train.liveSchedule.length - 1) {
        nextStationName = train.liveSchedule[train.liveCurrentStationIndex + 1].name;
    }
    
    document.getElementById('lp-next-station').textContent = nextStationName;
    document.getElementById('lp-eta').textContent = (train.status === 'finished') ? 'Arrived' : 'Calculating...';

    // Update status indicator
    const statusIndicator = document.getElementById('lp-status-indicator');
    statusIndicator.textContent = train.status.replace('_', ' ').toUpperCase();
    statusIndicator.className = 'locopilot-status';
    statusIndicator.classList.add(train.status === 'running' ? 'on-time' : 'delayed');

    // Update Resume Button State
    const resumeButton = document.getElementById('resume-button');
    if (resumeButton) {
        const isStopped = train.status === 'held' || train.status === 'emergency_stop';
        resumeButton.disabled = !isStopped;
    }

    // Call the function to render the map using the live schedule
    if (train.liveSchedule) {
        renderLiveMap(train);
    }
}

function renderLiveMap(train) {
    const mapList = document.getElementById('map-station-list');
    if (!mapList) return;
    mapList.innerHTML = ''; // Clear previous map

    // Find index of the current station in the live schedule
    const currentTrackId = train.route[train.currentTrackIndex];
    let currentStationIndex = -1;
    if (currentTrackId) {
        train.liveSchedule.forEach((station, index) => {
            if (currentTrackId.includes(station.code)) {
                currentStationIndex = index;
            }
        });
    }

    train.liveSchedule.forEach((station, index) => {
        const li = document.createElement('li');
        if (index === currentStationIndex) {
            li.className = 'current';
        }

        li.innerHTML = `
            <div class="station-details">
                <div class="station-code">${station.code} <span class="station-name">(${station.name})</span></div>
                <div class="arrival-time">${index === 0 ? 'Start' : '--:--'}</div>
            </div>
            <div class="station-info">
                <div class="status on-time">${index < currentStationIndex ? 'Departed' : 'En Route'}</div>
            </div>
        `;
        mapList.appendChild(li);
    });
    document.getElementById('map-date').textContent = `Journey for: ${new Date().toLocaleDateString()}`;
}
/*
function renderLiveMap(train) {
    const mapList = document.getElementById('map-station-list');
    if (!mapList) return;
    mapList.innerHTML = '';
    
    train.schedule.forEach((station, index) => {
        const li = document.createElement('li');
        // Simple logic to mark the first station as 'current' for demo
        li.className = index === 0 ? 'current' : '';
        li.innerHTML = `
            <div class="station-details">
                <div class="station-code">${station.stationCode} <span class="station-name">(${station.stationName})</span></div>
                <div class="arrival-time">${station.arrival}</div>
            </div>
            <div class="station-info">
                <div class="status on-time">${station.status}</div>
            </div>
        `;
        mapList.appendChild(li);
    });
    document.getElementById('map-date').textContent = `Start Date: ${new Date().toLocaleDateString()}`;
}
    */
    
    

function addUpdate(message, type = 'normal') {
    const updatesLog = document.getElementById('updates-log');
    if (!updatesLog) return;
    const now = new Date();
    const timeString = now.toTimeString().split(' ')[0];
    const updateItem = document.createElement('div');
    updateItem.className = 'update-item';
    if (type === 'critical') {
        updateItem.classList.add('critical');
    }
    updateItem.innerHTML = `
        <span class="timestamp">${timeString}</span>
        <div>${message}</div>
    `;
    updatesLog.prepend(updateItem);
}


document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const trainId = urlParams.get('train')?.toUpperCase();

    if (trainId) {
        currentTrainId = trainId;
        addUpdate("Dashboard initialized. Connecting to control server...");
        
        // --- PHASE 2 SCALING UPDATES START HERE ---

        socket.on('connect', () => {
            console.log('Connected to server with ID:', socket.id);
            addUpdate("✅ Connected to control server. Awaiting live data.");
            
            // [NEW] 1. Tell the server to add us to the specific room for this train
            // This ensures we only get messages meant for us
            socket.emit('joinTrainRoom', currentTrainId);
        });

        // [NEW] 2. Listen for the optimized, specific update event
        // The server now sends ONLY our train object, not the whole array.
        socket.on('trainSpecificUpdate', (myTrainData) => {
            // No need to loop or .find() anymore!
            trainDataFromServer = myTrainData;
            updateLocoPilotDashboard();
        });

        // [DELETED] The old 'stateUpdate' listener is removed to save bandwidth.

        // --- PHASE 2 SCALING UPDATES END HERE ---

        socket.on('pilotMessage', (data) => {
            // Because we are in a room, the server ensures this message is for us,
            // but keeping the ID check is a good safety backup.
            if (data.trainId === trainId) {
                addUpdate(data.message);
            }
        });
        
    } else {
        document.body.innerHTML = `<div style="text-align: center; padding-top: 50px;"><h2>Error: No Train ID specified.</h2><p>Please access this page with a URL parameter, e.g., loco_pilot.html?train=12951</p></div>`;
    }
    
    updateTime();
});
// Add this new function to your loco_pilot.js file
function requestResume() {
    if (!currentTrainId) return;
    const resumeData = { trainId: currentTrainId, timestamp: new Date().toISOString() };
    // This sends the resume request to the server
    socket.emit('resumeRequest', resumeData);
    showMessageBox('Request Sent', 'Resume request sent to control. Awaiting clearance.');
}

