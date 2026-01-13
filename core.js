const TILE = 60;
const FLOOR=0, WALL=1, HIDE=2, EXIT=3, COIN=5, TRAP=6, RICE=7, BOMB=8;

let grid, player, enemies, activeBombs = [], turnCount = 1;
let selectMode = 'move', gameOver = false, playerTurn = true, shake = 0, mapDim = 12;
let stats = { kills: 0, coins: 0, itemsUsed: 0 };
let inv = { trap: 3, rice: 2, bomb: 1 };
let camX = 0, camY = 0, zoom = 1.0;
let showMinimap = false;
let highlightPulse = 0;

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

function updateUI() {
    document.getElementById('countTrap').innerText = inv.trap;
    document.getElementById('countRice').innerText = inv.rice;
    document.getElementById('countBomb').innerText = inv.bomb;
}

function initGame() {
    mapDim = Math.min(20, parseInt(document.getElementById('mapSize').value) || 12);
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('toolbar').classList.remove('hidden');
    document.getElementById('ui-controls').classList.remove('hidden');
    updateUI();
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
        enemies.push({x:ex, y:ey, ax:ex, ay:ey, dir:{x:1, y:0}, alive:true, range:4, distracted:0});
    }
}

function rand(m) { return Math.floor(Math.random()*(m-2))+1; }

function drawSprite(n, x, y) { if(sprites[n]) ctx.drawImage(sprites[n], x*TILE, y*TILE, TILE, TILE); }

function gameLoop() {
    if(gameOver) return;
    highlightPulse = Math.sin(Date.now() / 200) * 0.2 + 0.5;

    ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle = "#000"; ctx.fillRect(0,0,canvas.width,canvas.height);
    const s = (Math.random()-0.5)*shake;
    ctx.translate(camX+s, camY+s); ctx.scale(zoom, zoom);

    // Draw Map
    for(let y=0; y<mapDim; y++) for(let x=0; x<mapDim; x++) {
        drawSprite('floor', x, y);
        const c = grid[y][x];
        if(c!==FLOOR) drawSprite(['','wall','hide','exit','','coin','trap','rice','bomb'][c], x, y);
    }

    // --- ENHANCED TARGETING HIGHLIGHTS ---
    if(playerTurn) {
        const isMove = selectMode === 'move';
        ctx.lineWidth = 3;
        for(let dy=-2; dy<=2; dy++) for(let dx=-2; dx<=2; dx++) {
            let tx=player.x+dx, ty=player.y+dy;
            if(grid[ty]?.[tx]!==undefined && grid[ty][tx]!==WALL) {
                ctx.strokeStyle = isMove ? `rgba(0, 210, 255, ${highlightPulse})` : `rgba(255, 50, 50, ${highlightPulse})`;
                ctx.strokeRect(tx*TILE+4, ty*TILE+4, TILE-8, TILE-8);
                ctx.fillStyle = isMove ? `rgba(0, 210, 255, 0.05)` : `rgba(255, 50, 50, 0.05)`;
                ctx.fillRect(tx*TILE+4, ty*TILE+4, TILE-8, TILE-8);
            }
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
    shake *= 0.8; 
    requestAnimationFrame(gameLoop);
}

// Interaction & Movement
async function endTurn() {
    updateUI();
    let exploding = [];
    activeBombs = activeBombs.filter(b => {
        b.t--; if(b.t <= 0) { exploding.push(b); return false; } return true;
    });

    exploding.forEach(b => {
        grid[b.y][b.x] = FLOOR; shake = 20; log("BOOM!", "#f44");
        enemies.forEach(e => { if(Math.abs(e.x-b.x)<=1 && Math.abs(e.y-b.y)<=1) { e.alive=false; stats.kills++; }});
    });

    for(let e of enemies.filter(g => g.alive)) {
        if(grid[e.y][e.x] === TRAP) { e.alive=false; grid[e.y][e.x]=FLOOR; log("Guard Trapped", "#f44"); continue; }
        if(e.distracted > 0) { e.distracted--; continue; }

        let nx=e.x, ny=e.y;
        const moves = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
        const d = moves[Math.floor(Math.random()*4)];
        if(grid[e.y+d.y]?.[e.x+d.x] === FLOOR) { nx+=d.x; ny+=d.y; }

        await new Promise(r => animMove(e, nx, ny, 0.2, r));

        if(!player.isHidden && hasLineOfSight(e, player.x, player.y)) {
            gameOver=true; document.getElementById('gameOverScreen').classList.remove('hidden'); return;
        }
    }
    turnCount++; playerTurn = true;
}

function animMove(obj, tx, ty, speed, cb) {
    const sx=obj.ax, sy=obj.ay; let p=0;
    if(obj!==player) obj.dir = {x:Math.sign(tx-obj.x)||obj.dir.x, y:Math.sign(ty-obj.y)||obj.dir.y};
    function step() {
        p+=speed; obj.ax=sx+(tx-sx)*p; obj.ay=sy+(ty-sy)*p;
        if(p<1) requestAnimationFrame(step); else { obj.x=tx; obj.y=ty; obj.ax=tx; obj.ay=ty; cb(); }
    }
    step();
}

function hasLineOfSight(e, px, py) {
    const dx=px-e.x, dy=py-e.y, dist=Math.hypot(dx,dy);
    if(dist > e.range) return false;
    for(let d=0.5; d<dist; d+=0.5) if(grid[Math.floor(e.y+(dy/dist)*d)]?.[Math.floor(e.x+(dx/dist)*d)]===WALL) return false;
    return true;
}

// Camera & Touch Setup
let lastDist = 0, isDragging = false, lastTouch = {x:0, y:0};

canvas.addEventListener('touchstart', e => {
    if(e.touches.length === 2) lastDist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
    else { isDragging = false; lastTouch = {x: e.touches[0].pageX, y: e.touches[0].pageY}; }
}, {passive:false});

canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if(e.touches.length === 2) {
        const dist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
        zoom = Math.min(2, Math.max(0.5, zoom * (dist/lastDist))); lastDist = dist;
    } else {
        const dx = e.touches[0].pageX - lastTouch.x, dy = e.touches[0].pageY - lastTouch.y;
        if(Math.hypot(dx, dy) > 10) { isDragging = true; camX += dx; camY += dy; lastTouch = {x: e.touches[0].pageX, y: e.touches[0].pageY}; }
    }
}, {passive:false});

