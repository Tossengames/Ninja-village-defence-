// campaign.js - Complete Map Selection System
// ============================================
// This script creates a map selection system for your stealth game
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
    
    // Hide main menu, show map selection
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('mapSelectionScreen').classList.remove('hidden');
    
    // Build the list of maps
    buildMapList();
}

// Go back to map selection from item screen
function backToMapSelection() {
    console.log("Going back to map selection...");
    
    // Reset any map-specific overrides on the start button
    const startBtn = document.getElementById('startGameBtn');
    if (startBtn && startBtn._originalOnClick) {
        startBtn.onclick = startBtn._originalOnClick;
        startBtn.textContent = "START MISSION";
    }
    
    // Hide item selection, show map selection
    document.getElementById('itemSelection').classList.add('hidden');
    document.getElementById('mapSelectionScreen').classList.remove('hidden');
}

// Load the map manifest from JSON file
function loadCampaignManifest() {
    console.log("Loading map manifest...");
    
    return fetch(MAP_MANIFEST_URL)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(maps => {
            window.campaignMaps = maps;
            console.log(`Loaded ${maps.length} maps from manifest`);
            return maps;
        })
        .catch(error => {
            console.error("Failed to load campaign manifest:", error);
            
            // Create a fallback default map list
            window.campaignMaps = [{
                id: 'default_random',
                name: 'Random Map',
                file: null,
                description: 'The original randomly generated map',
                width: 12,
                height: 12
            }];
            
            console.log("Using fallback map list");
            return window.campaignMaps;
        });
}

// Build the map selection UI
function buildMapList() {
    const container = document.getElementById('mapListContainer');
    if (!container) {
        console.error("Map list container not found!");
        return;
    }
    
    container.innerHTML = '';
    
    if (!window.campaignMaps || window.campaignMaps.length === 0) {
        container.innerHTML = `
            <div class="empty-preview">
                <div style="margin-bottom: 10px;">⚠️ No maps available</div>
                <div style="font-size: 12px; color: #888;">
                    Check if campaign_maps.json exists
                </div>
            </div>
        `;
        return;
    }
    
    // Create a button for each map
    window.campaignMaps.forEach(map => {
        const mapButton = document.createElement('div');
        mapButton.className = 'selected-item-preview';
        mapButton.style.cursor = 'pointer';
        mapButton.style.textAlign = 'center';
        mapButton.style.padding = '15px';
        mapButton.style.margin = '8px 0';
        mapButton.onclick = () => selectMap(map);
        
        // Different styling for random map
        const isRandomMap = !map.file;
        const icon = isRandomMap ? '🎲' : '🗺️';
        const borderColor = isRandomMap ? '#888' : '#ff3333';
        
        mapButton.style.border = `2px solid ${borderColor}`;
        mapButton.style.background = isRandomMap 
            ? 'linear-gradient(145deg, #222, #1a1a1a)' 
            : 'linear-gradient(145deg, #2a1a1a, #1a1a1a)';
        
        mapButton.innerHTML = `
            <div class="item-icon" style="font-size: 28px; margin-bottom: 8px;">${icon}</div>
            <div class="item-name" style="color: #fff; font-weight: bold; font-size: 14px;">${map.name}</div>
            <div style="font-size: 11px; color: #aaa; margin: 5px 0;">${map.description || ''}</div>
            <div style="font-size: 10px; color: #666;">
                ${isRandomMap ? 'Random Generation' : `${map.width || '?'}×${map.height || '?'}`}
            </div>
        `;
        
        container.appendChild(mapButton);
    });
    
    console.log(`Built UI for ${window.campaignMaps.length} maps`);
}

// Select a map from the list
function selectMap(mapData) {
    console.log("Selected map:", mapData.name);
    
    // Store selected map
    window.selectedMap = mapData;
    
    // Hide map selection, show item selection
    document.getElementById('mapSelectionScreen').classList.add('hidden');
    document.getElementById('itemSelection').classList.remove('hidden');
    
    // Modify the start button to use the selected map
    const startBtn = document.getElementById('startGameBtn');
    if (startBtn) {
        // Save original onclick
        if (!startBtn._originalOnClick) {
            startBtn._originalOnClick = startBtn.onclick;
        }
        
        // Override with map-specific start
        startBtn.onclick = function() {
            startCampaignMap(mapData);
        };
        
        // Update button text
        startBtn.textContent = `START: ${mapData.name}`;
        
        console.log(`Start button updated for map: ${mapData.name}`);
    }
}

