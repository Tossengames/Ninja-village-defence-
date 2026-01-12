const TILE = 60;
const FLOOR=0, WALL=1, HIDE=2, EXIT=3, COIN=5, TRAP=6, RICE=7, BOMB=8;

let grid, player, enemies, activeBombs = [], turnCount = 1;
let selectMode = 'move', gameOver = false, playerTurn = true, shake = 0, mapDim = 12;
let stats = { kills: 0, coins: 0, itemsUsed: 0 };
let inv = { trap: 3, rice: 2, bomb: 1 };

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const sprites = {};

['player', 'guard', 'wall', 'floor', 'exit', 'trap', 'rice', 'bomb', 'coin', 'hide'].forEach(n => {
    const img = new Image(); img.src = `sprites/${n}.png`;
    img.onload = () => sprites[n] = img;
});

function log(msg, color="#aaa") {
    const div = document.createElement('div');
    div.className = 'log-entry';
    div.style.color = color;
    div.innerText = `> ${msg}`;
    const container = document.getElementById('missionLog');
    container.prepend(div);
}

function initGame() {
    mapDim = Math.min(15, parseInt(document.getElementById('mapSize').value));
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('toolbar').classList.remove('hidden');
    generateLevel();
    requestAnimationFrame(gameLoop);
}

function generateLevel() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    grid = Array.from({length: mapDim}, (_, y) => Array.from({length: mapDim}, (_, x) => 
        (x==0 || y==0 || x==mapDim-1 || y==mapDim-1) ? WALL : Math.random() < 0.18 ? WALL : Math.random() < 0.08 ? HIDE : FLOOR
    ));
    player = { x: 1, y: 1, ax: 1, ay: 1, isHidden: false };
    grid[mapDim-2][mapDim-2] = EXIT;
    
    // Random Coins
    for(let i=0; i<4; i++) {
        let x, y; do { x=rand(mapDim); y=rand(mapDim); } while(grid[y][x]!==FLOOR);
        grid[y][x] = COIN;
    }

    const gc = Math.min(15, parseInt(document.getElementById('guardCount').value));
    enemies = [];
    for(let i=0; i<gc; i++) {
        let ex, ey; do { ex = rand(mapDim); ey = rand(mapDim); } while(grid[ey][ex] !== FLOOR || Math.hypot(ex-player.x, ey-player.y) < 4);
        enemies.push({ x: ex, y: ey, ax: ex, ay: ey, dir: {x:1, y:0}, alive: true, range: 4, distracted: 0 });
    }
}

function rand(max) { return Math.floor(Math.random() * (max-2)) + 1; }

function drawSprite(n, x, y) {
    const px = x*TILE, py = y*TILE;
    if(sprites[n]) {
        ctx.drawImage(sprites[n], px, py, TILE, TILE);
    } else {
        ctx.beginPath();
        if(n === 'player') { ctx.fillStyle=player.isHidden?"rgba(0,210,255,0.4)":"#00d2ff"; ctx.arc(px+30, py+30, 16, 0, 7); ctx.fill(); }
        else if(n === 'guard') { ctx.fillStyle="#ff3333"; ctx.fillRect(px+15, py+15, 30, 30); }
        else if(n === 'wall') { ctx.fillStyle="#1a1a1a"; ctx.fillRect(px,py,TILE,TILE); ctx.strokeStyle="#333"; ctx.strokeRect(px+4,py+4,TILE-8,TILE-8); }
        else if(n === 'floor') { ctx.fillStyle="#080808"; ctx.fillRect(px,py,TILE,TILE); }
        else if(n === 'hide') { ctx.strokeStyle="#d4af37"; ctx.lineWidth=2; ctx.strokeRect(px+12, py+12, TILE-24, TILE-24); }
        else if(n === 'exit') { ctx.strokeStyle="#0f0"; ctx.lineWidth=3; ctx.strokeRect(px+5, py+5, TILE-10, TILE-10); }
        else if(n === 'coin') { ctx.fillStyle="#ffd700"; ctx.arc(px+30, py+30, 6, 0, 7); ctx.fill(); }
        else if(n === 'rice') { ctx.fillStyle="#fff"; ctx.arc(px+30, py+35, 8, 0, 7); ctx.fill(); }
        else if(n === 'trap') { ctx.strokeStyle="#f0f"; ctx.strokeRect(px+20, py+20, 20, 20); }
    }
}

