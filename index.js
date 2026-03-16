// Custom Message Box functions
function showMessageBox(title, message) {
    document.getElementById('messageBoxTitle').textContent = title;
    document.getElementById('messageBoxContent').textContent = message;
    document.getElementById('messageBox').style.display = 'flex';
}

function hideMessageBox() {
    document.getElementById('messageBox').style.display = 'none';
}

function showLoginFields(role) {
    const loginContainer = document.getElementById('login-container');
    let loginFormHtml = `
        <h2>Login as ${role === 'station_master' ? 'Station Master' : 'Loco Pilot'}</h2>
        <p>Enter your credentials to access the system.</p>
        <div class="login-form">
            <label class="input-label" for="user-id">User ID</label>
            <input type="text" id="user-id" class="input-field" placeholder="Enter your ID">
        `;
    if (role === 'station_master') {
        loginFormHtml += `
                <label class="input-label" for="station-code">Station Code</label>
                <input type="text" id="station-code" class="input-field" placeholder="e.g., NDL or ANVT">
            `;
    } else {
        loginFormHtml += `
                <label class="input-label" for="train-id">Train ID</label>
                <input type="text" id="train-id" class="input-field" placeholder="e.g., 12951, 22440, etc.">
            `;
    }
    loginFormHtml += `
            <button class="btn btn-primary" onclick="performLogin('${role}')">Login</button>
            <button class="btn btn-warning" onclick="showRoleSelection()">Back</button>
        </div>
        `;
    loginContainer.innerHTML = loginFormHtml;
}

function showRoleSelection() {
    const loginContainer = document.getElementById('login-container');
    loginContainer.innerHTML = `
        <h2>Welcome</h2>
        <p>Please select your role to log in.</p>
        <div class="login-form-wrapper">
            <button class="btn btn-primary" onclick="showLoginFields('station_master')">Login as Station Master</button>
            <button class="btn btn-primary" onclick="showLoginFields('loco_pilot')">Login as Loco Pilot</button>
        </div>
    `;
}

function performLogin(role) {
    const userId = document.getElementById('user-id').value.toUpperCase();
    let loginSuccess = false;
    let stationCode = null;
    let trainId = null;

    if (role === 'station_master') {
        stationCode = document.getElementById('station-code').value.toUpperCase();
        if ((userId === 'SM101' && stationCode === 'NDL') || (userId === 'SM102' && stationCode === 'ANVT')) {
            loginSuccess = true;
            window.location.href = `station_master.html?station=${stationCode}`;
        }
    } else if (role === 'loco_pilot') {
        trainId = document.getElementById('train-id').value.toUpperCase();
        
        // A map of all valid pilot-to-train assignments
        const validLocoPilots = {
            'LP201': '12951',
            'LP202': '12003',
            'LP203': '22440',
            'LP204': '12424',
            'LP205': '12015',
            'LP206': '04408',
            'LP207': '14205',
            'LP208': '15014',
            'LP209': '54321',
            'LP210': '54322'
        };

        // Check if the provided User ID exists and if its assigned Train ID matches
        if (validLocoPilots[userId] === trainId) {
            loginSuccess = true;
            window.location.href = `loco_pilot.html?train=${trainId}`;
        }
    }

    if (!loginSuccess) {
        showMessageBox('Login Failed', 'Invalid credentials. Please try again.');
    }
}