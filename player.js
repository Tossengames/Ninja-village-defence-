canvas.addEventListener('pointerdown', e => {
    if (!playerTurn || gameOver) return;
    
    // Convert click to World Coordinates based on Camera and Zoom
    const rect = canvas.getBoundingClientRect();
    const worldX = (e.clientX - rect.left - canvas.width / 2) / zoom + cam.x;
    const worldY = (e.clientY - rect.top - canvas.height / 2) / zoom + cam.y;

    const tx = Math.floor(worldX / TILE);
    const ty = Math.floor(worldY / TILE);

    if (grid[ty]?.[tx] === undefined || grid[ty][tx] === WALL) return;
    
    const dist = Math.max(Math.abs(tx - player.x), Math.abs(ty - player.y));

    if (selectMode === 'move' && dist <= 2) {
        // Path blocked check
        const mx = player.x + Math.sign(tx - player.x);
        const my = player.y + Math.sign(ty - player.y);
        if (grid[my][mx] === WALL) return;

        playerTurn = false;
        // 0.05 speed for slow, smooth ninja movement
        animMove(player, tx, ty, 0.05, () => {
            player.isHidden = (grid[ty][tx] === HIDE);
            if (grid[ty][tx] === COIN) { stats.coins++; grid[ty][tx] = FLOOR; log("Acquired Gold", "#ffd700"); }
            if (grid[ty][tx] === EXIT) showVictory();
            endTurn();
        });
    } else if (selectMode !== 'move' && dist <= 2 && grid[ty][tx] === FLOOR) {
        deployItem(tx, ty);
    }
});

function deployItem(tx, ty) {
    let used = false;
    if (selectMode === 'trap' && inv.trap > 0) { grid[ty][tx] = TRAP; inv.trap--; log("Trap Laid"); used = true; }
    else if (selectMode === 'rice' && inv.rice > 0) { grid[ty][tx] = RICE; inv.rice--; log("Rice Lure Thrown"); used = true; }
    else if (selectMode === 'bomb' && inv.bomb > 0) { 
        grid[ty][tx] = BOMB; inv.bomb--; 
        activeBombs.push({x:tx, y:ty, t:3}); 
        log("Bomb Armed...", "#f00"); used = true;
    }
    if (used) { playerTurn = false; endTurn(); }
}

function playerWait() { if(playerTurn) { playerTurn = false; log("Wait Turn..."); endTurn(); } }

// Support Mouse Wheel Zoom
window.addEventListener('wheel', e => {
    adjustZoom(e.deltaY > 0 ? -0.1 : 0.1);
}, { passive: true });
