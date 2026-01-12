/**
 * SHADOW PROTOCOL: CORE ENGINE
 * Logic: Grid, Camera (Zoom/Pan), Rendering, & Logging
 */

const TILE = 60;
// Cell Types
const FLOOR = 0, WALL = 1, HIDE = 2, EXIT = 3, COIN = 5, TRAP = 6, RICE = 7, BOMB = 8;

// Game State
let grid, player, enemies, activeBombs = [], turnCount = 1;
let selectMode = 'move', gameOver = false, playerTurn = true, shake = 0, mapDim = 12;
let stats = { kills: 0, coins: 0, itemsUsed: 0 };
let inv = { trap: 3, rice: 2, bomb: 1 };

// Camera & Touch State
let camX = 0, camY = 0, zoom = 1.0;
const minZoom = 0.5, maxZoom = 2.0;
let showMinimap = false;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const sprites = {};

// --- ASSET LOADING ---
const assetNames = ['player', 'guard', 'wall', 'floor', 'exit', 'trap', 'rice', 'bomb', 'coin', 'hide'];
let assetsLoaded = 0;
assetNames.forEach(n => {
    const img = new Image();
    img.src = `sprites/${n}.png`;
    img.onload = () => { assetsLoaded++; sprites[n] = img; };
    img.onerror = () => { assetsLoaded++; console.warn(`Asset failed: ${n}`); };
});

// --- FEEDBACK & LOGS ---
function log(msg, color = "#aaa") {
    const container = document.getElementById('missionLog');
    if (!container) return;

    const entry = document.createElement('div');
    entry.style.color = color;
    entry.style.padding = "2px 0";
    entry.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
    entry.innerText = `> ${msg}`;
    
    container.prepend(entry);
    if (container.children.length > 6) container.removeChild(container.lastChild);
}

// --- CAMERA LOGIC ---
function centerCamera() {
    // Calculates the offset to keep player at screen center based on current zoom
    camX = (canvas.width / 2) - (player.x * TILE + TILE / 2) * zoom;
    camY = (canvas.height / 2) - (player.y * TILE + TILE / 2) * zoom;
    clampCamera();
}

function clampCamera() {
    const mapSizePxl = mapDim * TILE * zoom;
    // Padding allows the user to pan slightly past the map edge
    const padX = canvas.width * 0.4;
    const padY = canvas.height * 0.4;

    const minX = canvas.width - mapSizePxl - padX;
    const maxX = padX;
    const minY = canvas.height - mapSizePxl - padY;
    const maxY = padY;

    camX = Math.min(maxX, Math.max(camX, minX));
    camY = Math.min(maxY, Math.max(camY, minY));
}

// --- INITIALIZATION ---
function initGame() {
    // Reset State
    gameOver = false;
    playerTurn = true;
    turnCount = 1;
    activeBombs = [];
    document.getElementById('missionLog').innerHTML = '';
    
    mapDim = Math.min(20, parseInt(document.getElementById('mapSize').value) || 12);
    
    // UI Transitions
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('toolbar').classList.remove('hidden');
    document.getElementById('ui-controls').classList.remove('hidden');
    
    generateLevel();
    centerCamera();
    log("Infiltration initialized.", "#d4af37");
    
    requestAnimationFrame(gameLoop);
}

function generateLevel() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Create Grid
    grid = Array.from({length: mapDim}, (_, y) => Array.from({length: mapDim}, (_, x) => 
        (x==0 || y==0 || x==mapDim-1 || y==mapDim-1) ? WALL : Math.random() < 0.18 ? WALL : Math.random() < 0.08 ? HIDE : FLOOR
    ));
    
    player = { x: 1, y: 1, ax: 1, ay: 1, isHidden: false };
    grid[mapDim-2][mapDim-2] = EXIT;
    
    // Spawn Guards
    const gc = Math.min(15, parseInt(document.getElementById('guardCount').value) || 5);
    enemies = [];
    for(let i=0; i<gc; i++) {
        let ex, ey; 
        do { ex = rand(mapDim); ey = rand(mapDim); } 
        while(grid[ey][ex] !== FLOOR || Math.hypot(ex-player.x, ey-player.y) < 4);
        
        enemies.push({ x: ex, y: ey, ax: ex, ay: ey, dir: {x:1, y:0}, alive: true, range: 4, distracted: 0, alert: false });
    }
}

