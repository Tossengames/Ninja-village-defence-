// ============================================
// ENEMY AI & BEHAVIOR
// ============================================

async function processEnemyTurn(e) {
    if(!e.alive || combatSequence) return;
    
    // Show enemy status above unit
    if(Math.random() < 0.3) { // 30% chance to show status
        showEnemyStatus(e);
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // IMMEDIATE DETECTION: Check for player in line of sight
    if(hasLineOfSight(e, player.x, player.y) && !player.isHidden) {
        if(e.state !== 'alerted' && e.state !== 'chasing') {
            e.state = 'chasing';
            e.lastSeenPlayer = {x: player.x, y: player.y};
            e.chaseTurns = 5;
            e.thought = getRandomThought('spotted');
            e.thoughtTimer = 3;
            createAlertEffect(e.x, e.y);
            
            // Show reaction above unit
            addUnitText(e.x, e.y, "❗ SPOTTED!", e.color, 2);
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    
    // Check for sounds heard
    if(e.hasHeardSound && e.soundLocation) {
        if(e.state !== 'alerted' && e.state !== 'chasing') {
            e.state = 'investigating';
            e.investigationTarget = e.soundLocation;
            e.investigationTurns = 5;
            e.thought = getRandomThought('heard');
            e.thoughtTimer = 3;
            e.hasHeardSound = false;
            
            addUnitText(e.x, e.y, "👂 HEARD NOISE", e.color, 2);
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
        createTrapEffect(e.x, e.y);
        createDeathEffect(e.x, e.y);
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
        createTrapEffect(e.x, e.y);
        createDeathEffect(e.x, e.y);
        return;
    }
    
    // Check for rice
    if(e.alive && grid[e.y][e.x] === RICE) {
        e.state = 'eating';
        e.poisonTimer = Math.floor(Math.random() * 5) + 1;
        grid[e.y][e.x] = FLOOR;
        e.thought = getRandomThought('rice');
        e.thoughtTimer = 3;
        
        addUnitText(e.x, e.y, "🍚 FOUND RICE!", "#33ff33", 2);
        await new Promise(resolve => setTimeout(resolve, 500));
        return;
    }
    
    // Rice poisoning
    if(e.alive && e.state === 'eating' && e.poisonTimer > 0) {
        e.poisonTimer--;
        e.thought = getRandomThought('sick');
        e.thoughtTimer = 2;
        
        if(e.poisonTimer <= 0) {
            await new Promise(resolve => setTimeout(resolve, 300));
            e.alive = false;
            e.state = 'dead';
            stats.kills++;
            createDeathEffect(e.x, e.y);
            return;
        } else {
            addUnitText(e.x, e.y, `🤢 SICK (${e.poisonTimer})`, "#ff00ff", 2);
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }
}

function showEnemyStatus(e) {
    const status = getEnemyStatusText(e);
    if(status) {
        e.thought = status.text;
        e.thoughtTimer = 2;
        addUnitText(e.x, e.y, status.emoji, "#ffffff", 2);
    }
}

function getEnemyStatusText(e) {
    switch(e.state) {
        case 'patrolling':
            return {
                emoji: getRandomEmoji(['😴', '😐', '😪', '🥱']),
                text: getRandomThought('patrol')
            };
        case 'investigating':
            return {
                emoji: getRandomEmoji(['👂', '🤔', '🔍', '🎯']),
                text: getRandomThought('investigate')
            };
        case 'chasing':
            return {
                emoji: getRandomEmoji(['❗', '👁️', '🎯', '⚡']),
                text: getRandomThought('chase')
            };
        case 'eating':
            if(e.poisonTimer > 0) {
                return {
                    emoji: getRandomEmoji(['🤢', '😫', '🤮', '💀']),
                    text: getRandomThought('sick')
                };
            } else {
                return {
                    emoji: getRandomEmoji(['🍚', '😋', '🤤', '👍']),
                    text: getRandomThought('eating')
                };
            }
        default:
            return null;
    }
}

function getRandomThought(type) {
    const thoughts = {
        'patrol': ['Boring...', 'So tired...', 'When shift ends?', 'Need break...', 'Nothing here...'],
        'investigate': ['What was that?', 'Heard something...', 'Check it out...', 'Probably nothing...'],
        'spotted': ['INTRUDER!', 'ALERT!', 'ENEMY!', 'ATTACK!'],
        'chase': ['Where they go?', 'After them!', 'Get them!', 'Dont escape!'],
        'heard': ['A noise?', 'Whats that?', 'Someone there?', 'Investigate...'],
        'rice': ['Food!', 'Im starving!', 'Lunch time!', 'For me?'],
        'sick': ['My stomach...', 'Feel sick...', 'Poisoned?!', 'Ugh...'],
        'eating': ['So good!', 'Delicious!', 'Mmm rice!', 'Yummy!']
    };
    
    const list = thoughts[type] || ['...'];
    return list[Math.floor(Math.random() * list.length)];
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
            
            // Check if player is at that position (stop 1 tile away)
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
        // Calculate distance to player
        const distToPlayer = Math.hypot(e.x - player.x, e.y - player.y);
        
        // If in attack range, attack instead of moving closer
        if(distToPlayer <= e.attackRange) {
            addUnitText(e.x, e.y, `${e.type} ATTACK!`, e.color, 2);
            await new Promise(resolve => setTimeout(resolve, 500));
            
            playerHP -= e.damage;
            createDamageEffect(player.x, player.y, e.damage, true);
            addUnitText(player.x, player.y, `-${e.damage}`, "#ff66ff", 2);
            updateHPDisplay();
            
            await new Promise(resolve => setTimeout(resolve, 800));
            
            if(playerHP <= 0) {
                gameOver = true;
                document.getElementById('gameOverScreen').classList.remove('hidden');
                document.getElementById('resultScreen').classList.add('hidden');
                showGameOverStats();
                return;
            }
            
            e.chaseTurns--;
            return;
        }
        
        // Move toward last seen player position (stop 1 tile away from player)
        const dx = Math.sign(e.lastSeenPlayer.x - e.x);
        const dy = Math.sign(e.lastSeenPlayer.y - e.y);
        
        let moveX = e.x, moveY = e.y;
        let moved = false;
        
        // Try to move toward player but stop if would end up on player
        if(Math.abs(dx) > 0 && canMoveTo(e.x + dx, e.y, e) && !(e.x + dx === player.x && e.y === player.y)) {
            moveX = e.x + dx;
            e.dir = {x: dx, y: 0};
            moved = true;
        } else if(Math.abs(dy) > 0 && canMoveTo(e.x, e.y + dy, e) && !(e.x === player.x && e.y + dy === player.y)) {
            moveY = e.y + dy;
            e.dir = {x: 0, y: dy};
            moved = true;
        } else {
            // Try alternative directions
            const altDirs = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
            for(let d of altDirs) {
                if(canMoveTo(e.x + d.x, e.y + d.y, e) && !(e.x + d.x === player.x && e.y + d.y === player.y)) {
                    moveX = e.x + d.x;
                    moveY = e.y + d.y;
                    e.dir = d;
                    moved = true;
                    break;
                }
            }
        }
        
        if(moved && (moveX !== e.x || moveY !== e.y)) {
            addUnitText(e.x, e.y, "CHASING", e.color, 1);
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
            e.chaseTurns = 5;
        } else if(e.chaseTurns <= 0) {
            // Lost sight of player
            e.state = 'patrolling';
            e.thought = getRandomThought('patrol');
            e.thoughtTimer = 2;
            addUnitText(e.x, e.y, "👁️ LOST SIGHT", e.color, 2);
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
            addUnitText(e.x, e.y, "INVESTIGATING", e.color, 1);
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
            e.thought = getRandomThought('patrol');
            e.thoughtTimer = 2;
            addUnitText(e.x, e.y, "👁️ GIVING UP", e.color, 2);
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
            addUnitText(e.x, e.y, "INVESTIGATING", e.color, 1);
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
            e.thought = '';
            addUnitText(e.x, e.y, "👁️ GIVING UP", e.color, 2);
        }
    }
}

async function handleEatingState(e) {
    // Guard stays in place while eating
    e.thought = getRandomEmoji(['🍚', '😋', '🤤', '👍']);
    e.thoughtTimer = 2;
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