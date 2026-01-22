// campaign.js - Complete Map Selection System
// ============================================

// Global variables
window.campaignMaps = [];
window.selectedMap = null;
window.customMapData = null;
window.USE_CUSTOM_MAP = false;

// Map manifest
const MAP_MANIFEST_URL = 'campaign_maps.json';

// ============================================
// MAP SELECTION FUNCTIONS
// ============================================
function openMapSelection() {
    document.getElementById('mainMenu')?.classList.add('hidden');
    document.getElementById('mapSelectionScreen')?.classList.remove('hidden');
    buildMapList();
}

function backToMapSelection() {
    const startBtn = document.getElementById('startGameBtn');
    if (startBtn && startBtn._originalOnClick) {
        startBtn.onclick = startBtn._originalOnClick;
        startBtn.textContent = "START MISSION";
    }
    document.getElementById('itemSelection')?.classList.add('hidden');
    document.getElementById('mapSelectionScreen')?.classList.remove('hidden');
}

function loadCampaignManifest() {
    return fetch(MAP_MANIFEST_URL)
        .then(res => res.ok ? res.json() : Promise.reject(res.status))
        .then(maps => { window.campaignMaps = maps; return maps; })
        .catch(() => {
            window.campaignMaps = [{
                id: 'default_random', name: 'Random Map', file: null,
                description: 'Original randomly generated map', width: 12, height: 12
            }];
            return window.campaignMaps;
        });
}

function buildMapList() {
    const container = document.getElementById('mapListContainer');
    if (!container) return;

    container.innerHTML = '';
    window.campaignMaps.forEach(map => {
        const btn = document.createElement('div');
        btn.className = 'selected-item-preview';
        btn.style.cursor = 'pointer';
        btn.style.textAlign = 'center';
        btn.style.padding = '15px';
        btn.style.margin = '8px 0';
        btn.onclick = () => selectMap(map);

        const isRandom = !map.file;
        btn.innerHTML = `
            <div style="font-size:28px;margin-bottom:8px">${isRandom?'🎲':'🗺️'}</div>
            <div style="color:#fff;font-weight:bold;font-size:14px">${map.name}</div>
            <div style="font-size:11px;color:#aaa;margin:5px 0">${map.description||''}</div>
            <div style="font-size:10px;color:#666">${isRandom?'Random Generation':`${map.width}×${map.height}`}</div>
        `;
        container.appendChild(btn);
    });
}

function selectMap(mapData) {
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

function startCampaignMap(mapData) {
    document.getElementById('itemSelection')?.classList.add('hidden');
    document.getElementById('mapSelectionScreen')?.classList.add('hidden');

    if (!mapData.file) {
        window.USE_CUSTOM_MAP = false;
        window.customMapData = null;
        if (typeof window.initGame === 'function') window.initGame();
        else alert("initGame function not found!");
        return;
    }

    fetch(mapData.file)
        .then(res => res.ok ? res.json() : Promise.reject(res.status))
        .then(mapConfig => {
            window.customMapData = mapConfig;
            window.USE_CUSTOM_MAP = true;
            if (typeof window.initGame === 'function') window.initGame();
            else alert("initGame function not found!");
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
// CUSTOM MAP SUPPORT
// ============================================
function installCustomMapSupport() {
    if (typeof window.generateLevel !== 'function') return;
    window._originalGenerateLevel = window.generateLevel;

    window.generateLevel = function(guardCount) {
        if (window.USE_CUSTOM_MAP && window.customMapData) {
            const map = window.customMapData;
            mapDim = map.width;
            grid = map.grid.map(r => [...r]);

            // Player
            const px = Math.max(0, Math.min(mapDim-1, map.player?.x??1));
            const py = Math.max(0, Math.min(mapDim-1, map.player?.y??1));
            player.x = player.ax = px;
            player.y = player.ay = py;
            player.dir = {x:0,y:0};
            player.isHidden = (grid[py][px]===HIDE);

            // Exit
            if (map.exit) {
                const ex = Math.max(0, Math.min(mapDim-1,map.exit.x));
                const ey = Math.max(0, Math.min(mapDim-1,map.exit.y));
                grid[ey][ex] = EXIT;
            } else grid[mapDim-2][mapDim-2] = EXIT;

            // Enemies
            enemies = [];
            (map.enemies||[]).forEach((e,i)=>{
                if(typeof e.x==='number'&&typeof e.y==='number'){
                    const type=e.type||'NORMAL';
                    const stats=ENEMY_TYPES[type]||ENEMY_TYPES.NORMAL;
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

            window.USE_CUSTOM_MAP = false;
            window.customMapData = null;
            return;
        }

        return window._originalGenerateLevel.call(this, guardCount);
    };
}

// ============================================
// INITIALIZATION
// ============================================
function initCampaignSystem() {
    loadCampaignManifest().then(()=>{
        installCustomMapSupport();
        if(!document.getElementById('mapListContainer')) console.warn("Map list container missing");
    });
}

window.addEventListener('load',()=>{
    setTimeout(()=>{
        initCampaignSystem();
        if(!window.openMapSelection) window.openMapSelection = openMapSelection;
        if(!window.backToMapSelection) window.backToMapSelection = backToMapSelection;
    },1000);
});

// Expose functions globally
window.openMapSelection = openMapSelection;
window.backToMapSelection = backToMapSelection;
window.selectMap = selectMap;
window.startCampaignMap = startCampaignMap;
window.debugCampaignSystem = ()=>console.log("Campaign Debug:",{
    campaignMaps: window.campaignMaps,
    selectedMap: window.selectedMap,
    customMapData: window.customMapData,
    USE_CUSTOM_MAP: window.USE_CUSTOM_MAP,
    generateLevelOverridden: !!window._originalGenerateLevel
});
console.log("campaign.js loaded");