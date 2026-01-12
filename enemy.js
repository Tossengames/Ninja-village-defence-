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
        if(!player.isHidden && hasLineOfSight(e, player.x, player.y)) { 
            gameOver = true; 
            document.getElementById('gameOverScreen').classList.remove('hidden'); 
            return; 
        }
    }
    turnCount++; playerTurn = true;
}

function hasLineOfSight(e, px, py) {
    const dx = px-e.x, dy = py-e.y, dist = Math.hypot(dx, dy);
    if(dist > e.range) return false;
    const ang = Math.abs(Math.atan2(dy, dx) - Math.atan2(e.dir.y, e.dir.x));
    if(ang > 0.8 && ang < 5.5) return false;
    for(let d=0.5; d<dist; d+=0.5) if(grid[Math.floor(e.y + (dy/dist)*d)]?.[Math.floor(e.x + (dx/dist)*d)] === WALL) return false;
    return true;
}