function gameLoop() {
    if(gameOver) return;
    const scale = Math.min(canvas.width/(mapDim*TILE), canvas.height/(mapDim*TILE));
    const ox = (canvas.width - mapDim*TILE*scale)/2 + (Math.random()-0.5)*shake;
    const oy = (canvas.height - mapDim*TILE*scale)/2 + (Math.random()-0.5)*shake;
    shake *= 0.8;

    ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle = "#000"; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.translate(ox, oy); ctx.scale(scale, scale);

    for(let y=0; y<mapDim; y++) for(let x=0; x<mapDim; x++) {
        drawSprite('floor', x, y);
        const cell = grid[y][x];
        if(cell !== FLOOR) drawSprite(['','wall','hide','exit','','coin','trap','rice','bomb'][cell], x, y);
    }

    if(playerTurn) {
        ctx.strokeStyle = selectMode === 'move' ? "#00d2ff" : "#ff3333";
        ctx.shadowBlur = 10; ctx.shadowColor = ctx.strokeStyle;
        for(let dy=-2; dy<=2; dy++) for(let dx=-2; dx<=2; dx++) {
            let tx = player.x + dx, ty = player.y + dy;
            if(tx > 0 && tx < mapDim-1 && ty > 0 && ty < mapDim-1 && grid[ty][tx] !== WALL) {
                if(grid[player.y + Math.sign(dy)][player.x + Math.sign(dx)] !== WALL)
                    ctx.strokeRect(tx*TILE+8, ty*TILE+8, TILE-16, TILE-16);
            }
        }
        ctx.shadowBlur = 0;
    }

    enemies.forEach(e => {
        if(!e.alive) return;
        drawSprite('guard', e.ax, e.ay);
        ctx.fillStyle = "rgba(255, 0, 0, 0.15)";
        ctx.beginPath(); ctx.moveTo(e.ax*TILE+30, e.ay*TILE+30);
        const baseA = Math.atan2(e.dir.y, e.dir.x);
        for(let a = baseA-0.7; a <= baseA+0.7; a += 0.05) {
            let d = 0; while(d < e.range) { d += 0.2; if(grid[Math.floor(e.y + Math.sin(a)*d)]?.[Math.floor(e.x + Math.cos(a)*d)] === WALL) break; }
            ctx.lineTo(e.ax*TILE+30 + Math.cos(a)*d*TILE, e.ay*TILE+30 + Math.sin(a)*d*TILE);
        }
        ctx.fill();
    });

    drawSprite('player', player.ax, player.ay);
    requestAnimationFrame(gameLoop);
}

canvas.addEventListener('pointerdown', e => {
    if(!playerTurn || gameOver) return;
    const scale = Math.min(canvas.width/(mapDim*TILE), canvas.height/(mapDim*TILE));
    const ox = (canvas.width - mapDim*TILE*scale)/2, oy = (canvas.height - mapDim*TILE*scale)/2;
    const tx = Math.floor(((e.clientX - ox)/scale)/TILE), ty = Math.floor(((e.clientY - oy)/scale)/TILE);
    
    if (grid[ty]?.[tx] === undefined || grid[ty][tx] === WALL) return;
    const dist = Math.max(Math.abs(tx - player.x), Math.abs(ty - player.y));

    if(selectMode === 'move' && dist <= 2) {
        if(grid[player.y + Math.sign(ty-player.y)][player.x + Math.sign(tx-player.x)] === WALL) return;
        playerTurn = false;
        animMove(player, tx, ty, 0.2, () => {
            player.isHidden = (grid[ty][tx] === HIDE);
            if(grid[ty][tx] === COIN) { stats.coins++; grid[ty][tx] = FLOOR; log("Acquired Gold", "#ffd700"); }
            if(grid[ty][tx] === EXIT) showVictory();
            endTurn();
        });
    } else if(selectMode !== 'move' && dist <= 2 && grid[ty][tx] === FLOOR) {
        deployTool(tx, ty);
    }
});

