/**
 * CORE_MAIN.JS - Full Integrated Version
 * Hand-crafted levels via JSON with original AI/Combat/Hazards.
 */

// --- Constants & Config ---
const TILE_SIZE = 64;
const WALL = 1, FLOOR = 0, HIDE = 2, EXIT = 3;

// --- Global State ---
let canvas, ctx;
let mapDim = 20;
let grid = [];
let player = { 
    x: 0, y: 0, hp: 100, maxHp: 100, coins: 0, 
    inventory: { bombs: 3, gas: 2 },
    isHidden: false,
    ax: 0, ay: 0,
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

// Enemy types with distinct colors
const ENEMY_TYPES = {
    NORMAL: { range: 1, hp: 10, speed: 0.08, damage: 2, color: '#ff3333', tint: 'rgba(255, 50, 50, 0.3)' },
    ARCHER: { range: 3, hp: 8, speed: 0.06, damage: 1, color: '#33cc33', tint: 'rgba(50, 255, 50, 0.3)' },
    SPEAR: { range: 2, hp: 12, speed: 0.07, damage: 3, color: '#3366ff', tint: 'rgba(50, 100, 255, 0.3)' }
};

// Mode colors for highlighting
const modeColors = {
    'move': { fill: 'rgba(0, 210, 255, 0.15)', border: 'rgba(0, 210, 255, 0.7)', glow: 'rgba(0, 210, 255, 0.3)' },
    'trap': { fill: 'rgba(255, 100, 100, 0.15)', border: 'rgba(255, 100, 100, 0.7)', glow: 'rgba(255, 100, 100, 0.3)' },
    'rice': { fill: 'rgba(255, 255, 100, 0.15)', border: 'rgba(255, 255, 100, 0.7)', glow: 'rgba(255, 255, 100, 0.3)' },
    'bomb': { fill: 'rgba(255, 50, 150, 0.15)', border: 'rgba(255, 50, 150, 0.7)', glow: 'rgba(255, 50, 150, 0.3)' },
    'gas': { fill: 'rgba(153, 50, 204, 0.15)', border: 'rgba(153, 50, 204, 0.7)', glow: 'rgba(153, 50, 204, 0.3)' },
    'attack': { fill: 'rgba(255, 0, 0, 0.3)', border: 'rgba(255, 0, 0, 0.8)', glow: 'rgba(255, 0, 0, 0.5)' }
};

// --- Initialization & Level Loading ---

/**
 * Replaces the old random generator. Loads level data and starts engine.
 */
async function initGame(levelPath) {
    try {
        const response = await fetch(levelPath);
        if (!response.ok) throw new Error("File not found");
        const levelData = await response.json();

        // Load Map Architecture
        mapDim = levelData.mapDim;
        grid = levelData.grid;

        // Load Actor Positions
        player.x = levelData.playerStart.x;
        player.y = levelData.playerStart.y;
        player.hp = 100;
        player.coins = 0;

        // Load Enemies (using existing Enemy class)
        enemies = [];
        if (levelData.enemies) {
            levelData.enemies.forEach(e => {
                enemies.push(new Enemy(e.x, e.y, e.type));
            });
        }

        // Load Static Items
        items = levelData.items || [];

        // Reset Hazard States
        activeBombs = [];
        activeGas = [];
        turnCount = 0;

        // Interface Setup
        document.getElementById('mainMenu').style.display = 'none';
        document.getElementById('gameUI').classList.remove('hidden');
        
        canvas = document.getElementById('gameCanvas');
        ctx = canvas.getContext('2d');
        resizeCanvas();

        gameActive = true;
        playerTurn = true;
        
        requestAnimationFrame(gameLoop);
    } catch (err) {
        console.error("Initialization Failed:", err);
    }
}

// --- ENEMY CLASS (MISSING FROM FIRST SCRIPT) ---

class Enemy {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.hp = type === 'ARCHER' ? 80 : 100;
        this.maxHp = this.hp;
        this.alive = true;
        this.state = 'patrolling';
        this.dir = { x: 1, y: 0 };
        this.visionRange = 3;
        this.hearingRange = 6;
        this.attackRange = type === 'ARCHER' ? 3 : type === 'SPEAR' ? 2 : 1;
        this.damage = type === 'ARCHER' ? 15 : type === 'SPEAR' ? 25 : 20;
        this.color = type === 'ARCHER' ? '#33cc33' : type === 'SPEAR' ? '#3366ff' : '#ff3333';
        this.isSleeping = false;
        this.sleepTimer = 0;
        this.investigationTarget = null;
        this.investigationTurns = 0;
        
        // For smooth animation
        this.ax = x;
        this.ay = y;
    }
    
    async act() {
        if (!this.alive || this.isSleeping) return;
        
        // Check if enemy can see player
        if (hasLineOfSight(this.x, this.y, player.x, player.y) && !player.isHidden) {
            const dist = Math.abs(this.x - player.x) + Math.abs(this.y - player.y);
            
            if (dist <= this.attackRange) {
                // Attack player
                await processCombat(this, player);
                return;
            } else {
                // Move toward player
                this.moveToward(player.x, player.y);
            }
        } else {
            // Patrol behavior
            this.patrol();
        }
        
        // Update animation position
        this.ax = this.x;
        this.ay = this.y;
    }
    
    moveToward(tx, ty) {
        const dx = tx - this.x;
        const dy = ty - this.y;
        
        if (Math.abs(dx) > Math.abs(dy)) {
            const moveX = this.x + Math.sign(dx);
            if (grid[this.y][moveX] !== WALL) {
                this.x = moveX;
                this.dir.x = Math.sign(dx);
                this.dir.y = 0;
            }
        } else {
            const moveY = this.y + Math.sign(dy);
            if (grid[moveY][this.x] !== WALL) {
                this.y = moveY;
                this.dir.x = 0;
                this.dir.y = Math.sign(dy);
            }
        }
    }
    
    patrol() {
        // Simple random patrol
        const directions = [
            { x: 1, y: 0 }, { x: -1, y: 0 },
            { x: 0, y: 1 }, { x: 0, y: -1 }
        ];
        
        const validMoves = directions.filter(dir => {
            const nx = this.x + dir.x;
            const ny = this.y + dir.y;
            return nx >= 0 && nx < mapDim && ny >= 0 && ny < mapDim && 
                   grid[ny][nx] !== WALL;
        });
        
        if (validMoves.length > 0) {
            const move = validMoves[Math.floor(Math.random() * validMoves.length)];
            this.x += move.x;
            this.y += move.y;
            this.dir = move;
        }
    }
    
    draw(ctx) {
        if (!this.alive) return;
        
        // Draw enemy with color based on type
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
    }
}

// --- Vision & Combat Logic (Original Mechanics) ---

function hasLineOfSight(startX, startY, endX, endY) {
    let dx = Math.abs(endX - startX);
    let dy = Math.abs(endY - startY);
    let sx = (startX < endX) ? 1 : -1;
    let sy = (startY < endY) ? 1 : -1;
    let err = dx - dy;

    let x = startX;
    let y = startY;

    while (true) {
        if (x === endX && y === endY) return true;
        if (grid[y][x] === WALL) return false;
        
        let e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x += sx; }
        if (e2 < dx) { err += dx; y += sy; }
    }
}

async function processCombat(attacker, target) {
    const damage = attacker.type === 'ARCHER' ? 15 : 25;
    target.hp -= damage;
    
    // Visual feedback
    triggerShake();
    createDamageEffect(target.x, target.y, damage, target === player);
    createSpeechBubble(target.x, target.y, `-${damage}`, target === player ? "#ff66ff" : "#ff0000", 1.5);
    
    if (target.hp <= 0) {
        if (target === player) {
            gameOver();
        } else {
            enemies = enemies.filter(e => e !== target);
            createDeathEffect(target.x, target.y);
        }
    }
}

// --- ITEM PLACEMENT SYSTEM (MISSING) ---

function placeBomb(x, y) {
    if (player.inventory.bombs > 0 && grid[y][x] === FLOOR) {
        activeBombs.push({ x, y, timer: 3 });
        player.inventory.bombs--;
        updateUI();
        playerTurn = false;
        setTimeout(() => endTurn(), 500);
        return true;
    }
    return false;
}

