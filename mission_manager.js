// ============================================
// GITHUB PAGES MISSION LOADER (FIXED)
// ============================================

const MAPS_FOLDER = './maps/'; // IMPORTANT for GitHub Pages
const missions = []; // keep reference stable

async function loadMissions() {
    console.log('Loading missions...');
    
    // DO NOT reassign missions (breaks reference)
    missions.length = 0;

    try {
        const listResponse = await fetch(MAPS_FOLDER + 'mission_list.json');
        if (!listResponse.ok) {
            console.error('❌ Cannot load mission_list.json');
            updateMissionList();
            return;
        }

        const fileList = await listResponse.json();

        if (!Array.isArray(fileList)) {
            console.error('❌ mission_list.json must be an array');
            updateMissionList();
            return;
        }

        console.log('Mission list:', fileList);

        for (const fileName of fileList) {
            await loadMissionFile(fileName);
        }

    } catch (error) {
        console.error('❌ Error loading missions:', error);
    }

    console.log('✅ Total missions loaded:', missions.length);
    updateMissionList();
}

async function loadMissionFile(fileName) {
    try {
        const path = MAPS_FOLDER + fileName;
        console.log('Loading:', path);

        const response = await fetch(path);
        if (!response.ok) {
            console.error('❌ Failed:', fileName, response.status);
            return;
        }

        const data = await response.json();

        // Basic validation
        if (!data.name || !data.width || !data.height) {
            console.error('❌ Invalid mission format:', fileName);
            return;
        }

        data.id = 'mission_' + fileName.replace('.json', '');
        data.fileName = fileName;

        missions.push(data);
        console.log('✔ Loaded:', data.name);

    } catch (error) {
        console.error('❌ Error loading', fileName, error);
    }
}

function updateMissionList() {
    const missionList = document.getElementById('missionList');

    if (!missionList) {
        console.error('❌ missionList element not found');
        return;
    }

    missionList.innerHTML = '';

    if (missions.length === 0) {
        missionList.innerHTML = `
            <div style="padding:20px;text-align:center;color:#888;">
                <div>❌ No missions loaded</div>
                <button onclick="loadMissions()" style="margin-top:10px;">
                    🔄 Retry
                </button>
            </div>
        `;
        return;
    }

    missions.forEach(mission => {
        const div = document.createElement('div');
        div.className = 'mission-item';
        div.innerHTML = `
            <div style="font-weight:bold;">${mission.name}</div>
            <div style="font-size:12px;color:#aaa;">${mission.fileName}</div>
            <div style="font-size:11px;color:#777;">
                ${mission.width}x${mission.height} | ${mission.goal || 'escape'}
            </div>
            <button onclick="playMission('${mission.id}')">
                ▶️ Play
            </button>
        `;
        missionList.appendChild(div);
    });
}

// ============================================
// INIT
// ============================================

window.addEventListener('load', loadMissions);

// Expose globally if needed
window.loadMissions = loadMissions;
window.missions = missions;