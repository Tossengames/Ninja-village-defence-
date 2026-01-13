// ============================================
// PLAYER MODULE - PLAYER LOGIC & ACTIONS
// ============================================

function handlePlayerMove(tx, ty) {
    player.isHidden = (grid[ty][tx] === HIDE);
    
    if(grid[ty][tx] === COIN) { 
        stats.coins++; 
        grid[ty][tx] = FLOOR; 
        log("Found Gold!", "#ff0");
    }
    
    if(grid[ty][tx] === EXIT) { 
        gameOver = true; 
        document.getElementById('resultScreen').classList.remove('hidden');
        showVictoryStats();
    }
}

function handleItemPlacement(tx, ty, mode) {
    if(mode === 'trap' && inv.trap > 0) {
        grid[ty][tx] = TRAP;
        inv.trap--;
        stats.itemsUsed++;
        log("Trap set!", "#0f0");
    } else if(mode === 'rice' && inv.rice > 0) {
        grid[ty][tx] = RICE;
        inv.rice--;
        stats.itemsUsed++;
        log("Rice scattered!", "#ff0");
    } else if(mode === 'bomb' && inv.bomb > 0) {
        activeBombs.push({x: tx, y: ty, t: 3});
        inv.bomb--;
        stats.itemsUsed++;
        log("Bomb placed! (3 turns)", "#f00");
    } else {
        log("No more items!", "#f00");
        return;
    }
    
    updateToolCounts();
    playerTurn = false; 
    endTurn();
}

// Export player functions
window.handlePlayerMove = handlePlayerMove;
window.handleItemPlacement = handleItemPlacement;