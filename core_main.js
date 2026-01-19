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
let showMinimap = false, showHighlights = true, showLog = false;
let highlightedTiles = [], hasReachedExit = false, currentEnemyTurn = null;
let combatSequence = false, startTime = 0, currentTurnEntity = null;
let playerHasMovedThisTurn = false, playerUsedActionThisTurn = false;
let cameraFocusEnabled = true, isUserDragging = false, dragStartX = 0, dragStartY = 0;

// Player stats
let playerHP = 10, playerMaxHP = 10;

// VFX Systems
let particles = [], bloodStains = [], coinPickupEffects = [], hideEffects = [];
let explosionEffects = [], footstepEffects = [], damageEffects = [], speechBubbles = [], gasEffects = [];

// Canvas and rendering
let canvas, ctx;
const sprites = {};

const modeColors = {
    'move': { fill: 'rgba(0, 210, 255, 0.15)', border: 'rgba(0, 210, 255, 0.7)', glow: 'rgba(0, 210, 255, 0.3)' },
    'trap': { fill: 'rgba(255, 100, 100, 0.15)', border: 'rgba(255, 100, 100, 0.7)', glow: 'rgba(255, 100, 100, 0.3)' },
    'rice': { fill: 'rgba(255, 255, 100, 0.15)', border: 'rgba(255, 255, 100, 0.7)', glow: 'rgba(255, 255, 100, 0.3)' },
    'bomb': { fill: 'rgba(255, 50, 150, 0.15)', border: 'rgba(255, 50, 150, 0.7)', glow: 'rgba(255, 50, 150, 0.3)' },
    'gas': { fill: 'rgba(153, 50, 204, 0.15)', border: 'rgba(153, 50, 204, 0.7)', glow: 'rgba(153, 50, 204, 0.3)' },
    'attack': { fill: 'rgba(255, 0, 0, 0.3)', border: 'rgba(255, 0, 0, 0.8)', glow: 'rgba(255, 0, 0, 0.5)' }
};

const ENEMY_TYPES = {
    NORMAL: { range: 1, hp: 10, speed: 0.08, damage: 2, color: '#ff3333', tint: 'rgba(255, 50, 50, 0.3)' },
    ARCHER: { range: 3, hp: 8, speed: 0.06, damage: 1, color: '#33cc33', tint: 'rgba(50, 255, 50, 0.3)' },
    SPEAR: { range: 2, hp: 12, speed: 0.07, damage: 3, color: '#3366ff', tint: 'rgba(50, 100, 255, 0.3)' }
};

// ============================================
// INITIALIZATION
// ============================================

function initGame() {
    canvas = document.getElementById('game');
    ctx = canvas.getContext('2d');
    
    mapDim = window.mapDim || 12;
    const guardCountSetting = window.guardCount || 5;
    
    if (window.selectedItemsForGame) {
        inv = { ...inv, ...window.selectedItemsForGame };
    }
    
    hasReachedExit = false;
    playerHP = playerMaxHP;
    gameOver = false;
    
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('itemSelection').classList.add('hidden');
    document.getElementById('toolbar').classList.remove('hidden');
    document.getElementById('ui-controls').classList.remove('hidden');
    document.getElementById('playerStatus').classList.remove('hidden');
    
    generateLevel(guardCountSetting);
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
    
    const gc = Math.min(15, Math.max(1, guardCount));
    enemies = [];
    for(let i=0; i<gc; i++){
        let ex, ey; 
        do { 
            ex = Math.floor(Math.random()*(mapDim-2))+1; 
            ey = Math.floor(Math.random()*(mapDim-2))+1; 
        } while(grid[ey][ex] !== FLOOR || Math.hypot(ex-player.x, ey-player.y) < 4);
        
        enemies.push({
            x: ex, y: ey, ax: ex, ay: ey, dir: {x: 1, y: 0}, alive: true,
            hp: 10, maxHP: 10, type: 'NORMAL', visionRange: 3, tint: 'rgba(255, 50, 50, 0.3)'
        });
    }
}

function loadSprites() {
    const assetNames = ['player', 'guard', 'wall', 'floor', 'exit', 'trap', 'rice', 'bomb', 'coin', 'hide'];
    assetNames.forEach(n => {
        const img = new Image();
        img.src = `sprites/${n}.png`;
        img.onload = () => { sprites[n] = img; };
        img.onerror = () => {
            const cTemp = document.createElement('canvas');
            cTemp.width = TILE; cTemp.height = TILE;
            const tCtx = cTemp.getContext('2d');
            tCtx.fillStyle = '#444'; tCtx.fillRect(0, 0, TILE, TILE);
            sprites[n] = cTemp;
        };
    });
}

