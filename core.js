const TILE = 60;
const FLOOR=0, WALL=1, HIDE=2, EXIT=3, COIN=5, TRAP=6, RICE=7, BOMB=8;

let grid, player, enemies, activeBombs = [], turnCount = 1;
let selectMode = 'move', gameOver = false, playerTurn = true, shake = 0, mapDim = 12;
let stats = { kills: 0, coins: 0, itemsUsed: 0 };
let inv = { trap: 3, rice: 2, bomb: 1 };

let camX = 0, camY = 0, zoom = 1.0;
const minZoom = 0.5, maxZoom = 2.0;
let isDragging = false, lastMouse = {x:0, y:0}, lastDist = 0;
let showMinimap = true;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const sprites = {};

const assetNames = ['player', 'guard', 'wall', 'floor', 'exit', 'trap', 'rice', 'bomb', 'coin', 'hide'];
assetNames.forEach(n => {
    const img = new Image();
    img.src = `sprites/${n}.png`;
    img.onload = () => { sprites[n] = img; };
});

function toggleMinimap() {
    showMinimap = !showMinimap;
}

function centerCamera() {
    camX = (canvas.width / 2) - (player.x * TILE + TILE / 2) * zoom;
    camY = (canvas.height / 2) - (player.y * TILE + TILE / 2) * zoom;
    clampCamera();
}

function clampCamera() {
    const mapSizePxl = mapDim * TILE * zoom;
    // Allow panning but keep the map somewhat visible (padding)
    const padding = 100;
    const minX = canvas.width - mapSizePxl - padding;
    const maxX = padding;
    const minY = canvas.height - mapSizePxl - padding;
    const maxY = padding;

    camX = Math.min(maxX, Math.max(camX, minX));
    camY = Math.min(maxY, Math.max(camY, minY));
}

function initGame() {
    mapDim = Math.min(20, parseInt(document.getElementById('mapSize').value));
    showMinimap = document.getElementById('showMinimap').checked;
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('toolbar').classList.remove('hidden');
    generateLevel();
    centerCamera();
    requestAnimationFrame(gameLoop);
}

function generateLevel() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    grid = Array.from({length: mapDim}, (_, y) => Array.from({length: mapDim}, (_, x) => 
        (x==0 || y==0 || x==mapDim-1 || y==mapDim-1) ? WALL : Math.random() < 0.18 ? WALL : Math.random() < 0.08 ? HIDE : FLOOR
    ));
    player = { x: 1, y: 1, ax: 1, ay: 1, isHidden: false };
    grid[mapDim-2][mapDim-2] = EXIT;
    
    for(let i=0; i<4; i++) {
        let x, y; do { x=rand(mapDim); y=rand(mapDim); } while(grid[y][x]!==FLOOR);
        grid[y][x] = COIN;
    }

    const gc = Math.min(15, parseInt(document.getElementById('guardCount').value));
    enemies = [];
    for(let i=0; i<gc; i++) {
        let ex, ey; do { ex = rand(mapDim); ey = rand(mapDim); } while(grid[ey][ex] !== FLOOR || Math.hypot(ex-player.x, ey-player.y) < 4);
        enemies.push({ x: ex, y: ey, ax: ex, ay: ey, dir: {x:1, y:0}, alive: true, range: 4, distracted: 0, alert: false });
    }
}

function rand(max) { return Math.floor(Math.random() * (max-2)) + 1; }

function drawSprite(n, x, y) {
    const px = x*TILE, py = y*TILE;
    if(sprites[n]) ctx.drawImage(sprites[n], px, py, TILE, TILE);
}

