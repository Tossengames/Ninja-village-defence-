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
    
    // Check trap instantly (before enemy moves)
    if(grid[e.y][e.x] === TRAP) {
        grid[e.y][e.x] = FLOOR;
        e.alive = false;
        e.state = 'dead';
        e.hp = 0;
        stats.kills++;
        createDeathEffect(e.x, e.y);
        createSpeechBubble(e.x, e.y, "💀 TRAPPED!", "#ff0000", 1.5);
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
            e.state = 'investigating';
            e.investigationTarget = e.lastSeenPlayer;
            e.investigationTurns = 3;
            await investigateBehavior(e);
            break;
    }
    
    // Attack if adjacent to player and chasing AND can see player
    if(!e.isSleeping && e.state === 'chasing') {
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
        e.investigationTurns = 3;
        e.hasHeardSound = false;
        createSpeechBubble(e.x, e.y, "Hmm?", "#ff9900", 1);
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
        e.state = 'patrolling';
        createSpeechBubble(e.x, e.y, "Lost them...", "#aaa", 1);
        return;
    }
    
    e.chaseTurns--;
    
    if(e.lastSeenPlayer) {
        // Don't walk on player - stop 1 tile away
        const dx = e.lastSeenPlayer.x - e.x;
        const dy = e.lastSeenPlayer.y - e.y;
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        
        if(dist <= 1) {
            // Already adjacent to last seen position
            // Look around for player
            e.dir = {x: Math.sign(dx) || e.dir.x, y: Math.sign(dy) || e.dir.y};
            return;
        }
        
        let moveX = 0, moveY = 0;
        
        if(Math.abs(dx) > Math.abs(dy)) {
            moveX = Math.sign(dx);
        } else {
            moveY = Math.sign(dy);
        }
        
        const nx = e.x + moveX;
        const ny = e.y + moveY;
        
        // Check if tile is blocked by another enemy or player
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
                e.dir = {x: moveX, y: moveY};
            });
        } else {
            // Can't move toward player, try alternative direction
            const altDirections = [
                {x: 0, y: Math.sign(dy)},
                {x: Math.sign(dx), y: 0},
                {x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1}
            ];
            
            for(const dir of altDirections) {
                const altX = e.x + dir.x;
                const altY = e.y + dir.y;
                
                if(altX >= 0 && altX < mapDim && altY >= 0 && altY < mapDim && 
                   grid[altY][altX] !== WALL && !isTileBlocked(altX, altY)) {
                    await animMove(e, altX, altY, e.speed * 1.5, () => {
                        e.x = altX;
                        e.y = altY;
                        e.dir = dir;
                    });
                    break;
                }
            }
        }
    }
}

async function investigateBehavior(e) {
    if(e.investigationTurns <= 0) {
        e.state = 'patrolling';
        createSpeechBubble(e.x, e.y, "Nothing...", "#aaa", 1);
        return;
    }
    
    e.investigationTurns--;
    
    if(e.investigationTarget) {
        const dx = e.investigationTarget.x - e.x;
        const dy = e.investigationTarget.y - e.y;
        
        if(Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
            e.investigationTarget = null;
            createSpeechBubble(e.x, e.y, "Nothing here", "#aaa", 1);
            return;
        }
        
        let moveX = 0, moveY = 0;
        
        if(Math.abs(dx) > Math.abs(dy)) {
            moveX = Math.sign(dx);
        } else {
            moveY = Math.sign(dy);
        }
        
        const nx = e.x + moveX;
        const ny = e.y + moveY;
        
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
                e.dir = {x: moveX, y: moveY};
            });
        }
    }
}

async function eatBehavior(e) {
    if(e.investigationTarget) {
        const dx = e.investigationTarget.x - e.x;
        const dy = e.investigationTarget.y - e.y;
        
        if(Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
            // Reached rice
            grid[e.investigationTarget.y][e.investigationTarget.x] = FLOOR;
            e.ateRice = true;
            e.state = 'patrolling';
            createSpeechBubble(e.x, e.y, "Yum! 🍚", "#ffff00", 1.5);
            return;
        }
        
        let moveX = 0, moveY = 0;
        
        if(Math.abs(dx) > Math.abs(dy)) {
            moveX = Math.sign(dx);
        } else {
            moveY = Math.sign(dy);
        }
        
        const nx = e.x + moveX;
        const ny = e.y + moveY;
        
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
                e.dir = {x: moveX, y: moveY};
            });
        }
    } else {
        e.state = 'patrolling';
    }
}