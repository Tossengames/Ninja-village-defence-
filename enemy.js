async function moveEnemies() {
    for (let e of enemies.filter(en => en.alive)) {
        await new Promise(r => setTimeout(r, 100)); // Fast AI turn pacing
        
        if (grid[e.y][e.x] === TRAP) { 
            e.alive = false; grid[e.y][e.x] = FLOOR; stats.kills++; 
            log("Guard caught in trap", "#f44"); continue; 
        }
        
        if (e.distracted > 0) { e.distracted--; continue; }

        let nx = e.x, ny = e.y;
        let rice = findRiceNearby(e);

        if (rice) {
            nx += Math.sign(rice.x - e.x); ny += Math.sign(rice.y - e.y);
            if (nx === rice.x && ny === rice.y) { grid[ny][nx] = FLOOR; e.distracted = 2; log("Guard eating rice..."); }
        } else {
            // Random Patrol
            const d = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}][Math.floor(Math.random() * 4)];
            if (grid[e.y + d.y]?.[e.x + d.x] === FLOOR) { nx += d.x; ny += d.y; }
        }

        await new Promise(r => animMove(e, nx, ny, 0.15, r));
        
        // Detection Check
        if (!player.isHidden && checkGuardVision(e)) {
            gameOver = true;
            document.getElementById('gameOverScreen').classList.remove('hidden');
        }
    }
}

function findRiceNearby(e) {
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
        if (grid[e.y + dy]?.[e.x + dx] === RICE) return { x: e.x + dx, y: e.y + dy };
    }
    return null;
}

function checkGuardVision(e) {
    const dx = player.x - e.x, dy = player.y - e.y, dist = Math.hypot(dx, dy);
    if (dist > e.range) return false;
    
    const angleToPlayer = Math.atan2(dy, dx);
    const guardAngle = Math.atan2(e.dir.y, e.dir.x);
    let diff = Math.abs(angleToPlayer - guardAngle);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;

    if (diff < 0.8) { // ~45 degree field of view
        for (let d = 0.5; d < dist; d += 0.5) {
            if (grid[Math.floor(e.y + (dy/dist)*d)]?.[Math.floor(e.x + (dx/dist)*d)] === WALL) return false;
        }
        return true;
    }
    return false;
}
