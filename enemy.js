async function endTurn() {
    // 1. Process Bombs first
    const explodingNow = [];
    activeBombs = activeBombs.filter(b => {
        b.t--;
        if (b.t <= 0) {
            explodingNow.push(b);
            return false; // Remove from activeBombs
        }
        return true;
    });

    explodingNow.forEach(b => {
        grid[b.y][b.x] = FLOOR;
        shake = 30;
        log("BOMB DETONATED!", "#f44");
        
        enemies.forEach(e => {
            if (e.alive && Math.abs(e.x - b.x) <= 1 && Math.abs(e.y - b.y) <= 1) {
                e.alive = false;
                stats.kills++;
                log("Guard eliminated in blast", "#ff8800");
            }
        });
    });

    // 2. Process Guard Movements
    const activeGuards = enemies.filter(en => en.alive);
    
    for (let e of activeGuards) {
        await new Promise(r => setTimeout(r, 100)); // Small delay between guards
        
        if (grid[e.y][e.x] === TRAP) {
            e.alive = false;
            grid[e.y][e.x] = FLOOR;
            stats.kills++;
            log("Guard neutralized by trap", "#ff00ff");
            continue;
        }

        if (e.distracted > 0) {
            e.distracted--;
            continue;
        }

        let nx = e.x, ny = e.y;
        let rice = findRice(e);

        if (rice) {
            nx += Math.sign(rice.x - e.x);
            ny += Math.sign(rice.y - e.y);
            if (nx === rice.x && ny === rice.y) {
                grid[ny][nx] = FLOOR;
                e.distracted = 2;
                log("Guard found the rice lure...");
            }
        } else {
            // Random Patrol
            const moves = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
            const d = moves[Math.floor(Math.random() * moves.length)];
            if (grid[e.y + d.y]?.[e.x + d.x] === FLOOR) {
                nx += d.x; ny += d.y;
            }
        }
        
        // Use a wrapper to ensure animMove always resolves even if interrupted
        await new Promise(r => animMove(e, nx, ny, 0.2, r));

        // 3. Check Line of Sight
        if (!player.isHidden && hasLineOfSight(e, player.x, player.y)) {
            e.alert = true;
            log("GUARD SPOTTED YOU!", "#ff0000");
            await new Promise(r => setTimeout(r, 400));
            gameOver = true;
            document.getElementById('gameOverScreen').classList.remove('hidden');
            return; // Stop everything
        }
    }

    // 4. Finalize Turn
    turnCount++;
    playerTurn = true;
    log(`Turn ${turnCount}`, "#666");
}

function findRice(e) {
    for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
            if (grid[e.y + dy]?.[e.x + dx] === RICE) {
                return {x: e.x + dx, y: e.y + dy};
            }
        }
    }
    return null;
}

function hasLineOfSight(e, px, py) {
    const dx = px - e.x, dy = py - e.y, dist = Math.hypot(dx, dy);
    if (dist > e.range) return false;
    
    // View angle check
    const viewAngle = Math.atan2(e.dir.y, e.dir.x);
    const targetAngle = Math.atan2(dy, dx);
    let diff = Math.abs(targetAngle - viewAngle);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    if (diff > 0.8) return false;

    // Wall check
    for (let d = 0.5; d < dist; d += 0.5) {
        const tx = Math.floor(e.x + (dx / dist) * d);
        const ty = Math.floor(e.y + (dy / dist) * d);
        if (grid[ty]?.[tx] === WALL) return false;
    }
    return true;
}
