// ============================================
// MENU SYSTEM - MUST BE AT TOP
// ============================================

// Menu state
let selectedItems = {
    trap: 0, rice: 0, bomb: 0, gas: 0,
    health: 0, coin: 0, sight: 0, mark: 0
};
let mapSize = 12;
let guardCount = 5;

// Initialize menu
function initMenu() {
    console.log("Menu initialized");
    // Show main menu
    document.getElementById('mainMenu').classList.remove('hidden');
    document.getElementById('itemSelection').classList.add('hidden');
    document.getElementById('tutorialScreen').classList.add('hidden');
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
    document.getElementById('mainMenu').classList.remove('hidden');
}

function showTutorial() {
    // Determine which screen we're coming from
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
        console.log("Map size:", mapSize);
    }
    
    // Store in global variable for game
    window.mapDim = mapSize;
}

function changeGuardCount(delta) {
    guardCount += delta;
    if (guardCount < 1) guardCount = 1;
    if (guardCount > 15) guardCount = 15;
    
    const element = document.getElementById('guardCountValue');
    if (element) {
        element.textContent = guardCount;
        console.log("Guard count:", guardCount);
    }
    
    // Store in global variable for game
    window.guardCount = guardCount;
}

// Item selection logic
function toggleItem(itemType) {
    console.log("Toggling item:", itemType);
    
    const currentCount = selectedItems[itemType] || 0;
    const totalSelected = getTotalSelectedItems();
    const selectedTypes = getSelectedTypesCount();
    
    // If already has this item, increase count up to max 3 per type
    if (currentCount > 0) {
        if (currentCount < 3) {
            selectedItems[itemType]++;
            console.log(`Increased ${itemType} to ${selectedItems[itemType]}`);
        } else {
            console.log(`Max 3 per item type reached for ${itemType}`);
            return;
        }
    } else {
        // Check limits
        if (totalSelected >= 5) {
            alert("Maximum 5 items total!");
            return;
        }
        if (selectedTypes >= 3) {
            alert("Maximum 3 item types!");
            return;
        }
        
        // Add item
        selectedItems[itemType] = 1;
        console.log(`Added ${itemType}`);
    }
    
    updateSelectionDisplay();
}

