// ============================================
// CORE GAME ENGINE - COMPLETE VERSION
// ============================================

// Tile types (MUST MATCH map editor)
const TILE_TYPES = {
    FLOOR: 0,
    WALL: 1,
    HIDE: 2,
    EXIT: 3,
    COIN: 5,
    TRAP: 6,
    RICE: 7,
    BOMB: 8,
    GAS: 9,
    SCROLL: 10,
    MYSTERY_BOX: 11,
    FLOOR2: 21,
    GRASS1: 22,
    WALL2: 23,
    WATER: 24,
    TREE1: 25,
    TREE2: 26,
    BUSH1: 27,
    BUSH2: 28,
    BOX1: 29
};

// Use shorter constants for easier coding
const FLOOR = TILE_TYPES.FLOOR;
const WALL = TILE_TYPES.WALL;
const HIDE = TILE_TYPES.HIDE;
const EXIT = TILE_TYPES.EXIT;
const COIN = TILE_TYPES.COIN;
const TRAP = TILE_TYPES.TRAP;
const RICE = TILE_TYPES.RICE;
const BOMB = TILE_TYPES.BOMB;
const GAS = TILE_TYPES.GAS;
const SCROLL = TILE_TYPES.SCROLL;
const MYSTERY_BOX = TILE_TYPES.MYSTERY_BOX;

// Mission system
let currentMission = {
    goal: "escape",
    rules: [],
    story: "",
    name: "Random Mission",
    timeLimit: 0,
    items: [],
    coinsRequired: 0,
    scrollPos: null,
    difficulty: "medium"
};

// ============================================
// MENU SYSTEM
// ============================================

let selectedItems = {
    trap: 0, rice: 0, bomb: 0, gas: 0,
    health: 0, coin: 0, sight: 0, mark: 0
};
let mapSize = 12;
let guardCount = 5;

// Initialize menu
function initMenu() {
    console.log("Menu initialized");
    document.getElementById('mainMenu').classList.remove('hidden');
    document.getElementById('itemSelection').classList.add('hidden');
    document.getElementById('tutorialScreen').classList.add('hidden');
    document.getElementById('missionBriefingScreen').classList.add('hidden');
    document.getElementById('customMissionsScreen').classList.add('hidden');
    document.getElementById('pauseScreen').classList.add('hidden');
    document.getElementById('menu').classList.add('hidden');
    
    updateMenuDisplay();
}

// Screen navigation
function showItemSelection() {
    console.log("Showing item selection");
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('itemSelection').classList.remove('hidden');
    updateSelectionDisplay();
}

function backToMainMenu() {
    document.getElementById('itemSelection').classList.add('hidden');
    document.getElementById('missionBriefingScreen').classList.add('hidden');
    document.getElementById('customMissionsScreen').classList.add('hidden');
    document.getElementById('tutorialScreen').classList.add('hidden');
    document.getElementById('mapEditorScreen').classList.add('hidden');
    document.getElementById('mainMenu').classList.remove('hidden');
}

function showTutorial() {
    if (!document.getElementById('mainMenu').classList.contains('hidden')) {
        window.tutorialReturnScreen = 'main';
        document.getElementById('mainMenu').classList.add('hidden');
    } else {
        window.tutorialReturnScreen = 'items';
        document.getElementById('itemSelection').classList.add('hidden');
    }
    document.getElementById('tutorialScreen').classList.remove('hidden');
}

function hideTutorial() {
    document.getElementById('tutorialScreen').classList.add('hidden');
    
    if (window.tutorialReturnScreen === 'main') {
        document.getElementById('mainMenu').classList.remove('hidden');
    } else {
        document.getElementById('itemSelection').classList.remove('hidden');
    }
}

// Map/Guard controls
function changeMapSize(delta) {
    mapSize += delta;
    if (mapSize < 8) mapSize = 8;
    if (mapSize > 20) mapSize = 20;
    
    const element = document.getElementById('mapSizeValue');
    if (element) {
        element.textContent = mapSize;
    }
    
    window.mapDim = mapSize;
}

function changeGuardCount(delta) {
    guardCount += delta;
    if (guardCount < 1) guardCount = 1;
    if (guardCount > 15) guardCount = 15;
    
    const element = document.getElementById('guardCountValue');
    if (element) {
        element.textContent = guardCount;
    }
    
    window.guardCount = guardCount;
}

// Item selection logic
function toggleItem(itemType) {
    const currentCount = selectedItems[itemType] || 0;
    const totalSelected = getTotalSelectedItems();
    const selectedTypes = getSelectedTypesCount();
    
    if (currentCount > 0) {
        if (currentCount < 3) {
            selectedItems[itemType]++;
        } else {
            return;
        }
    } else {
        if (totalSelected >= 5) {
            alert("Maximum 5 items total!");
            return;
        }
        if (selectedTypes >= 3) {
            alert("Maximum 3 item types!");
            return;
        }
        
        selectedItems[itemType] = 1;
    }
    
    updateSelectionDisplay();
}

function removeItem(itemType) {
    if (selectedItems[itemType] > 0) {
        selectedItems[itemType]--;
        if (selectedItems[itemType] === 0) {
            delete selectedItems[itemType];
        }
        updateSelectionDisplay();
    }
}

// Helper functions
function getTotalSelectedItems() {
    let total = 0;
    for (const key in selectedItems) {
        total += selectedItems[key];
    }
    return total;
}

function getSelectedTypesCount() {
    let types = 0;
    for (const key in selectedItems) {
        if (selectedItems[key] > 0) types++;
    }
    return types;
}

// Update display
function updateMenuDisplay() {
    const mapElement = document.getElementById('mapSizeValue');
    const guardElement = document.getElementById('guardCountValue');
    
    if (mapElement) mapElement.textContent = mapSize;
    if (guardElement) guardElement.textContent = guardCount;
}

function updateSelectionDisplay() {
    const totalItems = getTotalSelectedItems();
    const totalTypes = getSelectedTypesCount();
    
    const totalItemsEl = document.getElementById('totalItems');
    const totalTypesEl = document.getElementById('totalTypes');
    if (totalItemsEl) totalItemsEl.textContent = totalItems;
    if (totalTypesEl) totalTypesEl.textContent = totalTypes;
    
    for (const itemType in selectedItems) {
        const countElement = document.getElementById(itemType + 'SelCount');
        if (countElement) {
            countElement.textContent = selectedItems[itemType] || 0;
            
            const button = document.querySelector(`[data-type="${itemType}"]`);
            if (button) {
                if (selectedItems[itemType] > 0) {
                    button.classList.add('selected');
                } else {
                    button.classList.remove('selected');
                }
            }
        }
    }
    
    const allItems = ['trap', 'rice', 'bomb', 'gas', 'health', 'coin', 'sight', 'mark'];
    allItems.forEach(itemType => {
        if (!selectedItems[itemType] || selectedItems[itemType] === 0) {
            const button = document.querySelector(`[data-type="${itemType}"]`);
            if (button) {
                button.classList.remove('selected');
            }
            const countElement = document.getElementById(itemType + 'SelCount');
            if (countElement) {
                countElement.textContent = '0';
            }
        }
    });
    
    updateSelectedPreview();
    
    const startBtn = document.getElementById('startGameBtn');
    if (startBtn) {
        startBtn.disabled = false;
        startBtn.textContent = "START MISSION";
    }
}

function updateSelectedPreview() {
    const preview = document.getElementById('selectedPreview');
    if (!preview) return;
    
    preview.innerHTML = '';
    
    const totalItems = getTotalSelectedItems();
    if (totalItems === 0) {
        preview.innerHTML = '<div class="empty-preview">Click items below to add them to your inventory</div>';
        return;
    }
    
    for (const itemType in selectedItems) {
        const count = selectedItems[itemType];
        if (count > 0) {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'selected-item-preview';
            itemDiv.onclick = () => removeItem(itemType);
            
            const itemInfo = getItemInfo(itemType);
            
            itemDiv.innerHTML = `
                <div class="item-icon">${itemInfo.icon}</div>
                <div class="item-name">${itemInfo.name}</div>
                <div class="item-count">${count}</div>
                <button class="remove-btn" onclick="event.stopPropagation(); removeItem('${itemType}')">×</button>
            `;
            
            preview.appendChild(itemDiv);
        }
    }
}

function getItemInfo(itemType) {
    const items = {
        trap: { icon: '⚠️', name: 'Trap' },
        rice: { icon: '🍚', name: 'Rice' },
        bomb: { icon: '💣', name: 'Bomb' },
        gas: { icon: '💨', name: 'Gas' },
        health: { icon: '❤️', name: 'Heal' },
        coin: { icon: '💰', name: 'Coin' },
        sight: { icon: '👁️', name: 'Sight' },
        mark: { icon: '🎯', name: 'Mark' }
    };
    return items[itemType] || { icon: '❓', name: 'Unknown' };
}

// Start random game
function startGame() {
    console.log("Starting random game...");
    
    window.mapDim = mapSize;
    window.guardCount = guardCount;
    window.selectedItemsForGame = { ...selectedItems };
    
    currentMission = {
        goal: "escape",
        rules: [],
        story: "",
        name: "Random Mission",
        timeLimit: 0,
        items: [],
        coinsRequired: 0,
        scrollPos: null,
        difficulty: "medium"
    };
    
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('itemSelection').classList.add('hidden');
    document.getElementById('tutorialScreen').classList.add('hidden');
    document.getElementById('missionBriefingScreen').classList.add('hidden');
    document.getElementById('customMissionsScreen').classList.add('hidden');
    document.getElementById('pauseScreen').classList.add('hidden');
    
    initGame();
}

// ============================================
// MISSION SYSTEM FUNCTIONS
// ============================================

