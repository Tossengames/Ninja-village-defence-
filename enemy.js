// ============================================
// ENEMY AI & DETECTION SYSTEM (UPDATED)
// ============================================

async function processEnemyTurn(e) {
    if(!e.alive) return;

    // Check trap INSTANTLY - IMMEDIATE DEATH (BEFORE ANY MOVEMENT)
    if(grid[e.y][e.x] === TRAP) {  
        grid[e.y][e.x] = FLOOR;  
        e.alive = false;  
        e.state = 'dead';  
        e.hp = 0;  
        stats.kills++;  
        createDeathEffect(e.x, e.y);  
        createSpeechBubble(e.x, e.y, "💀 TRAPPED!", "#ff0000", 2);  
        createTrapEffect(e.x, e.y);  
        return;  
    }  
    
    if(e.isSleeping) {  
        e.sleepTimer--;  
        if(e.sleepTimer <= 0) {  
            e.isSleeping = false;  
            createSpeechBubble(e.x, e.y, "Waking up...", "#aaa", 2);  
        } else {  
            createSpeechBubble(e.x, e.y, "💤 Zzz...", "#888", 2);  
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
            createSpeechBubble(e.x, e.y, "💀 Poisoned!", "#ff0000", 2);  
            return;  
        }  
    }  
    
    // Check sleeping gas  
    const gasAtTile = activeGas.find(g => g.x === e.x && g.y === e.y);  
    if(gasAtTile && !e.isSleeping) {  
        e.isSleeping = true;  
        e.sleepTimer = Math.floor(Math.random() * 5) + 2;  
        createSpeechBubble(e.x, e.y, "💤 Falling asleep!", "#9932cc", 2);  
        return;  
    }  
    
    // Check if enemy can see player RIGHT NOW  
    const canSeePlayerNow = !e.isSleeping && hasLineOfSight(e, player.x, player.y) && !player.isHidden;  
    
    // Check if enemy can see rice (rice is visible if in line of sight)
    const visibleRice = findVisibleRice(e);
    
    // If enemy sees rice and not currently chasing player or in alert, go eat it
    if(visibleRice && e.state !== 'chasing' && e.state !== 'alert' && !e.ateRice) {
        e.state = 'eating';
        e.investigationTarget = visibleRice;
        e.lastSeenPlayer = null; // Clear player tracking when eating
        createSpeechBubble(e.x, e.y, "Food! 🍚", "#ffff00", 2);
        await eatBehavior(e);
        return;
    }
    
    // IMMEDIATE SPOTTING - if enemy can see player, spot immediately  
    if(canSeePlayerNow) {  
        if(e.state !== 'chasing' && e.state !== 'alert') {  
            stats.timesSpotted++;  
            createAlertEffect(e.x, e.y);  
            createSpeechBubble(e.x, e.y, "! SPOTTED !", "#ff0000", 2);  
            playSound('alert');  
        }  
        
        e.state = 'chasing';  
        e.lastSeenPlayer = {x: player.x, y: player.y};  
        e.alertTurns = Math.floor(Math.random() * 5) + 1; // 1-5 alert turns (max 5)
        e.hasHeardSound = false;  
        e.soundLocation = null;  
        
        // When chasing, move toward player immediately  
        await chasePlayer(e);  
        return;  
    }  
    
    // If player goes into hiding state, investigating expires immediately
    if(player.isHidden && e.state === 'alert') {
        e.state = 'patrolling';
        e.patrolTarget = null;
        e.lastSeenPlayer = null;
        e.alertTurns = 0;
        createSpeechBubble(e.x, e.y, "Where'd they go?", "#aaa", 2);
        await patrolBehavior(e);
        return;
    }
    
    // If enemy is chasing but can't see player now  
    if(e.state === 'chasing' && !canSeePlayerNow) {  
        // Switch to alert state when losing sight of player
        e.state = 'alert';
        e.alertTurns = Math.floor(Math.random() * 5) + 1; // 1-5 alert turns for investigation
        createSpeechBubble(e.x, e.y, "Where'd they go?", "#ff9900", 2);  
        
        // Move toward last known position  
        await moveTowardLastSeen(e);  
        
        // After moving, check if we can see player again  
        const canSeePlayerAfterMove = !e.isSleeping && hasLineOfSight(e, player.x, player.y) && !player.isHidden;  
        if(canSeePlayerAfterMove) {  
            // Found player again!  
            e.lastSeenPlayer = {x: player.x, y: player.y};  
            e.alertTurns = Math.floor(Math.random() * 5) + 1; // Reset alert timer  
            createSpeechBubble(e.x, e.y, "Found you!", "#ff0000", 2);  
            e.state = 'chasing';
            await chasePlayer(e);  
        }  
        return;  
    }
    
    // If enemy is in alert state (investigating)
    if(e.state === 'alert' && !canSeePlayerNow) {
        // Decrement alert timer
        if(e.alertTurns) e.alertTurns--;
        
        // If alert expired and no player in view, go to patrolling
        if(e.alertTurns <= 0) {
            e.state = 'patrolling';
            e.patrolTarget = null;
            e.lastSeenPlayer = null;
            createSpeechBubble(e.x, e.y, "Lost them...", "#aaa", 2);
            await patrolBehavior(e);
            return;
        }
        
        // If player ran from vision and alert state is on, move to last player position
        if(e.lastSeenPlayer) {
            // Move toward last seen position (investigate)
            await moveTowardLastSeen(e);
            
            // After moving, check if we can see player again
            const canSeePlayerAfterMove = !e.isSleeping && hasLineOfSight(e, player.x, player.y) && !player.isHidden;
            if(canSeePlayerAfterMove) {
                // Found player again!
                e.lastSeenPlayer = {x: player.x, y: player.y};
                e.alertTurns = Math.floor(Math.random() * 5) + 1;
                createSpeechBubble(e.x, e.y, "Found you!", "#ff0000", 2);
                e.state = 'chasing';
                await chasePlayer(e);
                return;
            }
        }
        return;
    }
    
    // If investigating sound  
    if(e.hasHeardSound && e.soundLocation && e.state !== 'chasing' && e.state !== 'alert' && e.state !== 'eating') {  
        e.state = 'alert';  
        e.lastSeenPlayer = e.soundLocation;  
        e.alertTurns = Math.floor(Math.random() * 3) + 2; // 2-4 turns for sound investigation
        e.hasHeardSound = false;  
        createSpeechBubble(e.x, e.y, "Hmm? What was that?", "#ff9900", 2);  
        await moveTowardLastSeen(e);  
        return;  
    }  
    
    // Default patrol behavior  
    if(e.state === 'patrolling' || !e.state || e.state === 'idle') {  
        await patrolBehavior(e);  
    } else if(e.state === 'eating') {  
        await eatBehavior(e);  
    }
}

