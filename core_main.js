/**
 * CORE_MAIN.JS - Simplified Integrated Version
 */

// --- Constants & Config ---
const TILE_SIZE = 64;
const WALL = 1, FLOOR = 0, HIDE = 2, EXIT = 3;

// --- Global State ---
let canvas, ctx;
let mapDim = 20;
let grid = [];
let player = { 
    x: 1, y: 1, hp: 100, maxHp: 100, coins: 0,
    inventory: { 
        trap: 0, rice: 0, bomb: 3, gas: 2, 
        health: 0, coin: 0, sight: 0, mark: 0 
    },
    isHidden: false,
    ax: 1, ay: 1,
    dir: {x: 0, y: 0}
};
let enemies = [];
let items = [];
let activeBombs = [];
let activeGas = [];
let turnCount = 0;
let gameActive = false;
let playerTurn = true;
let camX = 0, camY = 0;
let selectMode = 'move';
let showMinimap = false;
let highlightedTiles = [];
let zoom = 1.0;
let isUserDragging = false;

// --- Initialization Functions ---

function initGame(levelFile) {
    console.log("Loading level:", levelFile);
    
    // Create a simple default map for testing
    createDefaultMap();
    
    // Setup player
    player = { 
        x: 1, y: 1, hp: 100, maxHp: 100, coins: 0,
        inventory: { trap: 3, rice: 2, bomb: 3, gas: 2, health: 2, coin: 0, sight: 0, mark: 0 },
        isHidden: false,
        ax: 1, ay: 1,
        dir: {x: 0, y: 0}
    };
    
    // Create some enemies
    enemies = [];
    enemies.push(new Enemy(5, 5, 'NORMAL'));
    enemies.push(new Enemy(8, 3, 'ARCHER'));
    enemies.push(new Enemy(3, 8, 'SPEAR'));
    
    // Create some items
    items = [
        { x: 3, y: 3, type: 'coin', value: 10 },
        { x: 7, y: 7, type: 'coin', value: 10 },
        { x: 10, y: 10, type: 'health', value: 3 }
    ];
    
    // Setup canvas
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();
    
    // Hide menus and show game UI
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('itemSelection').classList.add('hidden');
    document.getElementById('gameUI').classList.remove('hidden');
    document.getElementById('toolbar').classList.remove('hidden');
    document.getElementById('playerStatus').classList.remove('hidden');
    document.getElementById('ui-controls').classList.remove('hidden');
    document.getElementById('missionLog').classList.remove('hidden');
    
    // Add initial log entry
    addLogEntry("Mission started. Good luck, ninja!", "success");
    
    gameActive = true;
    playerTurn = true;
    
    // Start game loop
    requestAnimationFrame(gameLoop);
}

function initCustomGame(params) {
    console.log("Starting custom game with params:", params);
    
    // Create map based on custom size
    mapDim = params.mapSize || 12;
    createDefaultMap();
    
    // Setup player with selected items
    player = { 
        x: 1, y: 1, hp: 100, maxHp: 100, coins: 0,
        inventory: params.items || { trap: 0, rice: 0, bomb: 0, gas: 0, health: 0, coin: 0, sight: 0, mark: 0 },
        isHidden: false,
        ax: 1, ay: 1,
        dir: {x: 0, y: 0}
    };
    
    // Create enemies based on guard count
    enemies = [];
    const guardCount = params.guardCount || 5;
    const enemyTypes = ['NORMAL', 'ARCHER', 'SPEAR'];
    
    for (let i = 0; i < guardCount; i++) {
        const x = Math.floor(Math.random() * (mapDim - 4)) + 2;
        const y = Math.floor(Math.random() * (mapDim - 4)) + 2;
        const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
        enemies.push(new Enemy(x, y, type));
    }
    
    // Create some items
    items = [];
    for (let i = 0; i < 5; i++) {
        const x = Math.floor(Math.random() * (mapDim - 2)) + 1;
        const y = Math.floor(Math.random() * (mapDim - 2)) + 1;
        items.push({ x, y, type: 'coin', value: 10 });
    }
    
    // Setup canvas
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();
    
    // Hide menus and show game UI
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('itemSelection').classList.add('hidden');
    document.getElementById('gameUI').classList.remove('hidden');
    document.getElementById('toolbar').classList.remove('hidden');
    document.getElementById('playerStatus').classList.remove('hidden');
    document.getElementById('ui-controls').classList.remove('hidden');
    document.getElementById('missionLog').classList.remove('hidden');
    
    // Add initial log entry
    addLogEntry(`Custom mission: ${mapDim}x${mapDim} map, ${guardCount} guards`, "success");
    
    gameActive = true;
    playerTurn = true;
    
    // Start game loop
    requestAnimationFrame(gameLoop);
}

