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

function setMode(m) { 
    selectMode = m; 
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active')); 
    document.getElementById('btn' + m.charAt(0).toUpperCase() + m.slice(1)).classList.add('active'); 
}

function playerWait() { if(playerTurn) { playerTurn = false; log("Waiting..."); endTurn(); } }
