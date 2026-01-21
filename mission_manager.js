// GITHUB PAGES MISSION LOADER
const MAPS_FOLDER = 'maps/';
let missions = [];

async function loadMissions() {
    missions = [];
    
    // Load the mission list file
    try {
        const listResponse = await fetch(MAPS_FOLDER + 'mission_list.json');
        if (!listResponse.ok) {
            console.error('Cannot load mission_list.json');
            return;
        }
        
        const fileList = await listResponse.json();
        console.log('File list found:', fileList);
        
        // Load each mission file from the list
        for (const fileName of fileList) {
            await loadMissionFile(fileName);
        }
        
    } catch (error) {
        console.error('Error loading missions:', error);
    }
    
    console.log('Total missions loaded:', missions.length);
    
    // Update the UI
    updateMissionList();
}

async function loadMissionFile(fileName) {
    try {
        console.log('Trying to load:', MAPS_FOLDER + fileName);
        
        const response = await fetch(MAPS_FOLDER + fileName);
        
        if (!response.ok) {
            console.error('Failed to load', fileName, 'Status:', response.status);
            return;
        }
        
        const data = await response.json();
        
        // Basic validation
        if (!data || !data.name || !data.width || !data.height) {
            console.error('Invalid mission format in', fileName);
            return;
        }
        
        // Add mission
        data.id = 'mission_' + fileName.replace('.json', '');
        data.fileName = fileName;
        missions.push(data);
        
        console.log('✓ Loaded:', data.name);
        
    } catch (error) {
        console.error('Error loading', fileName, ':', error.message);
    }
}

function updateMissionList() {
    const missionList = document.getElementById('missionList');
    if (!missionList) {
        console.error('missionList element not found!');
        return;
    }
    
    if (missions.length === 0) {
        missionList.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #888;">
                <div>❌ No missions loaded!</div>
                <div style="font-size: 12px; margin-top: 10px;">
                    Check browser console for errors
                </div>
                <button onclick="loadMissions()" style="margin-top: 15px; padding: 8px 16px;">
                    🔄 Try Again
                </button>
            </div>
        `;
        return;
    }
    
    missionList.innerHTML = '';
    
    missions.forEach(mission => {
        const div = document.createElement('div');
        div.className = 'mission-item';
        div.innerHTML = `
            <div style="font-weight: bold;">${mission.name}</div>
            <div style="font-size: 12px; color: #aaa;">${mission.fileName}</div>
            <div style="font-size: 11px; color: #888;">
                ${mission.width}x${mission.height} | ${mission.goal || 'escape'}
            </div>
            <button onclick="playMission('${mission.id}')" style="margin-top: 5px;">
                ▶️ Play
            </button>
        `;
        missionList.appendChild(div);
    });
}

// Initialize
window.addEventListener('load', function() {
    console.log('Mission Loader starting...');
    loadMissions();
});

// Make it available globally
window.loadMissions = loadMissions;
window.missions = missions;