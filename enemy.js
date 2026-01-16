// ============================================
// ENEMY AI & DETECTION SYSTEM
// ============================================

async function processEnemyTurn(e) {
    if(!e.alive) return;
    
    // Check trap instantly (BEFORE anything else) - INSTANT DEATH
    if(grid[e.y][e.x] === TRAP) {
        grid[e.y][e.x] = FLOOR;
        e.alive = false;
        e.state = 'dead';
        e.hp = 0;
        stats.kills++;
        createDeathEffect(e.x, e.y);
        createSpeechBubble(e.x, e.y, "💀 TRAPPED!", "#ff0000", 1.5);
        createTrapEffect(e.x, e.y);
        return;
    }
    
    if(e.isSleeping) {
        e.sleepTimer--;
        if(e.sleepTimer <= 0) {
            e.isSleeping = false;
            createSpeechBubble(e.x, e.y, "Waking up...", "#aaa", 1);
        } else {
            createSpeechBubble(e.x, e.y, "💤 Zzz...", "#888", 1);
            return;
        }
    }
    
    // Check if enemy ate rice and should die
    if(e.ateRice) {
        e.riceDeathTimer--;
        if(e.riceDeathTimer <= 0) {
            e.alive = false;
            e.state = 'dead';
            e.hp = 0;
            stats.kills++;
            createDeathEffect(e.x, e.y);
            createSpeechBubble(e.x, e.y, "💀 Poisoned!", "#ff0000", 1.5);
            return;
        }
    }
    
    // Check sleeping gas
    const gasAtTile = activeGas.find(g => g.x === e.x && g.y === e.y);
    if(gasAtTile && !e.isSleeping) {
        e.isSleeping = true;
        e.sleepTimer = Math.floor(Math.random() * 5) + 2; // 2-6 turns
        createSpeechBubble(e.x, e.y, "💤 Falling asleep!", "#9932cc", 2); // Longer duration
        return;
    }
    
    // Check if enemy can see player RIGHT NOW (even if it's not enemy's "turn" for movement)
    const canSeePlayerNow = !e.isSleeping && hasLineOfSight(e, player.x, player.y) && !player.isHidden;
    
    // IMMEDIATE SPOTTING - if enemy can see player, spot immediately
    if(canSeePlayerNow) {
        if(e.state !== 'chasing' && e.state !== 'alerted') {
            stats.timesSpotted++;
            createAlertEffect(e.x, e.y);
            createSpeechBubble(e.x, e.y, "! SPOTTED !", "#ff0000", 2); // Longer duration
            playSound('alert');
        }
        
        e.state = 'chasing';
        e.lastSeenPlayer = {x: player.x, y: player.y};
        e.alertTurns = Math.floor(Math.random() * 4) + 2; // 2-5 turns alert
        e.hasHeardSound = false; // Clear sound investigation when chasing player
        e.soundLocation = null;
        e.investigationTarget = null;
    }
    
    // If enemy is chasing but can't see player now, decrement alert
    if(e.state === 'chasing' && !canSeePlayerNow) {
        e.alertTurns--;
        if(e.alertTurns <= 0) {
            e.state = 'patrolling';
            createSpeechBubble(e.x, e.y, "Lost them...", "#aaa", 2);
            e.lastSeenPlayer = null;
        }
    }
    
    // If enemy is chasing and CAN see player, reset alert timer
    if(e.state === 'chasing' && canSeePlayerNow) {
        e.alertTurns = Math.floor(Math.random() * 4) + 2; // Reset to 2-5 turns
    }
    
    // Check for rice in vision (only if not chasing player)
    if(!e.isSleeping && !e.ateRice && e.state !== 'chasing') {
        for(let dy = -e.visionRange; dy <= e.visionRange; dy++) {
            for(let dx = -e.visionRange; dx <= e.visionRange; dx++) {
                const tx = e.x + dx;
                const ty = e.y + dy;
                if(tx >= 0 && tx < mapDim && ty >= 0 && ty < mapDim && grid[ty][tx] === RICE) {
                    if(hasLineOfSight(e, tx, ty)) {
                        e.state = 'eating';
                        e.investigationTarget = {x: tx, y: ty};
                        e.investigationTurns = 99;
                        break;
                    }
                }
            }
        }
    }
    
    // If heard sound and not chasing player, investigate it
    if(!e.isSleeping && e.hasHeardSound && e.soundLocation && e.state !== 'chasing') {
        e.state = 'investigating';
        e.investigationTarget = e.soundLocation;
        e.investigationTurns = 5;
    }
    
    // ENEMY MOVEMENT - Random movement distance (1-3 tiles)
    const moveDistance = Math.floor(Math.random() * 3) + 1; // 1-3 tiles
    
    switch(e.state) {
        case 'patrolling':
            await patrolBehavior(e, moveDistance);
            break;
        case 'chasing':
            await chaseBehavior(e, moveDistance);
            break;
        case 'investigating':
            await investigateBehavior(e, moveDistance);
            break;
        case 'eating':
            await eatBehavior(e, moveDistance);
            break;
        case 'alerted':
            await chaseBehavior(e, moveDistance);
            break;
    }
    
    // ATTACK IF PLAYER IS IN RANGE AND ENEMY CAN SEE PLAYER
    if(!e.isSleeping && (e.state === 'chasing' || e.state === 'alerted')) {
        const distToPlayer = Math.hypot(e.x - player.x, e.y - player.y);
        const canSeePlayer = hasLineOfSight(e, player.x, player.y) && !player.isHidden;
        
        if(distToPlayer <= e.attackRange && canSeePlayer) {
            await new Promise(resolve => setTimeout(resolve, 300));
            createSpeechBubble(e.x, e.y, `🎯 ATTACKING!`, e.color, 2); // Longer duration
            
            playerHP -= e.damage;
            playerHP = Math.max(0, playerHP);
            createDamageEffect(player.x, player.y, e.damage, true);
            createSpeechBubble(player.x, player.y, `-${e.damage} HP`, "#ff66ff", 2); // Longer duration
            shake = 15;
            
            await new Promise(resolve => setTimeout(resolve, 800));
            
            if(playerHP <= 0) {
                playerHP = 0;
                gameOver = true;
                setTimeout(() => {
                    showGameOverScreen();
                }, 500);
                return;
            }
        }
    }
}

