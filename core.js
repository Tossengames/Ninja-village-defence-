const TILE = 60;
const FLOOR=0, WALL=1, HIDE=2, EXIT=3, COIN=5, TRAP=6, RICE=7, BOMB=8;

let grid, player, enemies, activeBombs = [], turnCount = 1;
let selectMode = 'move', gameOver = false, playerTurn = true, shake = 0, mapDim = 12;
let stats = { kills: 0, coins: 0, itemsUsed: 0 };
let inv = { trap: 3, rice: 2, bomb: 1 };
let camX = 0, camY = 0, zoom = 1.0;
let showMinimap = false;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const sprites = {};

const assetNames = ['player', 'guard', 'wall', 'floor', 'exit', 'trap', 'rice', 'bomb', 'coin', 'hide'];
assetNames.forEach(n => {
    const img = new Image();
    img.src = `sprites/${n}.png`;
    img.onload = () => { sprites[n] = img; };
});

function log(msg, color="#aaa") {
    const logDiv = document.getElementById('missionLog');
    const d = document.createElement('div');
    d.style.color = color;
    d.innerText = `> ${msg}`;
    logDiv.prepend(d);
    if(logDiv.children.length > 5) logDiv.lastChild.remove();
}

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

function initGame() {
    mapDim = Math.min(20, parseInt(document.getElementById('mapSize').value) || 12);
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('toolbar').classList.remove('hidden');
    document.getElementById('ui-controls').classList.remove('hidden');
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
    enemies = [];
    const gc = Math.min(15, parseInt(document.getElementById('guardCount').value) || 5);
    for(let i=0; i<gc; i++){
        let ex, ey; do { ex = rand(mapDim); ey = rand(mapDim); } while(grid[ey][ex]!==FLOOR || Math.hypot(ex-player.x, ey-player.y)<4);
        enemies.push({x:ex, y:ey, ax:ex, ay:ey, dir:{x:1, y:0}, alive:true, range:4, distracted:0, alert:false});
    }
}

function rand(m) { return Math.floor(Math.random()*(m-2))+1; }

function drawSprite(n, x, y) { if(sprites[n]) ctx.drawImage(sprites[n], x*TILE, y*TILE, TILE, TILE); }

function gameLoop() {
    if(gameOver) return;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle = "#000"; ctx.fillRect(0,0,canvas.width,canvas.height);
    const s = (Math.random()-0.5)*shake;
    ctx.translate(camX+s, camY+s); ctx.scale(zoom, zoom);

    for(let y=0; y<mapDim; y++) for(let x=0; x<mapDim; x++) {
        drawSprite('floor', x, y);
        const c = grid[y][x];
        if(c!==FLOOR) drawSprite(['','wall','hide','exit','','coin','trap','rice','bomb'][c], x, y);
    }

    if(playerTurn) {
        ctx.strokeStyle = selectMode==='move' ? "rgba(0,210,255,0.4)" : "rgba(255,50,50,0.4)";
        for(let dy=-2; dy<=2; dy++) for(let dx=-2; dx<=2; dx++) {
            let tx=player.x+dx, ty=player.y+dy;
            if(grid[ty]?.[tx]!==undefined && grid[ty][tx]!==WALL) ctx.strokeRect(tx*TILE+5, ty*TILE+5, TILE-10, TILE-10);
        }
    }

    enemies.forEach(e => {
        if(!e.alive) return;
        drawSprite('guard', e.ax, e.ay);
        ctx.fillStyle = "rgba(255,0,0,0.1)"; ctx.beginPath(); ctx.moveTo(e.ax*TILE+30, e.ay*TILE+30);
        const baseA = Math.atan2(e.dir.y, e.dir.x);
        for(let a=baseA-0.7; a<=baseA+0.7; a+=0.1) {
            let d=0; while(d<e.range) { d+=0.2; if(grid[Math.floor(e.y+Math.sin(a)*d)]?.[Math.floor(e.x+Math.cos(a)*d)]===WALL) break; }
            ctx.lineTo(e.ax*TILE+30 + Math.cos(a)*d*TILE, e.ay*TILE+30 + Math.sin(a)*d*TILE);
        }
        ctx.fill();
    });

    drawSprite('player', player.ax, player.ay);

    if(showMinimap) {
        ctx.setTransform(1,0,0,1,0,0);
        const ms=5; const mx=canvas.width-mapDim*ms-20;
        ctx.fillStyle="rgba(0,0,0,0.8)"; ctx.fillRect(mx-5, 75, mapDim*ms+10, mapDim*ms+10);
        for(let y=0; y<mapDim; y++) for(let x=0; x<mapDim; x++) if(grid[y][x]===WALL){ctx.fillStyle="#444"; ctx.fillRect(mx+x*ms, 80+y*ms, ms, ms);}
        ctx.fillStyle="#00d2ff"; ctx.fillRect(mx+player.x*ms, 80+player.y*ms, ms, ms);
    }
    shake *= 0.8; requestAnimationFrame(gameLoop);
}
function toggleMinimap() { showMinimap = !showMinimap; }
