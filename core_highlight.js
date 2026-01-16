// ============================================
// TILE HIGHLIGHTING SYSTEM & TURN INDICATOR
// ============================================

// Add alert indicator tracking
let playerAlertStatus = {
    isInVisionOfEnemy: false,
    isSpotted: false,
    isBeingChased: false,
    investigatingEnemies: 0,
    chasingEnemies: 0
};

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
                        if(!canSeePlayer || enemyAtTile.isSleeping) {
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
                                pulseIntensity: 1.0,
                                isSleeping: enemyAtTile.isSleeping
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

// ============================================
// ALERT INDICATOR SYSTEM
// ============================================

function drawAlertIndicator() {
    ctx.setTransform(1,0,0,1,0,0);
    
    const canvasWidth = canvas.width;
    const yPos = 70; // Below turn indicator
    
    // Count alert states
    let inVision = false;
    let spotted = false;
    let chasing = false;
    let investigating = 0;
    
    enemies.forEach(e => {
        if(e.alive && !e.isSleeping) {
            const canSeePlayer = hasLineOfSight(e, player.x, player.y) && !player.isHidden;
            
            if(canSeePlayer) {
                inVision = true;
                spotted = true;
            }
            
            if(e.state === 'chasing' || e.state === 'alerted') {
                chasing = true;
            }
            
            if(e.state === 'investigating') {
                investigating++;
            }
        }
    });
    
    // Update player alert status
    playerAlertStatus.isInVisionOfEnemy = inVision;
    playerAlertStatus.isSpotted = spotted;
    playerAlertStatus.isBeingChased = chasing;
    playerAlertStatus.investigatingEnemies = investigating;
    playerAlertStatus.chasingEnemies = enemies.filter(e => e.alive && (e.state === 'chasing' || e.state === 'alerted')).length;
    
    // Draw alert indicator if any alert state is active
    if(inVision || spotted || chasing || investigating > 0) {
        const pulse = Math.sin(Date.now() / 600) * 0.3 + 0.7;
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(canvasWidth - 180, yPos, 170, 90);
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        ctx.strokeRect(canvasWidth - 180, yPos, 170, 90);
        
        // Title
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('ENEMY STATUS', canvasWidth - 170, yPos + 20);
        
        // Draw status indicators
        let lineY = yPos + 40;
        
        if(inVision) {
            ctx.fillStyle = '#ff0000';
            ctx.fillText('🔴 IN VISION', canvasWidth - 170, lineY);
            lineY += 15;
        }
        
        if(chasing) {
            ctx.fillStyle = '#ff4444';
            ctx.fillText('⚠️ BEING CHASED', canvasWidth - 170, lineY);
            lineY += 15;
        }
        
        if(investigating > 0) {
            ctx.fillStyle = '#9932cc';
            ctx.fillText('🟣 INVESTIGATING: ' + investigating, canvasWidth - 170, lineY);
            lineY += 15;
        }
        
        if(!inVision && !chasing && investigating === 0) {
            ctx.fillStyle = '#00ff00';
            ctx.fillText('🟢 STEALTHY', canvasWidth - 170, yPos + 40);
        }
        
        // Draw glow effect based on alert level
        if(inVision) {
            ctx.strokeStyle = `rgba(255, 0, 0, ${0.5 * pulse})`;
            ctx.lineWidth = 3;
            ctx.strokeRect(canvasWidth - 183, yPos - 3, 176, 96);
        } else if(chasing) {
            ctx.strokeStyle = `rgba(255, 100, 0, ${0.4 * pulse})`;
            ctx.lineWidth = 2;
            ctx.strokeRect(canvasWidth - 182, yPos - 2, 174, 94);
        }
    }
}

// ============================================
// OVERRIDE VFX UPDATE TO INCLUDE ALERT INDICATOR
// ============================================

// Store the original updateVFX function
const originalUpdateVFX = window.updateVFX;

// Create a new updateVFX that also draws alert indicator
window.updateVFX = function() {
    // Call the original VFX update
    if(originalUpdateVFX) originalUpdateVFX();
    
    // Draw alert indicator
    drawAlertIndicator();
    
    // Draw turn indicator on top
    drawTurnIndicator();
};