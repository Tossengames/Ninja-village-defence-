async function endTurn() {
    let exploding = [];
    activeBombs = activeBombs.filter(b => {
        b.t--;
        if(b.t <= 0) { exploding.push(b); return false; }
        return true;
    });

    exploding.forEach(b => {
        grid[b.y][b.x] = FLOOR; shake = 25; log("BOMB DETONATED", "#f44");
        enemies.forEach(e => { if(Math.abs(e.x-b.x)<=1 && Math.abs(e.y-b.y)<=1) { e.alive=false; stats.kills++; }});
    });

    for(let e of enemies.filter(g => g.alive)) {
        if(grid[e.y][e.x] === TRAP) { e.alive=false; grid[e.y][e.x]=FLOOR; log("Guard eliminated"); continue; }
        if(e.distracted > 0) { e.distracted--; continue; }

        let nx=e.x, ny=e.y;
        const moves = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
        const d = moves[Math.floor(Math.random()*4)];
        if(grid[e.y+d.y]?.[e.x+d.x] === FLOOR) { nx+=d.x; ny+=d.y; }

        await new Promise(r => animMove(e, nx, ny, 0.2, r));

        if(!player.isHidden && hasLineOfSight(e, player.x, player.y)) {
            gameOver=true; 
            document.getElementById('gameOverScreen').classList.remove('hidden'); 
            return;
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
    const dx = px - e.x, dy = py - e.y, dist = Math.hypot(dx, dy);
    if (dist > e.range) return false;

    const viewA = Math.atan2(e.dir.y, e.dir.x);
    const targetA = Math.atan2(dy, dx);
    let diff = Math.abs(targetA - viewA);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    if (diff > 0.8) return false;

    // Precise Wall Check: Check every 0.2 tiles along the path
    const steps = dist * 5;
    for (let i = 1; i < steps; i++) {
        const tx = e.x + (dx * (i / steps));
        const ty = e.y + (dy * (i / steps));
        if (grid[Math.floor(ty)]?.[Math.floor(tx)] === WALL) return false;
    }
    return true;
}
