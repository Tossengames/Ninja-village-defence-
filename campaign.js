// campaign.js - Complete Map Selection System (Fixed)
// ============================================

// Global variables
window.campaignMaps = []; 
window.selectedMap = null; 
window.customMapData = null; 
window.USE_CUSTOM_MAP = false; 

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

// Go back to map selection from item screen
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

// Load the map manifest from JSON file
function loadCampaignManifest() {
    console.log("Loading map manifest...");
    return fetch(MAP_MANIFEST_URL)
        .then(res => res.ok ? res.json() : Promise.reject(res.status))
        .then(maps => { window.campaignMaps = maps; console.log(`Loaded ${maps.length} maps`); return maps; })
        .catch(error => {
            console.error("Failed to load campaign manifest:", error);
            window.campaignMaps = [{
                id: 'default_random',
                name: 'Random Map',
                file: null,
                description: 'The original randomly generated map',
                width: 12,
                height: 12
            }];
            return window.campaignMaps;
        });
}

// Build the map selection UI
function buildMapList() {
    const container = document.getElementById('mapListContainer');
    if (!container) { console.error("Map list container not found!"); return; }
    container.innerHTML = '';
    if (!window.campaignMaps || !window.campaignMaps.length) {
        container.innerHTML = `<div class="empty-preview">
            <div style="margin-bottom:10px;">⚠️ No maps available</div>
            <div style="font-size:12px;color:#888;">Check if campaign_maps.json exists</div>
        </div>`;
        return;
    }

    window.campaignMaps.forEach(map => {
        const mapButton = document.createElement('div');
        mapButton.className = 'selected-item-preview';
        mapButton.style.cursor = 'pointer';
        mapButton.style.textAlign = 'center';
        mapButton.style.padding = '15px';
        mapButton.style.margin = '8px 0';
        mapButton.onclick = () => selectMap(map);
        const isRandomMap = !map.file;
        const icon = isRandomMap ? '🎲' : '🗺️';
        const borderColor = isRandomMap ? '#888' : '#ff3333';
        mapButton.style.border = `2px solid ${borderColor}`;
        mapButton.style.background = isRandomMap 
            ? 'linear-gradient(145deg, #222, #1a1a1a)' 
            : 'linear-gradient(145deg, #2a1a1a, #1a1a1a)';
        mapButton.innerHTML = `
            <div class="item-icon" style="font-size:28px;margin-bottom:8px;">${icon}</div>
            <div class="item-name" style="color:#fff;font-weight:bold;font-size:14px;">${map.name}</div>
            <div style="font-size:11px;color:#aaa;margin:5px 0;">${map.description || ''}</div>
            <div style="font-size:10px;color:#666;">
                ${isRandomMap ? 'Random Generation' : `${map.width || '?'}×${map.height || '?'}`}
            </div>
        `;
        container.appendChild(mapButton);
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

// Start a specific campaign map
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

    // Fetch custom map JSON
    fetch(mapData.file)
        .then(res => res.ok ? res.json() : Promise.reject(res.status))
        .then(mapConfig => {
            console.log("Map loaded successfully:", mapConfig.name);
            window.customMapData = mapConfig;
            window.USE_CUSTOM_MAP = true;

            if (typeof window.initGame === 'function') window.initGame();
            else alert("initGame function not found!");
        })
        .catch(error => {
            console.error("Failed to load map file:", error);
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
    const requiredFields = ['name','width','height','grid'];
    for (const field of requiredFields) if (!mapData[field]) return false;
    if (mapData.grid.length !== mapData.height) return false;
    for (let i=0;i<mapData.grid.length;i++) if (mapData.grid[i].length !== mapData.width) return false;
    return true;
}

// ============================================
// CUSTOM MAP SUPPORT
// ============================================
function installCustomMapSupport() {
    console.log("Installing custom map support...");
    if (typeof window.generateLevel === 'function') {
        const original = window.generateLevel;
        window.generateLevel = function(guardCount) {
            if (window.USE_CUSTOM_MAP && window.customMapData) {
                console.log("=== LOADING CUSTOM MAP ===");
                const mapData = window.customMapData;

                if (!validateMapData(mapData)) {
                    console.warn("Invalid map data, using random generation");
                    window.USE_CUSTOM_MAP = false;
                    window.customMapData = null;
                    return original.call(this, guardCount);
                }

                // Safe deep copy of grid
                grid = mapData.grid.map(row => [...row]);
                mapDim = mapData.width;

                // Player
                const px = Math.max(0, Math.min(mapDim-1, mapData.player?.x||1));
                const py = Math.max(0, Math.min(mapDim-1, mapData.player?.y||1));
                player.x = player.ax = px;
                player.y = player.ay = py;
                player.dir = {x:0,y:0};
                player.isHidden = (grid[py][px] === HIDE);

                // Exit
                if (mapData.exit) {
                    const ex = Math.max(0, Math.min(mapDim-1, mapData.exit.x));
                    const ey = Math.max(0, Math.min(mapDim-1, mapData.exit.y));
                    grid[ey][ex] = EXIT;
                } else {
                    grid[mapDim-2][mapDim-2] = EXIT;
                }

                // Enemies
                enemies = [];
                if (Array.isArray(mapData.enemies)) {
                    mapData.enemies.forEach((e,i)=>{
                        if (typeof e.x==='number' && typeof e.y==='number') {
                            const type = e.type||'NORMAL';
                            const stats = ENEMY_TYPES[type]||ENEMY_TYPES.NORMAL;
                            enemies.push({
                                x:e.x, y:e.y, ax:e.x, ay:e.y,
                                dir:e.direction||{x:1,y:0},
                                alive:true, hp:stats.hp, maxHP:stats.hp,
                                type:type, attackRange:stats.range, damage:stats.damage, speed:stats.speed,
                                visionRange:3, state:'patrolling', investigationTarget:null, investigationTurns:0,
                                poisonTimer:0, hearingRange:6, hasHeardSound:false, soundLocation:null,
                                returnToPatrolPos:{x:e.x,y:e.y}, lastSeenPlayer:null, chaseTurns:0, chaseMemory:5,
                                color:stats.color, tint:stats.tint, isSleeping:false, sleepTimer:0, ateRice:false,
                                riceDeathTimer:Math.floor(Math.random()*5)+1
                            });
                        }
                    });
                }

                // Done loading custom map
                console.log("Custom map loaded successfully");
                window.USE_CUSTOM_MAP = false;
                window.customMapData = null;
                return;
            }
            return original.call(this, guardCount);
        };
        console.log("Custom map support installed");
    } else {
        console.error("generateLevel not found, cannot install custom maps");
    }
}

// ============================================
// INITIALIZATION
// ============================================
function initCampaignSystem() {
    console.log("Initializing campaign system...");
    loadCampaignManifest().then(()=>{
        installCustomMapSupport();
        console.log("Campaign system initialized with maps:", window.campaignMaps.length);
    });
}

// ============================================
// PAGE LOAD SETUP
// ============================================
window.addEventListener('load',()=>{
    setTimeout(()=>{
        console.log("Setting up campaign system...");
        initCampaignSystem();
        if(typeof window.openMapSelection!=='function') window.openMapSelection = openMapSelection;
        if(typeof window.backToMapSelection!=='function') window.backToMapSelection = backToMapSelection;
    },1000);
});

// ============================================
// EXPORT FUNCTIONS
// ============================================
window.openMapSelection = openMapSelection;
window.backToMapSelection = backToMapSelection;
window.selectMap = selectMap;
window.startCampaignMap = startCampaignMap;

console.log("campaign.js loaded successfully");