function createDefaultMap() {
    // Create a simple grid with border walls
    grid = [];
    for (let y = 0; y < mapDim; y++) {
        grid[y] = [];
        for (let x = 0; x < mapDim; x++) {
            // Border walls
            if (x === 0 || y === 0 || x === mapDim - 1 || y === mapDim - 1) {
                grid[y][x] = WALL;
            } else {
                // Random walls inside
                if (Math.random() < 0.1 && x > 2 && y > 2 && x < mapDim - 3 && y < mapDim - 3) {
                    grid[y][x] = WALL;
                } else {
                    grid[y][x] = FLOOR;
                }
            }
        }
    }
    
    // Add some hide spots
    for (let i = 0; i < 5; i++) {
        const x = Math.floor(Math.random() * (mapDim - 4)) + 2;
        const y = Math.floor(Math.random() * (mapDim - 4)) + 2;
        if (grid[y][x] === FLOOR) {
            grid[y][x] = HIDE;
        }
    }
    
    // Add exit
    const exitX = mapDim - 2;
    const exitY = mapDim - 2;
    grid[exitY][exitX] = EXIT;
}

// --- ENEMY CLASS ---
class Enemy {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.hp = 100;
        this.maxHp = 100;
        this.alive = true;
        this.color = this.getColor(type);
        this.ax = x;
        this.ay = y;
    }
    
    getColor(type) {
        switch(type) {
            case 'NORMAL': return '#ff3333';
            case 'ARCHER': return '#33cc33';
            case 'SPEAR': return '#3366ff';
            default: return '#ff3333';
        }
    }
    
    draw(ctx) {
        if (!this.alive) return;
        
        // Draw enemy body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(
            this.ax * TILE_SIZE + TILE_SIZE/2,
            this.ay * TILE_SIZE + TILE_SIZE/2,
            TILE_SIZE/3, 0, Math.PI * 2
        );
        ctx.fill();
        
        // Draw health bar
        const healthPercent = this.hp / this.maxHp;
        ctx.fillStyle = healthPercent > 0.5 ? "#0f0" : healthPercent > 0.25 ? "#ff0" : "#f00";
        ctx.fillRect(
            this.ax * TILE_SIZE + 5,
            this.ay * TILE_SIZE - 8,
            (TILE_SIZE - 10) * healthPercent, 4
        );
        
        // Draw enemy type indicator
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        let symbol = '👤';
        if (this.type === 'ARCHER') symbol = '🏹';
        if (this.type === 'SPEAR') symbol = '🔱';
        ctx.fillText(symbol, this.ax * TILE_SIZE + TILE_SIZE/2, this.ay * TILE_SIZE + TILE_SIZE/2 + 5);
    }
    
    update() {
        // Smooth movement animation
        this.ax += (this.x - this.ax) * 0.3;
        this.ay += (this.y - this.ay) * 0.3;
    }
}

// --- Input Handling ---
canvas.addEventListener('click', function(e) {
    if (!gameActive || !playerTurn) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left + camX) / TILE_SIZE);
    const y = Math.floor((e.clientY - rect.top + camY) / TILE_SIZE);
    
    // Check if click is on grid
    if (x < 0 || x >= mapDim || y < 0 || y >= mapDim) return;
    if (grid[y][x] === WALL) return;
    
    const dist = Math.abs(x - player.x) + Math.abs(y - player.y);
    
    // Handle different modes
    if (selectMode === 'move' && dist <= 3) {
        handlePlayerMove(x, y);
    } else if (selectMode === 'attack' && dist === 1) {
        handlePlayerAttack(x, y);
    } else if (selectMode === 'trap' && dist <= 2 && player.inventory.trap > 0) {
        placeTrap(x, y);
    } else if (selectMode === 'bomb' && dist <= 2 && player.inventory.bomb > 0) {
        placeBomb(x, y);
    } else if (selectMode === 'gas' && dist <= 2 && player.inventory.gas > 0) {
        placeGas(x, y);
    } else if (selectMode === 'rice' && dist <= 2 && player.inventory.rice > 0) {
        placeRice(x, y);
    }
});

function handlePlayerMove(x, y) {
    if (!playerTurn) return;
    
    // Check if tile is walkable
    if (grid[y][x] === WALL) {
        addLogEntry("Cannot move through walls!", "warning");
        return;
    }
    
    // Check if enemy is at target
    const enemyAtTarget = enemies.find(e => e.x === x && e.y === y && e.alive);
    if (enemyAtTarget) {
        addLogEntry("Enemy at target position!", "warning");
        return;
    }
    
    playerTurn = false;
    
    // Animate movement
    animateMove(player, x, y, () => {
        player.x = x;
        player.y = y;
        
        // Check for hide spot
        player.isHidden = grid[y][x] === HIDE;
        updateStatusCircle();
        
        // Check for items
        const itemIndex = items.findIndex(item => item.x === x && item.y === y);
        if (itemIndex !== -1) {
            const item = items[itemIndex];
            if (item.type === 'coin') {
                player.coins += item.value;
                addLogEntry(`Collected ${item.value} coins!`, "success");
            } else if (item.type === 'health') {
                player.hp = Math.min(player.maxHp, player.hp + item.value);
                addLogEntry(`Healed ${item.value} HP!`, "success");
            }
            items.splice(itemIndex, 1);
        }
        
        // Check for exit
        if (grid[y][x] === EXIT) {
            victory();
            return;
        }
        
        // End turn after move
        setTimeout(() => endTurn(), 300);
    });
}

function handlePlayerAttack(x, y) {
    const enemy = enemies.find(e => e.x === x && e.y === y && e.alive);
    if (!enemy) {
        addLogEntry("No enemy at target!", "warning");
        return;
    }
    
    playerTurn = false;
    addLogEntry(`Attacking ${enemy.type} enemy!`, "danger");
    
    // Deal damage
    const damage = 25;
    enemy.hp -= damage;
    
    // Check if enemy is dead
    if (enemy.hp <= 0) {
        enemy.alive = false;
        addLogEntry(`Defeated ${enemy.type} enemy!`, "success");
    }
    
    setTimeout(() => endTurn(), 500);
}

// --- Item Placement Functions ---
function placeTrap(x, y) {
    player.inventory.trap--;
    addLogEntry("Trap placed!", "info");
    playerTurn = false;
    setTimeout(() => endTurn(), 300);
    updateUI();
    return true;
}

function placeBomb(x, y) {
    player.inventory.bomb--;
    addLogEntry("Bomb placed!", "info");
    playerTurn = false;
    setTimeout(() => endTurn(), 300);
    updateUI();
    return true;
}

function placeGas(x, y) {
    player.inventory.gas--;
    addLogEntry("Gas grenade deployed!", "info");
    playerTurn = false;
    setTimeout(() => endTurn(), 300);
    updateUI();
    return true;
}

function placeRice(x, y) {
    player.inventory.rice--;
    addLogEntry("Rice scattered!", "info");
    playerTurn = false;
    setTimeout(() => endTurn(), 300);
    updateUI();
    return true;
}

