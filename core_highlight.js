// ============================================
// TILE HIGHLIGHTING SYSTEM & TURN INDICATOR
// ============================================

// Global alert tracking
let playerAlertStatus = {
    isInVisionOfEnemy: false,
    isSpotted: false,
    isBeingChased: false,
    investigatingEnemies: 0,
    chasingEnemies: 0,
    lastSpottedBy: null,
    spotTimer: 0
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
// STEALTH KILL PROMPT FOR PLAYER
// ============================================

function checkAndShowStealthKillPrompt() {
    if(!playerTurn) return;
    
    const adjacentEnemies = enemies.filter(e => 
        e.alive && Math.abs(e.x - player.x) <= 1 && Math.abs(e.y - player.y) <= 1
    );
    
    let hasStealthKill = false;
    adjacentEnemies.forEach(enemy => {
        // Check if stealth kill is available
        const canSeePlayer = hasLineOfSight(enemy, player.x, player.y) && !player.isHidden;
        
        if(!canSeePlayer || enemy.isSleeping) {
            hasStealthKill = true;
        }
    });
    
    if(hasStealthKill && selectMode === 'attack') {
        // Show stealth kill prompt above player
        drawStealthKillPromptPlayer();
    }
}

function drawStealthKillPromptPlayer() {
    const centerX = player.ax * TILE + TILE/2;
    const centerY = player.ay * TILE - 60; // Position above player
    const time = Date.now() / 1000;
    const pulse = Math.sin(time * 6) * 0.5 + 0.5;
    
    // Background glow
    ctx.save();
    ctx.globalAlpha = 0.7 * pulse;
    
    const gradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, 50
    );
    gradient.addColorStop(0, 'rgba(153, 50, 204, 0.6)');
    gradient.addColorStop(1, 'rgba(153, 50, 204, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 50, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
    
    // Text background
    ctx.fillStyle = `rgba(30, 0, 30, ${0.8 * pulse})`;
    ctx.fillRect(centerX - 80, centerY - 20, 160, 40);
    
    // Border
    ctx.strokeStyle = `rgba(220, 20, 60, ${pulse})`;
    ctx.lineWidth = 3;
    ctx.strokeRect(centerX - 80, centerY - 20, 160, 40);
    
    // Text
    ctx.fillStyle = `rgba(255, 215, 0, ${pulse})`; // Gold text
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🗡️ STEALTH KILL AVAILABLE', centerX, centerY);
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
// ALERT INDICATOR SYSTEM
// ============================================

function updateAlertStatus() {
    // Count alert states from all enemies
    let inVision = false;
    let spotted = false;
    let chasing = false;
    let investigating = 0;
    let chasingCount = 0;
    
    enemies.forEach(e => {
        if(e.alive && !e.isSleeping) {
            const canSeePlayer = hasLineOfSight(e, player.x, player.y) && !player.isHidden;
            
            if(canSeePlayer) {
                inVision = true;
                spotted = true;
                
                // Immediate spotting (even if not enemy's turn)
                if(e.state !== 'chasing' && e.state !== 'alerted') {
                    if(window.stats) window.stats.timesSpotted++;
                    if(window.createAlertEffect) createAlertEffect(e.x, e.y);
                    if(window.createSpeechBubble) createSpeechBubble(e.x, e.y, "! SPOTTED !", "#ff0000", 2);
                    if(window.playSound) playSound('alert');
                    e.state = 'chasing';
                    e.lastSeenPlayer = {x: player.x, y: player.y};
                    e.alertTurns = Math.floor(Math.random() * 4) + 2;
                }
            }
            
            if(e.state === 'chasing' || e.state === 'alerted') {
                chasing = true;
                chasingCount++;
                
                // If chasing but can't see player, decrement alert
                if(!canSeePlayer) {
                    if(e.alertTurns) {
                        e.alertTurns--;
                        if(e.alertTurns <= 0) {
                            e.state = 'investigating';
                            e.investigationTarget = e.lastSeenPlayer;
                            e.investigationTurns = 3;
                        }
                    }
                } else {
                    // Reset alert timer if can see player
                    e.alertTurns = Math.floor(Math.random() * 4) + 2;
                }
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
    playerAlertStatus.chasingEnemies = chasingCount;
    
    return { inVision, spotted, chasing, investigating };
}

function drawAlertIndicator() {
    ctx.setTransform(1,0,0,1,0,0);
    
    const canvasWidth = canvas.width;
    const yPos = 70; // Below turn indicator
    
    // Update alert status
    const alertStatus = updateAlertStatus();
    
    // Draw alert indicator if any alert state is active
    if(alertStatus.inVision || alertStatus.spotted || alertStatus.chasing || alertStatus.investigating > 0) {
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
        
        if(alertStatus.inVision) {
            ctx.fillStyle = '#ff0000';
            ctx.fillText('🔴 IN VISION', canvasWidth - 170, lineY);
            lineY += 15;
        }
        
        if(alertStatus.chasing) {
            ctx.fillStyle = '#ff4444';
            ctx.fillText('⚠️ BEING CHASED', canvasWidth - 170, lineY);
            lineY += 15;
        }
        
        if(alertStatus.investigating > 0) {
            ctx.fillStyle = '#9932cc';
            ctx.fillText('🟣 INVESTIGATING: ' + alertStatus.investigating, canvasWidth - 170, lineY);
            lineY += 15;
        }
        
        if(!alertStatus.inVision && !alertStatus.chasing && alertStatus.investigating === 0) {
            ctx.fillStyle = '#00ff00';
            ctx.fillText('🟢 STEALTHY', canvasWidth - 170, yPos + 40);
        }
        
        // Draw glow effect based on alert level
        if(alertStatus.inVision) {
            ctx.strokeStyle = `rgba(255, 0, 0, ${0.5 * pulse})`;
            ctx.lineWidth = 3;
            ctx.strokeRect(canvasWidth - 183, yPos - 3, 176, 96);
        } else if(alertStatus.chasing) {
            ctx.strokeStyle = `rgba(255, 100, 0, ${0.4 * pulse})`;
            ctx.lineWidth = 2;
            ctx.strokeRect(canvasWidth - 182, yPos - 2, 174, 94);
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

// Store the original updateVFX function
const originalUpdateVFX = window.updateVFX;

// Create a new updateVFX that includes everything
window.updateVFX = function() {
    // Call the original VFX update
    if(originalUpdateVFX) originalUpdateVFX();
    
    // Check and show stealth kill prompt for player
    checkAndShowStealthKillPrompt();
    
    // Draw alert indicator
    drawAlertIndicator();
    
    // Draw turn indicator on top of everything
    drawTurnIndicator();
};

// Export functions
window.calculateHighlightedTiles = calculateHighlightedTiles;
window.findPath = findPath;
window.drawTurnIndicator = drawTurnIndicator;
window.drawAlertIndicator = drawAlertIndicator;
window.checkAndShowStealthKillPrompt = checkAndShowStealthKillPrompt;
window.updateAlertStatus = updateAlertStatus;