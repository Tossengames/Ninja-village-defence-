// ============================================
// CORE MAIN - ENGINE SETUP & GAME LOOP
// ============================================

const TILE = 60;
const FLOOR = 0, WALL = 1, HIDE = 2, EXIT = 3, COIN = 5, TRAP = 6, RICE = 7, BOMB = 8;

// Global game state
let grid, player, enemies = [], activeBombs = [], turnCount = 1;
let selectMode = 'move', gameOver = false, playerTurn = true, shake = 0, mapDim = 12;
let stats = { kills: 0, coins: 0, itemsUsed: 0, timesSpotted: 0, stealthKills: 0, timeBonus: 0 };
let inv = { trap: 3, rice: 2, bomb: 1 };
let camX = 0, camY = 0, zoom = 1.0;
let showMinimap = false;
let showHighlights = true;
let showLog = true;
let highlightedTiles = [];
let hasReachedExit = false;
let currentEnemyTurn = null;
let combatSequence = false;
let startTime = 0;

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
let unitOutlines = []; // For highlighting current unit

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
    mapDim = Math.min(20, Math.max(8, parseInt(document.getElementById('mapSize').value) || 12));
    
    hasReachedExit = false;
    playerHP = playerMaxHP;
    combatSequence = false;
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
    unitOutlines = [];
    
    showHighlights = true;
    showLog = true;
    
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('toolbar').classList.remove('hidden');
    document.getElementById('rangeIndicator').classList.remove('hidden');
    document.getElementById('logToggle').classList.remove('hidden');
    document.getElementById('hpDisplay').classList.remove('hidden');
    document.getElementById('ui-controls').classList.remove('hidden');
    
    // Hide result screens
    document.getElementById('resultScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    
    generateLevel();
    centerCamera();
    updateToolCounts();
    updateHPDisplay();
    requestAnimationFrame(gameLoop);
}

function generateLevel() {
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
    
    const gc = Math.min(15, Math.max(1, parseInt(document.getElementById('guardCount').value) || 5));
    enemies = [];
    for(let i=0; i<gc; i++){
        let ex, ey; 
        do { 
            ex = rand(mapDim); 
            ey = rand(mapDim); 
        } while(grid[ey][ex] !== FLOOR || Math.hypot(ex-player.x, ey-player.y) < 4);
        
        const visionRange = Math.floor(Math.random() * 3) + 2;
        
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
            tint: enemyStats.tint
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
        img.onerror = () => { console.warn(`Failed to load sprite: ${n}.png`); };
    });
}

// ============================================
// RENDERING ENGINE
// ============================================

function drawSprite(n, x, y) { 
    if(sprites[n]) {
        ctx.drawImage(sprites[n], x*TILE, y*TILE, TILE, TILE);
    } else {
        ctx.fillStyle = '#666';
        ctx.fillRect(x*TILE, y*TILE, TILE, TILE);
    }
}

function gameLoop() {
    if(gameOver) return;
    
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
                const spriteMap = ['','wall','hide','exit','','coin','trap','rice','bomb'];
                drawSprite(spriteMap[c] || '', x, y);
            }
        }
    }

    // Draw highlights
    if(playerTurn) {
        calculateHighlightedTiles();
        highlightedTiles.forEach(tile => {
            drawTileHighlight(tile.x, tile.y, tile.color);
        });
    }

    // Draw enemies
    enemies.forEach(e => {
        if(!e.alive) return;
        
        // Draw enemy tint
        ctx.fillStyle = e.tint;
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
        ctx.fillStyle = e.color;
        ctx.font = "bold 8px monospace";
        ctx.textAlign = "left";
        ctx.fillText(e.type.charAt(0), e.ax * TILE + 3, e.ay * TILE + 10);
        
        // Draw state tint
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
        
        // Draw sprite
        drawSprite('guard', e.ax, e.ay);
        
        // Draw vision cone (visual only)
        if(!player.isHidden && e.state !== 'dead') {
            drawVisionConeVisual(e);
        }
    });

    // Draw VFX
    drawVFX();

    // Draw player health bar
    const playerHealthPercent = playerHP / playerMaxHP;
    ctx.fillStyle = playerHealthPercent > 0.5 ? "#0f0" : playerHealthPercent > 0.25 ? "#ff0" : "#f00";
    ctx.fillRect(player.ax * TILE + 5, player.ay * TILE - 8, (TILE - 10) * playerHealthPercent, 4);
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    ctx.strokeRect(player.ax * TILE + 5, player.ay * TILE - 8, TILE - 10, 4);
    
    // Draw player HP text
    ctx.fillStyle = "#fff";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.fillText(playerHP.toString(), player.ax * TILE + TILE/2, player.ay * TILE - 4);

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

    // Draw unit outlines (for current turn)
    drawUnitOutlines();

    // Draw minimap
    if(showMinimap) {
        drawMinimap();
    }
    
    updateVFX();
    
    shake *= 0.8;
    requestAnimationFrame(gameLoop);
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

