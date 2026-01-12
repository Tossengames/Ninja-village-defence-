function initGame() {
    mapDim = Math.min(60, parseInt(document.getElementById('mapSize').value));
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('toolbar').classList.remove('hidden');
    
    // Level Gen
    grid = Array.from({length: mapDim}, (_, y) => Array.from({length: mapDim}, (_, x) => 
        (x==0 || y==0 || x==mapDim-1 || y==mapDim-1) ? WALL : Math.random() < 0.18 ? WALL : Math.random() < 0.05 ? HIDE : FLOOR
    ));
    
    player = { x: 2, y: 2, ax: 2, ay: 2, isHidden: false };
    grid[mapDim-3][mapDim-3] = EXIT;
    
    const gc = Math.min(40, parseInt(document.getElementById('guardCount').value));
    enemies = [];
    for(let i=0; i<gc; i++) {
        let ex, ey; do { ex = randPos(); ey = randPos(); } while(grid[ey][ex] !== FLOOR || Math.hypot(ex-player.x, ey-player.y) < 6);
        enemies.push({ x: ex, y: ey, ax: ex, ay: ey, dir: {x:1, y:0}, alive: true, range: 5, distracted: 0 });
    }
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function render() {
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Camera Center
    cam.x = player.ax * TILE + TILE/2;
    cam.y = player.ay * TILE + TILE/2;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-cam.x, -cam.y);

    // Draw Grid
    for (let y = 0; y < mapDim; y++) {
        for (let x = 0; x < mapDim; x++) {
            if (grid[y][x] === WALL) {
                ctx.fillStyle = "#151515"; ctx.fillRect(x*TILE, y*TILE, TILE, TILE);
            } else {
                ctx.fillStyle = "#080808"; ctx.fillRect(x*TILE, y*TILE, TILE, TILE);
                if (grid[y][x] !== FLOOR) drawObj(['','','hide','exit','','coin','trap','rice','bomb'][grid[y][x]], x, y);
            }
        }
    }

    // Actors
    enemies.forEach(e => {
        if (!e.alive) return;
        drawObj('guard', e.ax, e.ay);
        // Vision Cone
        ctx.fillStyle = "rgba(255, 0, 0, 0.1)";
        ctx.beginPath(); ctx.moveTo(e.ax*TILE+30, e.ay*TILE+30);
        const baseA = Math.atan2(e.dir.y, e.dir.x);
        for(let a = baseA-0.7; a <= baseA+0.7; a += 0.1) {
            let d = 0; while(d < e.range) { d += 0.5; if(grid[Math.floor(e.y + Math.sin(a)*d)]?.[Math.floor(e.x + Math.cos(a)*d)] === WALL) break; }
            ctx.lineTo(e.ax*TILE+30 + Math.cos(a)*d*TILE, e.ay*TILE+30 + Math.sin(a)*d*TILE);
        }
        ctx.fill();
    });

    drawObj('player', player.ax, player.ay);
    ctx.restore();

    drawMinimap();
}

function drawMinimap() {
    const size = 120;
    const padding = 10;
    const mTile = size / mapDim;
    const mx = canvas.width - size - padding;
    const my = padding;

    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(mx, my, size, size);
    ctx.strokeStyle = varColor('--accent');
    ctx.strokeRect(mx, my, size, size);

    for (let y = 0; y < mapDim; y++) {
        for (let x = 0; x < mapDim; x++) {
            if (grid[y][x] === WALL) {
                ctx.fillStyle = "#444";
                ctx.fillRect(mx + x * mTile, my + y * mTile, mTile, mTile);
            } else if (grid[y][x] === EXIT) {
                ctx.fillStyle = "#0f0";
                ctx.fillRect(mx + x * mTile, my + y * mTile, mTile, mTile);
            }
        }
    }
    
    // Player on minimap
    ctx.fillStyle = varColor('--blue');
    ctx.fillRect(mx + player.x * mTile, my + player.y * mTile, mTile*1.5, mTile*1.5);
}

function varColor(name) { return getComputedStyle(document.documentElement).getPropertyValue(name); }

function drawObj(n, x, y) {
    const px = x * TILE, py = y * TILE;
    ctx.beginPath();
    if(n === 'player') { ctx.fillStyle = player.isHidden ? "rgba(0,210,255,0.4)" : varColor('--blue'); ctx.arc(px+30, py+30, 18, 0, 7); ctx.fill(); }
    else if(n === 'guard') { ctx.fillStyle = varColor('--red'); ctx.fillRect(px+15, py+15, 30, 30); }
    else if(n === 'hide') { ctx.strokeStyle = varColor('--accent'); ctx.strokeRect(px+15, py+15, 30, 30); }
    else if(n === 'exit') { ctx.fillStyle = "#0f0"; ctx.fillRect(px+10, py+10, 40, 40); }
}

function animMove(obj, tx, ty, speed, cb) {
    const sx = obj.ax, sy = obj.ay; let p = 0;
    if (obj !== player) obj.dir = { x: Math.sign(tx - obj.x), y: Math.sign(ty - obj.y) || obj.dir.y };
    function step() {
        p += speed; obj.ax = sx + (tx - sx) * p; obj.ay = sy + (ty - sy) * p;
        if (p < 1) requestAnimationFrame(step); else { obj.x = tx; obj.y = ty; obj.ax = tx; obj.ay = ty; cb(); }
    }
    step();
}

async function endTurn() {
    await moveEnemies();
    turnCount++; playerTurn = true;
}

function gameLoop() { if (!gameOver) { render(); requestAnimationFrame(gameLoop); } }
