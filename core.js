const TILE = 60;
const FLOOR=0, WALL=1, HIDE=2, EXIT=3, COIN=5, TRAP=6, RICE=7, BOMB=8;

let grid, player, enemies, activeBombs = [], turnCount = 1;
let selectMode = 'move', gameOver = false, playerTurn = true, shake = 0, mapDim = 12;
let stats = { kills: 0, coins: 0, itemsUsed: 0 };
let inv = { trap: 3, rice: 2, bomb: 1 };
let camX = 0, camY = 0, zoom = 1.0;
let showMinimap = false; // Starts hidden

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const sprites = {};

// asset loading logic
const assetNames = ['player', 'guard', 'wall', 'floor', 'exit', 'trap', 'rice', 'bomb', 'coin', 'hide'];
assetNames.forEach(n => {
    const img = new Image();
    img.src = `sprites/${n}.png`;
    img.onload = () => { sprites[n] = img; };
});

function toggleMinimap() { showMinimap = !showMinimap; }

function initGame() {
    // Reset Logic
    gameOver = false;
    playerTurn = true;
    turnCount = 1;
    activeBombs = [];
    
    mapDim = Math.min(20, parseInt(document.getElementById('mapSize').value) || 12);
    
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('toolbar').classList.remove('hidden');
    document.getElementById('ui-controls').classList.remove('hidden');
    
    generateLevel();
    centerCamera();
    gameLoop(); // Start the loop
}

function generateLevel() {
    canvas.width = window.innerWidth; 
    canvas.height = window.innerHeight;
    grid = Array.from({length: mapDim}, (_, y) => Array.from({length: mapDim}, (_, x) => 
        (x==0 || y==0 || x==mapDim-1 || y==mapDim-1) ? WALL : Math.random() < 0.18 ? WALL : Math.random() < 0.08 ? HIDE : FLOOR
    ));
    player = { x: 1, y: 1, ax: 1, ay: 1, isHidden: false };
    grid[mapDim-2][mapDim-2] = EXIT;
    
    const gc = Math.min(15, parseInt(document.getElementById('guardCount').value) || 5);
    enemies = [];
    for(let i=0; i<gc; i++) {
        let ex, ey; do { ex = rand(mapDim); ey = rand(mapDim); } while(grid[ey][ex] !== FLOOR || Math.hypot(ex-player.x, ey-player.y) < 4);
        enemies.push({ x: ex, y: ey, ax: ex, ay: ey, dir: {x:1, y:0}, alive: true, range: 4, distracted: 0, alert: false });
    }
}

function centerCamera() {
    camX = (canvas.width / 2) - (player.x * TILE + TILE / 2) * zoom;
    camY = (canvas.height / 2) - (player.y * TILE + TILE / 2) * zoom;
    clampCamera();
}

function clampCamera() {
    const mapSizePxl = mapDim * TILE * zoom;
    const padding = 150;
    const minX = canvas.width - mapSizePxl - padding;
    const minY = canvas.height - mapSizePxl - padding;
    camX = Math.min(padding, Math.max(camX, minX));
    camY = Math.min(padding, Math.max(camY, minY));
}

function gameLoop() {
    if(gameOver) return;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle = "#000"; ctx.fillRect(0,0,canvas.width,canvas.height);

    const s = (Math.random()-0.5)*shake;
    ctx.translate(camX + s, camY + s);
    ctx.scale(zoom, zoom);

    // Draw Map
    for(let y=0; y<mapDim; y++) for(let x=0; x<mapDim; x++) {
        drawSprite('floor', x, y);
        const cell = grid[y][x];
        if(cell !== FLOOR) drawSprite(['','wall','hide','exit','','coin','trap','rice','bomb'][cell], x, y);
    }

    // Highlighting
    if(playerTurn) {
        ctx.strokeStyle = (selectMode === 'move') ? "rgba(0, 210, 255, 0.5)" : "rgba(255, 50, 50, 0.5)";
        ctx.lineWidth = 2;
        for(let dy=-2; dy<=2; dy++) for(let dx=-2; dx<=2; dx++) {
            let tx = player.x + dx, ty = player.y + dy;
            if(tx > 0 && tx < mapDim-1 && ty > 0 && ty < mapDim-1 && grid[ty][tx] !== WALL) {
                ctx.strokeRect(tx*TILE+8, ty*TILE+8, TILE-16, TILE-16);
            }
        }
    }

    enemies.forEach(e => {
        if(!e.alive) return;
        drawSprite('guard', e.ax, e.ay);
        if(e.alert) {
            ctx.fillStyle="#ff0"; ctx.font="bold 30px Arial";
            ctx.setTransform(1,0,0,1,0,0);
            ctx.fillText("!", camX + (e.ax*TILE+25)*zoom, camY + (e.ay*TILE-10)*zoom);
            ctx.setTransform(1,0,0,1,camX+s,camY+s); ctx.scale(zoom, zoom);
        }
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

    if(showMinimap) {
        ctx.setTransform(1,0,0,1,0,0);
        const ms = 6;
        const mmX = canvas.width - (mapDim * ms) - 20;
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.fillRect(mmX-5, 65, (mapDim*ms)+10, (mapDim*ms)+10);
        for(let y=0; y<mapDim; y++) for(let x=0; x<mapDim; x++) {
            if(grid[y][x] === WALL) { ctx.fillStyle="#444"; ctx.fillRect(mmX+x*ms, 70+y*ms, ms, ms); }
        }
        ctx.fillStyle="#00d2ff"; ctx.fillRect(mmX+player.x*ms, 70+player.y*ms, ms, ms);
    }

    shake *= 0.8;
    requestAnimationFrame(gameLoop);
}

function rand(max) { return Math.floor(Math.random() * (max-2)) + 1; }
function drawSprite(n, x, y) { if(sprites[n]) ctx.drawImage(sprites[n], x*TILE, y*TILE, TILE, TILE); }