// Start a specific campaign map
function startCampaignMap(mapData) {
    console.log("Starting campaign map:", mapData.name);
    
    // For random maps, use original generator
    if (!mapData.file) {
        console.log("Using random map generator...");
        
        // Hide all menus
        document.getElementById('itemSelection').classList.add('hidden');
        document.getElementById('mapSelectionScreen').classList.add('hidden');
        
        // Clear custom map flag
        window.USE_CUSTOM_MAP = false;
        window.customMapData = null;
        
        // Use original startGame function
        if (typeof window.startGame === 'function') {
            window.startGame();
        } else {
            console.error("startGame function not found!");
            alert("Game initialization error!");
        }
        
        return;
    }
    
    // For custom maps, fetch the map file
    console.log(`Fetching map file: ${mapData.file}`);
    
    fetch(mapData.file)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load map: ${response.status}`);
            }
            return response.json();
        })
        .then(mapConfig => {
            console.log("Map loaded successfully:", mapConfig.name);
            
            // Store map data for game to use
            window.customMapData = mapConfig;
            window.USE_CUSTOM_MAP = true;
            
            // Hide all menus
            document.getElementById('itemSelection').classList.add('hidden');
            document.getElementById('mapSelectionScreen').classList.add('hidden');
            
            // Start the game
            if (typeof window.initGame === 'function') {
                window.initGame();
            } else {
                console.error("initGame function not found!");
                alert("Game initialization error!");
            }
        })
        .catch(error => {
            console.error("Failed to load map file:", error);
            alert(`Error loading map "${mapData.name}":\n${error.message}\n\nCheck console for details.`);
            
            // Reset the start button on error
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

// Validate map data structure
function validateMapData(mapData) {
    if (!mapData) {
        console.error("Map data is null or undefined");
        return false;
    }
    
    const requiredFields = ['name', 'width', 'height', 'grid'];
    const missingFields = [];
    
    requiredFields.forEach(field => {
        if (!mapData[field]) {
            missingFields.push(field);
        }
    });
    
    if (missingFields.length > 0) {
        console.error(`Map validation failed. Missing fields: ${missingFields.join(', ')}`);
        return false;
    }
    
    // Validate grid dimensions
    if (mapData.grid.length !== mapData.height) {
        console.error(`Grid height (${mapData.grid.length}) doesn't match specified height (${mapData.height})`);
        return false;
    }
    
    for (let i = 0; i < mapData.grid.length; i++) {
        if (mapData.grid[i].length !== mapData.width) {
            console.error(`Grid row ${i} width (${mapData.grid[i].length}) doesn't match specified width (${mapData.width})`);
            return false;
        }
    }
    
    console.log("Map data validation passed");
    return true;
}

// ============================================
// INTEGRATION WITH CORE GAME
// ============================================

