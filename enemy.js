// ============================================
// ENEMY AI & DETECTION SYSTEM (UPDATED)
// ============================================

async function processEnemyTurn(e) {
    if(!e.alive) return;
    
    // Check trap INSTANTLY - IMMEDIATE DEATH
    if(grid[e.y][e.x] === TRAP) {
        // INSTANT DEATH - no waiting for next turn
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
        e.sleepTimer = Math.floor(Math.random() * 5) + 2; // 2-6 turns
        createSpeechBubble(e.x, e.y, "💤 Falling asleep!", "#9932cc", 2);
        return;
    }
    
    // Check if enemy can see player RIGHT NOW
    const canSeePlayerNow = !e.isSleeping && hasLineOfSight(e, player.x, player.y) && !player.isHidden;
    
    // IMMEDIATE SPOTTING - if enemy can see player, spot immediately
    if(canSeePlayerNow) {
        if(e.state !== 'chasing' && e.state !== 'alerted') {
            stats.timesSpotted++;
            createAlertEffect(e.x, e.y);
            createSpeechBubble(e.x, e.y, "! SPOTTED !", "#ff0000", 2);
            playSound('alert');
        }
        
        e.state = 'chasing';
        e.lastSeenPlayer = {x: player.x, y: player.y};
        e.alertTurns = Math.floor(Math.random() * 4) + 2; // 2-5 turns alert
        e.hasHeardSound = false; // Clear sound investigation when chasing player
        e.soundLocation = null;
        e.investigationTarget = null;
        
        // When chasing, move toward player immediately
        await chasePlayer(e);
        return; // Skip other behaviors when chasing
    }
    
    // If enemy is chasing but can't see player now
    if(e.state === 'chasing' && !canSeePlayerNow) {
        // Decrement alert timer
        if(e.alertTurns) e.alertTurns--;
        
        if(e.alertTurns <= 0) {
            // Lost player completely
            e.state = 'investigating';
            e.investigationTarget = e.lastSeenPlayer;
            e.investigationTurns = 3;
            createSpeechBubble(e.x, e.y, "Lost them...", "#aaa", 2);
            await investigateBehavior(e);
            return;
        } else {
            // Still alert, move toward last seen position
            createSpeechBubble(e.x, e.y, "Where'd they go?", "#ff9900", 2);
            await moveTowardLastSeen(e);
            return;
        }
    }
    
    // If investigating sound
    if(e.hasHeardSound && e.soundLocation && e.state !== 'chasing') {
        e.state = 'investigating';
        e.investigationTarget = e.soundLocation;
        e.investigationTurns = 5;
        e.hasHeardSound = false; // Reset flag
        createSpeechBubble(e.x, e.y, "Hmm? What was that?", "#ff9900", 2);
        await investigateBehavior(e);
        return;
    }
    
    // Default patrol behavior
    if(e.state === 'patrolling' || !e.state) {
        await patrolBehavior(e);
    } else if(e.state === 'investigating') {
        await investigateBehavior(e);
    } else if(e.state === 'eating') {
        await eatBehavior(e);
    }
}

// CHASE PLAYER - Move toward player when spotted
async function chasePlayer(e) {
    if(!e.alive || e.isSleeping) return;
    
    const maxDistance = Math.floor(Math.random() * 3) + 1; // 1-3 tiles
    
    // Calculate direction to player
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.max(Math.abs(dx), Math.abs(dy));
    
    // If player is adjacent, attack
    if(dist <= e.attackRange) {
        // Attack player
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
    
    // Move toward player (up to maxDistance tiles)
    let movesMade = 0;
    let currentX = e.x;
    let currentY = e.y;
    
    while(movesMade < maxDistance && movesMade < dist) {
        // Determine best move toward player
        let moveX = 0;
        let moveY = 0;
        
        if(Math.abs(dx) > Math.abs(dy)) {
            moveX = dx > 0 ? 1 : -1;
        } else {
            moveY = dy > 0 ? 1 : -1;
        }
        
        const nx = currentX + moveX;
        const ny = currentY + moveY;
        
        // Check if tile is valid
        if(nx >= 0 && nx < mapDim && ny >= 0 && ny < mapDim && 
           grid[ny][nx] !== WALL) {
            
            // Check if tile has another enemy (but not player)
            const enemyAtTile = enemies.find(other => 
                other.alive && other !== e && other.x === nx && other.y === ny
            );
            
            if(!enemyAtTile) {
                await animMove(e, nx, ny, e.speed * 1.5, () => {
                    e.x = nx;
                    e.y = ny;
                    currentX = nx;
                    currentY = ny;
                    e.dir = {x: moveX, y: moveY};
                });
                movesMade++;
                
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
                    e.lastSeenPlayer = {x: player.x, y: player.y};
                    e.alertTurns = Math.floor(Math.random() * 4) + 2;
                }
                
                // Small delay between moves
                await new Promise(resolve => setTimeout(resolve, 100));
            } else {
                // Tile blocked by another enemy, try alternative
                break;
            }
        } else {
            // Can't move in that direction, try alternative
            break;
        }
    }
}

// MOVE TOWARD LAST SEEN POSITION
async function moveTowardLastSeen(e) {
    if(!e.lastSeenPlayer) return;
    
    const maxDistance = Math.floor(Math.random() * 2) + 1; // 1-2 tiles when investigating
    
    const dx = e.lastSeenPlayer.x - e.x;
    const dy = e.lastSeenPlayer.y - e.y;
    const dist = Math.max(Math.abs(dx), Math.abs(dy));
    
    if(dist <= 1) {
        // Reached last known position, look around
        createSpeechBubble(e.x, e.y, "Where are you?", "#ff9900", 2);
        return;
    }
    
    let movesMade = 0;
    let currentX = e.x;
    let currentY = e.y;
    
    while(movesMade < maxDistance && movesMade < dist - 1) {
        let moveX = 0;
        let moveY = 0;
        
        if(Math.abs(dx) > Math.abs(dy)) {
            moveX = dx > 0 ? 1 : -1;
        } else {
            moveY = dy > 0 ? 1 : -1;
        }
        
        const nx = currentX + moveX;
        const ny = currentY + moveY;
        
        // Check if tile is valid
        if(nx >= 0 && nx < mapDim && ny >= 0 && ny < mapDim && 
           grid[ny][nx] !== WALL) {
            
            // Check if tile has another enemy (but not player)
            const enemyAtTile = enemies.find(other => 
                other.alive && other !== e && other.x === nx && other.y === ny
            );
            
            if(!enemyAtTile) {
                await animMove(e, nx, ny, e.speed * 1.2, () => {
                    e.x = nx;
                    e.y = ny;
                    currentX = nx;
                    currentY = ny;
                    e.dir = {x: moveX, y: moveY};
                });
                movesMade++;
                
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
                
                // Small delay between moves
                await new Promise(resolve => setTimeout(resolve, 100));
            } else {
                break;
            }
        } else {
            break;
        }
    }
}

// PATROL BEHAVIOR (simplified)
async function patrolBehavior(e) {
    const directions = [
        {x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1}
    ];
    
    // Random movement distance 1-3 tiles
    const maxDistance = Math.floor(Math.random() * 3) + 1;
    let movesMade = 0;
    
    while(movesMade < maxDistance) {
        // Try current direction first
        let nx = e.x + e.dir.x;
        let ny = e.y + e.dir.y;
        
        // If can't move in current direction, choose random
        if(nx < 0 || nx >= mapDim || ny < 0 || ny >= mapDim || 
           grid[ny][nx] === WALL) {
            
            const validDirs = directions.filter(dir => {
                const tx = e.x + dir.x;
                const ty = e.y + dir.y;
                return tx >= 0 && tx < mapDim && ty >= 0 && ty < mapDim && 
                       grid[ty][tx] !== WALL;
            });
            
            if(validDirs.length > 0) {
                const dir = validDirs[Math.floor(Math.random() * validDirs.length)];
                nx = e.x + dir.x;
                ny = e.y + dir.y;
                e.dir = dir;
            } else {
                break;
            }
        }
        
        // Move to the tile
        await animMove(e, nx, ny, e.speed, () => {
            e.x = nx;
            e.y = ny;
        });
        movesMade++;
        
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

// INVESTIGATE BEHAVIOR
async function investigateBehavior(e) {
    if(!e.investigationTarget) {
        e.state = 'patrolling';
        return;
    }
    
    await moveTowardLastSeen(e);
    
    // Check if at investigation location
    const dx = e.investigationTarget.x - e.x;
    const dy = e.investigationTarget.y - e.y;
    const dist = Math.max(Math.abs(dx), Math.abs(dy));
    
    if(dist <= 1) {
        // Look around
        createSpeechBubble(e.x, e.y, "Nothing here...", "#aaa", 2);
        e.state = 'patrolling';
        e.investigationTarget = null;
        e.investigationTurns = 0;
    } else {
        e.investigationTurns--;
        if(e.investigationTurns <= 0) {
            e.state = 'patrolling';
            e.investigationTarget = null;
        }
    }
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