function placeGas(x, y) {
    if (player.inventory.gas > 0 && grid[y][x] === FLOOR) {
        activeGas.push({ x, y, duration: 4 });
        player.inventory.gas--;
        updateUI();
        playerTurn = false;
        setTimeout(() => endTurn(), 500);
        return true;
    }
    return false;
}

function useTrap(x, y) {
    if (player.inventory.traps > 0 && grid[y][x] === FLOOR) {
        grid[y][x] = 6; // TRAP tile
        player.inventory.traps--;
        updateUI();
        playerTurn = false;
        setTimeout(() => endTurn(), 500);
        return true;
    }
    return false;
}

function useRice(x, y) {
    if (player.inventory.rice > 0 && grid[y][x] === FLOOR) {
        grid[y][x] = 7; // RICE tile
        player.inventory.rice--;
        updateUI();
        playerTurn = false;
        setTimeout(() => endTurn(), 500);
        return true;
    }
    return false;
}

// --- VFX SYSTEM (MISSING) ---

function createExplosionEffect(x, y) {
    for (let i = 0; i < 20; i++) {
        explosionEffects.push({
            x: x * TILE_SIZE + TILE_SIZE/2,
            y: y * TILE_SIZE + TILE_SIZE/2,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 1.0,
            color: ['#ff3333', '#ff9933', '#ffff33'][Math.floor(Math.random() * 3)]
        });
    }
}

function createDeathEffect(x, y) {
    bloodStains.push({
        x: x * TILE_SIZE,
        y: y * TILE_SIZE,
        life: 5.0
    });
    
    for (let i = 0; i < 15; i++) {
        particles.push({
            x: x * TILE_SIZE + TILE_SIZE/2,
            y: y * TILE_SIZE + TILE_SIZE/2,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 1.0,
            color: '#8b0000'
        });
    }
}

function createDamageEffect(x, y, damage, isPlayer = false) {
    damageEffects.push({
        x: x * TILE_SIZE + TILE_SIZE/2,
        y: y * TILE_SIZE,
        value: damage,
        life: 1.5,
        color: isPlayer ? '#ff66ff' : '#ff0000'
    });
}

function createSpeechBubble(x, y, text, color = "#aaaaaa", duration = 2.0) {
    speechBubbles.push({
        x: x * TILE_SIZE + TILE_SIZE/2,
        y: y * TILE_SIZE - 20,
        text: text,
        life: duration,
        color: color
    });
}

function createFootstepEffect(x, y) {
    footstepEffects.push({
        x: x * TILE_SIZE + TILE_SIZE/2 + (Math.random() - 0.5) * 10,
        y: y * TILE_SIZE + TILE_SIZE/2 + (Math.random() - 0.5) * 10,
        life: 0.8,
        size: 3 + Math.random() * 4
    });
}

function createCoinPickupEffect(x, y) {
    for (let i = 0; i < 8; i++) {
        coinPickupEffects.push({
            x: x * TILE_SIZE + TILE_SIZE/2,
            y: y * TILE_SIZE + TILE_SIZE/2,
            vx: (Math.random() - 0.5) * 6,
            vy: -2 - Math.random() * 3,
            life: 1.2,
            color: '#ffd700'
        });
    }
}

function createHideEffect(x, y) {
    hideEffects.push({
        x: x * TILE_SIZE + TILE_SIZE/2,
        y: y * TILE_SIZE + TILE_SIZE/2,
        life: 1.5,
        maxLife: 1.5,
        radius: TILE_SIZE/2
    });
}

function triggerShake() {
    // Screen shake will be implemented in render loop
    window.shakeIntensity = 15;
}

// --- Turn Management ---

async function endTurn() {
    // 1. Hazard Ticks
    processHazards();

    // 2. Enemy AI Sequence
    for (let enemy of enemies) {
        if (enemy.hp > 0) {
            await enemy.act();
        }
    }

    turnCount++;
    playerTurn = true;
    
    // Reset highlights
    calculateHighlightedTiles();
}

