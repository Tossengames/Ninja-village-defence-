async function endTurn() {
    // Process Bombs
    let exploding = [];
    activeBombs = activeBombs.filter(b => {
        b.t--;
        if(b.t <= 0) { exploding.push(b); return false; }
        return true;
    });

    exploding.forEach(b => {
        grid[b.y][b.x] = FLOOR; shake = 20; log("BOOM!", "#f44");
        enemies.forEach(e => { if(Math.abs(e.x-b.x)<=1 && Math.abs(e.y-b.y)<=1) { e.alive=false; stats.kills++; }});
    });

    // Process Guards
    for(let e of enemies.filter(g => g.alive)) {
        if(grid[e.y][e.x] === TRAP) { e.alive=false; grid[e.y][e.x]=FLOOR; log("Guard Trapped"); continue; }
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