async function patrolBehavior(e, maxDistance) {
    const directions = [
        {x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1}
    ];
    
    // Check if target tile has another enemy OR the player
    function isTileBlocked(x, y) {
        // Don't walk on player
        if(x === player.x && y === player.y) return true;
        
        // Don't walk on other enemies
        return enemies.some(other => 
            other.alive && other !== e && other.x === x && other.y === y
        );
    }
    
    if(e.hasHeardSound && e.soundLocation && e.state !== 'chasing') {
        e.state = 'investigating';
        e.investigationTarget = e.soundLocation;
        e.investigationTurns = 5;
        createSpeechBubble(e.x, e.y, "Hmm? What was that?", "#ff9900", 2);
        return;
    }
    
    // Try to move up to maxDistance tiles
    let movesMade = 0;
    let currentX = e.x;
    let currentY = e.y;
    
    while(movesMade < maxDistance) {
        // Try current direction first
        let nx = currentX + e.dir.x;
        let ny = currentY + e.dir.y;
        
        // If can't move in current direction, choose random
        if(nx < 0 || nx >= mapDim || ny < 0 || ny >= mapDim || 
           grid[ny][nx] === WALL || isTileBlocked(nx, ny)) {
            const validDirs = directions.filter(dir => {
                const tx = currentX + dir.x;
                const ty = currentY + dir.y;
                return tx >= 0 && tx < mapDim && ty >= 0 && ty < mapDim && 
                       grid[ty][tx] !== WALL && !isTileBlocked(tx, ty);
            });
            
            if(validDirs.length > 0) {
                const dir = validDirs[Math.floor(Math.random() * validDirs.length)];
                nx = currentX + dir.x;
                ny = currentY + dir.y;
                e.dir = dir;
            } else {
                // Can't move anywhere - just turn in place
                e.dir = directions[Math.floor(Math.random() * directions.length)];
                break;
            }
        }
        
        // Check for rice at target
        if(grid[ny][nx] === RICE && e.state !== 'chasing') {
            e.state = 'eating';
            e.investigationTarget = {x: nx, y: ny};
            e.investigationTurns = 99;
            createSpeechBubble(e.x, e.y, "🍚 Rice!", "#ffff00", 2);
            break;
        }
        
        // Move to the tile
        await animMove(e, nx, ny, e.speed, () => {
            e.x = nx;
            e.y = ny;
            currentX = nx;
            currentY = ny;
        });
        
        movesMade++;
        
        // Check if we stepped on a trap (should kill instantly)
        if(grid[e.y][e.x] === TRAP) {
            // Trap will kill on next enemy turn start
            break;
        }
        
        // Check if we can see player after moving
        const canSeePlayer = !e.isSleeping && hasLineOfSight(e, player.x, player.y) && !player.isHidden;
        if(canSeePlayer && e.state !== 'chasing') {
            stats.timesSpotted++;
            createAlertEffect(e.x, e.y);
            createSpeechBubble(e.x, e.y, "! SPOTTED !", "#ff0000", 2);
            playSound('alert');
            e.state = 'chasing';
            e.lastSeenPlayer = {x: player.x, y: player.y};
            e.alertTurns = Math.floor(Math.random() * 4) + 2;
            break;
        }
        
        // Small delay between moves
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

async function chaseBehavior(e, maxDistance) {
    // If no last seen position, can't chase
    if(!e.lastSeenPlayer) {
        e.state = 'patrolling';
        return;
    }
    
    // Check if we can see player now
    const canSeePlayerNow = !e.isSleeping && hasLineOfSight(e, player.x, player.y) && !player.isHidden;
    
    // If we can see player, update last seen position
    if(canSeePlayerNow) {
        e.lastSeenPlayer = {x: player.x, y: player.y};
        e.alertTurns = Math.floor(Math.random() * 4) + 2; // Reset alert
    }
    
    // Pathfind to last known position
    const path = findPathEnemy(e.x, e.y, e.lastSeenPlayer.x, e.lastSeenPlayer.y);
    
    if(path && path.length > 0) {
        // Move up to maxDistance tiles along path
        const movesToMake = Math.min(maxDistance, path.length);
        
        for(let i = 0; i < movesToMake; i++) {
            const nextStep = path[i];
            const nx = nextStep.x;
            const ny = nextStep.y;
            
            // Check if tile is blocked
            function isTileBlocked(x, y) {
                if(x === player.x && y === player.y) return true;
                return enemies.some(other => 
                    other.alive && other !== e && other.x === x && other.y === y
                );
            }
            
            // SAFETY CHECK before moving
            if(nx >= 0 && nx < mapDim && ny >= 0 && ny < mapDim && 
               grid[ny][nx] !== WALL && !isTileBlocked(nx, ny)) {
                await animMove(e, nx, ny, e.speed * 1.5, () => {
                    e.x = nx;
                    e.y = ny;
                    e.dir = {x: Math.sign(nx - e.x) || e.dir.x, y: Math.sign(ny - e.y) || e.dir.y};
                });
                
                // Check trap after moving
                if(grid[e.y][e.x] === TRAP) {
                    // Will die next turn
                    break;
                }
                
                // Check if we can see player after moving
                const canSeePlayer = !e.isSleeping && hasLineOfSight(e, player.x, player.y) && !player.isHidden;
                if(canSeePlayer) {
                    e.lastSeenPlayer = {x: player.x, y: player.y};
                    e.alertTurns = Math.floor(Math.random() * 4) + 2;
                }
                
                // Small delay between moves
                await new Promise(resolve => setTimeout(resolve, 50));
            } else {
                break;
            }
        }
    } else {
        // Can't find path, try alternative move
        await tryAlternativeMove(e, e.lastSeenPlayer.x, e.lastSeenPlayer.y, maxDistance);
    }
}

async function investigateBehavior(e, maxDistance) {
    if(e.investigationTurns <= 0) {
        e.state = 'patrolling';
        createSpeechBubble(e.x, e.y, "Nothing there...", "#aaa", 2);
        e.hasHeardSound = false;
        e.soundLocation = null;
        return;
    }
    
    e.investigationTurns--;
    
    if(e.investigationTarget) {
        // If at investigation location
        const dx = e.investigationTarget.x - e.x;
        const dy = e.investigationTarget.y - e.y;
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        
        if(dist <= 1) {
            // Look around
            createSpeechBubble(e.x, e.y, "Nothing here...", "#aaa", 2);
            
            // Check if player is visible from here
            const canSeePlayer = !e.isSleeping && hasLineOfSight(e, player.x, player.y) && !player.isHidden;
            if(canSeePlayer) {
                stats.timesSpotted++;
                createAlertEffect(e.x, e.y);
                createSpeechBubble(e.x, e.y, "There you are!", "#ff0000", 2);
                e.state = 'chasing';
                e.lastSeenPlayer = {x: player.x, y: player.y};
                e.alertTurns = Math.floor(Math.random() * 4) + 2;
                e.hasHeardSound = false;
                e.soundLocation = null;
            } else {
                e.state = 'patrolling';
                e.hasHeardSound = false;
                e.soundLocation = null;
            }
            return;
        }
        
        // Move toward investigation target
        await tryAlternativeMove(e, e.investigationTarget.x, e.investigationTarget.y, maxDistance);
    } else {
        e.state = 'patrolling';
    }
}

async function eatBehavior(e, maxDistance) {
    if(e.investigationTarget) {
        const dx = e.investigationTarget.x - e.x;
        const dy = e.investigationTarget.y - e.y;
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        
        if(dist <= 1) {
            // Reached rice - eat it!
            grid[e.investigationTarget.y][e.investigationTarget.x] = FLOOR;
            e.ateRice = true;
            e.state = 'patrolling';
            e.investigationTarget = null;
            createSpeechBubble(e.x, e.y, "Yum! 🍚", "#ffff00", 2);
            return;
        }
        
        // Move toward rice
        await tryAlternativeMove(e, e.investigationTarget.x, e.investigationTarget.y, maxDistance);
    } else {
        e.state = 'patrolling';
    }
}

// Helper function for enemy pathfinding
function findPathEnemy(startX, startY, targetX, targetY) {
    // Same as before, but enemies can walk through other enemies
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
            
            // Enemies can walk through other enemies (but not player)
            const isPlayer = neighbor.x === player.x && neighbor.y === player.y;
            if(isPlayer) {
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

// Try alternative move when direct path is blocked
async function tryAlternativeMove(e, targetX, targetY, maxDistance) {
    const directions = [
        {x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1}
    ];
    
    // Sort directions by closeness to target
    directions.sort((a, b) => {
        const distA = Math.abs((e.x + a.x) - targetX) + Math.abs((e.y + a.y) - targetY);
        const distB = Math.abs((e.x + b.x) - targetX) + Math.abs((e.y + b.y) - targetY);
        return distA - distB;
    });
    
    let movesMade = 0;
    
    for(const dir of directions) {
        if(movesMade >= maxDistance) break;
        
        const nx = e.x + dir.x;
        const ny = e.y + dir.y;
        
        // Check if tile is blocked
        function isTileBlocked(x, y) {
            if(x === player.x && y === player.y) return true;
            return enemies.some(other => 
                other.alive && other !== e && other.x === x && other.y === y
            );
        }
        
        if(nx >= 0 && nx < mapDim && ny >= 0 && ny < mapDim && 
           grid[ny][nx] !== WALL && !isTileBlocked(nx, ny)) {
            await animMove(e, nx, ny, e.speed, () => {
                e.x = nx;
                e.y = ny;
                e.dir = dir;
            });
            movesMade++;
            
            // Check trap after moving
            if(grid[e.y][e.x] === TRAP) {
                // Will die next turn
                break;
            }
            
            // Check if we can see player after moving
            const canSeePlayer = !e.isSleeping && hasLineOfSight(e, player.x, player.y) && !player.isHidden;
            if(canSeePlayer && e.state !== 'chasing') {
                stats.timesSpotted++;
                createAlertEffect(e.x, e.y);
                createSpeechBubble(e.x, e.y, "! SPOTTED !", "#ff0000", 2);
                e.state = 'chasing';
                e.lastSeenPlayer = {x: player.x, y: player.y};
                e.alertTurns = Math.floor(Math.random() * 4) + 2;
                break;
            }
        }
    }
}

// Function to check if player is in any enemy's vision (called from game loop)
function checkPlayerVisibility() {
    let inVision = false;
    let spotted = false;
    let chasing = false;
    let investigating = 0;
    
    enemies.forEach(e => {
        if(e.alive && !e.isSleeping) {
            const canSeePlayer = hasLineOfSight(e, player.x, player.y) && !player.isHidden;
            
            if(canSeePlayer) {
                inVision = true;
                
                // If enemy can see player and isn't already chasing, spot immediately
                if(e.state !== 'chasing' && e.state !== 'alerted') {
                    // Immediate spotting (even if not enemy's turn)
                    stats.timesSpotted++;
                    createAlertEffect(e.x, e.y);
                    createSpeechBubble(e.x, e.y, "! SPOTTED !", "#ff0000", 2);
                    playSound('alert');
                    e.state = 'chasing';
                    e.lastSeenPlayer = {x: player.x, y: player.y};
                    e.alertTurns = Math.floor(Math.random() * 4) + 2;
                }
                
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
    
    return { inVision, spotted, chasing, investigating };
}