function processHazards() {
    // Bomb countdowns
    activeBombs.forEach((bomb, index) => {
        bomb.timer--;
        if (bomb.timer === 0) {
            explode(bomb.x, bomb.y);
            activeBombs.splice(index, 1);
        }
    });

    // Gas dissipation
    activeGas = activeGas.filter(gas => {
        gas.duration--;
        return gas.duration > 0;
    });
    
    // Update VFX
    updateVFX();
}

function explode(x, y) {
    createExplosionEffect(x, y);
    triggerShake();
    
    // Damage enemies in 3x3 area
    enemies.forEach(enemy => {
        if (Math.abs(enemy.x - x) <= 1 && Math.abs(enemy.y - y) <= 1) {
            enemy.hp -= 50;
            if (enemy.hp <= 0) {
                enemy.alive = false;
                createDeathEffect(enemy.x, enemy.y);
            }
        }
    });
    
    // Damage player
    if (Math.abs(player.x - x) <= 1 && Math.abs(player.y - y) <= 1) {
        player.hp -= 50;
        if (player.hp <= 0) {
            gameOver();
        }
    }
}

// --- Input & Interaction ---

window.addEventListener('mousedown', (e) => {
    if (!gameActive || !playerTurn) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left + camX) / TILE_SIZE);
    const y = Math.floor((e.clientY - rect.top + camY) / TILE_SIZE);

    if (isValidAction(x, y)) {
        handleMoveOrAttack(x, y);
    }
});

// ADDITIONAL INPUT HANDLING FOR ITEMS
canvas.addEventListener('click', function(e) {
    if (!gameActive || !playerTurn) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left - camX) / zoom) / TILE_SIZE);
    const y = Math.floor(((e.clientY - rect.top - camY) / zoom) / TILE_SIZE);
    
    if (grid[y]?.[x] === undefined) return;
    
    const isHighlighted = highlightedTiles.some(t => t.x === x && t.y === y);
    if (!isHighlighted) return;
    
    if (grid[y][x] === WALL) return;
    
    const dist = Math.max(Math.abs(x - player.x), Math.abs(y - player.y));
    
    if (selectMode === 'move' && dist <= 3) {
        handlePlayerMove(x, y);
    } else if (selectMode === 'bomb' && dist <= 2) {
        placeBomb(x, y);
    } else if (selectMode === 'gas' && dist <= 2) {
        placeGas(x, y);
    } else if (selectMode === 'trap' && dist <= 2) {
        useTrap(x, y);
    } else if (selectMode === 'rice' && dist <= 2) {
        useRice(x, y);
    }
});

function isValidAction(x, y) {
    if (x < 0 || x >= mapDim || y < 0 || y >= mapDim) return false;
    const dist = Math.abs(player.x - x) + Math.abs(player.y - y);
    return dist === 1 && grid[y][x] !== WALL;
}

async function handleMoveOrAttack(x, y) {
    playerTurn = false;
    
    // Check for enemy at target location
    const targetEnemy = enemies.find(en => en.x === x && en.y === y);
    
    if (targetEnemy) {
        await processCombat(player, targetEnemy);
    } else {
        player.x = x;
        player.y = y;
        
        // Pick up items
        items = items.filter(item => {
            if (item.x === x && item.y === y) {
                player.coins += 10;
                createCoinPickupEffect(x, y);
                return false;
            }
            return true;
        });

        if (grid[y][x] === EXIT) {
            victory();
            return;
        }
        
        // Check for hide spot
        if (grid[y][x] === HIDE) {
            player.isHidden = true;
            createHideEffect(x, y);
        } else {
            player.isHidden = false;
        }
        
        createFootstepEffect(x, y);
    }

    await endTurn();
}

function handlePlayerMove(x, y) {
    if (playerTurn && Math.abs(x - player.x) + Math.abs(y - player.y) <= 3) {
        playerTurn = false;
        animMove(player, x, y, 0.1, () => {
            player.x = x;
            player.y = y;
            
            // Check for items
            const itemIndex = items.findIndex(item => item.x === x && item.y === y);
            if (itemIndex !== -1) {
                player.coins += items[itemIndex].value || 10;
                createCoinPickupEffect(x, y);
                items.splice(itemIndex, 1);
            }
            
            // Check for exit
            if (grid[y][x] === EXIT) {
                victory();
                return;
            }
            
            // Check for hide spot
            if (grid[y][x] === HIDE) {
                player.isHidden = true;
                createHideEffect(x, y);
            } else {
                player.isHidden = false;
            }
            
            setTimeout(() => endTurn(), 300);
        });
    }
}

