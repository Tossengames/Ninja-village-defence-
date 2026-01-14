// ============================================
// ENEMY AI & BEHAVIOR
// ============================================

async function processEnemyTurn(e) {
    if(!e.alive || combatSequence) return;
    
    // Show enemy status with cartoon bubble (30% chance)
    if(Math.random() < 0.3) {
        const status = getEnemyStatusText(e);
        if(status) {
            createSpeechBubble(e.x, e.y, status.emoji, "#ffffff", 2);
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }
    
    // Check for player in cone vision
    if(hasLineOfSight(e, player.x, player.y) && !player.isHidden) {
        if(e.state !== 'alerted' && e.state !== 'chasing') {
            e.state = 'chasing';
            e.lastSeenPlayer = {x: player.x, y: player.y};
            e.chaseTurns = e.chaseMemory; // Use memory turns
            createSpeechBubble(e.x, e.y, "❗ SPOTTED!", e.color, 2);
            
            await new Promise(resolve => setTimeout(resolve, 500));
        } else if(e.state === 'chasing') {
            // Update last seen position
            e.lastSeenPlayer = {x: player.x, y: player.y};
            e.chaseTurns = e.chaseMemory; // Reset memory
        }
    }
    
    // Check for sounds heard
    if(e.hasHeardSound && e.soundLocation) {
        if(e.state !== 'alerted' && e.state !== 'chasing') {
            e.state = 'investigating';
            e.investigationTarget = e.soundLocation;
            e.investigationTurns = 5;
            createSpeechBubble(e.x, e.y, "👂 HEARD NOISE", e.color, 2);
            e.hasHeardSound = false;
            
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }
    
    // Check for trap before moving
    if(grid[e.y][e.x] === TRAP) {
        await new Promise(resolve => setTimeout(resolve, 300));
        e.alive = false;
        e.state = 'dead';
        stats.kills++;
        grid[e.y][e.x] = FLOOR;
        createSpeechBubble(e.x, e.y, "💀 TRAPPED!", "#ff0000", 2.5);
        return;
    }
    
    // State-based behavior
    switch(e.state) {
        case 'chasing':
            await handleChasingState(e);
            break;
        case 'alerted':
            await handleAlertedState(e);
            break;
        case 'investigating':
            await handleInvestigatingState(e);
            break;
        case 'eating':
            await handleEatingState(e);
            break;
        default:
            await handlePatrollingState(e);
            break;
    }
    
    // Check for trap after moving
    if(e.alive && grid[e.y][e.x] === TRAP) {
        await new Promise(resolve => setTimeout(resolve, 300));
        e.alive = false;
        e.state = 'dead';
        stats.kills++;
        grid[e.y][e.x] = FLOOR;
        createSpeechBubble(e.x, e.y, "💀 TRAPPED!", "#ff0000", 2.5);
        return;
    }
    
    // Check for rice
    if(e.alive && grid[e.y][e.x] === RICE) {
        e.state = 'eating';
        e.poisonTimer = Math.floor(Math.random() * 5) + 1;
        grid[e.y][e.x] = FLOOR;
        createSpeechBubble(e.x, e.y, "🍚 FOUND RICE!", "#33ff33", 2);
        await new Promise(resolve => setTimeout(resolve, 500));
        return;
    }
    
    // Rice poisoning
    if(e.alive && e.state === 'eating' && e.poisonTimer > 0) {
        e.poisonTimer--;
        
        if(e.poisonTimer <= 0) {
            await new Promise(resolve => setTimeout(resolve, 300));
            e.alive = false;
            e.state = 'dead';
            stats.kills++;
            createSpeechBubble(e.x, e.y, "💀 POISONED!", "#ff00ff", 2.5);
            return;
        } else {
            createSpeechBubble(e.x, e.y, `🤢 SICK (${e.poisonTimer})`, "#ff00ff", 2);
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }
}

function getEnemyStatusText(e) {
    switch(e.state) {
        case 'patrolling':
            return { emoji: getRandomEmoji(['😴', '😐', '😪', '🥱']) };
        case 'investigating':
            return { emoji: getRandomEmoji(['👂', '🤔', '🔍', '🎯']) };
        case 'chasing':
            return { emoji: getRandomEmoji(['❗', '👁️', '🎯', '⚡']) };
        case 'eating':
            if(e.poisonTimer > 0) {
                return { emoji: getRandomEmoji(['🤢', '😫', '🤮', '💀']) };
            } else {
                return { emoji: getRandomEmoji(['🍚', '😋', '🤤', '👍']) };
            }
        default:
            return null;
    }
}

function getRandomEmoji(emojis) {
    return emojis[Math.floor(Math.random() * emojis.length)];
}

async function handlePatrollingState(e) {
    const dirs = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
    let validDirs = [];
    
    for(let d of dirs) {
        const nx = e.x + d.x;
        const ny = e.y + d.y;
        
        if(nx>=0 && nx<mapDim && ny>=0 && ny<mapDim && grid[ny][nx]!==WALL) {
            // Check if another enemy is at that position
            const enemyAtPos = enemies.find(other => 
                other.alive && other !== e && other.x === nx && other.y === ny
            );
            
            // Check if player is at that position
            const playerAtPos = (nx === player.x && ny === player.y);
            
            if(!enemyAtPos && !playerAtPos) {
                validDirs.push(d);
            }
        }
    }
    
    if(validDirs.length > 0) {
        const d = validDirs[Math.floor(Math.random()*validDirs.length)];
        e.dir = d;
        const nx = e.x + d.x;
        const ny = e.y + d.y;
        
        await new Promise(resolve => {
            animMove(e, nx, ny, e.speed, () => {
                e.x = nx;
                e.y = ny;
                e.returnToPatrolPos = {x: nx, y: ny};
                resolve();
            });
        });
    }
}

async function handleChasingState(e) {
    if(e.chaseTurns > 0) {
        // Calculate distance to last seen position
        const distToLastSeen = Math.hypot(e.x - e.lastSeenPlayer.x, e.y - e.lastSeenPlayer.y);
        
        // If in attack range of last seen position (or player if still visible), attack
        if(distToLastSeen <= e.attackRange || 
           (hasLineOfSight(e, player.x, player.y) && !player.isHidden && Math.hypot(e.x - player.x, e.y - player.y) <= e.attackRange)) {
            
            createSpeechBubble(e.x, e.y, `${e.type} ATTACK!`, e.color, 2);
            await new Promise(resolve => setTimeout(resolve, 500));
            
            playerHP -= e.damage;
            createSpeechBubble(player.x, player.y, `-${e.damage}`, "#ff66ff", 2);
            updateHPDisplay();
            
            await new Promise(resolve => setTimeout(resolve, 800));
            
            if(playerHP <= 0) {
                gameOver = true;
                showGameOverStats();
                return;
            }
            
            e.chaseTurns--;
            return;
        }
        
        // Move toward last seen player position
        const dx = Math.sign(e.lastSeenPlayer.x - e.x);
        const dy = Math.sign(e.lastSeenPlayer.y - e.y);
        
        let moveX = e.x, moveY = e.y;
        let moved = false;
        
        // Try to move toward last seen position
        if(Math.abs(dx) > 0 && canMoveTo(e.x + dx, e.y, e)) {
            moveX = e.x + dx;
            e.dir = {x: dx, y: 0};
            moved = true;
        } else if(Math.abs(dy) > 0 && canMoveTo(e.x, e.y + dy, e)) {
            moveY = e.y + dy;
            e.dir = {x: 0, y: dy};
            moved = true;
        } else {
            // Try alternative directions
            const altDirs = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
            for(let d of altDirs) {
                if(canMoveTo(e.x + d.x, e.y + d.y, e)) {
                    moveX = e.x + d.x;
                    moveY = e.y + d.y;
                    e.dir = d;
                    moved = true;
                    break;
                }
            }
        }
        
        if(moved && (moveX !== e.x || moveY !== e.y)) {
            await new Promise(resolve => {
                animMove(e, moveX, moveY, e.speed * 1.2, () => {
                    e.x = moveX;
                    e.y = moveY;
                    resolve();
                });
            });
        }
        
        e.chaseTurns--;
        
        // Check if player is still visible
        if(hasLineOfSight(e, player.x, player.y) && !player.isHidden) {
            e.lastSeenPlayer = {x: player.x, y: player.y};
            e.chaseTurns = e.chaseMemory; // Reset memory
        } else if(e.chaseTurns <= 0) {
            // Lost sight of player for too long
            e.state = 'investigating';
            e.investigationTarget = e.lastSeenPlayer;
            e.investigationTurns = 3;
            createSpeechBubble(e.x, e.y, "👁️ LOST SIGHT", e.color, 2);
        }
    }
}

async function handleAlertedState(e) {
    if(e.investigationTarget && e.investigationTurns > 0) {
        const dx = Math.sign(e.investigationTarget.x - e.x);
        const dy = Math.sign(e.investigationTarget.y - e.y);
        
        let moveX = e.x, moveY = e.y;
        let moved = false;
        
        if(Math.abs(dx) > 0 && canMoveTo(e.x + dx, e.y, e)) {
            moveX = e.x + dx;
            e.dir = {x: dx, y: 0};
            moved = true;
        } else if(Math.abs(dy) > 0 && canMoveTo(e.x, e.y + dy, e)) {
            moveY = e.y + dy;
            e.dir = {x: 0, y: dy};
            moved = true;
        }
        
        if(moved && (moveX !== e.x || moveY !== e.y)) {
            await new Promise(resolve => {
                animMove(e, moveX, moveY, e.speed, () => {
                    e.x = moveX;
                    e.y = moveY;
                    resolve();
                });
            });
        }
        
        e.investigationTurns--;
        if(e.investigationTurns <= 0) {
            e.state = 'patrolling';
            createSpeechBubble(e.x, e.y, "👁️ GIVING UP", e.color, 2);
        }
    }
}

async function handleInvestigatingState(e) {
    if(e.investigationTarget && e.investigationTurns > 0) {
        const dx = Math.sign(e.investigationTarget.x - e.x);
        const dy = Math.sign(e.investigationTarget.y - e.y);
        
        let moveX = e.x, moveY = e.y;
        let moved = false;
        
        if(Math.abs(dx) > 0 && canMoveTo(e.x + dx, e.y, e)) {
            moveX = e.x + dx;
            e.dir = {x: dx, y: 0};
            moved = true;
        } else if(Math.abs(dy) > 0 && canMoveTo(e.x, e.y + dy, e)) {
            moveY = e.y + dy;
            e.dir = {x: 0, y: dy};
            moved = true;
        }
        
        if(moved && (moveX !== e.x || moveY !== e.y)) {
            await new Promise(resolve => {
                animMove(e, moveX, moveY, e.speed, () => {
                    e.x = moveX;
                    e.y = moveY;
                    resolve();
                });
            });
        }
        
        e.investigationTurns--;
        if(e.investigationTurns <= 0) {
            e.state = 'patrolling';
        }
    }
}

async function handleEatingState(e) {
    // Guard stays in place while eating
    // Nothing to do here - already handled above
}

function canMoveTo(x, y, enemy) {
    if(x < 0 || x >= mapDim || y < 0 || y >= mapDim) return false;
    if(grid[y][x] === WALL) return false;
    
    // Check if another enemy is at that position
    const enemyAtPos = enemies.find(other => 
        other.alive && other !== enemy && other.x === x && other.y === y
    );
    
    // Check if player is at that position
    const playerAtPos = (x === player.x && y === player.y);
    
    return !enemyAtPos && !playerAtPos;
}