canvas.addEventListener('touchend', e => {
    if(isDragging || !playerTurn || gameOver || e.touches.length > 0) return;
    const rect = canvas.getBoundingClientRect();
    const tx = Math.floor(((lastTouch.x - rect.left - camX)/zoom)/TILE), ty = Math.floor(((lastTouch.y - rect.top - camY)/zoom)/TILE);
    
    if(grid[ty]?.[tx] === undefined || grid[ty][tx] === WALL) return;
    const dist = Math.max(Math.abs(tx-player.x), Math.abs(ty-player.y));

    if(selectMode === 'move' && dist <= 2) {
        playerTurn = false;
        animMove(player, tx, ty, 0.2, () => {
            player.isHidden = (grid[ty][tx] === HIDE);
            if(grid[ty][tx] === COIN) { stats.coins++; grid[ty][tx]=FLOOR; log("Found Gold!", "#d4af37"); }
            if(grid[ty][tx] === EXIT) { gameOver=true; document.getElementById('resultScreen').classList.remove('hidden'); }
            endTurn();
        });
    } else if(selectMode !== 'move' && dist <= 2 && grid[ty][tx] === FLOOR) {
        if(inv[selectMode] > 0) {
            if(selectMode==='trap') grid[ty][tx]=TRAP;
            if(selectMode==='rice') grid[ty][tx]=RICE;
            if(selectMode==='bomb') activeBombs.push({x:tx, y:ty, t:3});
            inv[selectMode]--;
            log(`Deployed ${selectMode}`, "#00d2ff");
            playerTurn = false; endTurn();
        } else { log(`No ${selectMode}s left!`, "#f44"); }
    }
});

function setMode(m) {
    selectMode = m;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('btn' + m.charAt(0).toUpperCase() + m.slice(1)).classList.add('active');
}

function playerWait() { if(playerTurn) { playerTurn = false; endTurn(); } }

function centerCamera() {
    camX = (canvas.width/2) - (player.x*TILE + TILE/2)*zoom;
    camY = (canvas.height/2) - (player.y*TILE + TILE/2)*zoom;
}
