function initGame() {
    mapDim = Math.min(60, parseInt(document.getElementById('mapSize').value));
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('toolbar').classList.remove('hidden');
    
    // Generate Level
    grid = Array.from({length: mapDim}, (_, y) => Array.from({length: mapDim}, (_, x) => 
        (x==0 || y==0 || x==mapDim-1 || y==mapDim-1) ? WALL : Math.random() < 0.16 ? WALL : Math.random() < 0.04 ? HIDE : FLOOR
    ));
    
    player = { x: 2, y: 2, ax: 2, ay: 2, isHidden: false };
    grid[mapDim-3][mapDim-3] = EXIT;
    
    // Coins
    for(let i=0; i<8; i++){ let x=randPos(), y=randPos(); if(grid[y][x]===FLOOR) grid[y][x]=COIN; }

    const gc = Math.min(40, parseInt(document.getElementById('guardCount').value));
    enemies = [];
    for(let i=0; i<gc; i++) {
        let ex, ey; do { ex = randPos(); ey = randPos(); } while(grid[ey][ex] !== FLOOR || Math.hypot(ex-player.x, ey-player.y) < 6);
        enemies.push({ x: ex, y: ey, ax: ex, ay: ey, dir: {x:1, y:0}, alive: true, range: 5, distracted: 0 });
    }
    
    log("Infiltration started. Target the green exit.", "var(--accent)");
    requestAnimationFrame(gameLoop);
}

function spawnSmoke(x, y, color = "rgba(120, 120, 120,") {
    particles.push({
        x: x * TILE + 30, y: y * TILE + 30,
        vx: (Math.random()-0.5), vy: (Math.random()-0.5),
        life: 1.0, r: 8 + Math.random() * 8, baseColor: color
    });
}

function render() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Center Camera on Player Interpolated position
    cam.x = player.ax * TILE + 30;
    cam.y = player.ay * TILE + 30;

    ctx.fillStyle = "#050505"; ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-cam.x, -cam.y);

    if (shake > 0.1) { ctx.translate((Math.random()-0.5)*shake, (Math.random()-0.5)*shake); shake *= 0.8; }

    // Render Grid
    for (let y = 0; y < mapDim; y++) {
        for (let x = 0; x < mapDim; x++) {
            if (grid[y][x] === WALL) {
                ctx.fillStyle = "#111"; ctx.fillRect(x*TILE, y*TILE, TILE, TILE);
                ctx.strokeStyle = "#222"; ctx.strokeRect(x*TILE, y*TILE, TILE, TILE);
            } else {
                ctx.fillStyle = "#080808"; ctx.fillRect(x*TILE, y*TILE, TILE, TILE);
                if (grid[y][x] !== FLOOR) drawObj(['','','hide','exit','','coin','trap','rice','bomb'][grid[y][x]], x, y);
            }
        }
    }

    // VFX
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
        p.life -= 0.02; p.x += p.vx; p.y += p.vy;
        ctx.fillStyle = p.baseColor + p.life + ")";
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    });

    // Highlights
    if (playerTurn) {
        ctx.strokeStyle = selectMode === 'move' ? "var(--blue)" : "var(--red)";
        ctx.lineWidth = 3;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
            let tx = player.x + dx, ty = player.y + dy;
            if (grid[ty]?.[tx] !== undefined && grid[ty][tx] !== WALL) {
                if(grid[player.y + Math.sign(dy)][player.x + Math.sign(dx)] !== WALL)
                    ctx.strokeRect(tx * TILE + 5, ty * TILE + 5, TILE - 10, TILE - 10);
            }
        }
    }

    // Actors
    enemies.forEach(e => {
        if (!e.alive) return;
        drawObj('guard', e.ax, e.ay);
        // Vision Cone
        ctx.fillStyle = "rgba(255, 0, 0, 0.12)";
        ctx.beginPath(); ctx.moveTo(e.ax*TILE+30, e.ay*TILE+30);
        const baseA = Math.atan2(e.dir.y, e.dir.x);
        for(let a = baseA-0.7; a <= baseA+0.7; a += 0.05) {
            let d = 0; while(d < e.range) { d += 0.2; if(grid[Math.floor(e.y + Math.sin(a)*d)]?.[Math.floor(e.x + Math.cos(a)*d)] === WALL) break; }
            ctx.lineTo(e.ax*TILE+30 + Math.cos(a)*d*TILE, e.ay*TILE+30 + Math.sin(a)*d*TILE);
        }
        ctx.fill();
    });

    drawObj('player', player.ax, player.ay);
    ctx.restore();
}

function drawObj(n, x, y) {
    const px = x * TILE, py = y * TILE;
    if (sprites[n]) { ctx.drawImage(sprites[n], px, py, TILE, TILE); } 
    else {
        ctx.beginPath();
        if(n === 'player') { ctx.fillStyle = player.isHidden ? "rgba(0,210,255,0.3)" : "var(--blue)"; ctx.arc(px+30, py+30, 18, 0, 7); ctx.fill(); }
        else if(n === 'guard') { ctx.fillStyle = "var(--red)"; ctx.fillRect(px+15, py+15, 30, 30); }
        else if(n === 'hide') { ctx.strokeStyle = "var(--accent)"; ctx.strokeRect(px+15, py+15, 30, 30); }
        else if(n === 'coin') { ctx.fillStyle = "#ffd700"; ctx.arc(px+30, py+30, 6, 0, 7); ctx.fill(); }
        else if(n === 'exit') { ctx.strokeStyle = "#0f0"; ctx.lineWidth=4; ctx.strokeRect(px+10, py+10, TILE-20, TILE-20); }
        else if(n === 'rice') { ctx.fillStyle = "#fff"; ctx.arc(px+30, py+35, 8, 0, 7); ctx.fill(); }
        else if(n === 'trap') { ctx.strokeStyle = "#f0f"; ctx.strokeRect(px+20, py+20, 20, 20); }
    }
}

function animMove(obj, tx, ty, speed, cb) {
    const sx = obj.ax, sy = obj.ay; let p = 0;
    if (obj !== player) obj.dir = { x: Math.sign(tx - obj.x), y: Math.sign(ty - obj.y) || obj.dir.y };
    function step() {
        p += speed; obj.ax = sx + (tx - sx) * p; obj.ay = sy + (ty - sy) * p;
        if (Math.random() > 0.6) spawnSmoke(obj.ax, obj.ay);
        if (p < 1) requestAnimationFrame(step); 
        else { obj.x = tx; obj.y = ty; obj.ax = tx; obj.ay = ty; cb(); }
    }
    step();
}

async function endTurn() {
    activeBombs.forEach((b, i) => {
        b.t--; if (b.t <= 0) {
            grid[b.y][b.x] = FLOOR; shake = 40; log("BOOM!", "#f44");
            for(let j=0; j<20; j++) spawnSmoke(b.x + (Math.random()-0.5), b.y + (Math.random()-0.5), "rgba(255, 100, 0,");
            enemies.forEach(e => { if (Math.abs(e.x - b.x) <= 1 && Math.abs(e.y - b.y) <= 1) { e.alive = false; stats.kills++; } });
            activeBombs.splice(i, 1);
        }
    });
    await moveEnemies();
    turnCount++; playerTurn = true;
}

function gameLoop() { if (!gameOver) { render(); requestAnimationFrame(gameLoop); } }