// --- ANIMATION FUNCTION (MISSING) ---
function animMove(obj, tx, ty, speed, cb) {
    const sx = obj.ax || obj.x;
    const sy = obj.ay || obj.y;
    let p = 0;
    
    if (obj === player) {
        obj.dir = {
            x: Math.sign(tx - obj.x) || obj.dir.x,
            y: Math.sign(ty - obj.y) || obj.dir.y
        };
    }
    
    function step() {
        p += speed;
        obj.ax = sx + (tx - sx) * p;
        obj.ay = sy + (ty - sy) * p;
        
        if (Math.random() < 0.3 && obj === player) {
            createFootstepEffect(obj.ax, obj.ay);
        }
        
        if (p < 1) {
            requestAnimationFrame(step);
        } else {
            obj.x = tx;
            obj.y = ty;
            obj.ax = tx;
            obj.ay = ty;
            if (cb) cb();
        }
    }
    step();
}

// --- HIGHLIGHT SYSTEM (MISSING) ---
function calculateHighlightedTiles() {
    highlightedTiles = [];
    
    if (!playerTurn) return;
    
    if (selectMode === 'move') {
        // Highlight reachable tiles
        for (let y = 0; y < mapDim; y++) {
            for (let x = 0; x < mapDim; x++) {
                if (grid[y][x] !== WALL) {
                    const dist = Math.abs(x - player.x) + Math.abs(y - player.y);
                    if (dist <= 3) {
                        highlightedTiles.push({
                            x, y,
                            color: modeColors.move
                        });
                    }
                }
            }
        }
    } else if (selectMode === 'bomb' || selectMode === 'gas' || 
               selectMode === 'trap' || selectMode === 'rice') {
        // Highlight placement tiles
        for (let y = 0; y < mapDim; y++) {
            for (let x = 0; x < mapDim; x++) {
                if (grid[y][x] === FLOOR) {
                    const dist = Math.abs(x - player.x) + Math.abs(y - player.y);
                    if (dist <= 2) {
                        highlightedTiles.push({
                            x, y,
                            color: modeColors[selectMode]
                        });
                    }
                }
            }
        }
    }
}

// --- RENDERING ENGINE ---

