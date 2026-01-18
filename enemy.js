// ============================================
// ENEMY AI & DETECTION SYSTEM (UPDATED)
// ============================================

async function processEnemyTurn(e) {
    if(!e.alive) return;

    // Check trap INSTANTLY - IMMEDIATE DEATH  
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
        e.alertTurns = Math.floor(Math.random() * 5) + 1; // 1-5 alert turns
        e.hasHeardSound = false;  
        e.soundLocation = null;  
        e.investigationTarget = null;  
        
        // When chasing, move toward player immediately  
        await chasePlayer(e);  
        return;  
    }  
    
    // If enemy is chasing/alert but can't see player now  
    if((e.state === 'chasing' || e.state === 'alert') && !canSeePlayerNow) {  
        // Decrement alert timer  
        if(e.alertTurns) e.alertTurns--;  
        
        if(e.alertTurns <= 0) {  
            // Lost player completely after alert turns
            e.state = 'patrolling';  
            e.patrolTarget = null; // Get new random patrol point
            createSpeechBubble(e.x, e.y, "Lost them...", "#aaa", 2);  
            await patrolBehavior(e);  
            return;  
        } else {  
            // Still alert, move toward last seen position
            e.state = 'alert';
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
    }  
    
    // If investigating sound  
    if(e.hasHeardSound && e.soundLocation && e.state !== 'chasing' && e.state !== 'alert') {  
        e.state = 'alert';  
        e.lastSeenPlayer = e.soundLocation;  
        e.alertTurns = 3; // Short alert for sounds
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
    
    // Move one tile toward player
    let moveX = 0;
    let moveY = 0;
    
    // Determine best move direction
    if(Math.abs(dx) > Math.abs(dy)) {
        moveX = dx > 0 ? 1 : -1;
    } else {
        moveY = dy > 0 ? 1 : -1;
    }
    
    const nx = e.x + moveX;
    const ny = e.y + moveY;
    
    // Check if tile is valid
    if(nx >= 0 && nx < mapDim && ny >= 0 && ny < mapDim && 
       grid[ny][nx] !== WALL) {
        
        // Check if tile has another enemy
        const enemyAtTile = enemies.find(other => 
            other.alive && other !== e && other.x === nx && other.y === ny
        );
        
        if(!enemyAtTile) {
            await animMove(e, nx, ny, e.speed * 1.5, () => {
                e.x = nx;
                e.y = ny;
                e.dir = {x: moveX, y: moveY};
            });
            
            // Check trap after moving (INSTANT DEATH)
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
        }
    }
}

// MOVE TOWARD LAST SEEN POSITION
async function moveTowardLastSeen(e) {
    if(!e.lastSeenPlayer) return;

    const dx = e.lastSeenPlayer.x - e.x;
    const dy = e.lastSeenPlayer.y - e.y;
    const dist = Math.max(Math.abs(dx), Math.abs(dy));
    
    if(dist === 0) {
        // Already at last seen position, look around
        const directions = [
            {x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1}
        ];
        
        // Try to move in a random direction to search
        const validDirs = directions.filter(dir => {
            const tx = e.x + dir.x;
            const ty = e.y + dir.y;
            return tx >= 0 && tx < mapDim && ty >= 0 && ty < mapDim && 
                   grid[ty][tx] !== WALL;
        });
        
        if(validDirs.length > 0) {
            const dir = validDirs[Math.floor(Math.random() * validDirs.length)];
            const nx = e.x + dir.x;
            const ny = e.y + dir.y;
            
            const enemyAtTile = enemies.find(other => 
                other.alive && other !== e && other.x === nx && other.y === ny
            );
            
            if(!enemyAtTile) {
                await animMove(e, nx, ny, e.speed * 1.2, () => {
                    e.x = nx;
                    e.y = ny;
                    e.dir = dir;
                });
            }
        }
        return;
    }
    
    // Move one tile toward last seen position
    let moveX = 0;
    let moveY = 0;
    
    if(Math.abs(dx) > Math.abs(dy)) {
        moveX = dx > 0 ? 1 : -1;
    } else {
        moveY = dy > 0 ? 1 : -1;
    }
    
    const nx = e.x + moveX;
    const ny = e.y + moveY;
    
    // Check if tile is valid
    if(nx >= 0 && nx < mapDim && ny >= 0 && ny < mapDim && 
       grid[ny][nx] !== WALL) {
        
        // Check if tile has another enemy
        const enemyAtTile = enemies.find(other => 
            other.alive && other !== e && other.x === nx && other.y === ny
        );
        
        if(!enemyAtTile) {
            await animMove(e, nx, ny, e.speed * 1.2, () => {
                e.x = nx;
                e.y = ny;
                e.dir = {x: moveX, y: moveY};
            });
            
            // Check trap after moving (INSTANT DEATH)
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
        }
    }
}

// PATROL BEHAVIOR - Move to random points on the map
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
    
    // Move toward patrol target
    const dx = e.patrolTarget.x - e.x;
    const dy = e.patrolTarget.y - e.y;
    const dist = Math.max(Math.abs(dx), Math.abs(dy));
    
    if(dist === 0) {
        // Reached target, wait a turn then get new point
        createSpeechBubble(e.x, e.y, "Look around...", "#aaa", 1);
        e.patrolTarget = null;
        return;
    }
    
    // Move one tile toward patrol target
    let moveX = 0;
    let moveY = 0;
    
    // Prefer horizontal movement if equal distance
    if(Math.abs(dx) >= Math.abs(dy)) {
        moveX = dx > 0 ? 1 : -1;
    } else {
        moveY = dy > 0 ? 1 : -1;
    }
    
    // Try primary direction
    let nx = e.x + moveX;
    let ny = e.y + moveY;
    let validMove = false;
    
    if(nx >= 0 && nx < mapDim && ny >= 0 && ny < mapDim && 
       grid[ny][nx] !== WALL) {
        
        // Check if tile has another enemy
        const enemyAtTile = enemies.find(other => 
            other.alive && other !== e && other.x === nx && other.y === ny
        );
        
        if(!enemyAtTile) {
            validMove = true;
        }
    }
    
    // If primary move blocked, try alternative directions
    if(!validMove) {
        const directions = [
            {x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1}
        ];
        
        // Shuffle directions for more natural movement
        const shuffledDirs = [...directions].sort(() => Math.random() - 0.5);
        
        for(const dir of shuffledDirs) {
            // Skip the primary direction we already tried
            if(dir.x === moveX && dir.y === moveY) continue;
            
            nx = e.x + dir.x;
            ny = e.y + dir.y;
            
            if(nx >= 0 && nx < mapDim && ny >= 0 && ny < mapDim && 
               grid[ny][nx] !== WALL) {
                
                const enemyAtTile = enemies.find(other => 
                    other.alive && other !== e && other.x === nx && other.y === ny
                );
                
                if(!enemyAtTile) {
                    moveX = dir.x;
                    moveY = dir.y;
                    validMove = true;
                    break;
                }
            }
        }
    }
    
    // If found a valid move, execute it
    if(validMove) {
        await animMove(e, nx, ny, e.speed, () => {
            e.x = nx;
            e.y = ny;
            e.dir = {x: moveX, y: moveY};
        });
        
        // Check trap after moving (INSTANT DEATH)
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
        
        // Check if we can see player after moving
        const canSeePlayer = !e.isSleeping && hasLineOfSight(e, player.x, player.y) && !player.isHidden;
        if(canSeePlayer) {
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
        // Can't move, wait a turn and try new direction next time
        createSpeechBubble(e.x, e.y, "Stuck...", "#888", 1);
        e.patrolTarget = null; // Get new random point
    }
}

// GET RANDOM WALKABLE POINT - Helper function for patrol behavior
function getRandomWalkablePoint(e) {
    const maxAttempts = 20;
    
    for(let attempt = 0; attempt < maxAttempts; attempt++) {
        // Generate random coordinates
        const rx = Math.floor(Math.random() * mapDim);
        const ry = Math.floor(Math.random() * mapDim);
        
        // Check if tile is walkable (not wall)
        if(grid[ry][rx] !== WALL) {
            // Optional: Check if point is reachable (BFS check)
            // For simplicity, we'll assume most points are reachable
            // You could implement a pathfinding check here if needed
            
            // Check if point is not too close to current position (at least 3 tiles away)
            const dist = Math.max(Math.abs(rx - e.x), Math.abs(ry - e.y));
            if(dist >= 3) {
                return {x: rx, y: ry};
            }
        }
    }
    
    // If no valid point found after attempts, try any walkable tile
    for(let y = 0; y < mapDim; y++) {
        for(let x = 0; x < mapDim; x++) {
            if(grid[y][x] !== WALL) {
                const dist = Math.max(Math.abs(x - e.x), Math.abs(y - e.y));
                if(dist >= 2) {
                    return {x: x, y: y};
                }
            }
        }
    }
    
    // Fallback: current position (stay put)
    return {x: e.x, y: e.y};
}

// EAT BEHAVIOR
async function eatBehavior(e) {
    if(!e.investigationTarget) {
        e.state = 'patrolling';
        return;
    }

    await moveTowardLastSeen(e);  
    
    // Check if at rice location  
    const dx = e.investigationTarget.x - e.x;  
    const dy = e.investigationTarget.y - e.y;  
    const dist = Math.max(Math.abs(dx), Math.abs(dy));  
    
    if(dist <= 1) {  
        // Eat the rice  
        grid[e.investigationTarget.y][e.investigationTarget.x] = FLOOR;  
        e.ateRice = true;  
        e.state = 'patrolling';  
        e.investigationTarget = null;  
        createSpeechBubble(e.x, e.y, "Yum! 🍚", "#ffff00", 2);  
    }
}