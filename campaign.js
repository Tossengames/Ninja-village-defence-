// campaign.js - Complete Map Selection System
// ============================================

// Global variables
window.campaignMaps = []; // Array of available maps
window.selectedMap = null; // Currently selected map
window.customMapData = null; // Custom map data to load
window.USE_CUSTOM_MAP = false; // Flag to use custom map

// Map manifest URL
const MAP_MANIFEST_URL = 'campaign_maps.json';

// ============================================
// MAP SELECTION FUNCTIONS
// ============================================

// Open the map selection screen
function openMapSelection() {
    console.log("Opening map selection...");
    document.getElementById('mainMenu')?.classList.add('hidden');
    document.getElementById('mapSelectionScreen')?.classList.remove('hidden');
    buildMapList();
}

// Go back to map selection
function backToMapSelection() {
    console.log("Going back to map selection...");
    const startBtn = document.getElementById('startGameBtn');
    if (startBtn && startBtn._originalOnClick) {
        startBtn.onclick = startBtn._originalOnClick;
        startBtn.textContent = "START MISSION";
    }
    document.getElementById('itemSelection')?.classList.add('hidden');
    document.getElementById('mapSelectionScreen')?.classList.remove('hidden');
}

// Load map manifest
function loadCampaignManifest() {
    console.log("Loading map manifest...");
    return fetch(MAP_MANIFEST_URL)
        .then(res => {
            if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
            return res.json();
        })
        .then(maps => {
            window.campaignMaps = maps;
            console.log(`Loaded ${maps.length} maps`);
            return maps;
        })
        .catch(err => {
            console.error("Failed to load manifest:", err);
            window.campaignMaps = [{
                id: 'default_random',
                name: 'Random Map',
                file: null,
                description: 'Original randomly generated map',
                width: 12,
                height: 12
            }];
            console.log("Using fallback map list");
            return window.campaignMaps;
        });
}

// Build map selection UI
function buildMapList() {
    const container = document.getElementById('mapListContainer');
    if (!container) {
        console.error("Map list container not found!");
        return;
    }

    container.innerHTML = '';
    if (!window.campaignMaps.length) {
        container.innerHTML = `<div class="empty-preview">⚠️ No maps available</div>`;
        return;
    }

    window.campaignMaps.forEach(map => {
        const btn = document.createElement('div');
        btn.className = 'selected-item-preview';
        btn.style.cursor = 'pointer';
        btn.style.textAlign = 'center';
        btn.style.padding = '15px';
        btn.style.margin = '8px 0';
        btn.onclick = () => selectMap(map);

        const isRandom = !map.file;
        const icon = isRandom ? '🎲' : '🗺️';
        const borderColor = isRandom ? '#888' : '#ff3333';
        btn.style.border = `2px solid ${borderColor}`;
        btn.style.background = isRandom ? 'linear-gradient(145deg, #222, #1a1a1a)' : 'linear-gradient(145deg, #2a1a1a, #1a1a1a)';

        btn.innerHTML = `
            <div class="item-icon" style="font-size:28px;margin-bottom:8px">${icon}</div>
            <div class="item-name" style="color:#fff;font-weight:bold;font-size:14px">${map.name}</div>
            <div style="font-size:11px;color:#aaa;margin:5px 0">${map.description || ''}</div>
            <div style="font-size:10px;color:#666">${isRandom ? 'Random Generation' : `${map.width}×${map.height}`}</div>
        `;
        container.appendChild(btn);
    });

    console.log(`Built UI for ${window.campaignMaps.length} maps`);
}

// Select a map
function selectMap(mapData) {
    console.log("Selected map:", mapData.name);
    window.selectedMap = mapData;

    document.getElementById('mapSelectionScreen')?.classList.add('hidden');
    document.getElementById('itemSelection')?.classList.remove('hidden');

    const startBtn = document.getElementById('startGameBtn');
    if (startBtn) {
        if (!startBtn._originalOnClick) startBtn._originalOnClick = startBtn.onclick;
        startBtn.onclick = () => startCampaignMap(mapData);
        startBtn.textContent = `START: ${mapData.name}`;
    }
}

// Start the selected map
function startCampaignMap(mapData) {
    console.log("Starting campaign map:", mapData.name);
    document.getElementById('itemSelection')?.classList.add('hidden');
    document.getElementById('mapSelectionScreen')?.classList.add('hidden');

    if (!mapData.file) {
        console.log("Using random map generator...");
        window.USE_CUSTOM_MAP = false;
        window.customMapData = null;
        if (typeof window.startGame === 'function') window.startGame();
        else alert("startGame function not found!");
        return;
    }

    fetch(mapData.file)
        .then(res => res.ok ? res.json() : Promise.reject(res.status))
        .then(mapConfig => {
            console.log("Map loaded successfully:", mapConfig.name);
            window.customMapData = mapConfig;
            window.USE_CUSTOM_MAP = true;
            if (typeof window.startGame === 'function') window.startGame();
            else alert("startGame function not found!");
        })
        .catch(err => {
            console.error("Failed to load map file:", err);
            alert(`Error loading map "${mapData.name}"`);
            const startBtn = document.getElementById('startGameBtn');
            if (startBtn && startBtn._originalOnClick) {
                startBtn.onclick = startBtn._originalOnClick;
                startBtn.textContent = "START MISSION";
            }
        });
}