function drawVisionConeVisual(e) {
    const drawRange = e.visionRange || 2;
    
    const gradient = ctx.createRadialGradient(
        e.ax * TILE + 30, e.ay * TILE + 30, 5,
        e.ax * TILE + 30, e.ay * TILE + 30, drawRange * TILE
    );
    
    if(e.state === 'alerted' || e.state === 'chasing') {
        gradient.addColorStop(0, 'rgba(255, 0, 0, 0.3)');
        gradient.addColorStop(0.5, 'rgba(255, 50, 50, 0.2)');
        gradient.addColorStop(1, 'rgba(255, 100, 100, 0)');
    } else if(e.state === 'investigating') {
        gradient.addColorStop(0, 'rgba(255, 165, 0, 0.3)');
        gradient.addColorStop(0.5, 'rgba(255, 195, 50, 0.2)');
        gradient.addColorStop(1, 'rgba(255, 235, 150, 0)');
    } else {
        gradient.addColorStop(0, 'rgba(255, 100, 100, 0.2)');
        gradient.addColorStop(0.5, 'rgba(255, 150, 150, 0.1)');
        gradient.addColorStop(1, 'rgba(255, 200, 200, 0)');
    }
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    
    const baseA = Math.atan2(e.dir.y, e.dir.x);
    const visionAngle = Math.PI / 3;
    
    ctx.moveTo(e.ax * TILE + 30, e.ay * TILE + 30);
    
    const rayCount = 12;
    for(let i = 0; i <= rayCount; i++) {
        const angle = baseA - visionAngle + (2 * visionAngle * i / rayCount);
        ctx.lineTo(
            e.ax * TILE + 30 + Math.cos(angle) * drawRange * TILE,
            e.ay * TILE + 30 + Math.sin(angle) * drawRange * TILE
        );
    }
    
    ctx.closePath();
    ctx.fill();
}

function drawUnitOutlines() {
    unitOutlines.forEach(outline => {
        const pulse = Math.sin(Date.now() / 300) * 3 + 6;
        ctx.strokeStyle = outline.color;
        ctx.lineWidth = 3;
        ctx.strokeRect(
            outline.x * TILE + 2 - pulse/2,
            outline.y * TILE + 2 - pulse/2,
            TILE - 4 + pulse,
            TILE - 4 + pulse
        );
        
        // Draw corner markers
        ctx.fillStyle = outline.color;
        const cornerSize = 6;
        ctx.fillRect(outline.x * TILE + 2, outline.y * TILE + 2, cornerSize, 3);
        ctx.fillRect(outline.x * TILE + 2, outline.y * TILE + 2, 3, cornerSize);
        ctx.fillRect(outline.x * TILE + TILE - cornerSize - 2, outline.y * TILE + 2, cornerSize, 3);
        ctx.fillRect(outline.x * TILE + TILE - 3, outline.y * TILE + 2, 3, cornerSize);
        ctx.fillRect(outline.x * TILE + 2, outline.y * TILE + TILE - 3, cornerSize, 3);
        ctx.fillRect(outline.x * TILE + 2, outline.y * TILE + TILE - cornerSize - 2, 3, cornerSize);
        ctx.fillRect(outline.x * TILE + TILE - cornerSize - 2, outline.y * TILE + TILE - 3, cornerSize, 3);
        ctx.fillRect(outline.x * TILE + TILE - 3, outline.y * TILE + TILE - cornerSize - 2, 3, cornerSize);
    });
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
        const enemyColor = e.state === 'alerted' || e.state === 'chasing' ? e.color :
                          e.state === 'investigating' ? "#ff9900" :
                          e.state === 'eating' ? "#00ff00" : e.color;
        ctx.fillStyle = enemyColor;
        ctx.fillRect(mx + e.x*ms, my + 5 + e.y*ms, ms, ms);
    });
}

// ============================================
// CAMERA & UI FUNCTIONS (IMPROVED)
// ============================================

function centerCamera() {
    camX = (canvas.width/2) - (player.x*TILE + TILE/2)*zoom;
    camY = (canvas.height/2) - (player.y*TILE + TILE/2)*zoom;
    clampCamera();
}

