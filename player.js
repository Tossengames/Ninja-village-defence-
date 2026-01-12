canvas.addEventListener('pointerdown', e => {
    if (!playerTurn || gameOver) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // WORLD COORDS CALCULATION (Crucial for zoom/camera)
    const worldX = (x - canvas.width / 2) / zoom + cam.x;
    const worldY = (y - canvas.height / 2) / zoom + cam.y;

    const tx = Math.floor(worldX / TILE);
    const ty = Math.floor(worldY / TILE);

    if (grid[ty]?.[tx] === undefined || grid[ty][tx] === WALL) return;
    
    const dist = Math.max(Math.abs(tx - player.x), Math.abs(ty - player.y));

    if (selectMode === 'move' && dist <= 2) {
        if (grid[player.y + Math.sign(ty - player.y)][player.x + Math.sign(tx - player.x)] === WALL) return;
        playerTurn = false;
        animMove(player, tx, ty, 0.08, () => {
            player.isHidden = (grid[ty][tx] === HIDE);
            if (grid[ty][tx] === EXIT) showVictory();
            endTurn();
        });
    } else if (selectMode !== 'move' && dist <= 2 && grid[ty][tx] === FLOOR) {
        deployItem(tx, ty);
    }
});

function adjustZoom(amt) {
    zoom = Math.max(0.3, Math.min(1.5, zoom + amt));
    log(`Zoom: ${Math.round(zoom * 100)}%`);
}

function playerWait() { if(playerTurn) { playerTurn = false; endTurn(); } }

function deployItem(tx, ty) {
    if (selectMode === 'trap' && inv.trap > 0) { grid[ty][tx] = TRAP; inv.trap--; log("Trap Set"); }
    else if (selectMode === 'rice' && inv.rice > 0) { grid[ty][tx] = RICE; inv.rice--; log("Rice Set"); }
    else if (selectMode === 'bomb' && inv.bomb > 0) { grid[ty][tx] = BOMB; inv.bomb--; activeBombs.push({x:tx, y:ty, t:3}); log("Bomb Set"); }
    playerTurn = false;
    endTurn();
}
