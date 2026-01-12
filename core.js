const TILE = 60;
const FLOOR=0, WALL=1, HIDE=2, EXIT=3, COIN=5, TRAP=6, RICE=7, BOMB=8;

let grid, player, enemies, activeBombs = [], turnCount = 1;
let selectMode = 'move', gameOver = false, playerTurn = true, shake = 0, mapDim = 12;
let stats = { kills: 0, coins: 0, itemsUsed: 0 };
let inv = { trap: 3, rice: 2, bomb: 1 };
let camX = 0, camY = 0, isDragging = false, lastMouse = {x:0, y:0};
let useMinimap = true;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const sprites = {};

// Improved Asset Loading
const assetNames = ['player', 'guard', 'wall', 'floor', 'exit', 'trap', 'rice', 'bomb', 'coin', 'hide'];
let loadedCount = 0;
assetNames.forEach(n => {
    const img = new Image();
    img.src = `sprites/${n}.png`;
    img.onload = () => { loadedCount++; sprites[n] = img; };
    img.onerror = () => { loadedCount++; console.warn(`Sprite missing: ${n}`); };
});

function log(msg, color="#aaa") {
    const div = document.createElement('div');
    div.className = 'log-entry';
    div.style.color = color;
    div.innerText = `> ${msg}`;
    const container = document.getElementById('missionLog');
    container.prepend(div);
}

function centerCamera() {
    camX = (canvas.width / 2) - (player.x * TILE + TILE / 2);
    camY = (canvas.height / 2) - (player.y * TILE + TILE / 2);
    clampCamera();
}

function clampCamera() {
    const minX = canvas.width - (mapDim * TILE);
    const minY = canvas.height - (mapDim * TILE);
    camX = Math.min(0, Math.max(camX, minX));
    camY = Math.min(0, Math.max(camY, minY));
}

function initGame() {
    mapDim = Math.min(20, parseInt(document.getElementById('mapSize').value));
    useMinimap = document.getElementById('showMinimap').checked;
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
    if(sprites[n]) {
        ctx.drawImage(sprites[n], px, py, TILE, TILE);
    } else {
        // Fallback shapes if sprites are missing
        ctx.beginPath();
        if(n === 'player') { ctx.fillStyle="#00d2ff"; ctx.arc(px+30, py+30, 16, 0, 7); ctx.fill(); }
        else if(n === 'guard') { ctx.fillStyle="#ff3333"; ctx.fillRect(px+15, py+15, 30, 30); }
        else if(n === 'wall') { ctx.fillStyle="#1a1a1a"; ctx.fillRect(px,py,TILE,TILE); }
        else if(n === 'floor') { ctx.fillStyle="#080808"; ctx.fillRect(px,py,TILE,TILE); }
    }
}

function gameLoop() {
    if(gameOver) return;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle = "#000"; ctx.fillRect(0,0,canvas.width,canvas.height);

    const s = (Math.random()-0.5)*shake;
    ctx.translate(camX + s, camY + s);

    // Draw Floor & World
    for(let y=0; y<mapDim; y++) for(let x=0; x<mapDim; x++) {
        drawSprite('floor', x, y);
        const cell = grid[y][x];
        if(cell !== FLOOR) drawSprite(['','wall','hide','exit','','coin','trap','rice','bomb'][cell], x, y);
    }

    // Highlighting Move/Items
    if(playerTurn) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = (selectMode === 'move') ? "rgba(0, 210, 255, 0.5)" : "rgba(255, 50, 50, 0.5)";
        for(let dy=-2; dy<=2; dy++) for(let dx=-2; dx<=2; dx++) {
            let tx = player.x + dx, ty = player.y + dy;
            if(tx > 0 && tx < mapDim-1 && ty > 0 && ty < mapDim-1 && grid[ty][tx] !== WALL) {
                ctx.strokeRect(tx*TILE+5, ty*TILE+5, TILE-10, TILE-10);
            }
        }
    }

    // Enemies
    enemies.forEach(e => {
        if(!e.alive) return;
        drawSprite('guard', e.ax, e.ay);
        if(e.alert) { ctx.fillStyle="#fff"; ctx.font="bold 20px Arial"; ctx.fillText("!", e.ax*TILE+25, e.ay*TILE-5); }
        
        // Vision Cone
        ctx.fillStyle = "rgba(255, 0, 0, 0.1)";
        ctx.beginPath(); ctx.moveTo(e.ax*TILE+30, e.ay*TILE+30);
        const baseA = Math.atan2(e.dir.y, e.dir.x);
        for(let a = baseA-0.7; a <= baseA+0.7; a += 0.1) {
            let d = 0; while(d < e.range) { d += 0.2; if(grid[Math.floor(e.y + Math.sin(a)*d)]?.[Math.floor(e.x + Math.cos(a)*d)] === WALL) break; }
            ctx.lineTo(e.ax*TILE+30 + Math.cos(a)*d*TILE, e.ay*TILE+30 + Math.sin(a)*d*TILE);
        }
        ctx.fill();
    });

    drawSprite('player', player.ax, player.ay);

    // Mini-map
    if(useMinimap) {
        ctx.setTransform(1,0,0,1,0,0);
        const ms = 4; // Mini-map scale
        ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(10, 70, mapDim*ms, mapDim*ms);
        for(let y=0; y<mapDim; y++) for(let x=0; x<mapDim; x++) {
            if(grid[y][x] === WALL) { ctx.fillStyle="#444"; ctx.fillRect(10+x*ms, 70+y*ms, ms, ms); }
        }
        ctx.fillStyle="#00d2ff"; ctx.fillRect(10+player.x*ms, 70+player.y*ms, ms, ms);
    }

    shake *= 0.8;
    requestAnimationFrame(gameLoop);
}