function centerOnUnit(x, y) {
    camX = (canvas.width/2) - (x*TILE + TILE/2)*zoom;
    camY = (canvas.height/2) - (y*TILE + TILE/2)*zoom;
    clampCamera();
}

function clampCamera() {
    const mapWidth = mapDim * TILE * zoom;
    const mapHeight = mapDim * TILE * zoom;
    
    // Allow camera to move anywhere within map bounds
    const minX = Math.min(0, canvas.width - mapWidth);
    const maxX = Math.max(0, canvas.width - mapWidth);
    const minY = Math.min(0, canvas.height - mapHeight);
    const maxY = Math.max(0, canvas.height - mapHeight);
    
    // Center padding when map is smaller than screen
    const padX = Math.max(0, (canvas.width - mapWidth) / 2);
    const padY = Math.max(0, (canvas.height - mapHeight) / 2);
    
    if(mapWidth > canvas.width) {
        camX = Math.max(minX - 50, Math.min(camX, maxX + 50));
    } else {
        camX = padX;
    }
    
    if(mapHeight > canvas.height) {
        camY = Math.max(minY - 50, Math.min(camY, maxY + 50));
    } else {
        camY = padY;
    }
}

function toggleMinimap() { 
    showMinimap = !showMinimap; 
    log("Minimap " + (showMinimap ? "ON" : "OFF"), showMinimap ? "#0f0" : "#f00");
}

function toggleLog() {
    showLog = !showLog;
    document.getElementById('missionLog').style.display = showLog ? 'flex' : 'none';
    log("Log " + (showLog ? "ON" : "OFF"), showLog ? "#0f0" : "#f00");
}

function updateToolCounts() {
    document.getElementById('trapCount').textContent = inv.trap;
    document.getElementById('riceCount').textContent = inv.rice;
    document.getElementById('bombCount').textContent = inv.bomb;
}

function updateHPDisplay() {
    document.getElementById('playerHP').textContent = `${playerHP}/${playerMaxHP}`;
}

// ============================================
// INPUT HANDLING (IMPROVED)
// ============================================

let lastDist = 0, isDragging = false, lastTouch = {x:0, y:0};

canvas.addEventListener('touchstart', e => {
    if(e.touches.length === 2) {
        lastDist = Math.hypot(
            e.touches[0].pageX - e.touches[1].pageX, 
            e.touches[0].pageY - e.touches[1].pageY
        );
    } else {
        isDragging = false;
        lastTouch = {x: e.touches[0].pageX, y: e.touches[0].pageY};
    }
}, {passive: false});

canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if(e.touches.length === 2) {
        const dist = Math.hypot(
            e.touches[0].pageX - e.touches[1].pageX, 
            e.touches[0].pageY - e.touches[1].pageY
        );
        zoom = Math.min(2, Math.max(0.3, zoom * (dist/lastDist)));
        lastDist = dist;
        clampCamera();
    } else {
        const dx = e.touches[0].pageX - lastTouch.x;
        const dy = e.touches[0].pageY - lastTouch.y;
        
        if(Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            isDragging = true; 
        }
        
        if(isDragging) {
            camX += dx; 
            camY += dy; 
            lastTouch = {x: e.touches[0].pageX, y: e.touches[0].pageY};
            clampCamera();
        }
    }
}, {passive: false});

canvas.addEventListener('touchend', e => {
    if(isDragging || !playerTurn || gameOver || e.touches.length > 0) return;
    
    const rect = canvas.getBoundingClientRect();
    const tx = Math.floor(((lastTouch.x - rect.left - camX)/zoom)/TILE);
    const ty = Math.floor(((lastTouch.y - rect.top - camY)/zoom)/TILE);
    
    if(grid[ty]?.[tx] === undefined) return;
    
    // Check if tile is highlighted
    const isHighlighted = highlightedTiles.some(t => t.x === tx && t.y === ty);
    
    if(!isHighlighted) {
        log("Invalid move!", "#f00");
        return;
    }
    
    if(grid[ty][tx] === WALL) {
        log("Cannot move into wall!", "#f00");
        return;
    }
    
    const dist = Math.max(Math.abs(tx - player.x), Math.abs(ty - player.y));
    
    if(selectMode === 'move' && dist <= 2) {
        handlePlayerMove(tx, ty);
    } else if(selectMode === 'attack' && dist === 1) {
        handleAttack(tx, ty);
    } else if(selectMode !== 'move' && selectMode !== 'attack' && dist <= 2 && grid[ty][tx] === FLOOR) {
        handleItemPlacement(tx, ty, selectMode);
    }
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

function log(msg, color="#aaa") {
    if(!showLog) return;
    
    const logDiv = document.getElementById('missionLog');
    const d = document.createElement('div');
    d.style.color = color;
    d.innerText = `> ${msg}`;
    logDiv.prepend(d);
    if(logDiv.children.length > 5) logDiv.lastChild.remove();
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
            cb(); 
        }
    }
    step();
}

