canvas.addEventListener('pointerdown', e => {
    if (!playerTurn || gameOver) return;
    const scale = Math.min(canvas.width / (mapDim * TILE), canvas.height / (mapDim * TILE));
    const ox = (canvas.width - mapDim * TILE * scale) / 2;
    const oy = (canvas.height - mapDim * TILE * scale) / 2;
    const tx = Math.floor(((e.clientX - ox) / scale) / TILE);
    const ty = Math.floor(((e.clientY - oy) / scale) / TILE);

    if (grid[ty]?.[tx] === undefined || grid[ty][tx] === WALL) return;
    const dist = Math.max(Math.abs(tx - player.x), Math.abs(ty - player.y));

    if (selectMode === 'move' && dist <= 2) {
        // Simple wall check for the path
        if (grid[player.y + Math.sign(ty - player.y)][player.x + Math.sign(tx - player.x)] === WALL) return;
        playerTurn = false;
        animMove(player, tx, ty, 0.25, () => {
            player.isHidden = (grid[ty][tx] === HIDE);
            if (grid[ty][tx] === COIN) { stats.coins++; grid[ty][tx] = FLOOR; log("Gold Found!", "#ffd700"); }
            if (grid[ty][tx] === EXIT) showVictory();
            endTurn();
        });
    } else if (selectMode !== 'move' && dist <= 2 && grid[ty][tx] === FLOOR) {
        deployItem(tx, ty);
    }
});

function deployItem(tx, ty) {
    if (selectMode === 'trap' && inv.trap > 0) { grid[ty][tx] = TRAP; inv.trap--; log("Trap Set"); }
    else if (selectMode === 'rice' && inv.rice > 0) { grid[ty][tx] = RICE; inv.rice--; log("Rice Thrown"); }
    else if (selectMode === 'bomb' && inv.bomb > 0) { grid[ty][tx] = BOMB; inv.bomb--; activeBombs.push({x:tx, y:ty, t:3}); log("Bomb Armed", "#f00"); }
    else return;
    playerTurn = false;
    endTurn();
}

function playerWait() { if(playerTurn) { playerTurn = false; log("Waiting..."); endTurn(); } }