function gameLoop() {
    if (!gameActive) return;
    
    // Smooth Camera Follow
    const lerp = 0.1;
    camX += (player.x * TILE_SIZE - canvas.width / 2 - camX) * lerp;
    camY += (player.y * TILE_SIZE - canvas.height / 2 - camY) * lerp;

    render();
    requestAnimationFrame(gameLoop);
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    
    // Apply screen shake
    if (window.shakeIntensity > 0) {
        ctx.translate((Math.random() - 0.5) * window.shakeIntensity, 
                     (Math.random() - 0.5) * window.shakeIntensity);
        window.shakeIntensity *= 0.8;
    }
    
    ctx.translate(-camX, -camY);

    // Render Map
    for (let y = 0; y < mapDim; y++) {
        for (let x = 0; x < mapDim; x++) {
            drawTile(x, y, grid[y][x]);
        }
    }

    // Render Entities
    items.forEach(item => drawItem(item));
    activeBombs.forEach(bomb => drawBomb(bomb));
    activeGas.forEach(gas => drawGas(gas));
    enemies.forEach(enemy => enemy.draw(ctx));
    
    // Draw highlights
    if (playerTurn) {
        highlightedTiles.forEach(tile => {
            drawTileHighlight(tile.x, tile.y, tile.color);
        });
    }
    
    // Draw VFX
    drawVFX();
    
    // Render Player
    ctx.fillStyle = player.isHidden ? "#0066cc" : "#00ffcc";
    ctx.shadowBlur = player.isHidden ? 5 : 15;
    ctx.shadowColor = player.isHidden ? "#0066cc" : "#00ffcc";
    ctx.beginPath();
    ctx.arc(
        player.x * TILE_SIZE + TILE_SIZE/2,
        player.y * TILE_SIZE + TILE_SIZE/2,
        TILE_SIZE/3, 0, Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Draw minimap if enabled
    if (showMinimap) {
        drawMinimap();
    }

    ctx.restore();
    updateUI();
}

// --- VFX RENDERING (MISSING) ---
function drawVFX() {
    // Draw particles
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    });
    
    // Draw blood stains
    bloodStains.forEach(s => {
        ctx.fillStyle = 'rgba(139, 0, 0, 0.3)';
        ctx.fillRect(s.x, s.y, TILE_SIZE, TILE_SIZE);
    });
    
    // Draw damage numbers
    damageEffects.forEach(d => {
        ctx.fillStyle = d.color;
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.globalAlpha = d.life;
        ctx.fillText(`-${d.value}`, d.x, d.y);
        ctx.globalAlpha = 1.0;
    });
    
    // Draw speech bubbles
    speechBubbles.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.globalAlpha = b.life;
        ctx.fillText(b.text, b.x, b.y);
        ctx.globalAlpha = 1.0;
    });
    
    // Draw footsteps
    footstepEffects.forEach(f => {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.globalAlpha = f.life;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    });
    
    // Draw coin effects
    coinPickupEffects.forEach(c => {
        ctx.fillStyle = c.color;
        ctx.globalAlpha = c.life;
        ctx.beginPath();
        ctx.arc(c.x, c.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    });
    
    // Draw hide effects
    hideEffects.forEach(h => {
        const radius = h.radius * (h.life / h.maxLife);
        ctx.strokeStyle = 'rgba(0, 102, 204, 0.5)';
        ctx.lineWidth = 2;
        ctx.globalAlpha = h.life / h.maxLife;
        ctx.beginPath();
        ctx.arc(h.x, h.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    });
    
    // Draw explosion effects
    explosionEffects.forEach(e => {
        ctx.fillStyle = e.color;
        ctx.globalAlpha = e.life;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    });
}

function updateVFX() {
    // Update particles
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        return p.life > 0;
    });
    
    // Update other effects
    bloodStains = bloodStains.filter(s => {
        s.life -= 0.01;
        return s.life > 0;
    });
    
    damageEffects = damageEffects.filter(d => {
        d.y -= 1;
        d.life -= 0.03;
        return d.life > 0;
    });
    
    speechBubbles = speechBubbles.filter(b => {
        b.y -= 0.5;
        b.life -= 0.03;
        return b.life > 0;
    });
    
    footstepEffects = footstepEffects.filter(f => {
        f.life -= 0.04;
        return f.life > 0;
    });
    
    coinPickupEffects = coinPickupEffects.filter(c => {
        c.x += c.vx;
        c.y += c.vy;
        c.life -= 0.03;
        return c.life > 0;
    });
    
    hideEffects = hideEffects.filter(h => {
        h.life -= 0.04;
        return h.life > 0;
    });
    
    explosionEffects = explosionEffects.filter(e => {
        e.x += e.vx;
        e.y += e.vy;
        e.life -= 0.05;
        return e.life > 0;
    });
}

// --- MINIMAP (MISSING) ---
function drawMinimap() {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
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
            } else if(grid[y][x] === HIDE) {
                ctx.fillStyle = "#3333aa";
                ctx.fillRect(mx + x*ms, my + 5 + y*ms, ms, ms);
            }
        }
    }
    
    ctx.fillStyle = player.isHidden ? "#0066cc" : "#00d2ff";
    ctx.beginPath();
    ctx.arc(mx + player.x*ms + ms/2, my + 5 + player.y*ms + ms/2, ms/2, 0, Math.PI*2);
    ctx.fill();
    
    enemies.filter(e => e.alive).forEach(e => {
        ctx.fillStyle = e.isSleeping ? "#888" : e.color;
        ctx.fillRect(mx + e.x*ms, my + 5 + e.y*ms, ms, ms);
    });
    
    ctx.restore();
}

// --- UI & Helpers ---

