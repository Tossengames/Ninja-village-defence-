// ============================================
// CORE GAME ENGINE - MAIN LOGIC & RENDERING
// ============================================

const TILE = 60;
const FLOOR = 0, WALL = 1, HIDE = 2, EXIT = 3, COIN = 5, TRAP = 6, RICE = 7, BOMB = 8;

// Global game state
let grid, player, enemies = [], activeBombs = [], turnCount = 1;
let selectMode = 'move', gameOver = false, playerTurn = true, shake = 0, mapDim = 12;
let stats = { kills: 0, coins: 0, itemsUsed: 0 };
let inv = { trap: 3, rice: 2, bomb: 1 };
let camX = 0, camY = 0, zoom = 1.0;
let showMinimap = false;
let showHighlights = true; // Always true now
let highlightedTiles = [];
let hasReachedExit = false; // Track if player reached exit

// Canvas and rendering
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const sprites = {};

// Mode colors for highlighting
const modeColors = {
    'move': { fill: 'rgba(0, 210, 255, 0.15)', border: 'rgba(0, 210, 255, 0.7)', glow: 'rgba(0, 210, 255, 0.3)' },
    'trap': { fill: 'rgba(255, 100, 100, 0.15)', border: 'rgba(255, 100, 100, 0.7)', glow: 'rgba(255, 100, 100, 0.3)' },
    'rice': { fill: 'rgba(255, 255, 100, 0.15)', border: 'rgba(255, 255, 100, 0.7)', glow: 'rgba(255, 255, 100, 0.3)' },
    'bomb': { fill: 'rgba(255, 50, 150, 0.15)', border: 'rgba(255, 50, 150, 0.7)', glow: 'rgba(255, 50, 150, 0.3)' }
};

// ============================================
// INITIALIZATION
// ============================================

function initGame() {
    mapDim = Math.min(20, Math.max(8, parseInt(document.getElementById('mapSize').value) || 12));
    
    // Reset exit reached flag
    hasReachedExit = false;
    
    // Remove highlight toggle from menu and always show highlights
    showHighlights = true;
    
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('toolbar').classList.remove('hidden');
    document.getElementById('ui-controls').classList.remove('hidden');
    document.getElementById('modeIndicator').classList.remove('hidden');
    document.getElementById('rangeIndicator').classList.remove('hidden');
    
    generateLevel();
    centerCamera();
    updateToolCounts();
    updateModeIndicator();
    requestAnimationFrame(gameLoop);
}