// --- Animation ---
function animateMove(obj, tx, ty, callback) {
    const startX = obj.ax;
    const startY = obj.ay;
    const duration = 300; // ms
    const startTime = Date.now();
    
    function step() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease out
        const eased = 1 - Math.pow(1 - progress, 3);
        
        obj.ax = startX + (tx - startX) * eased;
        obj.ay = startY + (ty - startY) * eased;
        
        if (progress < 1) {
            requestAnimationFrame(step);
        } else {
            obj.ax = tx;
            obj.ay = ty;
            if (callback) callback();
        }
    }
    
    requestAnimationFrame(step);
}

// --- Turn Management ---
function endTurn() {
    // Update enemy positions
    enemies.forEach(enemy => {
        if (enemy.alive) {
            // Simple enemy AI - move randomly
            const directions = [
                {x: 1, y: 0}, {x: -1, y: 0},
                {x: 0, y: 1}, {x: 0, y: -1}
            ];
            const dir = directions[Math.floor(Math.random() * directions.length)];
            const newX = enemy.x + dir.x;
            const newY = enemy.y + dir.y;
            
            // Check if move is valid
            if (newX >= 0 && newX < mapDim && newY >= 0 && newY < mapDim && grid[newY][newX] !== WALL) {
                enemy.x = newX;
                enemy.y = newY;
            }
            
            // Check if enemy sees player
            if (Math.abs(enemy.x - player.x) <= 2 && Math.abs(enemy.y - player.y) <= 2) {
                addLogEntry("Enemy spotted you!", "danger");
                updateStatusCircle('detected');
            }
        }
    });
    
    turnCount++;
    playerTurn = true;
    
    // Update highlights
    updateHighlights();
    updateUI();
}

// --- UI Functions ---
function updateUI() {
    // Update HP bar
    const hpPercent = (player.hp / player.maxHp) * 100;
    document.getElementById('hpBar').style.width = `${hpPercent}%`;
    document.getElementById('coinCount').innerText = player.coins;
    
    // Update inventory counts
    document.getElementById('trapCount').innerText = player.inventory.trap;
    document.getElementById('riceCount').innerText = player.inventory.rice;
    document.getElementById('bombCount').innerText = player.inventory.bomb;
    document.getElementById('gasCount').innerText = player.inventory.gas;
}

function updateStatusCircle(status = 'stealth') {
    const statusCircle = document.getElementById('playerStatus');
    statusCircle.className = `status-circle ${status}`;
    
    // Update emoji
    const emoji = statusCircle.querySelector('.status-emoji');
    if (emoji) {
        if (status === 'stealth') emoji.textContent = '🥷';
        else if (status === 'detected') emoji.textContent = '👁️';
        else if (status === 'combat') emoji.textContent = '⚔️';
    }
}

function updateHighlights() {
    highlightedTiles = [];
    
    if (!playerTurn) return;
    
    if (selectMode === 'move') {
        // Highlight reachable tiles (3 steps)
        for (let y = 0; y < mapDim; y++) {
            for (let x = 0; x < mapDim; x++) {
                if (grid[y][x] !== WALL) {
                    const dist = Math.abs(x - player.x) + Math.abs(y - player.y);
                    if (dist <= 3) {
                        highlightedTiles.push({x, y});
                    }
                }
            }
        }
    }
    // Add more highlight logic for other modes
}

// --- Rendering ---
function gameLoop() {
    if (!gameActive) return;
    
    // Smooth camera follow
    const targetX = player.x * TILE_SIZE - canvas.width / 2;
    const targetY = player.y * TILE_SIZE - canvas.height / 2;
    camX += (targetX - camX) * 0.1;
    camY += (targetY - camY) * 0.1;
    
    render();
    requestAnimationFrame(gameLoop);
}

