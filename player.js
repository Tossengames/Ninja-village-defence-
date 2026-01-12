// Input handling for Pan and Zoom
canvas.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
        lastDist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
    } else {
        isDragging = false;
        lastMouse = { x: e.touches[0].pageX, y: e.touches[0].pageY };
    }
}, {passive: false});

canvas.addEventListener('touchmove', e => {
    e.preventDefault(); // Prevent scrolling the browser
    
    if (e.touches.length === 2) {
        // Pinch to Zoom
        const dist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
        const delta = dist / lastDist;
        const newZoom = Math.min(maxZoom, Math.max(minZoom, zoom * delta));
        
        // Adjust camera so we zoom toward the center of fingers
        const centerX = (e.touches[0].pageX + e.touches[1].pageX) / 2;
        const centerY = (e.touches[0].pageY + e.touches[1].pageY) / 2;
        camX = centerX - (centerX - camX) * (newZoom / zoom);
        camY = centerY - (centerY - camY) * (newZoom / zoom);
        
        zoom = newZoom;
        lastDist = dist;
        clampCamera();
    } else if (e.touches.length === 1) {
        // Pan
        const dx = e.touches[0].pageX - lastMouse.x;
        const dy = e.touches[0].pageY - lastMouse.y;
        if (Math.hypot(dx, dy) > 5) {
            isDragging = true;
            camX += dx; camY += dy;
            clampCamera();
            lastMouse = { x: e.touches[0].pageX, y: e.touches[0].pageY };
        }
    }
}, {passive: false});

canvas.addEventListener('touchend', e => {
    if (isDragging || !playerTurn || gameOver || e.touches.length > 0) return;

    // Use the stored lastMouse from touchstart for the click position
    const rect = canvas.getBoundingClientRect();
    const mx = lastMouse.x - rect.left - camX;
    const my = lastMouse.y - rect.top - camY;
    
    // Correct for zoom to find grid coordinate
    const tx = Math.floor((mx / zoom) / TILE);
    const ty = Math.floor((my / zoom) / TILE);

    processAction(tx, ty);
});

// Fallback for Mouse testing
canvas.addEventListener('mousedown', e => {
    isDragging = false;
    lastMouse = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener('mouseup', e => {
    if (isDragging || !playerTurn || gameOver) return;
    const rect = canvas.getBoundingClientRect();
    const tx = Math.floor(((e.clientX - rect.left - camX) / zoom) / TILE);
    const ty = Math.floor(((e.clientY - rect.top - camY) / zoom) / TILE);
    processAction(tx, ty);
});

function processAction(tx, ty) {
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
}

function deployTool(tx, ty) {
    if(selectMode === 'trap' && inv.trap > 0) { grid[ty][tx] = TRAP; inv.trap--; log("Trap Set"); }
    else if(selectMode === 'rice' && inv.rice > 0) { grid[ty][tx] = RICE; inv.rice--; log("Rice Lure Thrown"); }
    else if(selectMode === 'bomb' && inv.bomb > 0) { grid[ty][tx] = BOMB; inv.bomb--; activeBombs.push({x:tx, y:ty, t:3}); log("Bomb Ticking...", "#f00"); }
    else return;
    stats.itemsUsed++; playerTurn = false; endTurn();
}

function setMode(m) { 
    selectMode = m; 
    centerCamera(); 
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active')); 
    document.getElementById('btn' + m.charAt(0).toUpperCase() + m.slice(1)).classList.add('active'); 
}

function playerWait() { if(playerTurn) { playerTurn = false; log("Waiting..."); endTurn(); } }