function setMode(m) {
    selectMode = m;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('btn' + m.charAt(0).toUpperCase() + m.slice(1)).classList.add('active');
}

function autoSwitchToMove() {
    setMode('move');
}

function playerWait() { 
    if(playerTurn) { 
        playerTurn = false; 
        createSpeechBubble(player.x, player.y, "⏳ WAITING", "#aaaaaa", 1.5);
        // Show outline on player during wait
        unitOutlines.push({x: player.x, y: player.y, color: '#00d2ff', life: 1});
        setTimeout(() => {
            endTurn();
        }, 800);
    } 
}

function showVictoryScreen() {
    document.getElementById('resultScreen').classList.remove('hidden');
    showTenchuStyleVictoryStats();
}

function showGameOverScreen() {
    document.getElementById('gameOverScreen').classList.remove('hidden');
}

// ============================================
// LINE OF SIGHT - STRAIGHT LINE VISION
// ============================================

function hasLineOfSight(e, px, py) {
    if(hasReachedExit) return false;
    
    const dx = px - e.x;
    const dy = py - e.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if(distance > e.visionRange) return false;
    
    // Check line of sight in straight line (any direction, not just cone)
    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    for(let i = 1; i <= steps; i++) {
        const tx = Math.round(e.x + (dx / steps) * i);
        const ty = Math.round(e.y + (dy / steps) * i);
        
        if(tx === px && ty === py) break; // Reached target
        
        if(tx < 0 || tx >= mapDim || ty < 0 || ty >= mapDim) return false;
        if(grid[ty][tx] === WALL) return false;
    }
    
    return true;
}

// ============================================
// TURN PROCESSING (WITH WAITS)
// ============================================

async function endTurn() {
    if(hasReachedExit) {
        return;
    }
    
    // Clear unit outlines
    unitOutlines = [];
    
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

    for(let b of exploding) {
        await wait(600); // Wait before explosion
        
        grid[b.y][b.x] = FLOOR; 
        shake = 20; 
        createExplosionEffect(b.x, b.y);
        
        // Alert nearby enemies to the sound
        enemies.forEach(e => {
            if(e.alive && e.state !== 'dead') {
                const dist = Math.hypot(e.x - b.x, e.y - b.y);
                if(dist <= e.hearingRange) {
                    e.hasHeardSound = true;
                    e.soundLocation = {x: b.x, y: b.y};
                    e.investigationTurns = 3;
                    e.state = 'investigating';
                    createSpeechBubble(e.x, e.y, "What was that?", "#ff9900", 1.5);
                }
            }
        });
        
        const enemiesInBlast = enemies.filter(e => 
            e.alive && Math.abs(e.x-b.x)<=1 && Math.abs(e.y-b.y)<=1
        );
        
        for(let e of enemiesInBlast) {
            await wait(400); // Wait between deaths
            e.alive = false; 
            e.state = 'dead';
            stats.kills++;
            createDeathEffect(e.x, e.y);
        }
    }

    // Process enemies with proper waits
    for(let e of enemies.filter(g => g.alive)) {
        currentEnemyTurn = e;
        centerOnUnit(e.x, e.y);
        
        // Show outline on current enemy
        unitOutlines.push({x: e.x, y: e.y, color: e.color, life: 3});
        
        await wait(800); // Wait before enemy moves
        
        await processEnemyTurn(e);
        
        // Clear outline
        unitOutlines = unitOutlines.filter(o => !(o.x === e.x && o.y === e.y));
        
        await wait(500); // Wait after enemy moves
    }
    
    currentEnemyTurn = null;
    centerCamera();
    
    await wait(400); // Wait before returning to player
    
    turnCount++; 
    playerTurn = true;
    
    // Show outline on player at start of turn
    unitOutlines.push({x: player.x, y: player.y, color: '#00d2ff', life: 1});
}