function gameLoop() {
    if(gameOver) return;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle = "#000"; ctx.fillRect(0,0,canvas.width,canvas.height);

    const s = (Math.random()-0.5)*shake;
    ctx.translate(camX + s, camY + s);
    ctx.scale(zoom, zoom);

    for(let y=0; y<mapDim; y++) for(let x=0; x<mapDim; x++) {
        drawSprite('floor', x, y);
        const cell = grid[y][x];
        if(cell !== FLOOR) drawSprite(['','wall','hide','exit','','coin','trap','rice','bomb'][cell], x, y);
    }

    if(playerTurn) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = (selectMode === 'move') ? "rgba(0, 210, 255, 0.6)" : "rgba(255, 50, 50, 0.6)";
        for(let dy=-2; dy<=2; dy++) for(let dx=-2; dx<=2; dx++) {
            let tx = player.x + dx, ty = player.y + dy;
            if(tx > 0 && tx < mapDim-1 && ty > 0 && ty < mapDim-1 && grid[ty][tx] !== WALL) {
                ctx.strokeRect(tx*TILE+5, ty*TILE+5, TILE-10, TILE-10);
            }
        }
    }

    enemies.forEach(e => {
        if(!e.alive) return;
        drawSprite('guard', e.ax, e.ay);
        if(e.alert) { 
            ctx.setTransform(1,0,0,1,0,0);
            const screenX = camX + (e.ax * TILE + 25) * zoom;
            const screenY = camY + (e.ay * TILE - 10) * zoom;
            ctx.fillStyle="#ff0"; ctx.font="bold 30px Arial"; ctx.fillText("!", screenX, screenY);
            ctx.setTransform(1,0,0,1,camX+s,camY+s); ctx.scale(zoom, zoom);
        }
        
        ctx.fillStyle = "rgba(255, 0, 0, 0.15)";
        ctx.beginPath(); ctx.moveTo(e.ax*TILE+30, e.ay*TILE+30);
        const baseA = Math.atan2(e.dir.y, e.dir.x);
        for(let a = baseA-0.7; a <= baseA+0.7; a += 0.1) {
            let d = 0; while(d < e.range) { d += 0.2; if(grid[Math.floor(e.y + Math.sin(a)*d)]?.[Math.floor(e.x + Math.cos(a)*d)] === WALL) break; }
            ctx.lineTo(e.ax*TILE+30 + Math.cos(a)*d*TILE, e.ay*TILE+30 + Math.sin(a)*d*TILE);
        }
        ctx.fill();
    });

    drawSprite('player', player.ax, player.ay);

    // Repositioned Mini-map (Top Right)
    if(showMinimap) {
        ctx.setTransform(1,0,0,1,0,0);
        const ms = 5; 
        const mmX = canvas.width - (mapDim * ms) - 10;
        const mmY = 50; 
        ctx.fillStyle = "rgba(0,0,0,0.85)"; 
        ctx.fillRect(mmX - 2, mmY - 2, (mapDim * ms) + 4, (mapDim * ms) + 4);
        for(let y=0; y<mapDim; y++) for(let x=0; x<mapDim; x++) {
            if(grid[y][x] === WALL) { ctx.fillStyle="#555"; ctx.fillRect(mmX+x*ms, mmY+y*ms, ms, ms); }
            else if(grid[y][x] === EXIT) { ctx.fillStyle="#0f0"; ctx.fillRect(mmX+x*ms, mmY+y*ms, ms, ms); }
        }
        ctx.fillStyle="#00d2ff"; ctx.fillRect(mmX+player.x*ms, mmY+player.y*ms, ms, ms);
    }

    shake *= 0.8;
    requestAnimationFrame(gameLoop);
}

function animMove(obj, tx, ty, speed, cb) {
    const sx = obj.ax, sy = obj.ay; let p = 0;
    if(obj !== player) obj.dir = {x: Math.sign(tx-obj.x), y: Math.sign(ty-obj.y) || obj.dir.y};
    function step() {
        p += speed; obj.ax = sx + (tx-sx)*p; obj.ay = sy + (ty-sy)*p;
        if(p < 1) requestAnimationFrame(step); else { obj.x = tx; obj.y = ty; obj.ax = tx; obj.ay = ty; cb(); }
    }
    step();
}

function showVictory() {
    gameOver = true;
    const score = (stats.kills * 50) + (stats.coins * 100) - (turnCount * 2);
    let rank = "Novice";
    if(score > 500) rank = "Grand Master";
    else if(score > 300) rank = "Expert";
    document.getElementById('rankLabel').innerText = rank;
    document.getElementById('resultScreen').classList.remove('hidden');
}

window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; clampCamera(); });