function gameLoop() {
    if(gameOver || !ctx) return;
    
    ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle = "#111"; 
    ctx.fillRect(0,0,canvas.width,canvas.height);
    
    ctx.translate(camX, camY);
    ctx.scale(zoom, zoom);

    for(let y=0; y<mapDim; y++) {
        for(let x=0; x<mapDim; x++) {
            if(sprites['floor']) ctx.drawImage(sprites['floor'], x*TILE, y*TILE, TILE, TILE);
            const c = grid[y][x];
            if(c !== FLOOR) {
                const spriteMap = ['','wall','hide','exit','','coin','trap','rice','bomb','gas'];
                const sn = spriteMap[c];
                if(sprites[sn]) ctx.drawImage(sprites[sn], x*TILE, y*TILE, TILE, TILE);
            }
        }
    }

    enemies.forEach(e => {
        if(!e.alive) return;
        ctx.fillStyle = e.tint; ctx.fillRect(e.ax * TILE, e.ay * TILE, TILE, TILE);
        if(sprites['guard']) ctx.drawImage(sprites['guard'], e.ax*TILE, e.ay*TILE, TILE, TILE);
    });

    if(sprites['player']) ctx.drawImage(sprites['player'], player.ax*TILE, player.ay*TILE, TILE, TILE);

    requestAnimationFrame(gameLoop);
}

function centerCamera() {
    if(!canvas) return;
    camX = (canvas.width/2) - (player.x*TILE + TILE/2)*zoom;
    camY = (canvas.height/2) - (player.y*TILE + TILE/2)*zoom;
}

function updateToolCounts() {
    const tools = ['trap', 'rice', 'bomb', 'gas'];
    tools.forEach(t => {
        let el = document.getElementById(t + 'Count');
        if(el) el.textContent = inv[t];
    });
}

// ============================================
// MENU LOGIC
// ============================================

let selectedItems = { trap: 0, rice: 0, bomb: 0, gas: 0 };
let mapSizeSetting = 12;
let guardCountSetting = 5;

function changeMapSize(delta) {
    mapSizeSetting = Math.max(8, Math.min(20, mapSizeSetting + delta));
    document.getElementById('mapSizeValue').textContent = mapSizeSetting;
    window.mapDim = mapSizeSetting;
}

function changeGuardCount(delta) {
    guardCountSetting = Math.max(1, Math.min(15, guardCountSetting + delta));
    document.getElementById('guardCountValue').textContent = guardCountSetting;
    window.guardCount = guardCountSetting;
}

function showItemSelection() {
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('itemSelection').classList.remove('hidden');
    updateSelectionDisplay();
}

function backToMainMenu() {
    document.getElementById('itemSelection').classList.add('hidden');
    document.getElementById('mainMenu').classList.remove('hidden');
}

function toggleItem(itemType) {
    let total = Object.values(selectedItems).reduce((a, b) => a + b, 0);
    let types = Object.values(selectedItems).filter(v => v > 0).length;

    if (selectedItems[itemType] > 0) {
        if (selectedItems[itemType] < 3 && total < 5) selectedItems[itemType]++;
        else if (selectedItems[itemType] >= 3) removeItem(itemType);
    } else {
        if (total < 5 && types < 3) selectedItems[itemType] = 1;
    }
    updateSelectionDisplay();
}

function removeItem(itemType) {
    selectedItems[itemType] = 0;
    updateSelectionDisplay();
}

function updateSelectionDisplay() {
    let total = 0, types = 0;
    for (let k in selectedItems) {
        if (selectedItems[k] > 0) { total += selectedItems[k]; types++; }
        let el = document.getElementById(k + 'SelCount');
        if (el) el.textContent = selectedItems[k];
    }
    document.getElementById('totalItems').textContent = total;
    document.getElementById('totalTypes').textContent = types;
    
    const preview = document.getElementById('selectedPreview');
    preview.innerHTML = '';
    let hasAny = false;
    for (let k in selectedItems) {
        if (selectedItems[k] > 0) {
            hasAny = true;
            preview.innerHTML += `<div class="selected-item-preview" onclick="removeItem('${k}')">${k} x${selectedItems[k]}</div>`;
        }
    }
    if (!hasAny) preview.innerHTML = '<div class="empty-preview">Select Tools</div>';
}

function startGame() {
    window.selectedItemsForGame = { ...selectedItems };
    initGame();
}

function showTutorial() { document.getElementById('tutorialScreen').classList.remove('hidden'); }
function hideTutorial() { document.getElementById('tutorialScreen').classList.add('hidden'); }

// Bindings
window.addEventListener('load', loadSprites);
window.changeMapSize = changeMapSize;
window.changeGuardCount = changeGuardCount;
window.showItemSelection = showItemSelection;
window.backToMainMenu = backToMainMenu;
window.toggleItem = toggleItem;
window.removeItem = removeItem;
window.startGame = startGame;
window.showTutorial = showTutorial;
window.hideTutorial = hideTutorial;
window.centerCamera = centerCamera;