async function processCombatSequence(playerAttack, enemy, playerDamage = 2) {
    combatSequence = true;
    
    // Player attacks first
    createSpeechBubble(player.x, player.y, "🗡️ ATTACK!", "#00d2ff", 1.5);
    await wait(600); // Wait before attack
    
    enemy.hp -= playerDamage;
    createDamageEffect(enemy.x, enemy.y, playerDamage);
    createSpeechBubble(enemy.x, enemy.y, `-${playerDamage}`, "#ff0000", 1.5);
    shake = 10;
    
    await wait(800); // Wait after attack
    
    if(enemy.hp <= 0) {
        enemy.alive = false;
        enemy.state = 'dead';
        stats.kills++;
        if(!playerAttack) {
            stats.stealthKills++;
        }
        createDeathEffect(enemy.x, enemy.y);
        combatSequence = false;
        return true;
    }
    
    // Enemy counterattacks if in range
    const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    if(dist <= enemy.attackRange) {
        createSpeechBubble(enemy.x, enemy.y, `${enemy.type} ATTACK!`, enemy.color, 1.5);
        await wait(600); // Wait before enemy attack
        
        playerHP -= enemy.damage;
        createDamageEffect(player.x, player.y, enemy.damage, true);
        createSpeechBubble(player.x, player.y, `-${enemy.damage}`, "#ff66ff", 1.5);
        shake = 15;
        updateHPDisplay();
        
        await wait(800); // Wait after enemy attack
        
        if(playerHP <= 0) {
            gameOver = true;
            showGameOverScreen();
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
// TENCHU-STYLE VICTORY STATS
// ============================================

function showTenchuStyleVictoryStats() {
    const statsTable = document.getElementById('statsTable');
    const rankLabel = document.getElementById('rankLabel');
    const missionTime = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(missionTime / 60);
    const seconds = missionTime % 60;
    
    // Calculate score based on Tenchu-style scoring
    let score = 0;
    
    // Time bonus (faster = more points)
    const maxTimeBonus = 5000;
    const timeBonus = Math.max(0, maxTimeBonus - (missionTime * 10));
    stats.timeBonus = Math.floor(timeBonus);
    score += stats.timeBonus;
    
    // Kills
    const killPoints = stats.kills * 100;
    score += killPoints;
    
    // Stealth kills bonus
    const stealthBonus = stats.stealthKills * 150;
    score += stealthBonus;
    
    // Coins
    const coinPoints = stats.coins * 50;
    score += coinPoints;
    
    // Penalty for being spotted
    const spottedPenalty = stats.timesSpotted * 200;
    score = Math.max(0, score - spottedPenalty);
    
    // Penalty for items used
    const itemPenalty = stats.itemsUsed * 50;
    score = Math.max(0, score - itemPenalty);
    
    // Tenchu-style rankings
    let rank = "NOVICE";
    let rankDescription = "";
    let rankColor = "#888";
    let rankIcon = "🥷";
    
    if(score >= 10000) {
        rank = "GRAND MASTER";
        rankDescription = "Flawless execution. A true shadow warrior.";
        rankColor = "#ffd700";
        rankIcon = "👑";
    } else if(score >= 7500) {
        rank = "MASTER NINJA";
        rankDescription = "Superior technique and perfect stealth.";
        rankColor = "#c0c0c0";
        rankIcon = "🥷";
    } else if(score >= 5000) {
        rank = "EXPERT";
        rankDescription = "Skilled infiltration with few mistakes.";
        rankColor = "#cd7f32";
        rankIcon = "🗡️";
    } else if(score >= 3000) {
        rank = "ADEPT";
        rankDescription = "Competent performance.";
        rankColor = "#00ff00";
        rankIcon = "🎯";
    } else if(score >= 1500) {
        rank = "ASSASSIN";
        rankDescription = "Effective but not subtle.";
        rankColor = "#ff4444";
        rankIcon = "⚔️";
    } else if(score >= 500) {
        rank = "INITIATE";
        rankDescription = "Basic skills demonstrated.";
        rankColor = "#aaa";
        rankIcon = "🛡️";
    } else {
        rank = "NOVICE";
        rankDescription = "Survived the mission.";
        rankColor = "#888";
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
            <span class="stat-points">+${stealthBonus.toLocaleString()}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">GOLD COLLECTED</span>
            <span class="stat-value">${stats.coins}</span>
            <span class="stat-points">+${coinPoints.toLocaleString()}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">TIMES SPOTTED</span>
            <span class="stat-value">${stats.timesSpotted}</span>
            <span class="stat-points">-${spottedPenalty.toLocaleString()}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">ITEMS USED</span>
            <span class="stat-value">${stats.itemsUsed}</span>
            <span class="stat-points">-${itemPenalty.toLocaleString()}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-row total">
            <span class="stat-label">TOTAL SCORE</span>
            <span class="stat-value"></span>
            <span class="stat-points" style="color: ${rankColor}; font-size: 18px;">${score.toLocaleString()}</span>
        </div>
        <div class="rank-description" style="color: ${rankColor}; margin-top: 15px; font-style: italic;">
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
    log("Game loaded. Press START MISSION to begin.", "#0f0");
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