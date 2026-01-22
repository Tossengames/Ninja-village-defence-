// campaign.js - Map Selection System
window.campaignMaps = [];
window.selectedMap = null;
window.customMapData = null;
window.USE_CUSTOM_MAP = false;

const MAP_MANIFEST_URL = 'campaign_maps.json';

function openMapSelection() {
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('mapSelectionScreen').classList.remove('hidden');
    buildMapList();
}

function backToMapSelection() {
    const startBtn = document.getElementById('startGameBtn');
    if (startBtn && startBtn._originalOnClick) {
        startBtn.onclick = startBtn._originalOnClick;
        startBtn.textContent = "START MISSION";
    }
    document.getElementById('itemSelection').classList.add('hidden');
    document.getElementById('mapSelectionScreen').classList.remove('hidden');
}

async function loadCampaignManifest() {
    try {
        const response = await fetch(MAP_MANIFEST_URL);
        if (!response.ok) throw new Error("Manifest not found");
        window.campaignMaps = await response.json();
    } catch (error) {
        console.warn("Using fallback map");
        window.campaignMaps = [{ id: 'default_random', name: 'Random Map', file: null, description: 'Procedural Level' }];
    }
}

function buildMapList() {
    const container = document.getElementById('mapListContainer');
    if (!container) return;
    container.innerHTML = '';

    window.campaignMaps.forEach(map => {
        const btn = document.createElement('div');
        btn.className = 'selected-item-preview';
        btn.style.cssText = "cursor:pointer; text-align:center; padding:15px; margin:8px 0; border:2px solid #ff3333; background:#2a1a1a; color:white;";
        btn.innerHTML = `<strong>${map.name}</strong><br><small>${map.description || ''}</small>`;
        btn.onclick = () => selectMap(map);
        container.appendChild(btn);
    });
}

function selectMap(mapData) {
    window.selectedMap = mapData;
    document.getElementById('mapSelectionScreen').classList.add('hidden');
    document.getElementById('itemSelection').classList.remove('hidden');

    const startBtn = document.getElementById('startGameBtn');
    if (startBtn) {
        if (!startBtn._originalOnClick) startBtn._originalOnClick = startBtn.onclick;
        startBtn.onclick = () => startCampaignMap(mapData);
        startBtn.textContent = `START: ${mapData.name}`;
    }
}

async function startCampaignMap(mapData) {
    if (!mapData.file) {
        window.USE_CUSTOM_MAP = false;
        if (typeof startGame === 'function') startGame();
        return;
    }

    try {
        const response = await fetch(mapData.file);
        window.customMapData = await response.json();
        window.USE_CUSTOM_MAP = true;
        
        document.getElementById('itemSelection').classList.add('hidden');
        
        // IMPORTANT: Call the game initialization
        if (typeof initGame === 'function') initGame();
        else if (typeof startGame === 'function') startGame();
    } catch (e) {
        alert("Error loading map file!");
    }
}

// Global Exports
window.openMapSelection = openMapSelection;
window.backToMapSelection = backToMapSelection;

window.addEventListener('load', () => {
    setTimeout(loadCampaignManifest, 500);
});