// ============================================
// MAP DATA VALIDATION
// ============================================
function validateMapData(mapData) {
    if (!mapData) return false;
    const required = ['name','width','height','grid'];
    for (let f of required) if (!(f in mapData)) return false;
    if (mapData.grid.length !== mapData.height) return false;
    for (let row of mapData.grid) if (row.length !== mapData.width) return false;
    return true;
}

// ============================================
// CUSTOM MAP INTEGRATION
// ============================================
function installCustomMapSupport() {
    if (typeof window.generateLevel !== 'function') {
        console.error("generateLevel not found! Custom maps won't work.");
        return;
    }

    window._originalGenerateLevel = window.generateLevel;

    window.generateLevel = function(guardCount) {
        if (window.USE_CUSTOM_MAP && window.customMapData) {
            console.log("Using custom map:", window.customMapData.name);

            const map = window.customMapData;
            try {
                mapDim = map.width;
                grid = map.grid.map(r => [...r]);

                // Player
                const px = Math.max(0, Math.min(mapDim - 1, map.player?.x ?? 1));
                const py = Math.max(0, Math.min(mapDim - 1, map.player?.y ?? 1));
                player.x = player.ax = px;
                player.y = player.ay = py;
                player.dir = {x:0,y:0};
                player.isHidden = (grid[py][px] === HIDE);

                // Exit
                if (map.exit) {
                    const ex = Math.max(0, Math.min(mapDim-1,map.exit.x));
                    const ey = Math.max(0, Math.min(mapDim-1,map.exit.y));
                    grid[ey][ex] = EXIT;
                } else grid[mapDim-2][mapDim-2] = EXIT;

                // Enemies
                enemies = [];
                if (Array.isArray(map.enemies)) {
                    map.enemies.forEach((e,i) => {
                        if (typeof e.x === 'number' && typeof e.y === 'number') {
                            const type = e.type || 'NORMAL';
                            const stats = ENEMY_TYPES[type] || ENEMY_TYPES.NORMAL;
                            enemies.push({
                                x:e.x,y:e.y,ax:e.x,ay:e.y,
                                dir:e.direction||{x:1,y:0},
                                alive:true,hp:stats.hp,maxHP:stats.hp,
                                type:type,attackRange:stats.range,damage:stats.damage,speed:stats.speed,
                                visionRange:3,state:'patrolling',investigationTarget:null,investigationTurns:0,
                                poisonTimer:0,hearingRange:6,hasHeardSound:false,soundLocation:null,
                                returnToPatrolPos:{x:e.x,y:e.y},lastSeenPlayer:null,chaseTurns:0,chaseMemory:5,
                                color:stats.color,tint:stats.tint,isSleeping:false,sleepTimer:0,
                                ateRice:false,riceDeathTimer:Math.floor(Math.random()*5)+1
                            });
                        }
                    });
                }

                // Reset flags
                window.USE_CUSTOM_MAP = false;
                window.customMapData = null;

                console.log("Custom map loaded successfully");
                return;
            } catch (err) {
                console.error("Error in custom map:", err);
                window.USE_CUSTOM_MAP = false;
                window.customMapData = null;
            }
        }

        // Original random generation
        return window._originalGenerateLevel.call(this, guardCount);
    };

    console.log("Custom map support installed");
}

// ============================================
// INITIALIZATION
// ============================================
function initCampaignSystem() {
    console.log("Initializing campaign system...");
    loadCampaignManifest().then(() => {
        installCustomMapSupport();
        if (!document.getElementById('mapListContainer')) console.warn("Map list container missing");
        console.log("Campaign system initialized with", window.campaignMaps.length,"maps");
    });
}

// Setup on page load
window.addEventListener('load', function() {
    setTimeout(() => {
        console.log("Setting up campaign system...");
        initCampaignSystem();
        if (!window.openMapSelection) window.openMapSelection = openMapSelection;
        if (!window.backToMapSelection) window.backToMapSelection = backToMapSelection;
        console.log("Campaign system setup complete");
    }, 1000);
});

// ============================================
// EXPORT FUNCTIONS
// ============================================
window.openMapSelection = openMapSelection;
window.backToMapSelection = backToMapSelection;
window.selectMap = selectMap;
window.startCampaignMap = startCampaignMap;

window.debugCampaignSystem = function() {
    console.log("=== CAMPAIGN DEBUG ===");
    console.log("campaignMaps:", window.campaignMaps);
    console.log("selectedMap:", window.selectedMap);
    console.log("customMapData:", window.customMapData);
    console.log("USE_CUSTOM_MAP:", window.USE_CUSTOM_MAP);
    console.log("generateLevel overridden:", !!window._originalGenerateLevel);
    console.log("=====================");
};

console.log("campaign.js loaded successfully");