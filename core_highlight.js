// ============================================
// TILE HIGHLIGHTING SYSTEM
// ============================================

function calculateHighlightedTiles() {
    highlightedTiles = [];
    if(!playerTurn) return;
    
    const colorSet = modeColors[selectMode];
    
    // Different ranges for different modes
    let range;
    switch(selectMode) {
        case 'move':
            range = 3;
            break;
        case 'attack':
            range = 1;
            break;
        case 'trap':
        case 'rice':
        case 'bomb':
        case 'gas':
            range = 2;
            break;
        default:
            range = 2;
    }
    
    for(let dy = -range; dy <= range; dy++) {
        for(let dx = -range; dx <= range; dx++) {
            const tx = player.x + dx;
            const ty = player.y + dy;
            
            if(tx < 0 || ty < 0 || tx >= mapDim || ty >= mapDim) continue;
            
            const dist = Math.max(Math.abs(dx), Math.abs(dy));
            if(dist > range) continue;
            
            const tile = grid[ty][tx];
            
            if(selectMode === 'move') {
                if(dist <= 3 && tile !== WALL && tile !== undefined) {
                    // Check if path is clear using simple line of sight
                    const canReach = canPlayerReachTile(tx, ty);
                    if(canReach) {
                        const enemyAtTile = enemies.find(e => e.alive && e.x === tx && e.y === ty);
                        if(!enemyAtTile) {
                            highlightedTiles.push({
                                x: tx, y: ty, 
                                color: colorSet,
                                type: tile === EXIT ? 'exit' : 
                                      tile === HIDE ? 'hide' : 
                                      tile === COIN ? 'coin' : 'move'
                            });
                        }
                    }
                }
            } else if(selectMode === 'attack') {
                if(dist === 1) {
                    const enemyAtTile = enemies.find(e => e.alive && e.x === tx && e.y === ty);
                    if(enemyAtTile) {
                        highlightedTiles.push({
                            x: tx, y: ty,
                            color: colorSet,
                            type: 'attack'
                        });
                    }
                }
            } else if(selectMode === 'trap' || selectMode === 'rice' || selectMode === 'bomb' || selectMode === 'gas') {
                if(dist <= 2 && tile === FLOOR) {
                    const enemyAtTile = enemies.find(e => e.alive && e.x === tx && e.y === ty);
                    const hasItem = tile === TRAP || tile === RICE || tile === BOMB || 
                                  tile === GAS || tile === COIN || tile === HIDE || tile === EXIT;
                    
                    if(!enemyAtTile && !hasItem) {
                        highlightedTiles.push({
                            x: tx, y: ty, 
                            color: colorSet,
                            type: selectMode
                        });
                    }
                }
            }
        }
    }
}

function canPlayerReachTile(tx, ty) {
    const dx = tx - player.x;
    const dy = ty - player.y;
    const dist = Math.max(Math.abs(dx), Math.abs(dy));
    
    if(dist === 0) return false; // Can't move to current tile
    
    // Check straight line path
    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    for(let i = 1; i <= steps; i++) {
        const checkX = player.x + Math.round(dx * i / steps);
        const checkY = player.y + Math.round(dy * i / steps);
        
        if(checkX < 0 || checkX >= mapDim || checkY < 0 || checkY >= mapDim) {
            return false;
        }
        
        if(grid[checkY][checkX] === WALL) {
            return false;
        }
        
        const enemyAtTile = enemies.find(e => e.alive && e.x === checkX && e.y === checkY);
        if(enemyAtTile) {
            return false;
        }
        
        // Check if it's the target tile
        if(checkX === tx && checkY === ty) {
            break;
        }
    }
    
    return true;
}