function drawTile(x, y, type) {
    let color = "#111";
    if (type === WALL) color = "#333";
    if (type === HIDE) color = "#1a2e1a";
    if (type === EXIT) color = "#443300";
    if (type === 6) color = "#663333"; // Trap
    if (type === 7) color = "#666633"; // Rice
    
    ctx.fillStyle = color;
    ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE - 1, TILE_SIZE - 1);
}

function drawItem(item) {
    ctx.fillStyle = "#ffd700";
    ctx.beginPath();
    ctx.arc(
        item.x * TILE_SIZE + TILE_SIZE/2,
        item.y * TILE_SIZE + TILE_SIZE/2,
        TILE_SIZE/4, 0, Math.PI * 2
    );
    ctx.fill();
}

function drawBomb(bomb) {
    ctx.fillStyle = "#ff3333";
    ctx.fillRect(
        bomb.x * TILE_SIZE + TILE_SIZE/4,
        bomb.y * TILE_SIZE + TILE_SIZE/4,
        TILE_SIZE/2, TILE_SIZE/2
    );
    
    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
        bomb.timer,
        bomb.x * TILE_SIZE + TILE_SIZE/2,
        bomb.y * TILE_SIZE + TILE_SIZE/2 + 6
    );
}

function drawGas(gas) {
    const alpha = 0.3 + 0.2 * Math.sin(Date.now() / 500);
    ctx.fillStyle = `rgba(153, 50, 204, ${alpha})`;
    ctx.beginPath();
    ctx.arc(
        gas.x * TILE_SIZE + TILE_SIZE/2,
        gas.y * TILE_SIZE + TILE_SIZE/2,
        TILE_SIZE * 1.2, 0, Math.PI * 2
    );
    ctx.fill();
    
    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
        gas.duration,
        gas.x * TILE_SIZE + TILE_SIZE/2,
        gas.y * TILE_SIZE + TILE_SIZE/2 + 6
    );
}

function drawTileHighlight(x, y, colorSet) {
    const time = Date.now() / 1000;
    const pulseFactor = (Math.sin(time * 6) * 0.1 + 0.9);
    
    ctx.fillStyle = colorSet.fill;
    ctx.fillRect(x*TILE_SIZE + 4, y*TILE_SIZE + 4, TILE_SIZE - 8, TILE_SIZE - 8);
    
    ctx.strokeStyle = colorSet.border;
    ctx.lineWidth = 3;
    ctx.strokeRect(x*TILE_SIZE + 2, y*TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
    
    ctx.strokeStyle = colorSet.glow;
    ctx.lineWidth = 1;
    for(let i = 0; i < 3; i++) {
        const offset = i * 2 * pulseFactor;
        ctx.strokeRect(
            x*TILE_SIZE + 1 - offset, 
            y*TILE_SIZE + 1 - offset, 
            TILE_SIZE - 2 + offset*2, 
            TILE_SIZE - 2 + offset*2
        );
    }
}

function updateUI() {
    document.getElementById('hpBar').style.width = `${player.hp}%`;
    document.getElementById('coinCount').innerText = player.coins;
    
    // Update inventory display
    document.getElementById('bombCount').innerText = player.inventory.bombs;
    document.getElementById('gasCount').innerText = player.inventory.gas;
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function victory() {
    gameActive = false;
    alert("Level Secured!");
    location.reload();
}

function gameOver() {
    gameActive = false;
    alert("Killed in action...");
    location.reload();
}

// --- UI MODE FUNCTIONS (MISSING) ---
function setMode(mode) {
    selectMode = mode;
    calculateHighlightedTiles();
    
    // Update UI buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`.mode-btn[data-mode="${mode}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}

function toggleMinimap() {
    showMinimap = !showMinimap;
}

function playerWait() {
    if (playerTurn) {
        playerTurn = false;
        createSpeechBubble(player.x, player.y, "⏳ WAITING", "#aaaaaa", 1.5);
        setTimeout(() => {
            endTurn();
        }, 800);
    }
}

// --- INITIALIZATION ---
window.addEventListener('resize', resizeCanvas);

// Export functions for menu system
window.setMode = setMode;
window.playerWait = playerWait;
window.toggleMinimap = toggleMinimap;
window.initGame = initGame;