// ============================================
// TILE HIGHLIGHTING SYSTEM (UPDATED)
// ============================================

function calculateHighlightedTiles() {
    highlightedTiles = [];
    if(!playerTurn) return;
    
    const colorSet = modeColors[selectMode];
    
    // Different ranges for different modes
    let range;
    switch(selectMode) {
        case 'move':
            range = 3; // Player can move 3 tiles
            break;
        case 'attack':
            range = 1; // Attack only adjacent tiles
            break;
        case 'trap':
        case 'rice':
        case 'bomb':
            range = 2; // Items can be placed 2 tiles away
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
                // Only highlight walkable, non-occupied tiles within 3 range
                if(dist <= 3 && tile !== WALL && tile !== undefined) {
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
            } else if(selectMode === 'attack') {
                // Only highlight adjacent tiles with enemies (range = 1)
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
            } else if(selectMode === 'trap' || selectMode === 'rice' || selectMode === 'bomb') {
                // Highlight empty floor tiles within 2 range
                if(dist <= 2 && tile === FLOOR) {
                    const enemyAtTile = enemies.find(e => e.alive && e.x === tx && e.y === ty);
                    const hasItem = tile === TRAP || tile === RICE || tile === BOMB || tile === COIN || tile === HIDE || tile === EXIT;
                    
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