// Override the generateLevel function to support custom maps
function installCustomMapSupport() {
    console.log("Installing custom map support...");
    
    // Store the original generateLevel function
    if (typeof window.generateLevel === 'function') {
        window._originalGenerateLevel = window.generateLevel;
        
        // Create wrapper function
        window.generateLevel = function(guardCount) {
            // Check if we should use a custom map
            if (window.USE_CUSTOM_MAP && window.customMapData) {
                console.log("Using custom map data:", window.customMapData.name);
                
                // Validate map data
                if (!validateMapData(window.customMapData)) {
                    console.warn("Invalid map data, falling back to random generation");
                    return window._originalGenerateLevel.call(this, guardCount);
                }
                
                // Use custom map dimensions
                mapDim = window.customMapData.width;
                
                // Use custom grid
                grid = window.customMapData.grid;
                
                // Place player
                if (window.customMapData.player) {
                    player.x = window.customMapData.player.x;
                    player.y = window.customMapData.player.y;
                    player.ax = player.x;
                    player.ay = player.y;
                } else {
                    // Default player position
                    player.x = player.y = 1;
                    player.ax = player.ay = 1;
                }
                
                // Place exit
                if (window.customMapData.exit) {
                    // Find exit position in grid and set it
                    const exitValue = 3; // EXIT constant from core_main.js
                    if (window.customMapData.exit.y < grid.length && 
                        window.customMapData.exit.x < grid[0].length) {
                        grid[window.customMapData.exit.y][window.customMapData.exit.x] = exitValue;
                    } else {
                        console.warn("Invalid exit position, using default");
                        grid[mapDim-2][mapDim-2] = exitValue;
                    }
                } else {
                    // Default exit position
                    grid[mapDim-2][mapDim-2] = 3; // EXIT
                }
                
                // Create enemies from custom data
                enemies = [];
                if (window.customMapData.enemies && Array.isArray(window.customMapData.enemies)) {
                    window.customMapData.enemies.forEach(e => {
                        // Get enemy type stats
                        const enemyType = e.type || 'NORMAL';
                        const stats = ENEMY_TYPES[enemyType] || ENEMY_TYPES.NORMAL;
                        
                        // Create enemy object matching game's format
                        enemies.push({
                            x: e.x, 
                            y: e.y,
                            ax: e.x, 
                            ay: e.y,
                            dir: e.direction || {x: 1, y: 0},
                            alive: true,
                            hp: stats.hp,
                            maxHP: stats.hp,
                            type: enemyType,
                            attackRange: stats.range,
                            damage: stats.damage,
                            speed: stats.speed,
                            visionRange: e.visionRange || 3,
                            state: 'patrolling',
                            investigationTarget: null,
                            investigationTurns: 0,
                            poisonTimer: 0,
                            hearingRange: 6,
                            hasHeardSound: false,
                            soundLocation: null,
                            returnToPatrolPos: {x: e.x, y: e.y},
                            lastSeenPlayer: null,
                            chaseTurns: 0,
                            chaseMemory: 5,
                            color: stats.color,
                            tint: stats.tint,
                            isSleeping: false,
                            sleepTimer: 0,
                            ateRice: false,
                            riceDeathTimer: Math.floor(Math.random() * 5) + 1
                        });
                    });
                }
                
                // Place coins
                if (window.customMapData.coins && Array.isArray(window.customMapData.coins)) {
                    window.customMapData.coins.forEach(coin => {
                        if (coin.y < grid.length && coin.x < grid[0].length) {
                            grid[coin.y][coin.x] = 5; // COIN constant
                        }
                    });
                }
                
                // Place hiding spots
                if (window.customMapData.hidingSpots && Array.isArray(window.customMapData.hidingSpots)) {
                    window.customMapData.hidingSpots.forEach(spot => {
                        if (spot.y < grid.length && spot.x < grid[0].length) {
                            grid[spot.y][spot.x] = 2; // HIDE constant
                        }
                    });
                }
                
                // Reset flag for next game
                window.USE_CUSTOM_MAP = false;
                
                console.log("Custom map loaded successfully");
                return; // Skip the original random generation
            }
            
            // Otherwise, use original random generation
            console.log("Using random map generation");
            return window._originalGenerateLevel.call(this, guardCount);
        };
        
        console.log("Custom map support installed successfully");
    } else {
        console.error("generateLevel function not found! Custom maps won't work.");
    }
}

// ============================================
// INITIALIZATION
// ============================================

// Initialize the campaign system
function initCampaignSystem() {
    console.log("Initializing campaign system...");
    
    // Load map manifest
    loadCampaignManifest().then(() => {
        // Install custom map support
        installCustomMapSupport();
        
        // Check if we need to create the map list container
        if (!document.getElementById('mapListContainer')) {
            console.warn("Map list container not found in HTML");
        }
        
        console.log("Campaign system initialized successfully");
        console.log(`Available maps: ${window.campaignMaps.length}`);
    });
}

// ============================================
// SETUP ON PAGE LOAD
// ============================================

// Wait for page to fully load
window.addEventListener('load', function() {
    // Small delay to ensure core_main.js is loaded
    setTimeout(() => {
        console.log("Setting up campaign system...");
        
        // Initialize the campaign system
        initCampaignSystem();
        
        // Make sure menu functions are available
        if (typeof window.openMapSelection !== 'function') {
            window.openMapSelection = openMapSelection;
        }
        if (typeof window.backToMapSelection !== 'function') {
            window.backToMapSelection = backToMapSelection;
        }
        
        console.log("Campaign system setup complete");
    }, 1000); // 1 second delay to ensure all scripts are loaded
});

// ============================================
// EXPORT FUNCTIONS TO GLOBAL SCOPE
// ============================================

// Export functions to global scope for HTML onclick handlers
window.openMapSelection = openMapSelection;
window.backToMapSelection = backToMapSelection;
window.selectMap = selectMap;
window.startCampaignMap = startCampaignMap;

// Debug function to check system status
window.debugCampaignSystem = function() {
    console.log("=== CAMPAIGN SYSTEM DEBUG ===");
    console.log("campaignMaps:", window.campaignMaps);
    console.log("selectedMap:", window.selectedMap);
    console.log("customMapData:", window.customMapData);
    console.log("USE_CUSTOM_MAP:", window.USE_CUSTOM_MAP);
    console.log("generateLevel overridden:", typeof window._originalGenerateLevel !== 'undefined');
    console.log("=============================");
};

console.log("campaign.js loaded successfully");