function deployTool(tx, ty) {
    if(selectMode === 'trap' && inv.trap > 0) { grid[ty][tx] = TRAP; inv.trap--; log("Trap Set"); }
    else if(selectMode === 'rice' && inv.rice > 0) { grid[ty][tx] = RICE; inv.rice--; log("Rice Lure Thrown"); }
    else if(selectMode === 'bomb' && inv.bomb > 0) { grid[ty][tx] = BOMB; inv.bomb--; activeBombs.push({x:tx, y:ty, t:3}); log("Bomb Ticking...", "#f00"); }
    else return;
    stats.itemsUsed++; playerTurn = false; endTurn();
}

async function endTurn() {
    activeBombs.forEach((b, i) => {
        b.t--; 
        if(b.t <= 0) {
            grid[b.y][b.x] = FLOOR; shake = 30; log("BOOM!", "#f44");
            enemies.forEach(e => { if(Math.abs(e.x-b.x) <= 1 && Math.abs(e.y-b.y) <= 1) { e.alive = false; stats.kills++; } });
            activeBombs.splice(i, 1);
        }
    });

    for(let e of enemies.filter(en => en.alive)) {
        await new Promise(r => setTimeout(r, 200));
        if(grid[e.y][e.x] === TRAP) { e.alive = false; grid[e.y][e.x] = FLOOR; stats.kills++; log("Guard Neutralized", "#f44"); continue; }
        
        if(e.distracted > 0) { e.distracted--; log("Guard is distracted..."); continue; }

        let nx = e.x, ny = e.y;
        let rice = null;
        for(let dy=-3; dy<=3; dy++) for(let dx=-3; dx<=3; dx++) {
            if(grid[e.y+dy]?.[e.x+dx] === RICE) rice = {x:e.x+dx, y:e.y+dy};
        }

        if(rice) {
            nx += Math.sign(rice.x - e.x); ny += Math.sign(rice.y - e.y);
            if(nx === rice.x && ny === rice.y) { grid[ny][nx] = FLOOR; e.distracted = 2; log("Guard eating rice..."); }
        } else {
            const d = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}][Math.floor(Math.random()*4)];
            if(grid[e.y+d.y]?.[e.x+d.x] === FLOOR) { nx+=d.x; ny+=d.y; }
        }
        
        await new Promise(r => animMove(e, nx, ny, 0.15, r));
        if(!player.isHidden && hasLineOfSight(e, player.x, player.y)) { gameOver = true; document.getElementById('gameOverScreen').classList.remove('hidden'); return; }
    }
    turnCount++; playerTurn = true;
}

function showVictory() {
    gameOver = true;
    const score = (stats.kills * 50) + (stats.coins * 100) - (turnCount * 2);
    let rank = "Novice";
    if(score > 500) rank = "Grand Master";
    else if(score > 300) rank = "Expert";
    else if(score > 150) rank = "Ninja";

    document.getElementById('rankLabel').innerText = rank;
    document.getElementById('statsTable').innerHTML = `
        <div class="stat-line"><span>Kills</span><span>${stats.kills}</span></div>
        <div class="stat-line"><span>Coins</span><span>${stats.coins}</span></div>
        <div class="stat-line"><span>Turns</span><span>${turnCount}</span></div>
        <div class="stat-line" style="border-top:2px solid #222"><span>Score</span><span>${score}</span></div>
    `;
    document.getElementById('resultScreen').classList.remove('hidden');
}

function hasLineOfSight(e, px, py) {
    const dx = px-e.x, dy = py-e.y, dist = Math.hypot(dx, dy);
    if(dist > e.range) return false;
    const ang = Math.abs(Math.atan2(dy, dx) - Math.atan2(e.dir.y, e.dir.x));
    if(ang > 0.8 && ang < 5.5) return false;
    for(let d=0.5; d<dist; d+=0.5) if(grid[Math.floor(e.y + (dy/dist)*d)]?.[Math.floor(e.x + (dx/dist)*d)] === WALL) return false;
    return true;
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

function setMode(m) { 
    selectMode = m; 
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active')); 
    document.getElementById('btn' + m.charAt(0).toUpperCase() + m.slice(1)).classList.add('active'); 
}

function playerWait() { if(playerTurn) { playerTurn = false; log("Waiting..."); endTurn(); } }

window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });
