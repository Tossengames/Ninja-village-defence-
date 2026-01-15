// ============================================
// TILE HIGHLIGHTING SYSTEM & TURN INDICATOR
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
                        const canSeePlayer = hasLineOfSight(enemyAtTile, player.x, player.y) && !player.isHidden;
                        
                        // ENHANCED STEALTH KILL INDICATOR - PURPLE/CRIMSON
                        if(!canSeePlayer) {
                            // STEALTH KILL AVAILABLE - New purple/crimson indicator
                            highlightedTiles.push({
                                x: tx, y: ty,
                                color: {
                                    fill: 'rgba(153, 50, 204, 0.3)',    // Purple fill
                                    border: 'rgba(220, 20, 60, 1.0)',   // Crimson border
                                    glow: 'rgba(138, 43, 226, 0.6)'     // Blue-violet glow
                                },
                                type: 'stealth',
                                enemyType: enemyAtTile.type,
                                pulseIntensity: 1.0
                            });
                        } else {
                            // NORMAL COMBAT - enemy can see player
                            highlightedTiles.push({
                                x: tx, y: ty,
                                color: modeColors.attack,
                                type: 'attack'
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

// A* Pathfinding Algorithm
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
// TURN INDICATOR (From the working script)
// ============================================

function drawTurnIndicator() {
    ctx.setTransform(1,0,0,1,0,0);
    
    const indicatorWidth = 300;
    const indicatorHeight = 40;
    const x = canvas.width / 2 - indicatorWidth / 2;
    const y = 15;
    
    // Background with pulse effect
    const pulse = Math.sin(Date.now() / 500) * 0.3 + 0.7;
    ctx.fillStyle = playerTurn ? `rgba(0, 210, 255, ${0.2 * pulse})` : `rgba(255, 50, 50, ${0.2 * pulse})`;
    ctx.fillRect(x, y, indicatorWidth, indicatorHeight);
    
    // Border
    ctx.strokeStyle = playerTurn ? '#00d2ff' : '#ff3333';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, indicatorWidth, indicatorHeight);
    
    // Glow effect
    ctx.strokeStyle = playerTurn ? 'rgba(0, 210, 255, 0.4)' : 'rgba(255, 50, 50, 0.4)';
    ctx.lineWidth = 1;
    for(let i = 0; i < 3; i++) {
        const offset = i * 2;
        ctx.strokeRect(x - offset, y - offset, indicatorWidth + offset * 2, indicatorHeight + offset * 2);
    }
    
    // Text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    if(playerTurn) {
        ctx.fillText('🎮 PLAYER TURN', canvas.width / 2, y + indicatorHeight / 2);
        
        // Show what actions are available
        ctx.font = '14px monospace';
        ctx.fillStyle = '#aaffff';
        
        if(!playerHasMovedThisTurn && !playerUsedActionThisTurn) {
            ctx.fillText('Move (3 tiles) or use items', canvas.width / 2, y + indicatorHeight + 18);
        } else if(playerHasMovedThisTurn && !playerUsedActionThisTurn) {
            ctx.fillText('Attack or use items', canvas.width / 2, y + indicatorHeight + 18);
        } else {
            ctx.fillText('Click WAIT to end turn', canvas.width / 2, y + indicatorHeight + 18);
        }
    } else {
        ctx.fillText('👾 ENEMY TURN', canvas.width / 2, y + indicatorHeight / 2);
        ctx.font = '14px monospace';
        ctx.fillStyle = '#ffaaaa';
        
        if(currentEnemyTurn) {
            const enemyType = currentEnemyTurn.type || 'ENEMY';
            ctx.fillText(`${enemyType} is moving...`, canvas.width / 2, y + indicatorHeight + 18);
        } else {
            ctx.fillText('Wait for enemies to move...', canvas.width / 2, y + indicatorHeight + 18);
        }
    }
}

// ============================================
// ENHANCED TILE HIGHLIGHT DRAWING - PURPLE/CRIMSON
// ============================================

// Override the drawTileHighlight function for stealth kills
const originalDrawTileHighlight = window.drawTileHighlight || function(x, y, colorSet, pulse = true) {
    const time = Date.now() / 1000;
    const pulseFactor = pulse ? (Math.sin(time * 6) * 0.1 + 0.9) : 1;
    
    ctx.fillStyle = colorSet.fill;
    ctx.fillRect(x*TILE + 4, y*TILE + 4, TILE - 8, TILE - 8);
    
    ctx.strokeStyle = colorSet.border;
    ctx.lineWidth = 3;
    ctx.strokeRect(x*TILE + 2, y*TILE + 2, TILE - 4, TILE - 4);
    
    ctx.strokeStyle = colorSet.glow;
    ctx.lineWidth = 1;
    for(let i = 0; i < 3; i++) {
        const offset = i * 2 * pulseFactor;
        ctx.strokeRect(
            x*TILE + 1 - offset, 
            y*TILE + 1 - offset, 
            TILE - 2 + offset*2, 
            TILE - 2 + offset*2
        );
    }
};

// New enhanced drawTileHighlight with purple/crimson stealth kill
window.drawTileHighlight = function(x, y, colorSet, pulse = true) {
    // Find if this is a stealth kill tile
    const tileInfo = highlightedTiles.find(t => t.x === x && t.y === y);
    const isStealthKill = tileInfo && tileInfo.type === 'stealth';
    
    if(isStealthKill) {
        // STEALTH KILL - New purple/crimson effect
        drawStealthKillHighlight(x, y, tileInfo);
    } else {
        // Regular highlight
        originalDrawTileHighlight(x, y, colorSet, pulse);
    }
};

function drawStealthKillHighlight(x, y, tileInfo) {
    const time = Date.now() / 1000;
    const pulse = Math.sin(time * 8) * 0.5 + 0.5; // Fast, intense pulsing
    
    // Create a diamond shape instead of square
    const centerX = x * TILE + TILE/2;
    const centerY = y * TILE + TILE/2;
    const size = TILE/2 - 2;
    
    // Inner diamond fill with purple gradient
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size * 1.5);
    gradient.addColorStop(0, `rgba(153, 50, 204, ${0.7 * pulse})`);
    gradient.addColorStop(1, `rgba(138, 43, 226, ${0.3 * pulse})`);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - size);
    ctx.lineTo(centerX + size, centerY);
    ctx.lineTo(centerX, centerY + size);
    ctx.lineTo(centerX - size, centerY);
    ctx.closePath();
    ctx.fill();
    
    // Crimson border diamond
    ctx.strokeStyle = `rgba(220, 20, 60, ${pulse})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - size);
    ctx.lineTo(centerX + size, centerY);
    ctx.lineTo(centerX, centerY + size);
    ctx.lineTo(centerX - size, centerY);
    ctx.closePath();
    ctx.stroke();
    
    // Pulsing outer glow
    for(let i = 0; i < 4; i++) {
        const glowSize = size + 5 + i * 5 * pulse;
        const alpha = 0.4 - i * 0.1;
        
        ctx.strokeStyle = `rgba(138, 43, 226, ${alpha * pulse})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - glowSize);
        ctx.lineTo(centerX + glowSize, centerY);
        ctx.lineTo(centerX, centerY + glowSize);
        ctx.lineTo(centerX - glowSize, centerY);
        ctx.closePath();
        ctx.stroke();
    }
    
    // Add shadow dagger icon in center with pulse
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(time * 3); // Spinning effect
    
    // Shadow
    ctx.fillStyle = `rgba(0, 0, 0, ${0.5 * pulse})`;
    ctx.font = '22px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🗡️', 2, 2);
    
    // Main icon
    ctx.fillStyle = `rgba(255, 215, 0, ${pulse})`; // Gold color
    ctx.fillText('🗡️', 0, 0);
    
    ctx.restore();
    
    // Add floating particles
    if(Math.random() < 0.3) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * size;
        particles.push({
            x: centerX + Math.cos(angle) * dist,
            y: centerY + Math.sin(angle) * dist,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            life: 1.0,
            color: `rgba(220, 20, 60, ${0.8})`, // Crimson particles
            size: Math.random() * 2 + 1
        });
    }
}

// ============================================
// AUTO-INTEGRATION WITH GAME LOOP
// ============================================

// Override the updateVFX function to automatically draw turn indicator
const originalUpdateVFX = window.updateVFX;

window.updateVFX = function() {
    // Call the original VFX update
    if(originalUpdateVFX) originalUpdateVFX();
    
    // Draw turn indicator on top of everything
    drawTurnIndicator();
};

// Export functions
window.calculateHighlightedTiles = calculateHighlightedTiles;
window.findPath = findPath;
window.drawTurnIndicator = drawTurnIndicator;