function generateLevel() {
    canvas.width = window.innerWidth; 
    canvas.height = window.innerHeight;
    
    // Generate grid
    grid = Array.from({length: mapDim}, (_, y) => 
        Array.from({length: mapDim}, (_, x) => 
            (x==0 || y==0 || x==mapDim-1 || y==mapDim-1) ? WALL : 
            Math.random() < 0.18 ? WALL : 
            Math.random() < 0.08 ? HIDE : FLOOR
        )
    );
    
    // Initialize player
    player = { x: 1, y: 1, ax: 1, ay: 1, isHidden: false, dir: {x: 0, y: 0} };
    grid[mapDim-2][mapDim-2] = EXIT;
    
    // Add some coins
    for(let i = 0; i < 3; i++) {
        let cx, cy;
        do {
            cx = rand(mapDim);
            cy = rand(mapDim);
        } while(grid[cy][cx] !== FLOOR || Math.hypot(cx-player.x, cy-player.y) < 3);
        grid[cy][cx] = COIN;
    }
    
    // Initialize enemies with random vision range (1-3 tiles)
    const gc = Math.min(15, Math.max(1, parseInt(document.getElementById('guardCount').value) || 5));
    enemies = [];
    for(let i=0; i<gc; i++){
        let ex, ey; 
        do { 
            ex = rand(mapDim); 
            ey = rand(mapDim); 
        } while(grid[ey][ex] !== FLOOR || Math.hypot(ex-player.x, ey-player.y) < 4);
        
        // Random vision range: 1 to 3 tiles
        const visionRange = Math.floor(Math.random() * 3) + 1;
        
        enemies.push({
            x: ex, y: ey, 
            ax: ex, ay: ey, 
            dir: {x: 1, y: 0}, 
            alive: true,
            visionRange: visionRange, // Actual sight distance (1-3 tiles)
            state: 'patrolling',
            investigationTarget: null,
            investigationTurns: 0,
            thought: '',
            thoughtTimer: 0,
            poisonTimer: 0,
            poisonCounter: 0,
            hearingRange: 6,
            hasHeardSound: false,
            soundLocation: null,
            returnToPatrolPos: {x: ex, y: ey}
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
        // Fallback if image fails to load
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
        // Fallback colored squares
        ctx.fillStyle = '#666';
        ctx.fillRect(x*TILE, y*TILE, TILE, TILE);
    }
}

function drawTileHighlight(x, y, colorSet, pulse = true) {
    const time = Date.now() / 1000;
    const pulseFactor = pulse ? (Math.sin(time * 6) * 0.1 + 0.9) : 1;
    
    // Inner glow
    ctx.fillStyle = colorSet.fill;
    ctx.fillRect(x*TILE + 4, y*TILE + 4, TILE - 8, TILE - 8);
    
    // Border
    ctx.strokeStyle = colorSet.border;
    ctx.lineWidth = 3;
    ctx.strokeRect(x*TILE + 2, y*TILE + 2, TILE - 4, TILE - 4);
    
    // Outer glow
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
    
    // Corner accents
    ctx.fillStyle = colorSet.border;
    const cornerSize = 6;
    ctx.fillRect(x*TILE + 2, y*TILE + 2, cornerSize, 2);
    ctx.fillRect(x*TILE + 2, y*TILE + 2, 2, cornerSize);
    ctx.fillRect(x*TILE + TILE - cornerSize - 2, y*TILE + 2, cornerSize, 2);
    ctx.fillRect(x*TILE + TILE - 2, y*TILE + 2, 2, cornerSize);
    ctx.fillRect(x*TILE + 2, y*TILE + TILE - 2, cornerSize, 2);
    ctx.fillRect(x*TILE + 2, y*TILE + TILE - cornerSize - 2, 2, cornerSize);
    ctx.fillRect(x*TILE + TILE - cornerSize - 2, y*TILE + TILE - 2, cornerSize, 2);
    ctx.fillRect(x*TILE + TILE - 2, y*TILE + TILE - cornerSize - 2, 2, cornerSize);
}

function calculateHighlightedTiles() {
    highlightedTiles = [];
    if(!playerTurn) return;
    
    const range = 2;
    const colorSet = modeColors[selectMode];
    
    for(let dy = -range; dy <= range; dy++) {
        for(let dx = -range; dx <= range; dx++) {
            const tx = player.x + dx;
            const ty = player.y + dy;
            
            if(tx < 0 || ty < 0 || tx >= mapDim || ty >= mapDim) continue;
            
            const dist = Math.max(Math.abs(dx), Math.abs(dy));
            if(dist > range) continue;
            
            const tile = grid[ty][tx];
            
            if(selectMode === 'move') {
                if(tile !== WALL && tile !== undefined) {
                    highlightedTiles.push({
                        x: tx, y: ty, 
                        color: colorSet,
                        type: tile === EXIT ? 'exit' : 
                              tile === HIDE ? 'hide' : 
                              tile === COIN ? 'coin' : 'move'
                    });
                }
            } else {
                if(tile === FLOOR) {
                    highlightedTiles.push({
                        x: tx, y: ty, 
                        color: colorSet,
                        type: selectMode
                    });
                }
            }
        }
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

    // Draw floor and walls
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

    // Calculate and draw highlights
    if(playerTurn) {
        calculateHighlightedTiles();
        highlightedTiles.forEach(tile => {
            drawTileHighlight(tile.x, tile.y, tile.color);
            
            // Add special icons for special tiles
            if(tile.type === 'exit') {
                ctx.fillStyle = "rgba(0, 255, 100, 0.3)";
                ctx.fillRect(tile.x*TILE + 15, tile.y*TILE + 15, TILE - 30, TILE - 30);
            } else if(tile.type === 'coin') {
                ctx.fillStyle = "rgba(255, 215, 0, 0.3)";
                ctx.beginPath();
                ctx.arc(tile.x*TILE + TILE/2, tile.y*TILE + TILE/2, 15, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }

    // Draw enemies
    enemies.forEach(e => {
        if(!e.alive) return;
        
        // Draw guard with state-based tint
        if(e.state === 'alerted') {
            ctx.fillStyle = "rgba(255, 50, 50, 0.3)";
            ctx.fillRect(e.ax * TILE, e.ay * TILE, TILE, TILE);
        } else if(e.state === 'investigating') {
            ctx.fillStyle = "rgba(255, 200, 50, 0.3)";
            ctx.fillRect(e.ax * TILE, e.ay * TILE, TILE, TILE);
        } else if(e.state === 'eating') {
            ctx.fillStyle = "rgba(50, 255, 50, 0.3)";
            ctx.fillRect(e.ax * TILE, e.ay * TILE, TILE, TILE);
        } else if(e.state === 'poisoned') {
            ctx.fillStyle = "rgba(255, 0, 255, 0.3)";
            ctx.fillRect(e.ax * TILE, e.ay * TILE, TILE, TILE);
        }
        
        drawSprite('guard', e.ax, e.ay);
        
        // Draw thought bubble
        if(e.thought && e.thoughtTimer > 0) {
            drawThoughtBubble(e);
            e.thoughtTimer--;
        }
        
        // Draw vision cone
        if(!player.isHidden && e.state !== 'dead') {
            drawVisionCone(e);
        }
    });

    // Draw player with shadow
    ctx.shadowColor = player.isHidden ? 'rgba(0, 210, 255, 0.5)' : 'rgba(255, 255, 255, 0.3)';
    ctx.shadowBlur = 15;
    drawSprite('player', player.ax, player.ay);
    ctx.shadowBlur = 0;

    // Draw active bombs with timer
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
    
    shake *= 0.8;
    requestAnimationFrame(gameLoop);
}

function drawThoughtBubble(e) {
    // Draw bubble background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(e.ax * TILE + TILE/2, e.ay * TILE - 10, 12, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw bubble border
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(e.ax * TILE + TILE/2, e.ay * TILE - 10, 12, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw thought emoji
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000';
    ctx.fillText(e.thought, e.ax * TILE + TILE/2, e.ay * TILE - 10);
}

function drawVisionCone(e) {
    // Use the actual vision range for drawing (1-3 tiles)
    const drawRange = e.visionRange || 2;
    
    // More visible vision cone with gradient
    const gradient = ctx.createRadialGradient(
        e.ax * TILE + 30, e.ay * TILE + 30, 5,
        e.ax * TILE + 30, e.ay * TILE + 30, drawRange * TILE
    );
    
    if(e.state === 'alerted') {
        // Bright red when alerted
        gradient.addColorStop(0, 'rgba(255, 0, 0, 0.6)');
        gradient.addColorStop(0.3, 'rgba(255, 50, 50, 0.4)');
        gradient.addColorStop(0.7, 'rgba(255, 100, 100, 0.2)');
        gradient.addColorStop(1, 'rgba(255, 150, 150, 0)');
    } else if(e.state === 'investigating') {
        // Orange when investigating
        gradient.addColorStop(0, 'rgba(255, 165, 0, 0.5)');
        gradient.addColorStop(0.3, 'rgba(255, 195, 50, 0.3)');
        gradient.addColorStop(0.7, 'rgba(255, 215, 100, 0.1)');
        gradient.addColorStop(1, 'rgba(255, 235, 150, 0)');
    } else if(e.state === 'eating' || e.state === 'poisoned') {
        // Green when eating, purple when poisoned
        const color = e.state === 'eating' ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 0, 255, 0.5)';
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.5, color.replace('0.5', '0.2'));
        gradient.addColorStop(1, color.replace('0.5', '0'));
    } else {
        // Normal red vision
        gradient.addColorStop(0, 'rgba(255, 100, 100, 0.4)');
        gradient.addColorStop(0.3, 'rgba(255, 150, 150, 0.2)');
        gradient.addColorStop(0.7, 'rgba(255, 200, 200, 0.1)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    }
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(e.ax * TILE + 30, e.ay * TILE + 30);
    
    const baseA = Math.atan2(e.dir.y, e.dir.x);
    const visionAngle = 0.7; // Fixed cone angle (140 degrees total)
    
    // Draw the vision cone with proper wall blocking
    const rayCount = 20; // More rays for smoother cone
    for(let i = 0; i <= rayCount; i++) {
        const angle = baseA - visionAngle + (2 * visionAngle * i / rayCount);
        let maxDistance = drawRange;
        
        // Cast ray to find max visible distance
        for(let d = 0.1; d <= drawRange; d += 0.1) {
            const checkX = Math.floor(e.x + Math.cos(angle) * d);
            const checkY = Math.floor(e.y + Math.sin(angle) * d);
            
            // Check bounds
            if(checkX < 0 || checkX >= mapDim || checkY < 0 || checkY >= mapDim) {
                maxDistance = d - 0.1;
                break;
            }
            
            // Check for walls
            if(grid[checkY][checkX] === WALL) {
                maxDistance = d - 0.1;
                break;
            }
        }
        
        // Draw this edge of the cone
        ctx.lineTo(
            e.ax * TILE + 30 + Math.cos(angle) * maxDistance * TILE,
            e.ay * TILE + 30 + Math.sin(angle) * maxDistance * TILE
        );
    }
    
    ctx.closePath();
    ctx.fill();
    
    // Draw outline for better visibility
    ctx.strokeStyle = e.state === 'alerted' ? 'rgba(255, 0, 0, 0.8)' : 
                     e.state === 'investigating' ? 'rgba(255, 165, 0, 0.6)' :
                     e.state === 'eating' ? 'rgba(0, 255, 0, 0.6)' :
                     e.state === 'poisoned' ? 'rgba(255, 0, 255, 0.6)' :
                     'rgba(255, 100, 100, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw vision range indicator (subtle circle at max range)
    ctx.strokeStyle = e.state === 'alerted' ? 'rgba(255, 0, 0, 0.3)' : 'rgba(255, 100, 100, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]); // Dashed line
    ctx.beginPath();
    ctx.arc(e.ax * TILE + 30, e.ay * TILE + 30, drawRange * TILE, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash
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
    
    // Player on minimap
    ctx.fillStyle = "#00d2ff";
    ctx.beginPath();
    ctx.arc(mx + player.x*ms + ms/2, my + 5 + player.y*ms + ms/2, ms/2, 0, Math.PI*2);
    ctx.fill();
    
    // Enemies on minimap
    enemies.filter(e => e.alive).forEach(e => {
        const enemyColor = e.state === 'alerted' ? "#ff0000" :
                          e.state === 'investigating' ? "#ff9900" :
                          e.state === 'eating' ? "#00ff00" :
                          e.state === 'poisoned' ? "#ff00ff" : "#ff3333";
        ctx.fillStyle = enemyColor;
        ctx.fillRect(mx + e.x*ms, my + 5 + e.y*ms, ms, ms);
        
        // Draw vision range on minimap
        ctx.strokeStyle = enemyColor + "80"; // Semi-transparent
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(mx + e.x*ms + ms/2, my + 5 + e.y*ms + ms/2, (e.visionRange || 2) * ms, 0, Math.PI * 2);
        ctx.stroke();
    });
}

// ============================================
// CAMERA & UI FUNCTIONS
// ============================================

function centerCamera() {
    camX = (canvas.width/2) - (player.x*TILE + TILE/2)*zoom;
    camY = (canvas.height/2) - (player.y*TILE + TILE/2)*zoom;
    clampCamera();
}

function clampCamera() {
    const mapSize = mapDim * TILE * zoom;
    const pad = 100;
    camX = Math.min(pad, Math.max(camX, canvas.width - mapSize - pad));
    camY = Math.min(pad, Math.max(camY, canvas.height - mapSize - pad));
}

function toggleMinimap() { 
    showMinimap = !showMinimap; 
}

function updateModeIndicator() {
    const indicator = document.getElementById('modeIndicator');
    const modeName = selectMode.toUpperCase();
    indicator.innerHTML = `Mode: <span class="mode-name">${modeName}</span>`;
    
    const colors = {
        'move': '#00d2ff',
        'trap': '#ff6464',
        'rice': '#ffff64',
        'bomb': '#ff3296'
    };
    indicator.style.borderLeftColor = colors[selectMode] || '#00d2ff';
}

function updateToolCounts() {
    document.getElementById('trapCount').textContent = inv.trap;
    document.getElementById('riceCount').textContent = inv.rice;
    document.getElementById('bombCount').textContent = inv.bomb;
}

// ============================================
// TURN PROCESSING
// ============================================

async function endTurn() {
    // If player already reached exit, don't process enemies
    if(hasReachedExit) {
        turnCount++; 
        playerTurn = true;
        return;
    }
    
    // Process Bombs
    let exploding = [];
    activeBombs = activeBombs.filter(b => {
        b.t--;
        if(b.t <= 0) { 
            exploding.push(b); 
            return false; 
        }
        return true;
    });

    // Handle bomb explosions
    exploding.forEach(b => {
        grid[b.y][b.x] = FLOOR; 
        shake = 20; 
        log("BOOM!", "#f44");
        
        // Alert nearby enemies to the sound
        enemies.forEach(e => {
            if(e.alive && e.state !== 'dead') {
                const dist = Math.hypot(e.x - b.x, e.y - b.y);
                if(dist <= e.hearingRange) {
                    e.hasHeardSound = true;
                    e.soundLocation = {x: b.x, y: b.y};
                    e.investigationTurns = 5;
                    e.state = 'investigating';
                    e.thought = '👂';
                    e.thoughtTimer = 3;
                }
            }
        });
        
        // Kill enemies in blast radius
        enemies.forEach(e => { 
            if(e.alive && Math.abs(e.x-b.x)<=1 && Math.abs(e.y-b.y)<=1) { 
                e.alive = false; 
                e.state = 'dead';
                stats.kills++;
                log("Guard eliminated by explosion!", "#0f0");
            }
        });
    });

    // Process all enemies
    for(let e of enemies.filter(g => g.alive)) {
        await processEnemyTurn(e);
    }
    
    turnCount++; 
    playerTurn = true;
}

function checkGameOver() {
    // Don't game over if player already reached exit
    if(hasReachedExit) return;
    
    gameOver = true; 
    document.getElementById('gameOverScreen').classList.remove('hidden');
    log("YOU WERE SPOTTED!", "#f00");
}

// ============================================
// INPUT HANDLING
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
        zoom = Math.min(2, Math.max(0.5, zoom * (dist/lastDist)));
        lastDist = dist;
    } else {
        const dx = e.touches[0].pageX - lastTouch.x;
        const dy = e.touches[0].pageY - lastTouch.y;
        if(Math.hypot(dx, dy) > 10) { 
            isDragging = true; 
            camX += dx; 
            camY += dy; 
            lastTouch = {x: e.touches[0].pageX, y: e.touches[0].pageY};
        }
    }
    clampCamera();
}, {passive: false});

canvas.addEventListener('touchend', e => {
    if(isDragging || !playerTurn || gameOver || e.touches.length > 0) return;
    
    const rect = canvas.getBoundingClientRect();
    const tx = Math.floor(((lastTouch.x - rect.left - camX)/zoom)/TILE);
    const ty = Math.floor(((lastTouch.y - rect.top - camY)/zoom)/TILE);
    
    if(grid[ty]?.[tx] === undefined || grid[ty][tx] === WALL) return;
    
    const dist = Math.max(Math.abs(tx - player.x), Math.abs(ty - player.y));
    const isValidMove = highlightedTiles.some(t => t.x === tx && t.y === ty);

    if(selectMode === 'move' && dist <= 2 && isValidMove) {
        // Call handlePlayerMove - it will handle pathfinding
        handlePlayerMove(tx, ty);
    } else if(selectMode !== 'move' && dist <= 2 && grid[ty][tx] === FLOOR && isValidMove) {
        handleItemPlacement(tx, ty, selectMode);
    } else if(!isValidMove) {
        log("Out of range!", "#f00");
    }
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

function log(msg, color="#aaa") {
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
    updateModeIndicator();
    // No log message for mode change
}

function playerWait() { 
    if(playerTurn) { 
        playerTurn = false; 
        log("Waiting...", "#aaa");
        endTurn(); 
    } 
}

function showVictoryStats() {
    const statsTable = document.getElementById('statsTable');
    const rankLabel = document.getElementById('rankLabel');
    
    // Calculate score with minimum of 0 (no negative scores)
    let score = Math.max(0, stats.kills * 100 + stats.coins * 50 - turnCount * 5 - stats.itemsUsed * 10);
    
    // Tenchu-style rankings
    let rank = "Novice";
    let rankDescription = "";
    
    if(score >= 1000) {
        rank = "Grand Master";
        rankDescription = "Perfect stealth, maximum efficiency";
    } else if(score >= 750) {
        rank = "Shadow Master";
        rankDescription = "Flawless execution, unseen and unheard";
    } else if(score >= 500) {
        rank = "Master Ninja";
        rankDescription = "Superior technique, few could match";
    } else if(score >= 350) {
        rank = "Expert";
        rankDescription = "Skilled infiltration, clean work";
    } else if(score >= 200) {
        rank = "Adept";
        rankDescription = "Competent performance, room for improvement";
    } else if(score >= 100) {
        rank = "Assassin";
        rankDescription = "Ruthless but sloppy";
    } else if(score >= 50) {
        rank = "Initiate";
        rankDescription = "Basic skills shown";
    } else {
        rank = "Novice";
        rankDescription = "Survived, but barely";
    }
    
    // Set the data-rank attribute for CSS styling
    rankLabel.setAttribute('data-rank', rank);
    rankLabel.textContent = rank;
    
    statsTable.innerHTML = `
        <div><span>Mission Complete</span></div>
        <div><span>Turns Taken:</span><span>${turnCount}</span></div>
        <div><span>Guards Eliminated:</span><span>${stats.kills}</span></div>
        <div><span>Gold Collected:</span><span>${stats.coins}</span></div>
        <div><span>Items Used:</span><span>${stats.itemsUsed}</span></div>
        <div style="border-top: 1px solid rgba(255,255,255,0.2); margin-top: 10px; padding-top: 10px;">
            <span>Final Score:</span><span style="color: var(--accent); font-weight: bold;">${score}</span>
        </div>
        <div style="font-size: 12px; margin-top: 15px; color: #aaa; font-style: italic;">${rankDescription}</div>
    `;
}

// ============================================
// LINE OF SIGHT CHECKING (for enemies)
// ============================================

function checkLineOfSightRay(x0, y0, x1, y1) {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = (x0 < x1) ? 1 : -1;
    const sy = (y0 < y1) ? 1 : -1;
    let err = dx - dy;
    
    let currentX = x0;
    let currentY = y0;
    
    // Don't check starting position
    let firstStep = true;
    
    while(true) {
        if(!firstStep) {
            // If we hit a wall, line of sight is blocked
            if(grid[currentY][currentX] === WALL) {
                return false;
            }
        }
        firstStep = false;
        
        // If we reached the target
        if(currentX === x1 && currentY === y1) {
            return true;
        }
        
        const e2 = 2 * err;
        if(e2 > -dy) {
            err -= dy;
            currentX += sx;
        }
        if(e2 < dx) {
            err += dx;
            currentY += sy;
        }
    }
}

function hasLineOfSight(e, px, py) {
    // Don't check if player has reached exit
    if(hasReachedExit) return false;
    
    // Calculate distance
    const dx = px - e.x;
    const dy = py - e.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Can't see beyond their vision range (1-3 tiles)
    if(distance > e.visionRange) return false;
    
    // Check if player is within vision cone angle
    const angleToPlayer = Math.atan2(dy, dx);
    const enemyAngle = Math.atan2(e.dir.y, e.dir.x);
    let angleDiff = Math.abs(angleToPlayer - enemyAngle);
    
    // Normalize angle difference to 0-PI range
    if(angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
    
    // Vision cone is 140 degrees (0.7 radians each side)
    if(angleDiff > 0.7) return false;
    
    // Use ray casting for wall checking
    return checkLineOfSightRay(e.x, e.y, px, py);
}

// ============================================
// INITIALIZATION ON LOAD
// ============================================

window.addEventListener('load', () => {
    loadSprites();
});

// Export functions that other scripts need
window.animMove = animMove;
window.log = log;
window.checkGameOver = checkGameOver;
window.hasLineOfSight = hasLineOfSight;
window.checkLineOfSightRay = checkLineOfSightRay;