// --- MAIN RENDER LOOP ---
function gameLoop() {
    if(gameOver) return;

    // Clear Screen
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply Camera Transform
    const s = (Math.random() - 0.5) * shake;
    ctx.translate(camX + s, camY + s);
    ctx.scale(zoom, zoom);

    // 1. Draw Map Tiles
    for(let y=0; y<mapDim; y++) {
        for(let x=0; x<mapDim; x++) {
            drawSprite('floor', x, y);
            const cell = grid[y][x];
            if(cell !== FLOOR) {
                const names = ['', 'wall', 'hide', 'exit', '', 'coin', 'trap', 'rice', 'bomb'];
                drawSprite(names[cell], x, y);
            }
        }
    }

    // 2. Interaction Highlights
    if(playerTurn) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = (selectMode === 'move') ? "rgba(0, 210, 255, 0.4)" : "rgba(255, 50, 50, 0.4)";
        for(let dy=-2; dy<=2; dy++) {
            for(let dx=-2; dx<=2; dx++) {
                let tx = player.x + dx, ty = player.y + dy;
                if(tx > 0 && tx < mapDim-1 && ty > 0 && ty < mapDim-1 && grid[ty][tx] !== WALL) {
                    ctx.strokeRect(tx*TILE+8, ty*TILE+8, TILE-16, TILE-16);
                }
            }
        }
    }

    // 3. Draw Enemies & Vision
    enemies.forEach(e => {
        if(!e.alive) return;
        drawSprite('guard', e.ax, e.ay);
        
        // Alert Icon (Independent of scale for clarity)
        if(e.alert) {
            ctx.save();
            ctx.setTransform(1,0,0,1,0,0);
            ctx.fillStyle="#ffea00"; ctx.font="bold 30px Arial";
            ctx.fillText("!", camX + (e.ax*TILE+25)*zoom, camY + (e.ay*TILE-10)*zoom);
            ctx.restore();
        }

        // Vision Cone
        ctx.fillStyle = "rgba(255, 50, 50, 0.12)";
        ctx.beginPath();
        ctx.moveTo(e.ax*TILE+30, e.ay*TILE+30);
        const baseA = Math.atan2(e.dir.y, e.dir.x);
        for(let a = baseA-0.7; a <= baseA+0.7; a += 0.1) {
            let d = 0; 
            while(d < e.range) { 
                d += 0.2; 
                if(grid[Math.floor(e.y + Math.sin(a)*d)]?.[Math.floor(e.x + Math.cos(a)*d)] === WALL) break; 
            }
            ctx.lineTo(e.ax*TILE+30 + Math.cos(a)*d*TILE, e.ay*TILE+30 + Math.sin(a)*d*TILE);
        }
        ctx.fill();
    });

    // 4. Draw Player
    if (!player.isHidden || turnCount % 2 === 0) { // Slight flicker when hidden
        drawSprite('player', player.ax, player.ay);
    }

    // 5. Mini-Map Overlay
    if(showMinimap) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const ms = 6;
        const mmX = canvas.width - (mapDim * ms) - 20;
        ctx.fillStyle = "rgba(0,0,0,0.85)";
        ctx.fillRect(mmX-5, 65, (mapDim*ms)+10, (mapDim*ms)+10);
        for(let y=0; y<mapDim; y++) {
            for(let x=0; x<mapDim; x++) {
                if(grid[y][x] === WALL) { ctx.fillStyle="#444"; ctx.fillRect(mmX+x*ms, 70+y*ms, ms, ms); }
            }
        }
        ctx.fillStyle="#00d2ff"; ctx.fillRect(mmX+player.x*ms, 70+player.y*ms, ms, ms);
    }

    shake *= 0.8;
    requestAnimationFrame(gameLoop);
}

// --- UTILITIES ---
function rand(max) { return Math.floor(Math.random() * (max-2)) + 1; }
function drawSprite(n, x, y) { if(sprites[n]) ctx.drawImage(sprites[n], x*TILE, y*TILE, TILE, TILE); }
function toggleMinimap() { showMinimap = !showMinimap; }

window.addEventListener('resize', () => { 
    canvas.width = window.innerWidth; 
    canvas.height = window.innerHeight; 
    clampCamera(); 
});
