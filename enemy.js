// ============================================
// ENEMY AI & DETECTION SYSTEM
// ============================================

async function processEnemyTurn(e) {
    if(!e.alive) return;
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
    
    // Check trap instantly (before enemy moves) - INSTANT KILL
    if(grid[e.y][e.x] === TRAP) {
        grid[e.y][e.x] = FLOOR;
        e.alive = false;
        e.state = 'dead';
        e.hp = 0;
        stats.kills++;
        createDeathEffect(e.x, e.y);
        createSpeechBubble(e.x, e.y, "💀 TRAPPED!", "#ff0000", 1.5);
        createTrapEffect(e.x, e.y); // Add trap activation effect
        return;
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
        createSpeechBubble(e.x, e.y, "💤 Falling asleep!", "#9932cc", 1.5);
        return;
    }
    
    // Can't see player if sleeping
    const canSeePlayer = !e.isSleeping && hasLineOfSight(e, player.x, player.y) && !player.isHidden;
    
    if(canSeePlayer) {
        if(e.state !== 'alerted' && e.state !== 'chasing') {
            stats.timesSpotted++;
            createAlertEffect(e.x, e.y);
            createSpeechBubble(e.x, e.y, "! SPOTTED !", "#ff0000", 1.5);
            playSound('alert');
        }
        
        e.state = 'chasing';
        e.lastSeenPlayer = {x: player.x, y: player.y};
        e.chaseTurns = e.chaseMemory;
        e.hasHeardSound = false; // Clear sound investigation when chasing player
        e.soundLocation = null;
    }
    
    // Check for rice in vision (CONE VISION ONLY)
    if(!e.isSleeping && !e.ateRice) {
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
    
    // If heard sound, investigate it
    if(!e.isSleeping && e.hasHeardSound && e.soundLocation) {
        e.state = 'investigating';
        e.investigationTarget = e.soundLocation;
        e.investigationTurns = 5; // Give them more time to investigate
    }
    
    switch(e.state) {
        case 'patrolling':
            await patrolBehavior(e);
            break;
        case 'chasing':
            await chaseBehavior(e);
            break;
        case 'investigating':
            await investigateBehavior(e);
            break;
        case 'eating':
            await eatBehavior(e);
            break;
        case 'alerted':
            e.state = 'chasing';
            await chaseBehavior(e);
            break;
    }
    
    // Attack if adjacent to player and chasing AND can see player
    if(!e.isSleeping && (e.state === 'chasing' || e.state === 'alerted')) {
        const distToPlayer = Math.hypot(e.x - player.x, e.y - player.y);
        const canSeePlayerNow = hasLineOfSight(e, player.x, player.y) && !player.isHidden;
        
        if(distToPlayer <= e.attackRange && canSeePlayerNow) {
            await new Promise(resolve => setTimeout(resolve, 300));
            createSpeechBubble(e.x, e.y, `🎯 ATTACKING!`, e.color, 1);
            
            playerHP -= e.damage;
            playerHP = Math.max(0, playerHP);
            createDamageEffect(player.x, player.y, e.damage, true);
            createSpeechBubble(player.x, player.y, `-${e.damage} HP`, "#ff66ff", 1);
            shake = 15;
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
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

async function patrolBehavior(e) {
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
    
    if(e.hasHeardSound && e.soundLocation) {
        e.state = 'investigating';
        e.investigationTarget = e.soundLocation;
        e.investigationTurns = 5;
        createSpeechBubble(e.x, e.y, "Hmm? What was that?", "#ff9900", 1);
        return;
    }
    
    // Try to move in current direction first
    let nx = e.x + e.dir.x;
    let ny = e.y + e.dir.y;
    
    // If can't move in current direction, choose random
    if(nx < 0 || nx >= mapDim || ny < 0 || ny >= mapDim || 
       grid[ny][nx] === WALL || isTileBlocked(nx, ny)) {
        const validDirs = directions.filter(dir => {
            const tx = e.x + dir.x;
            const ty = e.y + dir.y;
            return tx >= 0 && tx < mapDim && ty >= 0 && ty < mapDim && 
                   grid[ty][tx] !== WALL && !isTileBlocked(tx, ty);
        });
        
        if(validDirs.length > 0) {
            const dir = validDirs[Math.floor(Math.random() * validDirs.length)];
            nx = e.x + dir.x;
            ny = e.y + dir.y;
            e.dir = dir;
        } else {
            // Can't move anywhere - just turn in place
            e.dir = directions[Math.floor(Math.random() * directions.length)];
            return;
        }
    }
    
    // Check for rice at target
    if(grid[ny][nx] === RICE) {
        e.state = 'eating';
        createSpeechBubble(e.x, e.y, "🍚 Rice!", "#ffff00", 1.5);
        return;
    }
    
    // SAFETY CHECK: Make sure we're not trying to move to an invalid tile
    if(nx >= 0 && nx < mapDim && ny >= 0 && ny < mapDim && 
       grid[ny][nx] !== WALL && !isTileBlocked(nx, ny)) {
        await animMove(e, nx, ny, e.speed, () => {
            e.x = nx;
            e.y = ny;
        });
    }
}

async function chaseBehavior(e) {
    if(e.chaseTurns <= 0) {
        // If lost player, investigate last known position
        e.state = 'investigating';
        e.investigationTarget = e.lastSeenPlayer;
        e.investigationTurns = 3;
        createSpeechBubble(e.x, e.y, "Where did they go?", "#ff9900", 1);
        return;
    }
    
    e.chaseTurns--;
    
    if(e.lastSeenPlayer) {
        // Pathfind to player's last known position
        const path = findPathEnemy(e.x, e.y, e.lastSeenPlayer.x, e.lastSeenPlayer.y);
        
        if(path && path.length > 0) {
            const nextStep = path[0];
            const nx = nextStep.x;
            const ny = nextStep.y;
            
            // Check if tile is blocked
            function isTileBlocked(x, y) {
                if(x === player.x && y === player.y) return true;
                return enemies.some(other => 
                    other.alive && other !== e && other.x === x && other.y === y
                );
            }
            
            // Check if next step is a trap
            if(grid[ny][nx] === TRAP) {
                // Will be caught in trap next turn
            }
            
            // SAFETY CHECK before moving
            if(nx >= 0 && nx < mapDim && ny >= 0 && ny < mapDim && 
               grid[ny][nx] !== WALL && !isTileBlocked(nx, ny)) {
                await animMove(e, nx, ny, e.speed * 1.5, () => {
                    e.x = nx;
                    e.y = ny;
                    e.dir = {x: Math.sign(nx - e.x) || e.dir.x, y: Math.sign(ny - e.y) || e.dir.y};
                });
            } else {
                // Can't move toward player, try alternative
                await tryAlternativeMove(e, e.lastSeenPlayer.x, e.lastSeenPlayer.y);
            }
        } else {
            // No path found, try alternative move
            await tryAlternativeMove(e, e.lastSeenPlayer.x, e.lastSeenPlayer.y);
        }
    }
}

async function investigateBehavior(e) {
    if(e.investigationTurns <= 0) {
        e.state = 'patrolling';
        createSpeechBubble(e.x, e.y, "Nothing there...", "#aaa", 1);
        e.hasHeardSound = false;
        e.soundLocation = null;
        return;
    }
    
    e.investigationTurns--;
    
    if(e.investigationTarget) {
        // If we can see the investigation target (like bomb location or player last seen)
        const dx = e.investigationTarget.x - e.x;
        const dy = e.investigationTarget.y - e.y;
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        
        // If we're at the investigation location
        if(dist <= 1) {
            // Look around
            createSpeechBubble(e.x, e.y, "Nothing here...", "#aaa", 1);
            e.investigationTarget = null;
            e.hasHeardSound = false;
            e.soundLocation = null;
            
            // Check if player is visible from here
            const canSeePlayer = !e.isSleeping && hasLineOfSight(e, player.x, player.y) && !player.isHidden;
            if(canSeePlayer) {
                e.state = 'chasing';
                e.lastSeenPlayer = {x: player.x, y: player.y};
                e.chaseTurns = e.chaseMemory;
                createSpeechBubble(e.x, e.y, "There you are!", "#ff0000", 1);
            }
            return;
        }
        
        // Pathfind to investigation target
        const path = findPathEnemy(e.x, e.y, e.investigationTarget.x, e.investigationTarget.y);
        
        if(path && path.length > 0) {
            const nextStep = path[0];
            const nx = nextStep.x;
            const ny = nextStep.y;
            
            // Check if tile is blocked
            function isTileBlocked(x, y) {
                if(x === player.x && y === player.y) return true;
                return enemies.some(other => 
                    other.alive && other !== e && other.x === x && other.y === y
                );
            }
            
            // SAFETY CHECK
            if(nx >= 0 && nx < mapDim && ny >= 0 && ny < mapDim && 
               grid[ny][nx] !== WALL && !isTileBlocked(nx, ny)) {
                await animMove(e, nx, ny, e.speed * 1.2, () => {
                    e.x = nx;
                    e.y = ny;
                    e.dir = {x: Math.sign(nx - e.x) || e.dir.x, y: Math.sign(ny - e.y) || e.dir.y};
                });
            } else {
                await tryAlternativeMove(e, e.investigationTarget.x, e.investigationTarget.y);
            }
        } else {
            await tryAlternativeMove(e, e.investigationTarget.x, e.investigationTarget.y);
        }
    } else {
        e.state = 'patrolling';
    }
}

async function eatBehavior(e) {
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
            createSpeechBubble(e.x, e.y, "Yum! 🍚", "#ffff00", 1.5);
            return;
        }
        
        // Pathfind to rice
        const path = findPathEnemy(e.x, e.y, e.investigationTarget.x, e.investigationTarget.y);
        
        if(path && path.length > 0) {
            const nextStep = path[0];
            const nx = nextStep.x;
            const ny = nextStep.y;
            
            // Check if tile is blocked
            function isTileBlocked(x, y) {
                if(x === player.x && y === player.y) return true;
                return enemies.some(other => 
                    other.alive && other !== e && other.x === x && other.y === y
                );
            }
            
            // SAFETY CHECK
            if(nx >= 0 && nx < mapDim && ny >= 0 && ny < mapDim && 
               grid[ny][nx] !== WALL && !isTileBlocked(nx, ny)) {
                await animMove(e, nx, ny, e.speed * 1.2, () => {
                    e.x = nx;
                    e.y = ny;
                    e.dir = {x: Math.sign(nx - e.x) || e.dir.x, y: Math.sign(ny - e.y) || e.dir.y};
                });
            } else {
                await tryAlternativeMove(e, e.investigationTarget.x, e.investigationTarget.y);
            }
        }
    } else {
        e.state = 'patrolling';
    }
}

// Helper function for enemy pathfinding (avoids other enemies)
function findPathEnemy(startX, startY, targetX, targetY) {
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
async function tryAlternativeMove(e, targetX, targetY) {
    const directions = [
        {x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1}
    ];
    
    // Sort directions by closeness to target
    directions.sort((a, b) => {
        const distA = Math.abs((e.x + a.x) - targetX) + Math.abs((e.y + a.y) - targetY);
        const distB = Math.abs((e.x + b.x) - targetX) + Math.abs((e.y + b.y) - targetY);
        return distA - distB;
    });
    
    for(const dir of directions) {
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
            return;
        }
    }
}