// CHASE PLAYER - Move toward player when spotted
async function chasePlayer(e) {
    if(!e.alive || e.isSleeping) return;

    // Calculate distance to player
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.max(Math.abs(dx), Math.abs(dy));
    
    // Update enemy direction to face player
    updateEnemyDirection(e, player.x, player.y);
    
    // If player is within attack range, attack
    if(dist <= e.attackRange) {
        createSpeechBubble(e.x, e.y, `🎯 ATTACKING!`, e.color, 2);
        await new Promise(resolve => setTimeout(resolve, 300));
        
        playerHP -= e.damage;
        playerHP = Math.max(0, playerHP);
        createDamageEffect(player.x, player.y, e.damage, true);
        createSpeechBubble(player.x, player.y, `-${e.damage} HP`, "#ff66ff", 2);
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
        return;
    }
    
    // Find path to player using simple pathfinding
    const nextStep = findPathStep(e.x, e.y, player.x, player.y);
    if(nextStep) {
        const nx = nextStep.x;
        const ny = nextStep.y;
        
        // Update direction based on movement
        updateEnemyDirection(e, nx, ny);
        
        // Check if tile is valid and not occupied
        if(isValidMove(e, nx, ny)) {
            await animMove(e, nx, ny, e.speed * 1.5, () => {
                e.x = nx;
                e.y = ny;
            });
        }
    }
}

// UPDATE ENEMY DIRECTION - Fix cone direction
function updateEnemyDirection(e, targetX, targetY) {
    const dx = targetX - e.x;
    const dy = targetY - e.y;
    
    // Set direction based on movement or looking direction
    if(Math.abs(dx) > Math.abs(dy)) {
        // Horizontal movement/looking
        e.dir = {x: dx > 0 ? 1 : -1, y: 0};
    } else if(dy !== 0) {
        // Vertical movement/looking
        e.dir = {x: 0, y: dy > 0 ? 1 : -1};
    }
    // If dx and dy are both 0, keep current direction
}

// MOVE TOWARD LAST SEEN POSITION - For investigating
async function moveTowardLastSeen(e) {
    if(!e.lastSeenPlayer) {
        // No last seen position, go back to patrolling
        e.state = 'patrolling';
        e.patrolTarget = null;
        await patrolBehavior(e);
        return;
    }

    const dx = e.lastSeenPlayer.x - e.x;
    const dy = e.lastSeenPlayer.y - e.y;
    const dist = Math.max(Math.abs(dx), Math.abs(dy));
    
    // Update direction to face last seen position
    updateEnemyDirection(e, e.lastSeenPlayer.x, e.lastSeenPlayer.y);
    
    // If we're at or very close to the last seen position, look around
    if(dist <= 1) {
        // Do a small random search move
        await doRandomSearchMove(e);
        return;
    }
    
    // Find path to last seen position using pathfinding
    const nextStep = findPathStep(e.x, e.y, e.lastSeenPlayer.x, e.lastSeenPlayer.y);
    if(nextStep) {
        const nx = nextStep.x;
        const ny = nextStep.y;
        
        // Update direction based on movement
        updateEnemyDirection(e, nx, ny);
        
        // Check if tile is valid and not occupied
        if(isValidMove(e, nx, ny)) {
            await animMove(e, nx, ny, e.speed * 1.2, () => {
                e.x = nx;
                e.y = ny;
            });
        } else {
            // Can't move to planned step, try alternative
            await doRandomSearchMove(e);
        }
    } else {
        // No path found, try random move
        await doRandomSearchMove(e);
    }
}

// DO RANDOM SEARCH MOVE - Helper function for investigating
async function doRandomSearchMove(e) {
    const directions = [
        {x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1}
    ];
    
    // Shuffle directions
    const shuffledDirs = [...directions].sort(() => Math.random() - 0.5);
    
    for(const dir of shuffledDirs) {
        const nx = e.x + dir.x;
        const ny = e.y + dir.y;
        
        if(isValidMove(e, nx, ny)) {
            // Update direction before moving
            e.dir = dir;
            
            await animMove(e, nx, ny, e.speed * 1.2, () => {
                e.x = nx;
                e.y = ny;
            });
            return true;
        }
    }
    
    // Can't move in any direction
    return false;
}

// FIND PATH STEP - Simple pathfinding (Breadth-First Search for one step)
function findPathStep(startX, startY, targetX, targetY) {
    // If target is adjacent, return direct move
    const dx = targetX - startX;
    const dy = targetY - startY;
    const dist = Math.max(Math.abs(dx), Math.abs(dy));
    
    if(dist === 0) return null;
    
    // Check if direct path is available
    if(Math.abs(dx) > Math.abs(dy)) {
        const nx = startX + (dx > 0 ? 1 : -1);
        const ny = startY;
        if(isTileWalkable(nx, ny)) {
            return {x: nx, y: ny};
        }
    } else {
        const nx = startX;
        const ny = startY + (dy > 0 ? 1 : -1);
        if(isTileWalkable(nx, ny)) {
            return {x: nx, y: ny};
        }
    }
    
    // If direct path blocked, use BFS to find alternative path
    const queue = [{x: startX, y: startY, path: []}];
    const visited = new Set();
    visited.add(`${startX},${startY}`);
    
    while(queue.length > 0) {
        const current = queue.shift();
        
        // Check all adjacent tiles
        const neighbors = [
            {x: current.x + 1, y: current.y},
            {x: current.x - 1, y: current.y},
            {x: current.x, y: current.y + 1},
            {x: current.x, y: current.y - 1}
        ];
        
        for(const neighbor of neighbors) {
            const key = `${neighbor.x},${neighbor.y}`;
            
            // Skip if visited or not walkable
            if(visited.has(key) || !isTileWalkable(neighbor.x, neighbor.y)) {
                continue;
            }
            
            visited.add(key);
            
            // Create new path
            const newPath = [...current.path, neighbor];
            
            // If this is the first step in path, return it
            if(newPath.length === 1) {
                // Check if this step gets us closer to target
                const newDist = Math.max(Math.abs(targetX - neighbor.x), Math.abs(targetY - neighbor.y));
                const oldDist = Math.max(Math.abs(targetX - startX), Math.abs(targetY - startY));
                
                if(newDist < oldDist) {
                    return neighbor;
                }
            }
            
            // If we reached target, return first step
            if(neighbor.x === targetX && neighbor.y === targetY) {
                return newPath[0];
            }
            
            // Continue BFS
            queue.push({x: neighbor.x, y: neighbor.y, path: newPath});
        }
    }
    
    // No path found
    return null;
}

// IS TILE WALKABLE - Check if tile can be walked on (ignoring enemies)
function isTileWalkable(x, y) {
    // Check bounds
    if(x < 0 || x >= mapDim || y < 0 || y >= mapDim) {
        return false;
    }
    
    // Check if tile is walkable
    if(grid[y][x] === WALL || grid[y][x] === TRAP) {
        return false;
    }
    
    return true;
}

// PATROL BEHAVIOR - Move to random points on the map with pathfinding
async function patrolBehavior(e) {
    // If no patrol target or reached current target, get new random point
    if(!e.patrolTarget || (e.x === e.patrolTarget.x && e.y === e.patrolTarget.y)) {
        e.patrolTarget = getRandomWalkablePoint(e);
        e.patrolTurns = 0; // Reset turn counter
        e.maxPatrolTurns = Math.floor(Math.random() * 10) + 5; // 5-14 turns to reach point
        
        if(!e.patrolTarget) {
            // Couldn't find a valid point, wait a turn
            createSpeechBubble(e.x, e.y, "Hmm...", "#aaa", 1);
            return;
        }
        
        createSpeechBubble(e.x, e.y, "Patrolling...", "#888", 1);
    }
    
    // Increment turn counter
    e.patrolTurns++;
    
    // If taking too long to reach point, get new one
    if(e.patrolTurns > e.maxPatrolTurns) {
        e.patrolTarget = null;
        await patrolBehavior(e);
        return;
    }
    
    // Move toward patrol target using pathfinding
    const nextStep = findPathStep(e.x, e.y, e.patrolTarget.x, e.patrolTarget.y);
    if(nextStep) {
        const nx = nextStep.x;
        const ny = nextStep.y;
        
        // Update direction based on movement
        updateEnemyDirection(e, nx, ny);
        
        // Check if tile is valid and not occupied by other enemies
        if(isValidMove(e, nx, ny)) {
            await animMove(e, nx, ny, e.speed, () => {
                e.x = nx;
                e.y = ny;
            });
            
            // Check if we can see player after moving
            const canSeePlayer = !e.isSleeping && hasLineOfSight(e, player.x, player.y) && !player.isHidden;
            if(canSeePlayer && e.state === 'patrolling') {
                stats.timesSpotted++;
                createAlertEffect(e.x, e.y);
                createSpeechBubble(e.x, e.y, "! SPOTTED !", "#ff0000", 2);
                playSound('alert');
                e.state = 'chasing';
                e.lastSeenPlayer = {x: player.x, y: player.y};
                e.alertTurns = Math.floor(Math.random() * 5) + 1;
                e.patrolTarget = null; // Cancel patrol
                return;
            }
        } else {
            // Tile occupied by another enemy, try alternative move
            const moved = await doRandomSearchMove(e);
            if(!moved) {
                createSpeechBubble(e.x, e.y, "Blocked...", "#888", 1);
                e.patrolTarget = null; // Get new random point
            }
        }
    } else {
        // No path found, get new patrol target
        createSpeechBubble(e.x, e.y, "Can't reach...", "#888", 1);
        e.patrolTarget = null;
    }
}

// GET RANDOM WALKABLE POINT - Helper function for patrol behavior
function getRandomWalkablePoint(e) {
    const maxAttempts = 30;
    
    for(let attempt = 0; attempt < maxAttempts; attempt++) {
        // Generate random coordinates
        const rx = Math.floor(Math.random() * mapDim);
        const ry = Math.floor(Math.random() * mapDim);
        
        // Check if tile is walkable (not wall) and not occupied
        if(isTileWalkable(rx, ry)) {
            // Check if tile is not occupied by another enemy or player
            const occupied = enemies.some(other => 
                other.alive && other !== e && other.x === rx && other.y === ry
            ) || (player.x === rx && player.y === ry);
            
            if(!occupied) {
                // Check if point is not too close to current position (at least 3 tiles away)
                const dist = Math.max(Math.abs(rx - e.x), Math.abs(ry - e.y));
                if(dist >= 3) {
                    // Verify there's a path to this point
                    if(findPathStep(e.x, e.y, rx, ry)) {
                        return {x: rx, y: ry};
                    }
                }
            }
        }
    }
    
    // If no valid point found after attempts, try any walkable tile with path
    for(let y = 0; y < mapDim; y++) {
        for(let x = 0; x < mapDim; x++) {
            if(isTileWalkable(x, y)) {
                const occupied = enemies.some(other => 
                    other.alive && other !== e && other.x === x && other.y === y
                ) || (player.x === x && player.y === y);
                
                if(!occupied) {
                    const dist = Math.max(Math.abs(x - e.x), Math.abs(y - e.y));
                    if(dist >= 2) {
                        if(findPathStep(e.x, e.y, x, y)) {
                            return {x: x, y: y};
                        }
                    }
                }
            }
        }
    }
    
    // Fallback: stay in place (but check if current tile is occupied by enemy)
    const occupied = enemies.some(other => 
        other.alive && other !== e && other.x === e.x && other.y === e.y
    );
    
    if(!occupied) {
        return {x: e.x, y: e.y};
    }
    
    return null;
}

// EAT BEHAVIOR - Simplified version with pathfinding
async function eatBehavior(e) {
    if(!e.investigationTarget) {
        e.state = 'patrolling';
        return;
    }

    // Check if we're already at the rice (adjacent to it)
    const dx = e.investigationTarget.x - e.x;
    const dy = e.investigationTarget.y - e.y;
    const dist = Math.max(Math.abs(dx), Math.abs(dy));
    
    // Update direction to face rice
    updateEnemyDirection(e, e.investigationTarget.x, e.investigationTarget.y);
    
    if(dist <= 1) {
        // Eat the rice if it's still there
        if(grid[e.investigationTarget.y][e.investigationTarget.x] === RICE) {
            grid[e.investigationTarget.y][e.investigationTarget.x] = FLOOR;
            e.ateRice = true;
            // Random death timer between 1-3 turns
            e.riceDeathTimer = Math.floor(Math.random() * 3) + 1;
            createSpeechBubble(e.x, e.y, "Yum! 🍚", "#ffff00", 2);
            createPoisonEffect(e.x, e.y);
        }
        e.state = 'patrolling';
        e.investigationTarget = null;
        return;
    }
    
    // Find path to rice
    const nextStep = findPathStep(e.x, e.y, e.investigationTarget.x, e.investigationTarget.y);
    if(nextStep) {
        const nx = nextStep.x;
        const ny = nextStep.y;
        
        // Update direction based on movement
        updateEnemyDirection(e, nx, ny);
        
        // Check if tile is valid and not occupied
        if(isValidMove(e, nx, ny)) {
            await animMove(e, nx, ny, e.speed * 1.2, () => {
                e.x = nx;
                e.y = ny;
            });
            
            // Check if rice is still there after moving
            if(e.investigationTarget && grid[e.investigationTarget.y][e.investigationTarget.x] !== RICE) {
                // Rice was eaten or disappeared
                e.state = 'patrolling';
                e.investigationTarget = null;
                createSpeechBubble(e.x, e.y, "Food gone?", "#aaa", 1);
            }
        } else {
            // Can't move toward rice, go back to patrolling
            e.state = 'patrolling';
            e.investigationTarget = null;
            await patrolBehavior(e);
        }
    } else {
        // No path to rice, go back to patrolling
        e.state = 'patrolling';
        e.investigationTarget = null;
        createSpeechBubble(e.x, e.y, "Can't reach food", "#aaa", 1);
        await patrolBehavior(e);
    }
}

// HELPER FUNCTIONS

// Check if a tile is valid for movement (not wall, not trap, not occupied)
function isValidMove(e, x, y) {
    // First check if tile is walkable
    if(!isTileWalkable(x, y)) {
        return false;
    }
    
    // Check if tile has another enemy
    const enemyAtTile = enemies.find(other => 
        other.alive && other !== e && other.x === x && other.y === y
    );
    
    if(enemyAtTile) {
        return false;
    }
    
    // Check if tile is player position
    if(player.x === x && player.y === y) {
        return false;
    }
    
    return true;
}

// Find visible rice in line of sight
function findVisibleRice(e) {
    // Check all tiles in the map for rice
    for(let y = 0; y < mapDim; y++) {
        for(let x = 0; x < mapDim; x++) {
            if(grid[y][x] === RICE) {
                // Check if rice is in line of sight
                if(hasLineOfSight(e, x, y)) {
                    return {x: x, y: y};
                }
            }
        }
    }
    return null;
}

// Create poison effect when enemy eats rice
function createPoisonEffect(x, y) {
    // Create a green poison cloud effect
    const effect = {
        x: x,
        y: y,
        color: "#00ff00",
        alpha: 0.7,
        size: 1.0,
        timer: 30
    };
    
    // Add to effects array if you have one, or create a visual effect
    if(typeof createVisualEffect === 'function') {
        createVisualEffect(x, y, "poison");
    }
}