function removeItem(itemType) {
    if (selectedItems[itemType] > 0) {
        selectedItems[itemType]--;
        if (selectedItems[itemType] === 0) {
            // Remove from selected items if count reaches 0
            delete selectedItems[itemType];
        }
        updateSelectionDisplay();
        console.log(`Removed ${itemType} from preview`);
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
    
    console.log("Updating display:", totalItems, "items,", totalTypes, "types");
    
    // Update counters
    const totalItemsEl = document.getElementById('totalItems');
    const totalTypesEl = document.getElementById('totalTypes');
    if (totalItemsEl) totalItemsEl.textContent = totalItems;
    if (totalTypesEl) totalTypesEl.textContent = totalTypes;
    
    // Update item counts
    for (const itemType in selectedItems) {
        const countElement = document.getElementById(itemType + 'SelCount');
        if (countElement) {
            countElement.textContent = selectedItems[itemType] || 0;
            
            // Update button state
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
    
    // Also update for items with 0 count (remove selection)
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
    
    // Update preview
    updateSelectedPreview();
    
    // Update start button state
    const startBtn = document.getElementById('startGameBtn');
    if (startBtn) {
        if (totalItems === 0) {
            startBtn.disabled = false; // Can start with 0 items
            startBtn.textContent = "START MISSION";
        } else {
            startBtn.disabled = false;
            startBtn.textContent = "START MISSION";
        }
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
    
    // Add selected items
    for (const itemType in selectedItems) {
        const count = selectedItems[itemType];
        if (count > 0) {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'selected-item-preview';
            itemDiv.onclick = () => removeItem(itemType);
            
            // Get item info
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

// Start game
function startGame() {
    console.log("Starting game...");
    console.log("Map size:", mapSize);
    console.log("Guard count:", guardCount);
    console.log("Selected items:", selectedItems);
    
    // Set global variables
    window.mapDim = mapSize;
    window.guardCount = guardCount;
    window.selectedItemsForGame = { ...selectedItems };
    
    // Hide all menus
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('itemSelection').classList.add('hidden');
    document.getElementById('tutorialScreen').classList.add('hidden');
    
    // Initialize game
    if (typeof initGame === 'function') {
        initGame();
    } else {
        console.error("initGame function not found!");
        alert("Game initialization error!");
    }
}

// ============================================
// CORE MAIN - ENGINE SETUP & GAME LOOP
// ============================================

const TILE = 60;
const FLOOR = 0, WALL = 1, HIDE = 2, EXIT = 3, COIN = 5, TRAP = 6, RICE = 7, BOMB = 8, GAS = 9;

// Global game state
let grid, player, enemies = [], activeBombs = [], activeGas = [], turnCount = 1;
let selectMode = 'move', gameOver = false, playerTurn = true, shake = 0, mapDim = 12;
let stats = { kills: 0, coins: 0, itemsUsed: 0, timesSpotted: 0, stealthKills: 0, timeBonus: 0 };
let inv = { trap: 0, rice: 0, bomb: 0, gas: 0, health: 0, coin: 0, sight: 0, mark: 0 };
let camX = 0, camY = 0, zoom = 1.0;
let showMinimap = false;
let showHighlights = true;
let showLog = false;
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
let dragStartX = 0, dragStartY = 0;

// Player stats
let playerHP = 10;
let playerMaxHP = 10;

// VFX Systems
let particles = [];
let bloodStains = [];
let coinPickupEffects = [];
let hideEffects = [];
let explosionEffects = [];
let footstepEffects = [];
let damageEffects = [];
let speechBubbles = [];
let gasEffects = [];

// Canvas and rendering
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const sprites = {};

// Audio context for programmatic SFX
let audioContext;
let gainNode;

// Mode colors for highlighting
const modeColors = {
    'move': { fill: 'rgba(0, 210, 255, 0.15)', border: 'rgba(0, 210, 255, 0.7)', glow: 'rgba(0, 210, 255, 0.3)' },
    'trap': { fill: 'rgba(255, 100, 100, 0.15)', border: 'rgba(255, 100, 100, 0.7)', glow: 'rgba(255, 100, 100, 0.3)' },
    'rice': { fill: 'rgba(255, 255, 100, 0.15)', border: 'rgba(255, 255, 100, 0.7)', glow: 'rgba(255, 255, 100, 0.3)' },
    'bomb': { fill: 'rgba(255, 50, 150, 0.15)', border: 'rgba(255, 50, 150, 0.7)', glow: 'rgba(255, 50, 150, 0.3)' },
    'gas': { fill: 'rgba(153, 50, 204, 0.15)', border: 'rgba(153, 50, 204, 0.7)', glow: 'rgba(153, 50, 204, 0.3)' },
    'attack': { fill: 'rgba(255, 0, 0, 0.3)', border: 'rgba(255, 0, 0, 0.8)', glow: 'rgba(255, 0, 0, 0.5)' }
};

// Enemy types with distinct colors
const ENEMY_TYPES = {
    NORMAL: { range: 1, hp: 10, speed: 0.08, damage: 2, color: '#ff3333', tint: 'rgba(255, 50, 50, 0.3)' },
    ARCHER: { range: 3, hp: 8, speed: 0.06, damage: 1, color: '#33cc33', tint: 'rgba(50, 255, 50, 0.3)' },
    SPEAR: { range: 2, hp: 12, speed: 0.07, damage: 3, color: '#3366ff', tint: 'rgba(50, 100, 255, 0.3)' }
};

// ============================================
// INITIALIZATION
// ============================================

function initGame() {
    // Get values from menu system
    mapDim = window.mapDim || 12;
    const guardCount = window.guardCount || 5;
    
    // Set inventory from selected items
    if (window.selectedItemsForGame) {
        inv = { ...inv, ...window.selectedItemsForGame };
        console.log("Inventory set from menu:", inv);
    }
    
    hasReachedExit = false;
    playerHP = playerMaxHP;
    combatSequence = false;
    playerHasMovedThisTurn = false;
    playerUsedActionThisTurn = false;
    startTime = Date.now();
    stats = { kills: 0, coins: 0, itemsUsed: 0, timesSpotted: 0, stealthKills: 0, timeBonus: 0 };
    
    particles = [];
    bloodStains = [];
    coinPickupEffects = [];
    hideEffects = [];
    explosionEffects = [];
    footstepEffects = [];
    damageEffects = [];
    speechBubbles = [];
    gasEffects = [];
    
    showHighlights = true;
    showLog = false;
    currentTurnEntity = player;
    cameraFocusEnabled = true;
    isUserDragging = false;
    
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('toolbar').classList.remove('hidden');
    document.getElementById('ui-controls').classList.remove('hidden');
    document.getElementById('playerStatus').classList.remove('hidden');
    
    // Hide result screens
    document.getElementById('resultScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    
    generateLevel(guardCount);
    centerCamera();
    updateToolCounts();
    
    requestAnimationFrame(gameLoop);
}

function generateLevel(guardCount) {

   // === ADD THIS CODE AT THE VERY START ===
    if (window.USE_CUSTOM_MAP && window.customMapData) {
        console.log("Loading custom map:", window.customMapData.name);
        
        // Use custom map dimensions
        mapDim = window.customMapData.width || 12;
        
        // Use custom grid
        grid = window.customMapData.grid;
        
        // Place player
        if (window.customMapData.player) {
            player.x = window.customMapData.player.x;
            player.y = window.customMapData.player.y;
            player.ax = player.x;
            player.ay = player.y;
        } else {
            player.x = player.y = 1;
            player.ax = player.ay = 1;
        }
        
        // Place exit
        if (window.customMapData.exit) {
            // Find and set exit in grid
            const exitValue = 3; // Your EXIT constant
            grid[window.customMapData.exit.y][window.customMapData.exit.x] = exitValue;
        }
        
        // Create enemies from custom data
        enemies = [];
        if (window.customMapData.enemies) {
            window.customMapData.enemies.forEach(e => {
                // Convert JSON enemy data to your enemy format
                // You'll need to match your enemy object structure
                const enemyType = e.type || 'NORMAL';
                const stats = ENEMY_TYPES[enemyType] || ENEMY_TYPES.NORMAL;
                
                enemies.push({
                    x: e.x, y: e.y,
                    ax: e.x, ay: e.y,
                    dir: e.direction || {x: 1, y: 0},
                    alive: true,
                    hp: stats.hp,
                    maxHP: stats.hp,
                    type: enemyType,
                    attackRange: stats.range,
                    damage: stats.damage,
                    speed: stats.speed,
                    visionRange: 3,
                    state: 'patrolling',
                    // ... other enemy properties ...
                    color: stats.color,
                    tint: stats.tint
                });
            });
        }
        
        // Clear the flag so next game uses random generator
        window.USE_CUSTOM_MAP = false;
        return; // Skip the rest of the random generation
    }
    // === END OF ADDED CODE ===
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
        
        const visionRange = 3;
        
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
            visionRange: visionRange,
            state: 'patrolling',
            investigationTarget: null,
            investigationTurns: 0,
            poisonTimer: 0,
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
// SPRITE LOADING
// ============================================

function loadSprites() {
    const assetNames = ['player', 'guard', 'wall', 'floor', 'exit', 'trap', 'rice', 'bomb', 'coin', 'hide'];
    assetNames.forEach(n => {
        const img = new Image();
        img.src = `sprites/${n}.png`;
        img.onload = () => { sprites[n] = img; };
        img.onerror = () => {
            // Create placeholder
            const canvas = document.createElement('canvas');
            canvas.width = TILE;
            canvas.height = TILE;
            const ctx = canvas.getContext('2d');
            
            ctx.fillStyle = '#666';
            ctx.fillRect(0, 0, TILE, TILE);
            
            if(n === 'player') {
                ctx.fillStyle = '#00d2ff';
                ctx.beginPath();
                ctx.arc(TILE/2, TILE/2, TILE/3, 0, Math.PI * 2);
                ctx.fill();
            } else if(n === 'guard') {
                ctx.fillStyle = '#ff3333';
                ctx.beginPath();
                ctx.arc(TILE/2, TILE/2, TILE/3, 0, Math.PI * 2);
                ctx.fill();
            } else if(n === 'coin') {
                ctx.fillStyle = '#ffd700';
                ctx.beginPath();
                ctx.arc(TILE/2, TILE/2, TILE/3, 0, Math.PI * 2);
                ctx.fill();
            } else if(n === 'exit') {
                ctx.fillStyle = '#00ff00';
                ctx.fillRect(5, 5, TILE-10, TILE-10);
            } else if(n === 'trap') {
                ctx.fillStyle = '#ff6666';
                ctx.fillRect(10, 10, TILE-20, TILE-20);
            } else if(n === 'rice') {
                ctx.fillStyle = '#ffff66';
                ctx.fillRect(15, 15, TILE-30, TILE-30);
            } else if(n === 'bomb') {
                ctx.fillStyle = '#ff3399';
                ctx.beginPath();
                ctx.arc(TILE/2, TILE/2, TILE/3, 0, Math.PI * 2);
                ctx.fill();
            } else if(n === 'hide') {
                ctx.fillStyle = '#3333aa';
                ctx.fillRect(0, 0, TILE, TILE);
            }
            
            sprites[n] = canvas;
        };
    });
}

// ============================================
// RENDERING ENGINE
// ============================================

function drawSprite(n, x, y) { 
    if(sprites[n]) {
        ctx.drawImage(sprites[n], x*TILE, y*TILE, TILE, TILE);
    } else {
        // Fallback rendering
        ctx.fillStyle = '#444';
        ctx.fillRect(x*TILE, y*TILE, TILE, TILE);
    }
}

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
        for(let y=0; y<mapDim; y++) {
            for(let x=0; x<mapDim; x++) {
                drawSprite('floor', x, y);
                const c = grid[y][x];
                if(c !== FLOOR) {
                    const spriteMap = ['','wall','hide','exit','','coin','trap','rice','bomb','gas'];
                    drawSprite(spriteMap[c] || '', x, y);
                }
            }
        }

        // Draw gas clouds
        activeGas.forEach(g => {
            drawGasEffect(g.x, g.y, g.t);
        });

        // Draw highlights during player turn (only if not moved yet)
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
            
            // Draw enemy tint
            if(e.isSleeping) {
                ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
            } else {
                ctx.fillStyle = e.tint;
            }
            ctx.fillRect(e.ax * TILE, e.ay * TILE, TILE, TILE);
            
            // Draw health bar
            const healthPercent = e.hp / e.maxHP;
            ctx.fillStyle = healthPercent > 0.5 ? "#0f0" : healthPercent > 0.25 ? "#ff0" : "#f00";
            ctx.fillRect(e.ax * TILE + 5, e.ay * TILE - 8, (TILE - 10) * healthPercent, 4);
            ctx.strokeStyle = "#333";
            ctx.lineWidth = 1;
            ctx.strokeRect(e.ax * TILE + 5, e.ay * TILE - 8, TILE - 10, 4);
            
            // Draw HP text
            ctx.fillStyle = "#fff";
            ctx.font = "bold 10px monospace";
            ctx.textAlign = "center";
            ctx.fillText(e.hp.toString(), e.ax * TILE + TILE/2, e.ay * TILE - 4);
            
            // Draw type indicator
            ctx.fillStyle = e.isSleeping ? "#888" : e.color;
            ctx.font = "bold 8px monospace";
            ctx.textAlign = "left";
            ctx.fillText(e.type.charAt(0), e.ax * TILE + 3, e.ay * TILE + 10);
            
            // Draw state tint
            if(!e.isSleeping) {
                if(e.state === 'alerted' || e.state === 'chasing') {
                    ctx.fillStyle = "rgba(255, 50, 50, 0.3)";
                    ctx.fillRect(e.ax * TILE, e.ay * TILE, TILE, TILE);
                } else if(e.state === 'investigating') {
                    ctx.fillStyle = "rgba(255, 200, 50, 0.3)";
                    ctx.fillRect(e.ax * TILE, e.ay * TILE, TILE, TILE);
                } else if(e.state === 'eating') {
                    ctx.fillStyle = "rgba(50, 255, 50, 0.3)";
                    ctx.fillRect(e.ax * TILE, e.ay * TILE, TILE, TILE);
                }
            }
            
            // Draw sprite
            drawSprite('guard', e.ax, e.ay);
            
            // Draw vision cone (visual only)
            if(!player.isHidden && e.state !== 'dead' && !e.isSleeping) {
                drawVisionConeVisual(e);
            }
        });

        // Draw VFX
        drawVFX();

        // Draw player health bar
        const playerHealthPercent = playerHP / playerMaxHP;
        ctx.fillStyle = playerHealthPercent > 0.5 ? "#0f0" : playerHealthPercent > 0.25 ? "#ff0" : "#f00";
        ctx.fillRect(player.ax * TILE + 5, player.ay * TILE - 8, (TILE - 10) * playerHealthPercent, 4);

        // Draw player with shadow
        ctx.shadowColor = player.isHidden ? 'rgba(0, 210, 255, 0.5)' : 'rgba(255, 255, 255, 0.3)';
        ctx.shadowBlur = 15;
        drawSprite('player', player.ax, player.ay);
        ctx.shadowBlur = 0;

        // Draw bombs
        activeBombs.forEach(b => {
            drawSprite('bomb', b.x, b.y);
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
        
        // Camera focus on current turn entity (only if not dragging)
        if(currentTurnEntity && cameraFocusEnabled && !isUserDragging) {
            const targetX = (canvas.width/2) - (currentTurnEntity.ax*TILE + TILE/2)*zoom;
            const targetY = (canvas.height/2) - (currentTurnEntity.ay*TILE + TILE/2)*zoom;
            camX += (targetX - camX) * 0.05; // Slower camera movement
            camY += (targetY - camY) * 0.05;
        }
        
        shake *= 0.8;
        requestAnimationFrame(gameLoop);
    } catch (error) {
        console.error("Error in game loop:", error);
    }
}

function drawTileHighlight(x, y, colorSet, pulse = true) {
    const time = Date.now() / 1000;
    const pulseFactor = pulse ? (Math.sin(time * 6) * 0.1 + 0.9) : 1;
    
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

function drawGasEffect(x, y, timer) {
    const alpha = 0.3 + 0.2 * Math.sin(Date.now() / 500);
    ctx.fillStyle = `rgba(153, 50, 204, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x*TILE + TILE/2, y*TILE + TILE/2, TILE * 1.2, 0, Math.PI * 2); // Bigger than bomb
    ctx.fill();
    
    ctx.fillStyle = "#fff";
    ctx.font = "bold 20px monospace";
    ctx.textAlign = "center";
    ctx.fillText(timer.toString(), x*TILE + TILE/2, y*TILE + TILE/2 + 7);
}

function drawVisionConeVisual(e) {
    const drawRange = 3;
    const baseA = Math.atan2(e.dir.y, e.dir.x);
    const visionAngle = Math.PI / 3;
    
    ctx.save();
    ctx.translate(e.ax * TILE + 30, e.ay * TILE + 30);
    ctx.rotate(baseA);
    
    // Draw cone fill
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
    
    // Draw ONLY SIDE outlines
    ctx.strokeStyle = e.state === 'alerted' || e.state === 'chasing' ? 
                     '#ff0000' : 
                     e.state === 'investigating' ?
                     '#ff9900' :
                     '#ff6666';
    ctx.lineWidth = 2;
    
    // Left side line
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(visionAngle) * drawRange * TILE, Math.sin(visionAngle) * drawRange * TILE);
    ctx.stroke();
    
    // Right side line
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(-visionAngle) * drawRange * TILE, Math.sin(-visionAngle) * drawRange * TILE);
    ctx.stroke();
    
    // Arc connecting the sides
    ctx.beginPath();
    ctx.arc(0, 0, drawRange * TILE, -visionAngle, visionAngle);
    ctx.stroke();
    
    ctx.restore();
}

function drawMinimap() {
    ctx.setTransform(1,0,0,1,0,0);
    const ms = 5;
    const mx = canvas.width - mapDim * ms - 20;
    const my = 75;
    
    ctx.fillStyle = "rgba(0,0,0,0.85)";
    ctx.fillRect(mx-5, my, mapDim*ms+10, mapDim*ms+10);
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 1;
    ctx.strokeRect(mx-5, my, mapDim*ms+10, mapDim*ms+10);
    
    for(let y=0; y<mapDim; y++) {
        for(let x=0; x<mapDim; x++) {
            if(grid[y][x] === WALL) {
                ctx.fillStyle = "#666";
                ctx.fillRect(mx + x*ms, my + 5 + y*ms, ms, ms);
            } else if(grid[y][x] === EXIT) {
                ctx.fillStyle = "#0f0";
                ctx.fillRect(mx + x*ms, my + 5 + y*ms, ms, ms);
            }
        }
    }
    
    ctx.fillStyle = "#00d2ff";
    ctx.beginPath();
    ctx.arc(mx + player.x*ms + ms/2, my + 5 + player.y*ms + ms/2, ms/2, 0, Math.PI*2);
    ctx.fill();
    
    enemies.filter(e => e.alive).forEach(e => {
        let enemyColor;
        if(e.isSleeping) {
            enemyColor = "#888";
        } else if(e.state === 'alerted' || e.state === 'chasing') {
            enemyColor = e.color;
        } else if(e.state === 'investigating') {
            enemyColor = "#ff9900";
        } else if(e.state === 'eating') {
            enemyColor = "#00ff00";
        } else {
            enemyColor = e.color;
        }
        ctx.fillStyle = enemyColor;
        ctx.fillRect(mx + e.x*ms, my + 5 + e.y*ms, ms, ms);
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
        dragStartX = lastTouch.x;
        dragStartY = lastTouch.y;
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
    dragStartX = e.clientX;
    dragStartY = e.clientY;
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
        
        if(Math.random() < 0.3 && obj === player) {
            createFootstepEffect(sx + (tx - sx) * p, sy + (ty - sy) * p);
        }
        
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
        
        if(tx < 0 || tx >= mapDim || ty < 0 || ty >= mapDim) return false;
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
// TENCHU-STYLE VICTORY STATS (UPDATED)
// ============================================

function showTenchuStyleVictoryStats() {
    const statsTable = document.getElementById('statsTable');
    const rankLabel = document.getElementById('rankLabel');
    const missionTime = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(missionTime / 60);
    const seconds = missionTime % 60;
    
    // Calculate score based on Tenchu-style scoring (BALANCED)
    let score = 1000; // Base score - ensures never zero
    
    // Time bonus (faster = more points, but not too punishing)
    const maxTimeBonus = 5000;
    const timePenaltyPerSecond = 5; // Reduced from 20
    const timeBonus = Math.max(0, maxTimeBonus - (missionTime * timePenaltyPerSecond));
    stats.timeBonus = Math.floor(timeBonus);
    score += stats.timeBonus;
    
    // Kills (normal kills are good)
    const killPoints = stats.kills * 300; // Increased from 200
    score += killPoints;
    
    // Stealth kills bonus (BETTER than normal kills)
    const stealthBonus = stats.stealthKills * 800; // Increased from 500
    score += stealthBonus;
    
    // Coins
    const coinPoints = stats.coins * 150; // Increased from 100
    score += coinPoints;
    
    // SMALL PENALTY for being spotted (not too harsh)
    const spottedPenalty = stats.timesSpotted * 200; // Reduced from 1000
    score = Math.max(500, score - spottedPenalty); // Minimum 500
    
    // NO PENALTY for items used - items are tactical tools!
    // BONUS for not using items (stealthy approach)
    const itemBonus = (10 - Math.min(stats.itemsUsed, 10)) * 100; // Bonus for using fewer items
    score += itemBonus;
    
    // Tenchu-style rankings (like Tenchu: Stealth Assassins)
    let rank = "THUG";
    let rankDescription = "";
    let rankColor = "#888";
    let rankIcon = "🥷";
    
    if(score >= 20000) {
        rank = "GRAND MASTER";
        rankDescription = "Flawless execution. A true shadow warrior.";
        rankColor = "#ff3333";
        rankIcon = "👑";
    } else if(score >= 15000) {
        rank = "MASTER NINJA";
        rankDescription = "Superior technique and perfect stealth.";
        rankColor = "#c0c0c0";
        rankIcon = "🥷";
    } else if(score >= 12000) {
        rank = "EXPERT ASSASSIN";
        rankDescription = "Skilled infiltration with few mistakes.";
        rankColor = "#cd7f32";
        rankIcon = "🗡️";
    } else if(score >= 9000) {
        rank = "ASSASSIN";
        rankDescription = "Effective and deadly.";
        rankColor = "#00ff00";
        rankIcon = "⚔️";
    } else if(score >= 6000) {
        rank = "SHINOBI";
        rankDescription = "Competent shadow warrior.";
        rankColor = "#44aaff";
        rankIcon = "👤";
    } else if(score >= 3000) {
        rank = "RONIN";
        rankDescription = "Adept but unrefined.";
        rankColor = "#ffaa00";
        rankIcon = "🛡️";
    } else {
        rank = "THUG";
        rankDescription = "Brute force over finesse.";
        rankColor = "#ff4444";
        rankIcon = "👣";
    }
    
    // Set rank text
    rankLabel.innerHTML = `${rankIcon} ${rank}`;
    rankLabel.style.color = rankColor;
    rankLabel.style.textShadow = `0 0 10px ${rankColor}`;
    
    // Show detailed stats in Tenchu style
    statsTable.innerHTML = `
        <div class="stat-row">
            <span class="stat-label">MISSION TIME</span>
            <span class="stat-value">${minutes}:${seconds.toString().padStart(2, '0')}</span>
            <span class="stat-points">+${stats.timeBonus.toLocaleString()}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">GUARDS ELIMINATED</span>
            <span class="stat-value">${stats.kills}</span>
            <span class="stat-points">+${killPoints.toLocaleString()}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">STEALTH KILLS</span>
            <span class="stat-value">${stats.stealthKills}</span>
            <span class="stat-points" style="color: #00ff00;">+${stealthBonus.toLocaleString()}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">GOLD COLLECTED</span>
            <span class="stat-value">${stats.coins}</span>
            <span class="stat-points">+${coinPoints.toLocaleString()}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">TIMES SPOTTED</span>
            <span class="stat-value">${stats.timesSpotted}</span>
            <span class="stat-points" style="color: #ff4444;">-${spottedPenalty.toLocaleString()}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">ITEMS USED</span>
            <span class="stat-value">${stats.itemsUsed}</span>
            <span class="stat-points" style="color: #44aaff;">+${itemBonus.toLocaleString()}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-row">
            <span class="stat-label">STEALTH BONUS</span>
            <span class="stat-value"></span>
            <span class="stat-points" style="color: #00ff00;">+${itemBonus.toLocaleString()}</span>
        </div>
        <div class="stat-row total">
            <span class="stat-label">TOTAL SCORE</span>
            <span class="stat-value"></span>
            <span class="stat-points" style="color: ${rankColor}; font-size: 18px; font-weight: bold;">${score.toLocaleString()}</span>
        </div>
        <div class="rank-description" style="color: ${rankColor}; margin-top: 15px; font-style: italic; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 5px;">
            ${rankDescription}
        </div>
    `;
}

// ============================================
// INITIALIZATION ON LOAD
// ============================================

window.addEventListener('load', () => {
    loadSprites();
    initAudio();
    initMenu(); // Initialize menu on load
});

// Export functions
window.animMove = animMove;
window.log = log;
window.processCombatSequence = processCombatSequence;
window.hasLineOfSight = hasLineOfSight;
window.createSpeechBubble = createSpeechBubble;
window.createFootstepEffect = createFootstepEffect;
window.createDeathEffect = createDeathEffect;
window.createExplosionEffect = createExplosionEffect;
window.createCoinPickupEffect = createCoinPickupEffect;
window.createHideEffect = createHideEffect;
window.createTrapEffect = createTrapEffect;
window.createAlertEffect = createAlertEffect;
window.createDamageEffect = createDamageEffect;
window.playSound = playSound;
window.autoSwitchToMove = autoSwitchToMove;
window.setMode = setMode;
window.playerWait = playerWait;
window.wait = wait;
window.initGame = initGame;
window.toggleMinimap = toggleMinimap;

// Export menu functions
window.changeMapSize = changeMapSize;
window.changeGuardCount = changeGuardCount;
window.toggleItem = toggleItem;
window.removeItem = removeItem;
window.showItemSelection = showItemSelection;
window.backToMainMenu = backToMainMenu;
window.showTutorial = showTutorial;
window.hideTutorial = hideTutorial;
window.startGame = startGame;
window.initMenu = initMenu;