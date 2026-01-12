function initGame() {
    mapDim = Math.min(15, parseInt(document.getElementById('mapSize').value));
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('toolbar').classList.remove('hidden');
    
    grid = Array.from({length: mapDim}, (_, y) => Array.from({length: mapDim}, (_, x) => 
        (x==0 || y==0 || x==mapDim-1 || y==mapDim-1) ? WALL : Math.random() < 0.18 ? WALL : Math.random() < 0.08 ? HIDE : FLOOR
    ));
    player = { x: 1, y: 1, ax: 1, ay: 1, isHidden: false };
    grid[mapDim-2][mapDim-2] = EXIT;

    const gc = Math.min(15, parseInt(document.getElementById('guardCount').value));
    enemies = [];
    for(let i=0; i<gc; i++) {
        let ex, ey; do { ex = randPos(); ey = randPos(); } while(grid[ey][ex] !== FLOOR || Math.hypot(ex-player.x, ey-player.y) < 4);
        enemies.push({ x: ex, y: ey, ax: ex, ay: ey, dir: {x:1, y:0}, alive: true, range: 4, distracted: 0 });
    }
    log("Infiltration started.", "var(--accent)");
    requestAnimationFrame(gameLoop);
}

function spawnSmoke(x, y, color = "rgba(100, 100, 100,") {
    for(let i=0; i<2; i++) {
        particles.push({
            x: x * TILE + 30 + (Math.random()-0.5)*20,
            y: y * TILE + 30 + (Math.random()-0.5)*20,
            vx: (Math.random()-0.5) * 0.5,
            vy: (Math.random()-0.5) * 0.5,
            life: 1.0,
            r: 8 + Math.random() * 12,
            baseColor: color
        });
    }
}

function render() {
    const scale = Math.min(canvas.width / (mapDim * TILE), canvas.height / (mapDim * TILE));
    const ox = (canvas.width - mapDim * TILE * scale) / 2 + (Math.random()-0.5)*shake;
    const oy = (canvas.height - mapDim * TILE * scale) / 2 + (Math.random()-0.5)*shake;
    shake *= 0.8;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.translate(ox, oy); ctx.scale(scale, scale);

    // Draw Map
    for (let y = 0; y < mapDim; y++) for (let x = 0; x < mapDim; x++) {
        drawObj('floor', x, y);
        if (grid[y][x] !== FLOOR) drawObj(['','wall','hide','exit','','coin','trap','rice','bomb'][grid[y][x]], x, y);
    }

    // Draw & Update Smoke VFX
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
        p.life -= 0.025;
        p.x += p.vx; p.y += p.vy;
        ctx.fillStyle = p.baseColor + p.life + ")";
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    });

    // Movement/Item Highlights
    if (playerTurn) {
        ctx.strokeStyle = selectMode === 'move' ? "#00d2ff" : "#ff3333";
        ctx.lineWidth = 2; ctx.shadowBlur = 10; ctx.shadowColor = ctx.strokeStyle;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
            let tx = player.x + dx, ty = player.y + dy;
            if (tx > 0 && tx < mapDim - 1 && ty > 0 && ty < mapDim - 1 && grid[ty][tx] !== WALL) {
                if(grid[player.y + Math.sign(dy)][player.x + Math.sign(dx)] !== WALL) 
                    ctx.strokeRect(tx * TILE + 8, ty * TILE + 8, TILE - 16, TILE - 16);
            }
        }
        ctx.shadowBlur = 0;
    }

    enemies.forEach(e => {
        if (!e.alive) return;
        drawObj('guard', e.ax, e.ay);
        // Vision Cone
        ctx.fillStyle = "rgba(255, 0, 0, 0.15)";
        ctx.beginPath(); ctx.moveTo(e.ax*TILE+30, e.ay*TILE+30);
        const baseA = Math.atan2(e.dir.y, e.dir.x);
        for(let a = baseA-0.7; a <= baseA+0.7; a += 0.05) {
            let d = 0; while(d < e.range) { d += 0.2; if(grid[Math.floor(e.y + Math.sin(a)*d)]?.[Math.floor(e.x + Math.cos(a)*d)] === WALL) break; }
            ctx.lineTo(e.ax*TILE+30 + Math.cos(a)*d*TILE, e.ay*TILE+30 + Math.sin(a)*d*TILE);
        }
        ctx.fill();
    });

    drawObj('player', player.ax, player.ay);
}

function drawObj(n, x, y) {
    const px = x * TILE, py = y * TILE;
    if (sprites[n]) { ctx.drawImage(sprites[n], px, py, TILE, TILE); } 
    else {
        ctx.beginPath();
        if(n === 'player') { 
            ctx.fillStyle = player.isHidden ? "rgba(0,210,255,0.4)" : "#00d2ff"; 
            ctx.arc(px+30, py+30, 16, 0, 7); ctx.fill(); 
        }
        else if(n === 'guard') { 
            ctx.fillStyle = "#ff3333"; ctx.fillRect(px+15, py+15, 30, 30); 
        }
        else if(n === 'wall') { 
            ctx.fillStyle = "#1a1a1a"; ctx.fillRect(px,py,TILE,TILE); 
            ctx.strokeStyle="#333"; ctx.strokeRect(px+4,py+4,TILE-8,TILE-8); 
        }
        else if(n === 'floor') { ctx.fillStyle = "#080808"; ctx.fillRect(px,py,TILE,TILE); }
        else if(n === 'hide') { 
            ctx.strokeStyle = "#d4af37"; ctx.lineWidth=2; 
            ctx.strokeRect(px+12, py+12, TILE-24, TILE-24); 
        }
        else if(n === 'exit') { 
            ctx.strokeStyle = "#0f0"; ctx.lineWidth=3; 
            ctx.strokeRect(px+5, py+5, TILE-10, TILE-10); 
        }
    }
}

function animMove(obj, tx, ty, speed, cb) {
    const sx = obj.ax, sy = obj.ay; 
    let p = 0;
    if (obj !== player) obj.dir = { x: Math.sign(tx - obj.x), y: Math.sign(ty - obj.y) || obj.dir.y };
    
    function step() {
        p += speed; 
        obj.ax = sx + (tx - sx) * p; 
        obj.ay = sy + (ty - sy) * p;
        
        // Spawn smoke trails while moving
        if (Math.random() > 0.4) spawnSmoke(obj.ax, obj.ay);

        if (p < 1) requestAnimationFrame(step); 
        else { 
            obj.x = tx; obj.y = ty; obj.ax = tx; obj.ay = ty; 
            cb(); 
        }
    }
    step();
}

async function endTurn() {
    activeBombs.forEach((b, i) => {
        b.t--; 
        if (b.t <= 0) {
            grid[b.y][b.x] = FLOOR; 
            shake = 30; 
            log("BOOM!", "#f44");
            // Thick explosion smoke
            for(let j=0; j<15; j++) spawnSmoke(b.x + (Math.random()-0.5), b.y + (Math.random()-0.5), "rgba(200, 50, 0,");
            enemies.forEach(e => { 
                if (Math.abs(e.x - b.x) <= 1 && Math.abs(e.y - b.y) <= 1) { 
                    e.alive = false; stats.kills++; 
                } 
            });
            activeBombs.splice(i, 1);
        }
    });
    await moveEnemies(); // From enemy.js
    turnCount++; 
    playerTurn = true;
}

function gameLoop() { if (!gameOver) { render(); requestAnimationFrame(gameLoop); } }
window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });
