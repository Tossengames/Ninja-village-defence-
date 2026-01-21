// ============================================
// CUSTOM MISSIONS MENU (ONE SCRIPT)
// GITHUB PAGES SAFE
// ============================================

(() => {

const MAPS_FOLDER = './maps/';
const missions = [];

// ---------- CREATE MENU HTML ----------
function createCustomMissionMenu() {
    if (document.getElementById('customMissionMenu')) return;

    const menu = document.createElement('div');
    menu.id = 'customMissionMenu';
    menu.style.cssText = `
        position: fixed;
        inset: 0;
        background: #050505;
        color: #eee;
        padding: 20px;
        overflow-y: auto;
        display: none;
        z-index: 9999;
    `;

    menu.innerHTML = `
        <h2 style="margin-top:0;">🗺 Custom Missions</h2>

        <div id="missionList" style="margin-top:15px;"></div>

        <button id="closeMissionMenu"
            style="margin-top:20px;padding:10px 16px;">
            ⬅ Back
        </button>
    `;

    document.body.appendChild(menu);

    document.getElementById('closeMissionMenu').onclick = () => {
        menu.style.display = 'none';
    };
}

// ---------- LOAD MISSIONS ----------
async function loadCustomMissions() {
    createCustomMissionMenu();

    const listEl = document.getElementById('missionList');
    listEl.innerHTML = 'Loading missions...';

    missions.length = 0;

    try {
        const res = await fetch(MAPS_FOLDER + 'mission_list.json');
        if (!res.ok) throw 'mission_list.json missing';

        const files = await res.json();

        for (const file of files) {
            const mission = await loadMissionFile(file);
            if (mission) missions.push(mission);
        }

        renderMissionList();

    } catch (e) {
        console.error(e);
        listEl.innerHTML = '❌ Failed to load missions';
    }
}

async function loadMissionFile(file) {
    try {
        const res = await fetch(MAPS_FOLDER + file);
        if (!res.ok) return null;

        const data = await res.json();
        data.id = file.replace('.json', '');
        data.fileName = file;
        return data;

    } catch {
        return null;
    }
}

// ---------- RENDER ----------
function renderMissionList() {
    const listEl = document.getElementById('missionList');
    listEl.innerHTML = '';

    if (missions.length === 0) {
        listEl.innerHTML = '❌ No missions found';
        return;
    }

    missions.forEach(m => {
        const btn = document.createElement('button');
        btn.style.cssText = `
            display:block;
            width:100%;
            margin-bottom:8px;
            padding:10px;
            text-align:left;
        `;
        btn.innerHTML = `
            <strong>${m.name}</strong><br>
            <small>${m.width}x${m.height}</small>
        `;

        btn.onclick = () => {
            console.log('Play mission:', m.id);
            // playMission(m.id);
        };

        listEl.appendChild(btn);
    });
}

// ---------- PUBLIC ----------
window.openCustomMissions = () => {
    const menu = document.getElementById('customMissionMenu');
    menu.style.display = 'block';
    loadCustomMissions();
};

})();