function render() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Save context for camera transform
    ctx.save();
    ctx.translate(-camX, -camY);
    
    // Draw grid
    for (let y = 0; y < mapDim; y++) {
        for (let x = 0; x < mapDim; x++) {
            drawTile(x, y, grid[y][x]);
        }
    }
    
    // Draw items
    items.forEach(item => {
        drawItem(item);
    });
    
    // Draw highlighted tiles
    if (playerTurn) {
        highlightedTiles.forEach(tile => {
            drawHighlight(tile.x, tile.y);
        });
    }
    
    // Draw enemies
    enemies.forEach(enemy => {
        enemy.update();
        enemy.draw(ctx);
    });
    
    // Draw player
    drawPlayer();
    
    // Restore context
    ctx.restore();
}

function drawTile(x, y, type) {
    let color = "#111";
    switch(type) {
        case WALL:
            color = "#333";
            break;
        case HIDE:
            color = "#1a2e1a";
            break;
        case EXIT:
            color = "#664400";
            break;
        default:
            color = "#111";
    }
    
    ctx.fillStyle = color;
    ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    
    // Grid lines
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 1;
    ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
}

function drawItem(item) {
    let color = "#ffd700";
    let symbol = "💰";
    
    if (item.type === 'health') {
        color = "#ff4444";
        symbol = "❤️";
    }
    
    ctx.fillStyle = color;
    ctx.font = "24px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(symbol, 
        item.x * TILE_SIZE + TILE_SIZE/2, 
        item.y * TILE_SIZE + TILE_SIZE/2);
}

function drawHighlight(x, y) {
    ctx.fillStyle = "rgba(0, 255, 204, 0.2)";
    ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    
    ctx.strokeStyle = "#00ffcc";
    ctx.lineWidth = 2;
    ctx.strokeRect(x * TILE_SIZE + 2, y * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
}

function drawPlayer() {
    // Draw player shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.ellipse(
        player.ax * TILE_SIZE + TILE_SIZE/2,
        player.ay * TILE_SIZE + TILE_SIZE/2 + 5,
        TILE_SIZE/3, TILE_SIZE/6, 0, 0, Math.PI * 2
    );
    ctx.fill();
    
    // Draw player
    ctx.fillStyle = player.isHidden ? "#0066cc" : "#00ffcc";
    ctx.beginPath();
    ctx.arc(
        player.ax * TILE_SIZE + TILE_SIZE/2,
        player.ay * TILE_SIZE + TILE_SIZE/2,
        TILE_SIZE/3, 0, Math.PI * 2
    );
    ctx.fill();
    
    // Draw player indicator
    ctx.fillStyle = "#fff";
    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🥷", 
        player.ax * TILE_SIZE + TILE_SIZE/2, 
        player.ay * TILE_SIZE + TILE_SIZE/2);
}

// --- Utility Functions ---
function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function victory() {
    gameActive = false;
    document.getElementById('resultScreen').classList.remove('hidden');
    document.getElementById('rankLabel').textContent = "VICTORY!";
}

function gameOver() {
    gameActive = false;
    document.getElementById('gameOverScreen').classList.remove('hidden');
}

// --- Public Functions for UI ---
window.setMode = function(mode) {
    selectMode = mode;
    updateHighlights();
    
    // Update active button
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    const btnId = `btn${mode.charAt(0).toUpperCase() + mode.slice(1)}`;
    const activeBtn = document.getElementById(btnId);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    addLogEntry(`Mode: ${mode}`, "info");
};

window.playerWait = function() {
    if (!playerTurn) return;
    playerTurn = false;
    addLogEntry("Waiting...", "info");
    setTimeout(() => endTurn(), 500);
};

window.toggleMinimap = function() {
    showMinimap = !showMinimap;
    addLogEntry(`Minimap ${showMinimap ? 'ON' : 'OFF'}`, "info");
};

// Initialize on load
window.addEventListener('load', function() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
});

// Export for menu system
window.initGame = initGame;
window.initCustomGame = initCustomGame;