// Load mission from JSON
function loadMissionFromJSON(jsonData) {
    try {
        console.log("Loading mission from JSON:", jsonData.name);
        
        // Validate
        if (!jsonData || !jsonData.width || !jsonData.height) {
            console.error("Invalid mission data");
            return false;
        }
        
        // Store mission data
        currentMission.name = jsonData.name || "Custom Mission";
        currentMission.story = jsonData.story || "";
        currentMission.goal = jsonData.goal || "escape";
        currentMission.rules = jsonData.rules || [];
        currentMission.timeLimit = parseInt(jsonData.timeLimit) || 0;
        currentMission.difficulty = jsonData.difficulty || "medium";
        currentMission.items = jsonData.items || [];
        
        // Set map size
        const width = jsonData.width;
        const height = jsonData.height;
        mapDim = Math.max(width, height);
        
        // Create grid
        grid = Array.from({length: height}, () => Array(width).fill(FLOOR));
        
        // Place tiles
        if (jsonData.tiles && Array.isArray(jsonData.tiles)) {
            for(let y = 0; y < height && y < jsonData.tiles.length; y++) {
                for(let x = 0; x < width && x < jsonData.tiles[y].length; x++) {
                    const tileValue = jsonData.tiles[y][x];
                    grid[y][x] = typeof tileValue === 'number' ? tileValue : FLOOR;
                }
            }
        }
        
        // Place player
        if (jsonData.playerStart && jsonData.playerStart.x !== undefined && jsonData.playerStart.y !== undefined) {
            player.x = jsonData.playerStart.x;
            player.y = jsonData.playerStart.y;
            player.ax = player.x;
            player.ay = player.y;
        } else {
            // Find first floor tile
            let found = false;
            for(let y = 1; y < height-1 && !found; y++) {
                for(let x = 1; x < width-1 && !found; x++) {
                    if(grid[y][x] === FLOOR) {
                        player.x = x;
                        player.y = y;
                        player.ax = x;
                        player.ay = y;
                        found = true;
                    }
                }
            }
        }
        
        // Place exit
        if (jsonData.exit && jsonData.exit.x !== undefined && jsonData.exit.y !== undefined) {
            if (grid[jsonData.exit.y][jsonData.exit.x] !== WALL) {
                grid[jsonData.exit.y][jsonData.exit.x] = EXIT;
            }
        } else {
            // Auto-place exit
            for(let y = height-2; y > 0; y--) {
                for(let x = width-2; x > 0; x--) {
                    if(grid[y][x] === FLOOR) {
                        grid[y][x] = EXIT;
                        break;
                    }
                }
            }
        }
        
        // Create enemies
        enemies = [];
        if (jsonData.enemies && Array.isArray(jsonData.enemies)) {
            jsonData.enemies.forEach(e => {
                if (e.x >= 0 && e.x < width && e.y >= 0 && e.y < height) {
                    const type = (e.type || 'NORMAL').toUpperCase();
                    const stats = ENEMY_TYPES[type] || ENEMY_TYPES.NORMAL;
                    
                    enemies.push({
                        x: e.x, y: e.y,
                        ax: e.x, ay: e.y,
                        dir: {x: 1, y: 0},
                        alive: true,
                        hp: stats.hp,
                        maxHP: stats.hp,
                        type: type,
                        attackRange: stats.range,
                        damage: stats.damage,
                        speed: stats.speed,
                        visionRange: 3,
                        state: 'patrolling',
                        investigationTarget: null,
                        investigationTurns: 0,
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
                }
            });
        }
        
        // Place items
        if (jsonData.items && Array.isArray(jsonData.items)) {
            jsonData.items.forEach(item => {
                if (item.x >= 0 && item.x < width && item.y >= 0 && item.y < height) {
                    if (item.type === 'scroll') {
                        if (grid[item.y][item.x] !== WALL) {
                            grid[item.y][item.x] = SCROLL;
                            currentMission.scrollPos = {x: item.x, y: item.y};
                        }
                    } else if (item.type === 'coin') {
                        if (grid[item.y][item.x] !== WALL) {
                            grid[item.y][item.x] = COIN;
                        }
                    } else if (item.type === 'mystery') {
                        if (grid[item.y][item.x] !== WALL) {
                            grid[item.y][item.x] = MYSTERY_BOX;
                        }
                    }
                }
            });
        }
        
        // Count coins
        currentMission.coinsRequired = jsonData.items?.filter(item => item.type === 'coin').length || 0;
        
        console.log("Mission loaded successfully");
        return true;
    } catch (error) {
        console.error("Failed to load mission:", error);
        return false;
    }
}

// Check mission goals
function checkMissionGoal() {
    if (hasReachedExit) {
        switch(currentMission.goal) {
            case "kill_all":
                const allDead = enemies.every(e => !e.alive);
                return allDead ? "victory" : "in_progress";
                
            case "steal":
                const hasScroll = currentMission.scrollPos && 
                                 player.x === currentMission.scrollPos.x && 
                                 player.y === currentMission.scrollPos.y;
                return hasScroll ? "victory" : "in_progress";
                
            case "pacifist":
                return stats.kills === 0 ? "victory" : "failure";
                
            case "time_trial":
                return turnCount <= currentMission.timeLimit ? "victory" : "failure";
                
            case "collect_all_coins":
                return stats.coins >= currentMission.coinsRequired ? "victory" : "in_progress";
                
            default: // "escape"
                return "victory";
        }
    }
    
    return "in_progress";
}

// Update mission progress display
function updateMissionProgress() {
    const goalTracker = document.getElementById('goalTracker');
    if (!goalTracker) return;
    
    let html = '<div class="goal-item">';
    html += `<span class="goal-label">Mission:</span>`;
    html += `<span class="goal-status">${currentMission.name}</span>`;
    html += '</div>';
    
    html += '<div class="goal-item">';
    html += `<span class="goal-label">Objective:</span>`;
    html += `<span class="goal-status">${currentMission.goal.toUpperCase().replace('_', ' ')}</span>`;
    html += '</div>';
    
    if (currentMission.goal === 'steal' && currentMission.scrollPos) {
        const hasScroll = player.x === currentMission.scrollPos.x && player.y === currentMission.scrollPos.y;
        html += '<div class="goal-item">';
        html += `<span class="goal-label">Scroll Collected:</span>`;
        html += `<span class="goal-status ${hasScroll ? 'complete' : 'incomplete'}">${hasScroll ? '✓' : '✗'}</span>`;
        html += '</div>';
    }
    
    if (currentMission.goal === 'collect_all_coins') {
        html += '<div class="goal-item">';
        html += `<span class="goal-label">Coins:</span>`;
        html += `<span class="goal-status ${stats.coins >= currentMission.coinsRequired ? 'complete' : 'incomplete'}">`;
        html += `${stats.coins}/${currentMission.coinsRequired}`;
        html += `</span>`;
        html += '</div>';
    }
    
    if (currentMission.goal === 'kill_all') {
        const aliveCount = enemies.filter(e => e.alive).length;
        html += '<div class="goal-item">';
        html += `<span class="goal-label">Enemies Left:</span>`;
        html += `<span class="goal-status ${aliveCount === 0 ? 'complete' : 'incomplete'}">`;
        html += `${aliveCount}`;
        html += `</span>`;
        html += '</div>';
    }
    
    goalTracker.innerHTML = html;
}

// Start custom mission
function startCustomMission(missionData) {
    console.log("Starting custom mission:", missionData.name);
    
    try {
        // Reset mission data
        currentMission = {
            goal: missionData.goal || "escape",
            rules: missionData.rules || [],
            story: missionData.story || "",
            name: missionData.name || "Custom Mission",
            timeLimit: parseInt(missionData.timeLimit) || 0,
            items: missionData.items || [],
            coinsRequired: 0,
            scrollPos: null,
            difficulty: missionData.difficulty || "medium"
        };
        
        // Hide all menus
        document.getElementById('mainMenu').classList.add('hidden');
        document.getElementById('itemSelection').classList.add('hidden');
        document.getElementById('tutorialScreen').classList.add('hidden');
        document.getElementById('missionBriefingScreen').classList.add('hidden');
        document.getElementById('customMissionsScreen').classList.add('hidden');
        document.getElementById('pauseScreen').classList.add('hidden');
        document.getElementById('mapEditorScreen').classList.add('hidden');
        
        // Show game UI
        document.getElementById('toolbar').classList.remove('hidden');
        document.getElementById('ui-controls').classList.remove('hidden');
        document.getElementById('playerStatus').classList.remove('hidden');
        
        // Set game state
        gameOver = false;
        hasReachedExit = false;
        playerTurn = true;
        turnCount = 1;
        startTime = Date.now();
        stats = { kills: 0, coins: 0, itemsUsed: 0, timesSpotted: 0, stealthKills: 0, timeBonus: 0 };
        
        // Reset inventory
        if (window.selectedItemsForGame) {
            inv = { trap: 0, rice: 0, bomb: 0, gas: 0, health: 0, coin: 0, sight: 0, mark: 0 };
            for (const [key, value] of Object.entries(window.selectedItemsForGame)) {
                if (inv.hasOwnProperty(key)) {
                    inv[key] = value;
                }
            }
        }
        
        // Load the mission
        if (loadMissionFromJSON(missionData)) {
            centerCamera();
            updateToolCounts();
            requestAnimationFrame(gameLoop);
        } else {
            throw new Error("Failed to load mission data");
        }
    } catch (error) {
        console.error("Error starting custom mission:", error);
        alert("Failed to start mission: " + error.message);
        backToMainMenu();
    }
}

// Show mission briefing
function showMissionBriefing(missionData) {
    document.getElementById('customMissionsScreen').classList.add('hidden');
    
    // Update briefing screen
    document.getElementById('missionName').textContent = missionData.name || "Mission Briefing";
    
    let storyText = missionData.story || "No mission story provided.";
    if (storyText.length > 500) {
        storyText = storyText.substring(0, 500) + "...";
    }
    document.getElementById('missionStory').textContent = storyText;
    
    let goalText = "";
    switch(missionData.goal) {
        case "escape": goalText = "Reach the exit point"; break;
        case "kill_all": goalText = "Eliminate all enemies"; break;
        case "steal": goalText = "Steal the scroll and escape"; break;
        case "pacifist": goalText = "Escape without killing anyone"; break;
        case "time_trial": goalText = `Escape within ${missionData.timeLimit || 20} turns`; break;
        case "collect_all_coins": goalText = "Collect all coins and escape"; break;
        default: goalText = "Reach the exit point";
    }
    
    document.getElementById('missionGoal').innerHTML = `<strong>Objective:</strong> ${goalText}`;
    
    // Set up start button
    const startBtn = document.getElementById('startMissionBtn');
    if (startBtn) {
        startBtn.onclick = function() {
            startCustomMission(missionData);
        };
    }
    
    document.getElementById('missionBriefingScreen').classList.remove('hidden');
}

// Pause game
function pauseGame() {
    if (gameOver) return;
    
    updateMissionProgress();
    document.getElementById('pauseScreen').classList.remove('hidden');
    document.getElementById('toolbar').classList.add('hidden');
    document.getElementById('ui-controls').classList.add('hidden');
}

// Resume game
function resumeGame() {
    document.getElementById('pauseScreen').classList.add('hidden');
    document.getElementById('toolbar').classList.remove('hidden');
    document.getElementById('ui-controls').classList.remove('hidden');
}

// ============================================
// CORE GAME ENGINE
// ============================================

const TILE = 60;

// Global game state
let grid, player, enemies = [], activeBombs = [], activeGas = [], turnCount = 1;
let selectMode = 'move', gameOver = false, playerTurn = true, shake = 0, mapDim = 12;
let stats = { kills: 0, coins: 0, itemsUsed: 0, timesSpotted: 0, stealthKills: 0, timeBonus: 0 };
let inv = { trap: 0, rice: 0, bomb: 0, gas: 0, health: 0, coin: 0, sight: 0, mark: 0 };
let camX = 0, camY = 0, zoom = 1.0;
let showMinimap = false;
let highlightedTiles = [];
let hasReachedExit = false;
let currentEnemyTurn = null;
let combatSequence = false;
let startTime = 0;
let currentTurnEntity = null;
let playerHasMovedThisTurn = false;
let playerUsedActionThisTurn = false;
let cameraFocusEnabled = true;
let isUserDragging = false;

// Player stats
let playerHP = 10;
let playerMaxHP = 10;

// VFX Systems
let particles = [];
let speechBubbles = [];

// Canvas
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Mode colors
const modeColors = {
    'move': { fill: 'rgba(0, 210, 255, 0.15)', border: 'rgba(0, 210, 255, 0.7)', glow: 'rgba(0, 210, 255, 0.3)' },
    'trap': { fill: 'rgba(255, 100, 100, 0.15)', border: 'rgba(255, 100, 100, 0.7)', glow: 'rgba(255, 100, 100, 0.3)' },
    'rice': { fill: 'rgba(255, 255, 100, 0.15)', border: 'rgba(255, 255, 100, 0.7)', glow: 'rgba(255, 255, 100, 0.3)' },
    'bomb': { fill: 'rgba(255, 50, 150, 0.15)', border: 'rgba(255, 50, 150, 0.7)', glow: 'rgba(255, 50, 150, 0.3)' },
    'gas': { fill: 'rgba(153, 50, 204, 0.15)', border: 'rgba(153, 50, 204, 0.7)', glow: 'rgba(153, 50, 204, 0.3)' },
    'attack': { fill: 'rgba(255, 0, 0, 0.3)', border: 'rgba(255, 0, 0, 0.8)', glow: 'rgba(255, 0, 0, 0.5)' }
};

// Enemy types
const ENEMY_TYPES = {
    NORMAL: { range: 1, hp: 10, speed: 0.08, damage: 2, color: '#ff3333', tint: 'rgba(255, 50, 50, 0.3)' },
    ARCHER: { range: 3, hp: 8, speed: 0.06, damage: 1, color: '#33cc33', tint: 'rgba(50, 255, 50, 0.3)' },
    SPEAR: { range: 2, hp: 12, speed: 0.07, damage: 3, color: '#3366ff', tint: 'rgba(50, 100, 255, 0.3)' }
};

// ============================================
// INITIALIZATION
// ============================================

function initGame() {
    mapDim = window.mapDim || 12;
    const guardCount = window.guardCount || 5;
    
    if (window.selectedItemsForGame) {
        inv = { ...inv, ...window.selectedItemsForGame };
    }
    
    currentMission = {
        goal: "escape",
        rules: [],
        story: "",
        name: "Random Mission",
        timeLimit: 0,
        items: [],
        coinsRequired: 0,
        scrollPos: null,
        difficulty: "medium"
    };
    
    hasReachedExit = false;
    playerHP = playerMaxHP;
    combatSequence = false;
    playerHasMovedThisTurn = false;
    playerUsedActionThisTurn = false;
    startTime = Date.now();
    stats = { kills: 0, coins: 0, itemsUsed: 0, timesSpotted: 0, stealthKills: 0, timeBonus: 0 };
    
    particles = [];
    speechBubbles = [];
    
    currentTurnEntity = player;
    cameraFocusEnabled = true;
    isUserDragging = false;
    
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('toolbar').classList.remove('hidden');
    document.getElementById('ui-controls').classList.remove('hidden');
    document.getElementById('playerStatus').classList.remove('hidden');
    
    document.getElementById('resultScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('pauseScreen').classList.add('hidden');
    
    generateLevel(guardCount);
    centerCamera();
    updateToolCounts();
    
    requestAnimationFrame(gameLoop);
}

function generateLevel(guardCount) {
    canvas.width = window.innerWidth; 
    canvas.height = window.innerHeight;
    
    grid = Array.from({length: mapDim}, (_, y) => 
        Array.from({length: mapDim}, (_, x) => 
            (x==0 || y==0 || x==mapDim-1 || y==mapDim-1) ? WALL : 
            Math.random() < 0.18 ? WALL : 
            Math.random() < 0.08 ? HIDE : FLOOR
        )
    );
    
    player = { x: 1, y: 1, ax: 1, ay: 1, isHidden: false, dir: {x: 0, y: 0} };
    grid[mapDim-2][mapDim-2] = EXIT;
    
    for(let i = 0; i < 3; i++) {
        let cx, cy;
        do {
            cx = rand(mapDim);
            cy = rand(mapDim);
        } while(grid[cy][cx] !== FLOOR || Math.hypot(cx-player.x, cy-player.y) < 3);
        grid[cy][cx] = COIN;
    }
    
    const gc = Math.min(15, Math.max(1, guardCount));
    enemies = [];
    for(let i=0; i<gc; i++){
        let ex, ey; 
        do { 
            ex = rand(mapDim); 
            ey = rand(mapDim); 
        } while(grid[ey][ex] !== FLOOR || Math.hypot(ex-player.x, ey-player.y) < 4);
        
        const typeRoll = Math.random();
        let enemyType, enemyStats;
        if(typeRoll < 0.6) {
            enemyType = 'NORMAL';
            enemyStats = ENEMY_TYPES.NORMAL;
        } else if(typeRoll < 0.85) {
            enemyType = 'SPEAR';
            enemyStats = ENEMY_TYPES.SPEAR;
        } else {
            enemyType = 'ARCHER';
            enemyStats = ENEMY_TYPES.ARCHER;
        }
        
        enemies.push({
            x: ex, y: ey, 
            ax: ex, ay: ey, 
            dir: {x: 1, y: 0}, 
            alive: true,
            hp: enemyStats.hp,
            maxHP: enemyStats.hp,
            type: enemyType,
            attackRange: enemyStats.range,
            damage: enemyStats.damage,
            speed: enemyStats.speed,
            visionRange: 3,
            state: 'patrolling',
            investigationTarget: null,
            investigationTurns: 0,
            hearingRange: 6,
            hasHeardSound: false,
            soundLocation: null,
            returnToPatrolPos: {x: ex, y: ey},
            lastSeenPlayer: null,
            chaseTurns: 0,
            chaseMemory: 5,
            color: enemyStats.color,
            tint: enemyStats.tint,
            isSleeping: false,
            sleepTimer: 0,
            ateRice: false,
            riceDeathTimer: Math.floor(Math.random() * 5) + 1
        });
    }
}

function rand(m) { return Math.floor(Math.random()*(m-2))+1; }

// ============================================
// RENDERING
// ============================================

function gameLoop() {
    if(gameOver) return;
    
    try {
        ctx.setTransform(1,0,0,1,0,0);
        ctx.fillStyle = "#000"; 
        ctx.fillRect(0,0,canvas.width,canvas.height);
        
        const s = (Math.random()-0.5)*shake;
        ctx.translate(camX+s, camY+s); 
        ctx.scale(zoom, zoom);

        // Draw grid
        for(let y=0; y<grid.length; y++) {
            for(let x=0; x<grid[y].length; x++) {
                drawTile(x, y, grid[y][x]);
            }
        }

        // Draw gas clouds
        activeGas.forEach(g => {
            drawGasEffect(g.x, g.y, g.t);
        });

        // Draw highlights
        if(playerTurn && !playerHasMovedThisTurn && selectMode === 'move') {
            calculateHighlightedTiles();
            highlightedTiles.forEach(tile => {
                drawTileHighlight(tile.x, tile.y, tile.color);
            });
        } else if(playerTurn && selectMode !== 'move') {
            calculateHighlightedTiles();
            highlightedTiles.forEach(tile => {
                drawTileHighlight(tile.x, tile.y, tile.color);
            });
        }

        // Draw enemies
        enemies.forEach(e => {
            if(!e.alive) return;
            
            if(e.isSleeping) {
                ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
            } else {
                ctx.fillStyle = e.tint;
            }
            ctx.fillRect(e.ax * TILE, e.ay * TILE, TILE, TILE);
            
            // Health bar
            const healthPercent = e.hp / e.maxHP;
            ctx.fillStyle = healthPercent > 0.5 ? "#0f0" : healthPercent > 0.25 ? "#ff0" : "#f00";
            ctx.fillRect(e.ax * TILE + 5, e.ay * TILE - 8, (TILE - 10) * healthPercent, 4);
            
            // HP text
            ctx.fillStyle = "#fff";
            ctx.font = "bold 10px monospace";
            ctx.textAlign = "center";
            ctx.fillText(e.hp.toString(), e.ax * TILE + TILE/2, e.ay * TILE - 4);
            
            // Type indicator
            ctx.fillStyle = e.isSleeping ? "#888" : e.color;
            ctx.font = "bold 8px monospace";
            ctx.textAlign = "left";
            ctx.fillText(e.type.charAt(0), e.ax * TILE + 3, e.ay * TILE + 10);
            
            // State tint
            if(!e.isSleeping) {
                if(e.state === 'alerted' || e.state === 'chasing') {
                    ctx.fillStyle = "rgba(255, 50, 50, 0.3)";
                    ctx.fillRect(e.ax * TILE, e.ay * TILE, TILE, TILE);
                } else if(e.state === 'investigating') {
                    ctx.fillStyle = "rgba(255, 200, 50, 0.3)";
                    ctx.fillRect(e.ax * TILE, e.ay * TILE, TILE, TILE);
                }
            }
            
            // Draw enemy
            drawEnemy(e.ax, e.ay, e.color);
            
            // Vision cone
            if(!player.isHidden && e.state !== 'dead' && !e.isSleeping) {
                drawVisionConeVisual(e);
            }
        });

        // Draw VFX
        drawVFX();

        // Player health bar
        const playerHealthPercent = playerHP / playerMaxHP;
        ctx.fillStyle = playerHealthPercent > 0.5 ? "#0f0" : playerHealthPercent > 0.25 ? "#ff0" : "#f00";
        ctx.fillRect(player.ax * TILE + 5, player.ay * TILE - 8, (TILE - 10) * playerHealthPercent, 4);

        // Draw player
        ctx.shadowColor = player.isHidden ? 'rgba(0, 210, 255, 0.5)' : 'rgba(255, 255, 255, 0.3)';
        ctx.shadowBlur = 15;
        drawPlayer(player.ax, player.ay);
        ctx.shadowBlur = 0;

        // Draw bombs
        activeBombs.forEach(b => {
            drawBomb(b.x, b.y);
            ctx.fillStyle = b.t <= 1 ? "#ff0000" : "#ffffff";
            ctx.font = "bold 20px monospace";
            ctx.textAlign = "center";
            ctx.fillText(b.t.toString(), b.x*TILE + TILE/2, b.y*TILE + TILE/2 + 7);
        });

        // Draw minimap
        if(showMinimap) {
            drawMinimap();
        }
        
        updateVFX();
        
        // Camera focus
        if(currentTurnEntity && cameraFocusEnabled && !isUserDragging) {
            const targetX = (canvas.width/2) - (currentTurnEntity.ax*TILE + TILE/2)*zoom;
            const targetY = (canvas.height/2) - (currentTurnEntity.ay*TILE + TILE/2)*zoom;
            camX += (targetX - camX) * 0.05;
            camY += (targetY - camY) * 0.05;
        }
        
        shake *= 0.8;
        
        // Check mission goal
        if(playerTurn && !combatSequence) {
            const goalStatus = checkMissionGoal();
            if(goalStatus === "victory") {
                setTimeout(() => {
                    showVictoryScreen();
                }, 500);
                gameOver = true;
            } else if(goalStatus === "failure") {
                setTimeout(() => {
                    showGameOverScreen();
                }, 500);
                gameOver = true;
            }
        }
        
        requestAnimationFrame(gameLoop);
    } catch (error) {
        console.error("Error in game loop:", error);
    }
}

// Draw tile
function drawTile(x, y, tileValue) {
    const tx = x * TILE;
    const ty = y * TILE;
    
    // Draw floor first
    ctx.fillStyle = '#444';
    ctx.fillRect(tx, ty, TILE, TILE);
    
    // Draw specific tile
    if(tileValue === WALL) {
        ctx.fillStyle = '#666';
        ctx.fillRect(tx, ty, TILE, TILE);
    } else if(tileValue === HIDE) {
        ctx.fillStyle = '#3333aa';
        ctx.fillRect(tx, ty, TILE, TILE);
    } else if(tileValue === EXIT) {
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(tx + 5, ty + 5, TILE - 10, TILE - 10);
    } else if(tileValue === COIN) {
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(tx + TILE/2, ty + TILE/2, TILE/3, 0, Math.PI * 2);
        ctx.fill();
    } else if(tileValue === TRAP) {
        ctx.fillStyle = '#ff6666';
        ctx.fillRect(tx + 10, ty + 10, TILE - 20, TILE - 20);
    } else if(tileValue === RICE) {
        ctx.fillStyle = '#ffff66';
        ctx.fillRect(tx + 15, ty + 15, TILE - 30, TILE - 30);
    } else if(tileValue === BOMB) {
        ctx.fillStyle = '#ff3399';
        ctx.beginPath();
        ctx.arc(tx + TILE/2, ty + TILE/2, TILE/3, 0, Math.PI * 2);
        ctx.fill();
    } else if(tileValue === GAS) {
        ctx.fillStyle = '#9932cc';
        ctx.beginPath();
        ctx.arc(tx + TILE/2, ty + TILE/2, TILE/2, 0, Math.PI * 2);
        ctx.fill();
    } else if(tileValue === SCROLL) {
        ctx.fillStyle = '#9932cc';
        ctx.fillRect(tx + 10, ty + 10, TILE - 20, TILE - 20);
        ctx.fillStyle = '#fff';
        ctx.font = "bold 16px monospace";
        ctx.textAlign = "center";
        ctx.fillText("📜", tx + TILE/2, ty + TILE/2 + 5);
    } else if(tileValue === MYSTERY_BOX) {
        ctx.fillStyle = '#ff9900';
        ctx.fillRect(tx + 5, ty + 5, TILE - 10, TILE - 10);
        ctx.fillStyle = '#000';
        ctx.font = "bold 20px monospace";
        ctx.textAlign = "center";
        ctx.fillText("?", tx + TILE/2, ty + TILE/2 + 7);
    } else if(tileValue >= 21 && tileValue <= 29) {
        // Custom tiles from editor
        drawCustomTile(x, y, tileValue);
    }
    
    // Draw grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.strokeRect(tx, ty, TILE, TILE);
}

// Draw custom tile
function drawCustomTile(x, y, tileValue) {
    const tx = x * TILE;
    const ty = y * TILE;
    
    switch(tileValue) {
        case TILE_TYPES.FLOOR2:
            ctx.fillStyle = '#777777';
            break;
        case TILE_TYPES.GRASS1:
            ctx.fillStyle = '#33aa33';
            break;
        case TILE_TYPES.WALL2:
            ctx.fillStyle = '#999999';
            break;
        case TILE_TYPES.WATER:
            ctx.fillStyle = '#3366cc';
            break;
        case TILE_TYPES.TREE1:
            ctx.fillStyle = '#228822';
            break;
        case TILE_TYPES.TREE2:
            ctx.fillStyle = '#226622';
            break;
        case TILE_TYPES.BUSH1:
            ctx.fillStyle = '#33cc33';
            break;
        case TILE_TYPES.BUSH2:
            ctx.fillStyle = '#44dd44';
            break;
        case TILE_TYPES.BOX1:
            ctx.fillStyle = '#996633';
            break;
        default:
            ctx.fillStyle = '#666666';
    }
    
    ctx.fillRect(tx, ty, TILE, TILE);
}

// Draw player
function drawPlayer(x, y) {
    const tx = x * TILE;
    const ty = y * TILE;
    
    ctx.fillStyle = '#00d2ff';
    ctx.beginPath();
    ctx.arc(tx + TILE/2, ty + TILE/2, TILE/3, 0, Math.PI * 2);
    ctx.fill();
}

// Draw enemy
function drawEnemy(x, y, color) {
    const tx = x * TILE;
    const ty = y * TILE;
    
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(tx + TILE/2, ty + TILE/2, TILE/3, 0, Math.PI * 2);
    ctx.fill();
}

// Draw bomb
function drawBomb(x, y) {
    const tx = x * TILE;
    const ty = y * TILE;
    
    ctx.fillStyle = '#ff3399';
    ctx.beginPath();
    ctx.arc(tx + TILE/2, ty + TILE/2, TILE/3, 0, Math.PI * 2);
    ctx.fill();
}

// Draw gas effect
function drawGasEffect(x, y, timer) {
    const tx = x * TILE;
    const ty = y * TILE;
    const alpha = 0.3 + 0.2 * Math.sin(Date.now() / 500);
    
    ctx.fillStyle = `rgba(153, 50, 204, ${alpha})`;
    ctx.beginPath();
    ctx.arc(tx + TILE/2, ty + TILE/2, TILE * 0.8, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = "#fff";
    ctx.font = "bold 20px monospace";
    ctx.textAlign = "center";
    ctx.fillText(timer.toString(), tx + TILE/2, ty + TILE/2 + 7);
}

// Draw tile highlight
function drawTileHighlight(x, y, colorSet) {
    const time = Date.now() / 1000;
    const pulseFactor = (Math.sin(time * 6) * 0.1 + 0.9);
    
    ctx.fillStyle = colorSet.fill;
    ctx.fillRect(x*TILE + 4, y*TILE + 4, TILE - 8, TILE - 8);
    
    ctx.strokeStyle = colorSet.border;
    ctx.lineWidth = 3;
    ctx.strokeRect(x*TILE + 2, y*TILE + 2, TILE - 4, TILE - 4);
    
    ctx.strokeStyle = colorSet.glow;
    ctx.lineWidth = 1;
    for(let i = 0; i < 3; i++) {
        const offset = i * 2 * pulseFactor;
        ctx.strokeRect(
            x*TILE + 1 - offset, 
            y*TILE + 1 - offset, 
            TILE - 2 + offset*2, 
            TILE - 2 + offset*2
        );
    }
}

// Draw vision cone
function drawVisionConeVisual(e) {
    const drawRange = 3;
    const baseA = Math.atan2(e.dir.y, e.dir.x);
    const visionAngle = Math.PI / 3;
    
    ctx.save();
    ctx.translate(e.ax * TILE + 30, e.ay * TILE + 30);
    ctx.rotate(baseA);
    
    if(e.state === 'alerted' || e.state === 'chasing') {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
    } else if(e.state === 'investigating') {
        ctx.fillStyle = 'rgba(255, 165, 0, 0.2)';
    } else {
        ctx.fillStyle = 'rgba(255, 100, 100, 0.15)';
    }
    
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for(let i = 0; i <= 10; i++) {
        const angle = -visionAngle + (2 * visionAngle * i / 10);
        ctx.lineTo(
            Math.cos(angle) * drawRange * TILE,
            Math.sin(angle) * drawRange * TILE
        );
    }
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
}

// Draw minimap
function drawMinimap() {
    ctx.setTransform(1,0,0,1,0,0);
    const ms = 5;
    const mx = canvas.width - mapDim * ms - 20;
    const my = 75;
    
    ctx.fillStyle = "rgba(0,0,0,0.85)";
    ctx.fillRect(mx-5, my, mapDim*ms+10, mapDim*ms+10);
    
    for(let y=0; y<mapDim; y++) {
        for(let x=0; x<mapDim; x++) {
            if(grid[y][x] === WALL) {
                ctx.fillStyle = "#666";
                ctx.fillRect(mx + x*ms, my + 5 + y*ms, ms, ms);
            } else if(grid[y][x] === EXIT) {
                ctx.fillStyle = "#0f0";
                ctx.fillRect(mx + x*ms, my + 5 + y*ms, ms, ms);
            } else if(grid[y][x] === SCROLL) {
                ctx.fillStyle = "#9932cc";
                ctx.fillRect(mx + x*ms, my + 5 + y*ms, ms, ms);
            }
        }
    }
    
    // Player
    ctx.fillStyle = "#00d2ff";
    ctx.beginPath();
    ctx.arc(mx + player.x*ms + ms/2, my + 5 + player.y*ms + ms/2, ms/2, 0, Math.PI*2);
    ctx.fill();
    
    // Enemies
    enemies.filter(e => e.alive).forEach(e => {
        let enemyColor = e.color;
        if(e.isSleeping) enemyColor = "#888";
        else if(e.state === 'investigating') enemyColor = "#ff9900";
        
        ctx.fillStyle = enemyColor;
        ctx.fillRect(mx + e.x*ms, my + 5 + e.y*ms, ms, ms);
    });
}

// Draw VFX
function drawVFX() {
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x * TILE - 2, p.y * TILE - 2, 4, 4);
    });
    
    speechBubbles.forEach(b => {
        const alpha = b.life / b.maxLife;
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.7})`;
        ctx.fillRect(b.x - 50, b.y - 20, 100, 30);
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(b.x - 50, b.y - 20, 100, 30);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.font = "bold 12px monospace";
        ctx.textAlign = "center";
        ctx.fillText(b.text, b.x, b.y);
    });
}

// Update VFX
function updateVFX() {
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.016;
        return p.life > 0;
    });
    
    speechBubbles = speechBubbles.filter(b => {
        b.life -= 0.016;
        b.y -= 0.5;
        return b.life > 0;
    });
}

// ============================================
// CAMERA & UI FUNCTIONS
// ============================================

function centerCamera() {
    camX = (canvas.width/2) - (player.x*TILE + TILE/2)*zoom;
    camY = (canvas.height/2) - (player.y*TILE + TILE/2)*zoom;
}

function toggleMinimap() { 
    showMinimap = !showMinimap;
}

function updateToolCounts() {
    document.getElementById('trapCount').textContent = inv.trap;
    document.getElementById('riceCount').textContent = inv.rice;
    document.getElementById('bombCount').textContent = inv.bomb;
    document.getElementById('gasCount').textContent = inv.gas;
}

// ============================================
// INPUT HANDLING
// ============================================

let lastDist = 0, isDragging = false, lastTouch = {x:0, y:0};

canvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    if(e.touches.length === 2) {
        lastDist = Math.hypot(
            e.touches[0].pageX - e.touches[1].pageX, 
            e.touches[0].pageY - e.touches[1].pageY
        );
        isUserDragging = false;
    } else {
        isDragging = false;
        isUserDragging = false;
        lastTouch = {x: e.touches[0].pageX, y: e.touches[0].pageY};
    }
}, {passive: false});

canvas.addEventListener('touchmove', function(e) {
    e.preventDefault();
    if(e.touches.length === 2) {
        const dist = Math.hypot(
            e.touches[0].pageX - e.touches[1].pageX, 
            e.touches[0].pageY - e.touches[1].pageY
        );
        zoom = Math.min(2, Math.max(0.3, zoom * (dist/lastDist)));
        lastDist = dist;
        isUserDragging = true;
    } else {
        const dx = e.touches[0].pageX - lastTouch.x;
        const dy = e.touches[0].pageY - lastTouch.y;
        
        if(Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            isDragging = true; 
            isUserDragging = true;
            cameraFocusEnabled = false;
        }
        
        if(isDragging) {
            camX += dx; 
            camY += dy; 
            lastTouch = {x: e.touches[0].pageX, y: e.touches[0].pageY};
        }
    }
}, {passive: false});

canvas.addEventListener('touchend', function(e) {
    e.preventDefault();
    if(isDragging) {
        isDragging = false;
        setTimeout(() => {
            if(!isUserDragging) {
                cameraFocusEnabled = true;
            }
        }, 2000);
        return;
    }
    
    if(!playerTurn || gameOver || e.touches.length > 0) return;
    
    const rect = canvas.getBoundingClientRect();
    const tx = Math.floor(((lastTouch.x - rect.left - camX)/zoom)/TILE);
    const ty = Math.floor(((lastTouch.y - rect.top - camY)/zoom)/TILE);
    
    if(grid[ty]?.[tx] === undefined) return;
    
    // Check if tile is highlighted
    const isHighlighted = highlightedTiles.some(t => t.x === tx && t.y === ty);
    
    if(!isHighlighted) return;
    
    if(grid[ty][tx] === WALL) return;
    
    const dist = Math.max(Math.abs(tx - player.x), Math.abs(ty - player.y));
    
    if(selectMode === 'move' && dist <= 3) {
        handlePlayerMove(tx, ty);
    } else if(selectMode === 'attack' && dist === 1) {
        handleAttack(tx, ty);
    } else if(selectMode !== 'move' && selectMode !== 'attack' && dist <= 2 && grid[ty][tx] === FLOOR) {
        handleItemPlacement(tx, ty, selectMode);
    }
    
    cameraFocusEnabled = true;
    isUserDragging = false;
}, {passive: false});

// Mouse support for testing
canvas.addEventListener('mousedown', function(e) {
    e.preventDefault();
    isDragging = false;
    isUserDragging = false;
    lastTouch = {x: e.clientX, y: e.clientY};
});

canvas.addEventListener('mousemove', function(e) {
    e.preventDefault();
    if(e.buttons === 1) { // Left mouse button pressed
        const dx = e.clientX - lastTouch.x;
        const dy = e.clientY - lastTouch.y;
        
        if(Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            isDragging = true;
            isUserDragging = true;
            cameraFocusEnabled = false;
        }
        
        if(isDragging) {
            camX += dx;
            camY += dy;
            lastTouch = {x: e.clientX, y: e.clientY};
        }
    }
});

canvas.addEventListener('mouseup', function(e) {
    e.preventDefault();
    if(isDragging) {
        isDragging = false;
        setTimeout(() => {
            if(!isUserDragging) {
                cameraFocusEnabled = true;
            }
        }, 2000);
        return;
    }
    
    if(!playerTurn || gameOver) return;
    
    const rect = canvas.getBoundingClientRect();
    const tx = Math.floor(((e.clientX - rect.left - camX)/zoom)/TILE);
    const ty = Math.floor(((e.clientY - rect.top - camY)/zoom)/TILE);
    
    if(grid[ty]?.[tx] === undefined) return;
    
    const isHighlighted = highlightedTiles.some(t => t.x === tx && t.y === ty);
    
    if(!isHighlighted) return;
    
    if(grid[ty][tx] === WALL) return;
    
    const dist = Math.max(Math.abs(tx - player.x), Math.abs(ty - player.y));
    
    if(selectMode === 'move' && dist <= 3) {
        handlePlayerMove(tx, ty);
    } else if(selectMode === 'attack' && dist === 1) {
        handleAttack(tx, ty);
    } else if(selectMode !== 'move' && selectMode !== 'attack' && dist <= 2 && grid[ty][tx] === FLOOR) {
        handleItemPlacement(tx, ty, selectMode);
    }
    
    cameraFocusEnabled = true;
    isUserDragging = false;
});

// Wheel zoom
canvas.addEventListener('wheel', function(e) {
    e.preventDefault();
    
    const zoomSpeed = 0.1;
    const oldZoom = zoom;
    
    if(e.deltaY < 0) {
        zoom = Math.min(2.0, zoom + zoomSpeed);
    } else {
        zoom = Math.max(0.3, zoom - zoomSpeed);
    }
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const worldX = (mouseX - camX) / oldZoom;
    const worldY = (mouseY - camY) / oldZoom;
    
    camX = mouseX - worldX * zoom;
    camY = mouseY - worldY * zoom;
    
    isUserDragging = true;
    cameraFocusEnabled = false;
    setTimeout(() => {
        cameraFocusEnabled = true;
        isUserDragging = false;
    }, 2000);
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

function log(msg, color="#aaa") {
    return;
}

function animMove(obj, tx, ty, speed, cb) {
    const sx = obj.ax, sy = obj.ay; 
    let p = 0;
    
    if(obj !== player) {
        obj.dir = {
            x: Math.sign(tx-obj.x) || obj.dir.x, 
            y: Math.sign(ty-obj.y) || obj.dir.y
        };
    }
    
    function step() {
        p += speed; 
        obj.ax = sx + (tx - sx) * p; 
        obj.ay = sy + (ty - sy) * p;
        
        if(p < 1) {
            requestAnimationFrame(step);
        } else { 
            obj.x = tx; 
            obj.y = ty; 
            obj.ax = tx; 
            obj.ay = ty; 
            if(cb) cb(); 
        }
    }
    step();
}

function setMode(m) {
    selectMode = m;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('btn' + m.charAt(0).toUpperCase() + m.slice(1));
    if(btn) btn.classList.add('active');
    
    // When user clicks any button, focus camera on player
    if(playerTurn) {
        cameraFocusEnabled = true;
        currentTurnEntity = player;
        isUserDragging = false;
    }
}

function autoSwitchToMove() {
    setMode('move');
}

function playerWait() { 
    if(playerTurn) { 
        playerTurn = false; 
        playerHasMovedThisTurn = false;
        playerUsedActionThisTurn = false;
        createSpeechBubble(player.x, player.y, "⏳ WAITING", "#aaaaaa", 1.5);
        autoSwitchToMove();
        
        setTimeout(() => {
            endTurn();
        }, 800);
    } 
}

function showVictoryScreen() {
    document.getElementById('resultScreen').classList.remove('hidden');
    document.getElementById('toolbar').classList.add('hidden');
    document.getElementById('ui-controls').classList.add('hidden');
    document.getElementById('playerStatus').classList.add('hidden');
    showTenchuStyleVictoryStats();
}

function showGameOverScreen() {
    gameOver = true;
    document.getElementById('gameOverScreen').classList.remove('hidden');
    document.getElementById('toolbar').classList.add('hidden');
    document.getElementById('ui-controls').classList.add('hidden');
    document.getElementById('playerStatus').classList.add('hidden');
}

// ============================================
// LINE OF SIGHT - CONE VISION ONLY (NOT BEHIND)
// ============================================

function hasLineOfSight(e, px, py) {
    if(hasReachedExit) return false;
    if(e.isSleeping) return false;
    
    const dx = px - e.x;
    const dy = py - e.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if(distance > e.visionRange) return false;
    
    // Check if target is within vision cone (60 degrees)
    const angleToPlayer = Math.atan2(dy, dx);
    const enemyAngle = Math.atan2(e.dir.y, e.dir.x);
    
    // Calculate angle difference (wrap around)
    let angleDiff = Math.abs(angleToPlayer - enemyAngle);
    if(angleDiff > Math.PI) {
        angleDiff = 2 * Math.PI - angleDiff;
    }
    
    // Only see in front (within 60 degrees)
    if(angleDiff > Math.PI / 3) { // 60 degrees
        return false;
    }
    
    // Check line of sight
    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    for(let i = 1; i <= steps; i++) {
        const tx = Math.round(e.x + (dx / steps) * i);
        const ty = Math.round(e.y + (dy / steps) * i);
        
        if(tx === px && ty === py) break;
        
        if(tx < 0 || tx >= grid[0].length || ty < 0 || ty >= grid.length) return false;
        if(grid[ty][tx] === WALL) return false;
    }
    
    return true;
}

// ============================================
// TURN PROCESSING
// ============================================

async function endTurn() {
    if(hasReachedExit) {
        return;
    }
    
    // Process Bombs first
    let exploding = [];
    activeBombs = activeBombs.filter(b => {
        b.t--;
        if(b.t <= 0) { 
            exploding.push(b); 
            return false; 
        }
        return true;
    });

    // Process Gas
    let gasExploding = [];
    activeGas = activeGas.filter(g => {
        g.t--;
        if(g.t <= 0) { 
            gasExploding.push(g); 
            return false; 
        }
        return true;
    });

    for(let b of exploding) {
        await wait(600);
        
        grid[b.y][b.x] = FLOOR; 
        shake = 20; 
        createExplosionEffect(b.x, b.y);
        
        // Alert nearby enemies to the sound
        enemies.forEach(e => {
            if(e.alive && e.state !== 'dead' && !e.isSleeping) {
                const dist = Math.hypot(e.x - b.x, e.y - b.y);
                if(dist <= e.hearingRange) {
                    e.hasHeardSound = true;
                    e.soundLocation = {x: b.x, y: b.y};
                    e.investigationTurns = 5;
                    e.state = 'investigating';
                    createSpeechBubble(e.x, e.y, "What was that?", "#ff9900", 1.5);
                }
            }
        });
        
        const enemiesInBlast = enemies.filter(e => 
            e.alive && Math.abs(e.x-b.x)<=1 && Math.abs(e.y-b.y)<=1
        );
        
        for(let e of enemiesInBlast) {
            await wait(400);
            e.alive = false; 
            e.state = 'dead';
            e.hp = 0;
            stats.kills++;
            createDeathEffect(e.x, e.y);
        }
    }
    
    // Process Gas explosions
    for(let g of gasExploding) {
        await wait(600);
        
        grid[g.y][g.x] = FLOOR; 
        shake = 15; 
        
        // Gas has bigger range than bomb (2 tiles)
        const enemiesInGas = enemies.filter(e => 
            e.alive && Math.abs(e.x-g.x)<=2 && Math.abs(e.y-g.y)<=2
        );
        
        for(let e of enemiesInGas) {
            if(!e.isSleeping) {
                await wait(300);
                e.isSleeping = true;
                e.sleepTimer = Math.floor(Math.random() * 5) + 2; // 2-6 turns
                createSpeechBubble(e.x, e.y, "💤 Sleeping...", "#9932cc", 1.5);
            }
        }
    }

    // Process enemies with proper waits
    for(let e of enemies.filter(g => g.alive)) {
        currentEnemyTurn = e;
        currentTurnEntity = e;
        
        await wait(800 + Math.random() * 400);
        
        await processEnemyTurn(e);
        
        await wait(500);
    }
    
    currentEnemyTurn = null;
    currentTurnEntity = player;
    
    await wait(600);
    
    turnCount++; 
    playerTurn = true;
    playerHasMovedThisTurn = false;
    playerUsedActionThisTurn = false;
    autoSwitchToMove();
}

async function processCombatSequence(playerAttack, enemy, playerDamage = 2) {
    combatSequence = true;
    
    // Player attacks first
    createSpeechBubble(player.x, player.y, "🗡️ ATTACK!", "#00d2ff", 1.5);
    await wait(600);
    
    enemy.hp -= playerDamage;
    enemy.hp = Math.max(0, enemy.hp);
    createDamageEffect(enemy.x, enemy.y, playerDamage);
    createSpeechBubble(enemy.x, enemy.y, `-${playerDamage}`, "#ff0000", 1.5);
    shake = 10;
    
    await wait(800);
    
    if(enemy.hp <= 0) {
        enemy.alive = false;
        enemy.state = 'dead';
        enemy.hp = 0;
        stats.kills++;
        if(!playerAttack) {
            stats.stealthKills++;
        }
        createDeathEffect(enemy.x, enemy.y);
        combatSequence = false;
        return true;
    }
    
    // Enemy counterattacks if in range AND can see player
    const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    const canSeePlayer = hasLineOfSight(enemy, player.x, player.y) && !player.isHidden;
    
    if(dist <= enemy.attackRange && canSeePlayer) {
        createSpeechBubble(enemy.x, enemy.y, `${enemy.type} ATTACK!`, enemy.color, 1.5);
        await wait(600);
        
        playerHP -= enemy.damage;
        playerHP = Math.max(0, playerHP);
        createDamageEffect(player.x, player.y, enemy.damage, true);
        createSpeechBubble(player.x, player.y, `-${enemy.damage}`, "#ff66ff", 1.5);
        shake = 15;
        
        await wait(800);
        
        if(playerHP <= 0) {
            playerHP = 0;
            setTimeout(() => {
                showGameOverScreen();
            }, 500);
            combatSequence = false;
            return false;
        }
    }
    
    combatSequence = false;
    return false;
}

// Helper function for waits
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// GAME LOGIC FUNCTIONS
// ============================================

function handlePlayerMove(tx, ty) {
    if(!playerTurn || playerHasMovedThisTurn || gameOver) return;
    
    player.dir = {x: Math.sign(tx - player.x), y: Math.sign(ty - player.y)};
    
    // Check if enemy is at target position
    const enemyAtTarget = enemies.find(e => e.alive && e.x === tx && e.y === ty);
    
    if(enemyAtTarget) {
        // Check if stealth kill is possible (enemy can't see player)
        const canSee = hasLineOfSight(enemyAtTarget, player.x, player.y);
        if(!canSee || enemyAtTarget.isSleeping) {
            // Stealth kill!
            animMove(player, tx, ty, 0.1, () => {
                enemyAtTarget.alive = false;
                enemyAtTarget.state = 'dead';
                enemyAtTarget.hp = 0;
                stats.kills++;
                stats.stealthKills++;
                createDeathEffect(tx, ty);
                createSpeechBubble(player.x, player.y, "🗡️ STEALTH KILL!", "#00ff00", 1.5);
                playerHasMovedThisTurn = true;
                playerUsedActionThisTurn = true;
                
                setTimeout(() => {
                    endTurn();
                }, 800);
            });
        } else {
            // Normal attack - triggers combat
            animMove(player, tx, ty, 0.1, async () => {
                await processCombatSequence(true, enemyAtTarget);
                playerHasMovedThisTurn = true;
                playerUsedActionThisTurn = true;
                
                setTimeout(() => {
                    endTurn();
                }, 800);
            });
        }
    } else {
        // Normal move
        animMove(player, tx, ty, 0.1, () => {
            playerHasMovedThisTurn = true;
            
            // Check for hide tile
            player.isHidden = (grid[player.y][player.x] === HIDE);
            
            // Check for exit
            if(grid[player.y][player.x] === EXIT) {
                hasReachedExit = true;
                setTimeout(() => {
                    showVictoryScreen();
                }, 500);
                gameOver = true;
                return;
            }
            
            // Check for coin
            if(grid[player.y][player.x] === COIN) {
                stats.coins++;
                createCoinPickupEffect(player.x, player.y);
                grid[player.y][player.x] = FLOOR;
            }
            
            // Check for scroll
            if(grid[player.y][player.x] === SCROLL) {
                createSpeechBubble(player.x, player.y, "📜 SCROLL ACQUIRED!", "#9932cc", 2);
                grid[player.y][player.x] = FLOOR;
            }
            
            // Check for trap
            if(grid[player.y][player.x] === TRAP) {
                playerHP = Math.max(0, playerHP - 3);
                createDamageEffect(player.x, player.y, 3, true);
                createSpeechBubble(player.x, player.y, "⚠️ TRAP!", "#ff0000", 1.5);
                grid[player.y][player.x] = FLOOR;
                
                if(playerHP <= 0) {
                    playerHP = 0;
                    setTimeout(() => {
                        showGameOverScreen();
                    }, 500);
                    gameOver = true;
                    return;
                }
            }
            
            // Check for rice
            if(grid[player.y][player.x] === RICE) {
                createSpeechBubble(player.x, player.y, "🍚 RICE!", "#ffff00", 1.5);
                grid[player.y][player.x] = FLOOR;
                
                // Make all enemies that can see the player investigate
                enemies.forEach(e => {
                    if(e.alive && !e.isSleeping) {
                        const dist = Math.hypot(e.x - player.x, e.y - player.y);
                        if(dist <= e.hearingRange) {
                            e.hasHeardSound = true;
                            e.soundLocation = {x: player.x, y: player.y};
                            e.investigationTurns = 5;
                            e.state = 'investigating';
                            createSpeechBubble(e.x, e.y, "What's that?", "#ff9900", 1.5);
                        }
                    }
                });
            }
            
            // Check for mystery box
            if(grid[player.y][player.x] === MYSTERY_BOX) {
                const rewards = ['coin', 'health', 'trap', 'rice', 'bomb', 'gas'];
                const reward = rewards[Math.floor(Math.random() * rewards.length)];
                
                createSpeechBubble(player.x, player.y, `🎁 ${reward.toUpperCase()}!`, "#ff9900", 2);
                
                switch(reward) {
                    case 'coin':
                        stats.coins += 5;
                        break;
                    case 'health':
                        playerHP = Math.min(playerMaxHP, playerHP + 3);
                        break;
                    case 'trap':
                        inv.trap++;
                        break;
                    case 'rice':
                        inv.rice++;
                        break;
                    case 'bomb':
                        inv.bomb++;
                        break;
                    case 'gas':
                        inv.gas++;
                        break;
                }
                
                updateToolCounts();
                grid[player.y][player.x] = FLOOR;
            }
            
            // Check if enemy spotted us
            enemies.forEach(e => {
                if(e.alive && !e.isSleeping && e.state !== 'dead') {
                    const canSee = hasLineOfSight(e, player.x, player.y);
                    if(canSee && !player.isHidden) {
                        e.state = 'alerted';
                        e.lastSeenPlayer = {x: player.x, y: player.y};
                        e.chaseTurns = e.chaseMemory;
                        stats.timesSpotted++;
                        createSpeechBubble(e.x, e.y, "I SEE YOU!", e.color, 1.5);
                    }
                }
            });
            
            // Auto end turn if no action taken
            if(!playerUsedActionThisTurn) {
                setTimeout(() => {
                    endTurn();
                }, 800);
            }
        });
    }
}

function handleAttack(tx, ty) {
    if(!playerTurn || playerUsedActionThisTurn || gameOver) return;
    
    const enemy = enemies.find(e => e.alive && e.x === tx && e.y === ty);
    if(!enemy) return;
    
    // Check if adjacent
    const dist = Math.max(Math.abs(tx - player.x), Math.abs(ty - player.y));
    if(dist !== 1) return;
    
    playerUsedActionThisTurn = true;
    
    // Face the enemy
    player.dir = {x: Math.sign(tx - player.x), y: Math.sign(ty - player.y)};
    
    processCombatSequence(true, enemy).then(() => {
        setTimeout(() => {
            endTurn();
        }, 800);
    });
}

function handleItemPlacement(tx, ty, mode) {
    if(!playerTurn || playerUsedActionThisTurn || gameOver) return;
    
    if(inv[mode] <= 0) {
        createSpeechBubble(player.x, player.y, "❌ NONE LEFT", "#ff0000", 1.5);
        return;
    }
    
    // Check if tile is empty
    if(grid[ty][tx] !== FLOOR) {
        createSpeechBubble(player.x, player.y, "❌ CAN'T PLACE THERE", "#ff0000", 1.5);
        return;
    }
    
    // Check distance
    const dist = Math.max(Math.abs(tx - player.x), Math.abs(ty - player.y));
    if(dist > 2) return;
    
    inv[mode]--;
    updateToolCounts();
    playerUsedActionThisTurn = true;
    
    switch(mode) {
        case 'trap':
            grid[ty][tx] = TRAP;
            createSpeechBubble(player.x, player.y, "⚠️ TRAP SET", "#ff6666", 1.5);
            break;
        case 'rice':
            grid[ty][tx] = RICE;
            createSpeechBubble(player.x, player.y, "🍚 RICE SET", "#ffff66", 1.5);
            break;
        case 'bomb':
            grid[ty][tx] = BOMB;
            activeBombs.push({x: tx, y: ty, t: 3});
            createSpeechBubble(player.x, player.y, "💣 BOMB SET (3)", "#ff3399", 1.5);
            break;
        case 'gas':
            grid[ty][tx] = GAS;
            activeGas.push({x: tx, y: ty, t: 3});
            createSpeechBubble(player.x, player.y, "💨 GAS SET (3)", "#9932cc", 1.5);
            break;
        case 'health':
            playerHP = Math.min(playerMaxHP, playerHP + 3);
            createSpeechBubble(player.x, player.y, "❤️ HEALED +3", "#ff66ff", 1.5);
            playerUsedActionThisTurn = false; // Healing doesn't cost action
            break;
        case 'coin':
            stats.coins += 3;
            createSpeechBubble(player.x, player.y, "💰 +3 COINS", "#ffd700", 1.5);
            break;
        case 'sight':
            // Reveal enemy positions for this turn
            createSpeechBubble(player.x, player.y, "👁️ ENHANCED VISION", "#00ff00", 1.5);
            // This would require additional implementation
            break;
        case 'mark':
            // Mark an enemy for easier tracking
            createSpeechBubble(player.x, player.y, "🎯 MARKING", "#ff9900", 1.5);
            // This would require additional implementation
            break;
    }
    
    if(mode !== 'health') {
        setTimeout(() => {
            endTurn();
        }, 800);
    }
}

// Calculate highlighted tiles
function calculateHighlightedTiles() {
    highlightedTiles = [];
    
    if(!playerTurn) return;
    
    const range = selectMode === 'move' ? 3 : (selectMode === 'attack' ? 1 : 2);
    
    for(let y = 0; y < grid.length; y++) {
        for(let x = 0; x < grid[y].length; x++) {
            const dist = Math.max(Math.abs(x - player.x), Math.abs(y - player.y));
            
            if(dist <= range && grid[y][x] !== WALL) {
                let colorSet;
                
                if(selectMode === 'move') {
                    colorSet = modeColors.move;
                } else if(selectMode === 'attack') {
                    const enemyHere = enemies.find(e => e.alive && e.x === x && e.y === y);
                    colorSet = enemyHere ? modeColors.attack : null;
                } else {
                    if(grid[y][x] === FLOOR) {
                        colorSet = modeColors[selectMode];
                    }
                }
                
                if(colorSet) {
                    highlightedTiles.push({x, y, color: colorSet});
                }
            }
        }
    }
}

// ============================================
// ENEMY AI
// ============================================

async function processEnemyTurn(e) {
    if(!e.alive || hasReachedExit) return;
    
    // Process sleep
    if(e.isSleeping) {
        e.sleepTimer--;
        if(e.sleepTimer <= 0) {
            e.isSleeping = false;
            createSpeechBubble(e.x, e.y, "😴 Waking up...", "#888888", 1.5);
        } else {
            createSpeechBubble(e.x, e.y, `💤 ${e.sleepTimer}`, "#888888", 1.5);
            return;
        }
    }
    
    // Process rice death
    if(e.ateRice) {
        e.riceDeathTimer--;
        if(e.riceDeathTimer <= 0) {
            e.alive = false;
            e.state = 'dead';
            e.hp = 0;
            stats.kills++;
            createDeathEffect(e.x, e.y);
            createSpeechBubble(e.x, e.y, "🍚 POISONED!", "#ffff00", 1.5);
            return;
        }
    }
    
    // Check line of sight to player
    const canSeePlayer = hasLineOfSight(e, player.x, player.y);
    const playerHidden = player.isHidden || (grid[player.y][player.x] === HIDE);
    
    if(canSeePlayer && !playerHidden) {
        // Can see player!
        e.state = 'chasing';
        e.lastSeenPlayer = {x: player.x, y: player.y};
        e.chaseTurns = e.chaseMemory;
        
        const dist = Math.hypot(e.x - player.x, e.y - player.y);
        
        if(dist <= e.attackRange) {
            // In attack range - attack!
            await processCombatSequence(false, e);
            return;
        } else {
            // Chase player
            createSpeechBubble(e.x, e.y, "GET BACK HERE!", e.color, 1.5);
            await moveTowards(e, player.x, player.y);
        }
    } else if(e.state === 'chasing') {
        // Lost sight but still chasing
        e.chaseTurns--;
        
        if(e.chaseTurns <= 0) {
            e.state = 'investigating';
            e.investigationTarget = e.lastSeenPlayer;
            e.investigationTurns = 5;
            createSpeechBubble(e.x, e.y, "Where did they go?", "#ff9900", 1.5);
        } else {
            // Continue chasing last known position
            if(e.lastSeenPlayer) {
                createSpeechBubble(e.x, e.y, "Searching...", "#ff9900", 1.5);
                await moveTowards(e, e.lastSeenPlayer.x, e.lastSeenPlayer.y);
                
                // Check if we reached the last known position
                if(e.x === e.lastSeenPlayer.x && e.y === e.lastSeenPlayer.y) {
                    e.state = 'investigating';
                    e.investigationTarget = e.lastSeenPlayer;
                    e.investigationTurns = 5;
                }
            }
        }
    } else if(e.hasHeardSound && e.soundLocation) {
        // Investigate sound
        e.state = 'investigating';
        e.investigationTarget = e.soundLocation;
        e.investigationTurns = 5;
        createSpeechBubble(e.x, e.y, "What was that?", "#ff9900", 1.5);
        
        await moveTowards(e, e.soundLocation.x, e.soundLocation.y);
        
        // Check if we reached the sound location
        if(e.x === e.soundLocation.x && e.y === e.soundLocation.y) {
            e.hasHeardSound = false;
            e.soundLocation = null;
            e.state = 'patrolling';
            createSpeechBubble(e.x, e.y, "Nothing here...", "#888888", 1.5);
        }
    } else if(e.state === 'investigating' && e.investigationTarget) {
        // Continue investigation
        e.investigationTurns--;
        
        if(e.investigationTurns <= 0) {
            e.state = 'patrolling';
            e.investigationTarget = null;
            createSpeechBubble(e.x, e.y, "Must have been nothing", "#888888", 1.5);
        } else {
            await moveTowards(e, e.investigationTarget.x, e.investigationTarget.y);
            
            // Check if we reached the investigation target
            if(e.x === e.investigationTarget.x && e.y === e.investigationTarget.y) {
                e.state = 'patrolling';
                e.investigationTarget = null;
                createSpeechBubble(e.x, e.y, "Nothing here", "#888888", 1.5);
            }
        }
    } else {
        // Patrolling
        e.state = 'patrolling';
        await patrolMove(e);
    }
    
    // Check for traps or rice after moving
    if(grid[e.y][e.x] === TRAP) {
        e.hp = Math.max(0, e.hp - 3);
        createDamageEffect(e.x, e.y, 3);
        createSpeechBubble(e.x, e.y, "⚠️ TRAP!", "#ff0000", 1.5);
        grid[e.y][e.x] = FLOOR;
        
        if(e.hp <= 0) {
            e.alive = false;
            e.state = 'dead';
            stats.kills++;
            createDeathEffect(e.x, e.y);
            return;
        }
    }
    
    if(grid[e.y][e.x] === RICE) {
        e.ateRice = true;
        createSpeechBubble(e.x, e.y, "🍚 YUM...", "#ffff00", 1.5);
        grid[e.y][e.x] = FLOOR;
    }
}

async function moveTowards(e, tx, ty) {
    // Find the best move
    const moves = [
        {dx: 1, dy: 0}, {dx: -1, dy: 0}, 
        {dx: 0, dy: 1}, {dx: 0, dy: -1}
    ];
    
    let bestMove = null;
    let bestDist = Infinity;
    
    for(const move of moves) {
        const nx = e.x + move.dx;
        const ny = e.y + move.dy;
        
        if(nx < 0 || nx >= grid[0].length || ny < 0 || ny >= grid.length) continue;
        if(grid[ny][nx] === WALL) continue;
        
        // Don't move into other enemies
        const enemyThere = enemies.find(other => 
            other !== e && other.alive && other.x === nx && other.y === ny
        );
        if(enemyThere) continue;
        
        const dist = Math.hypot(nx - tx, ny - ty);
        
        if(dist < bestDist) {
            bestDist = dist;
            bestMove = move;
        }
    }
    
    if(bestMove) {
        const nx = e.x + bestMove.dx;
        const ny = e.y + bestMove.dy;
        
        e.dir = {x: bestMove.dx, y: bestMove.dy};
        await animMove(e, nx, ny, e.speed);
    }
}

async function patrolMove(e) {
    // Random patrol
    const moves = [
        {dx: 1, dy: 0}, {dx: -1, dy: 0}, 
        {dx: 0, dy: 1}, {dx: 0, dy: -1}
    ].filter(m => {
        const nx = e.x + m.dx;
        const ny = e.y + m.dy;
        
        if(nx < 0 || nx >= grid[0].length || ny < 0 || ny >= grid.length) return false;
        if(grid[ny][nx] === WALL) return false;
        
        // Don't move into other enemies
        const enemyThere = enemies.find(other => 
            other !== e && other.alive && other.x === nx && other.y === ny
        );
        return !enemyThere;
    });
    
    if(moves.length > 0) {
        const move = moves[Math.floor(Math.random() * moves.length)];
        const nx = e.x + move.dx;
        const ny = e.y + move.dy;
        
        // Occasionally turn without moving
        if(Math.random() < 0.3) {
            e.dir = {x: move.dx, y: move.dy};
            createSpeechBubble(e.x, e.y, "👀 Looking around", "#888888", 1.5);
        } else {
            e.dir = {x: move.dx, y: move.dy};
            await animMove(e, nx, ny, e.speed);
        }
    }
}

// ============================================
// VFX FUNCTIONS
// ============================================

function createSpeechBubble(x, y, text, color, duration = 2) {
    speechBubbles.push({
        x: x * TILE + TILE/2 + camX/zoom,
        y: y * TILE - 20 + camY/zoom,
        text: text,
        color: color,
        life: duration,
        maxLife: duration
    });
}

function createExplosionEffect(x, y) {
    for(let i = 0; i < 20; i++) {
        particles.push({
            x: x + Math.random() * 1.5 - 0.75,
            y: y + Math.random() * 1.5 - 0.75,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3,
            color: '#ff9900',
            life: 1.0
        });
    }
}

function createDeathEffect(x, y) {
    for(let i = 0; i < 15; i++) {
        particles.push({
            x: x + Math.random() * 1.5 - 0.75,
            y: y + Math.random() * 1.5 - 0.75,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            color: '#ff0000',
            life: 1.5
        });
    }
}

function createDamageEffect(x, y, amount, isPlayer = false) {
    const colors = isPlayer ? ['#ff66ff', '#ff99ff'] : ['#ff0000', '#ff6666'];
    for(let i = 0; i < 10; i++) {
        particles.push({
            x: x + Math.random() * 1.2 - 0.6,
            y: y + Math.random() * 1.2 - 0.6,
            vx: (Math.random() - 0.5) * 1.5,
            vy: (Math.random() - 0.5) * 1.5,
            color: colors[Math.floor(Math.random() * colors.length)],
            life: 1.0
        });
    }
}

function createCoinPickupEffect(x, y) {
    for(let i = 0; i < 8; i++) {
        particles.push({
            x: x + Math.random() * 1.0 - 0.5,
            y: y + Math.random() * 1.0 - 0.5,
            vx: (Math.random() - 0.5) * 1,
            vy: (Math.random() - 0.5) * 1,
            color: '#ffd700',
            life: 1.2
        });
    }
}

// ============================================
// VICTORY SCREEN
// ============================================

function showTenchuStyleVictoryStats() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    
    // Calculate score
    const timeScore = Math.max(0, 10000 - (turnCount * 100));
    const stealthBonus = stats.stealthKills * 500;
    const coinBonus = stats.coins * 100;
    const itemBonus = (5 - stats.itemsUsed) * 200;
    const survivalBonus = (playerHP / playerMaxHP) * 1000;
    
    const totalScore = timeScore + stealthBonus + coinBonus + itemBonus + survivalBonus;
    
    // Mission-specific bonus
    let missionBonus = 0;
    let missionResult = "";
    
    const goalStatus = checkMissionGoal();
    if(goalStatus === "victory") {
        switch(currentMission.goal) {
            case "kill_all":
                missionBonus = 2000;
                missionResult = "COMPLETE EXTERMINATION";
                break;
            case "steal":
                missionBonus = 1500;
                missionResult = "SCROLL RETRIEVED";
                break;
            case "pacifist":
                missionBonus = 3000;
                missionResult = "PERFECT STEALTH";
                break;
            case "time_trial":
                missionBonus = 1000 + (currentMission.timeLimit - turnCount) * 100;
                missionResult = "TIME TRIAL COMPLETE";
                break;
            case "collect_all_coins":
                missionBonus = stats.coins * 200;
                missionResult = "ALL COINS COLLECTED";
                break;
            default:
                missionBonus = 1000;
                missionResult = "MISSION COMPLETE";
        }
    }
    
    const finalScore = totalScore + missionBonus;
    
    // Update display
    document.getElementById('missionNameDisplay').textContent = currentMission.name;
    document.getElementById('missionResult').textContent = missionResult;
    document.getElementById('timeTaken').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('turnsTaken').textContent = turnCount;
    document.getElementById('enemiesKilled').textContent = `${stats.kills} (${stats.stealthKills} stealth)`;
    document.getElementById('coinsCollected').textContent = stats.coins;
    document.getElementById('itemsUsed').textContent = stats.itemsUsed;
    document.getElementById('timesSpotted').textContent = stats.timesSpotted;
    document.getElementById('playerHealth').textContent = `${playerHP}/${playerMaxHP}`;
    
    // Score breakdown
    document.getElementById('timeScore').textContent = timeScore;
    document.getElementById('stealthBonus').textContent = stealthBonus;
    document.getElementById('coinBonus').textContent = coinBonus;
    document.getElementById('itemBonus').textContent = itemBonus;
    document.getElementById('survivalBonus').textContent = Math.floor(survivalBonus);
    document.getElementById('missionBonus').textContent = missionBonus;
    document.getElementById('finalScore').textContent = finalScore;
    
    // Rank
    let rank = "D";
    if(finalScore >= 10000) rank = "S";
    else if(finalScore >= 8000) rank = "A";
    else if(finalScore >= 6000) rank = "B";
    else if(finalScore >= 4000) rank = "C";
    
    document.getElementById('rank').textContent = rank;
}

// ============================================
// INITIALIZE ON LOAD
// ============================================

window.addEventListener('load', function() {
    console.log("Game loaded");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    initMenu();
    
    // Handle window resize
    window.addEventListener('resize', function() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        centerCamera();
    });
    
    // Initialize camera focus
    cameraFocusEnabled = true;
    
    // Initialize game state
    gameOver = false;
    playerTurn = true;
    turnCount = 1;
    startTime = Date.now();
    stats = { kills: 0, coins: 0, itemsUsed: 0, timesSpotted: 0, stealthKills: 0, timeBonus: 0 };
    inv = { trap: 0, rice: 0, bomb: 0, gas: 0, health: 0, coin: 0, sight: 0, mark: 0 };
    
    // Set default mode
    setMode('move');
});

// ============================================
// EXPORT FOR HTML USE
// ============================================

// Make functions available globally
window.initMenu = initMenu;
window.showItemSelection = showItemSelection;
window.backToMainMenu = backToMainMenu;
window.showTutorial = showTutorial;
window.hideTutorial = hideTutorial;
window.changeMapSize = changeMapSize;
window.changeGuardCount = changeGuardCount;
window.toggleItem = toggleItem;
window.removeItem = removeItem;
window.startGame = startGame;
window.startCustomMission = startCustomMission;
window.showMissionBriefing = showMissionBriefing;
window.pauseGame = pauseGame;
window.resumeGame = resumeGame;
window.setMode = setMode;
window.toggleMinimap = toggleMinimap;
window.playerWait = playerWait;
window.initGame = initGame;