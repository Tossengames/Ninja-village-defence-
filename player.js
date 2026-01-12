canvas.addEventListener('pointerdown', e => {
    isDragging = false;
    lastMouse = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener('pointermove', e => {
    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;
    if (Math.hypot(dx, dy) > 5) {
        isDragging = true;
        camX += dx; camY += dy;
        clampCamera();
        lastMouse = { x: e.clientX, y: e.clientY };
    }
});

canvas.addEventListener('pointerup', e => {
    if (isDragging || !playerTurn || gameOver) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left - camX;
    const my = e.clientY - rect.top - camY;
    const tx = Math.floor(mx / TILE);
    const ty = Math.floor(my / TILE);

    if (grid[ty]?.[tx] === undefined || grid[ty][tx] === WALL) return;
    const dist = Math.max(Math.abs(tx - player.x), Math.abs(ty - player.y));

    if(selectMode === 'move' && dist <= 2) {
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
    centerCamera(); // Always move camera to player position
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active')); 
    document.getElementById('btn' + m.charAt(0).toUpperCase() + m.slice(1)).classList.add('active'); 
}

function playerWait() { if(playerTurn) { playerTurn = false; log("Waiting..."); endTurn(); } }
