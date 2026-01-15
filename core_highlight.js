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
                    // Use A* pathfinding to check if reachable
                    const path = findPath(player.x, player.y, tx, ty);
                    if(path && path.length <= 3) {
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
                        // Check if enemy can see player for stealth kill
                        const canSeePlayer = !enemyAtTile.isSleeping && hasLineOfSight(enemyAtTile, player.x, player.y) && !player.isHidden;
                        const isAlerted = enemyAtTile.state === 'alerted' || enemyAtTile.state === 'chasing';
                        
                        if(enemyAtTile.isSleeping) {
                            // Sleeping enemy - instant stealth kill
                            highlightedTiles.push({
                                x: tx, y: ty,
                                color: modeColors.stealth,
                                type: 'stealth'
                            });
                        } else if(canSeePlayer || isAlerted) {
                            // Normal combat
                            highlightedTiles.push({
                                x: tx, y: ty,
                                color: modeColors.attack,
                                type: 'attack'
                            });
                        } else {
                            // Stealth kill (enemy can't see player)
                            highlightedTiles.push({
                                x: tx, y: ty,
                                color: modeColors.stealth,
                                type: 'stealth'
                            });
                        }
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

function findPath(startX, startY, targetX, targetY) {
    if(startX === targetX && startY === targetY) return [];
    
    const openSet = [];
    const closedSet = new Set();
    const startNode = {x: startX, y: startY, g: 0, h: 0, f: 0, parent: null};
    
    openSet.push(startNode);
    
    while(openSet.length > 0) {
        let lowestIndex = 0;
        for(let i = 1; i < openSet.length; i++) {
            if(openSet[i].f < openSet[lowestIndex].f) {
                lowestIndex = i;
            }
        }
        
        const current = openSet[lowestIndex];
        
        if(current.x === targetX && current.y === targetY) {
            const path = [];
            let temp = current;
            while(temp) {
                path.push({x: temp.x, y: temp.y});
                temp = temp.parent;
            }
            return path.reverse().slice(1);
        }
        
        openSet.splice(lowestIndex, 1);
        closedSet.add(`${current.x},${current.y}`);
        
        const neighbors = [
            {x: current.x, y: current.y - 1},
            {x: current.x, y: current.y + 1},
            {x: current.x - 1, y: current.y},
            {x: current.x + 1, y: current.y}
        ];
        
        for(const neighbor of neighbors) {
            if(neighbor.x < 0 || neighbor.x >= mapDim || neighbor.y < 0 || neighbor.y >= mapDim) {
                continue;
            }
            
            if(grid[neighbor.y][neighbor.x] === WALL || grid[neighbor.y][neighbor.x] === undefined) {
                continue;
            }
            
            const enemyAtTile = enemies.find(e => e.alive && e.x === neighbor.x && e.y === neighbor.y);
            if(enemyAtTile) {
                continue;
            }
            
            if(closedSet.has(`${neighbor.x},${neighbor.y}`)) {
                continue;
            }
            
            const gScore = current.g + 1;
            const hScore = Math.abs(neighbor.x - targetX) + Math.abs(neighbor.y - targetY);
            const fScore = gScore + hScore;
            
            let existingNode = openSet.find(n => n.x === neighbor.x && n.y === neighbor.y);
            if(existingNode) {
                if(gScore < existingNode.g) {
                    existingNode.g = gScore;
                    existingNode.f = gScore + existingNode.h;
                    existingNode.parent = current;
                }
            } else {
                const newNode = {
                    x: neighbor.x,
                    y: neighbor.y,
                    g: gScore,
                    h: hScore,
                    f: fScore,
                    parent: current
                };
                openSet.push(newNode);
            }
        }
    }
    
    return null;
}

// ============================================
// TURN INDICATOR
// ============================================

function drawTurnIndicator() {
    ctx.setTransform(1,0,0,1,0,0);
    
    const indicatorWidth = 300;
    const indicatorHeight = 40;
    const x = canvas.width / 2 - indicatorWidth / 2;
    const y = 15;
    
    // Background
    ctx.fillStyle = playerTurn ? 'rgba(0, 210, 255, 0.2)' : 'rgba(255, 50, 50, 0.2)';
    ctx.fillRect(x, y, indicatorWidth, indicatorHeight);
    ctx.strokeStyle = playerTurn ? '#00d2ff' : '#ff3333';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, indicatorWidth, indicatorHeight);
    
    // Text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    if(playerTurn) {
        ctx.fillText('🎮 PLAYER TURN', canvas.width / 2, y + indicatorHeight / 2);
        
        // Show what actions are available
        ctx.font = '12px monospace';
        if(!playerHasMovedThisTurn && !playerUsedActionThisTurn) {
            ctx.fillText('Move (3 tiles) or use items', canvas.width / 2, y + indicatorHeight + 15);
        } else if(playerHasMovedThisTurn && !playerUsedActionThisTurn) {
            ctx.fillText('Attack or use items', canvas.width / 2, y + indicatorHeight + 15);
        } else {
            ctx.fillText('Click WAIT to end turn', canvas.width / 2, y + indicatorHeight + 15);
        }
    } else {
        ctx.fillText('👾 ENEMY TURN', canvas.width / 2, y + indicatorHeight / 2);
        ctx.font = '12px monospace';
        ctx.fillText('Wait for enemies to move...', canvas.width / 2, y + indicatorHeight + 15);
    }
}

// ============================================
// OVERRIDE THE VFX UPDATE TO DRAW TURN INDICATOR
// ============================================

// Store the original updateVFX function
const originalUpdateVFX = window.updateVFX;

// Create a new updateVFX that also draws turn indicator
window.updateVFX = function() {
    // Call the original VFX update
    if(originalUpdateVFX) originalUpdateVFX();
    
    // Draw turn indicator on top
    drawTurnIndicator();
};

// Export functions
window.calculateHighlightedTiles = calculateHighlightedTiles;
window.findPath = findPath;
window.drawTurnIndicator = drawTurnIndicator;