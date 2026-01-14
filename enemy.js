// ============================================
// ENEMY AI & BEHAVIOR
// ============================================

async function processEnemyTurn(e) {
    if(!e.alive) return;
    
    // Show enemy status
    showEnemyStatus(e);
    
    // Wait for thinking
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // IMMEDIATE DETECTION: Check for player in line of sight (no delay)
    if(hasLineOfSight(e, player.x, player.y) && !player.isHidden) {
        if(e.state !== 'alerted' && e.state !== 'chasing') {
            e.state = 'chasing';
            e.lastSeenPlayer = {x: player.x, y: player.y};
            e.chaseTurns = 5;
            e.thought = getRandomThought('spotted');
            e.thoughtTimer = 5;
            createAlertEffect(e.x, e.y);
            log(`🚨 ${e.type} guard spotted you!`, "#ff3333");
            
            // Show immediate reaction
            showEnemyStatus(e);
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
            log(`👂 ${e.type} guard investigating noise`, "#ff9900");
            
            showEnemyStatus(e);
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }
    
    // Check for trap before moving
    if(grid[e.y][e.x] === TRAP) {
        e.alive = false;
        e.state = 'dead';
        stats.kills++;
        grid[e.y][e.x] = FLOOR;
        createTrapEffect(e.x, e.y);
        createDeathEffect(e.x, e.y);
        log(`⚠️ ${e.type} guard stepped on trap and died!`, "#ff3333");
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
        e.alive = false;
        e.state = 'dead';
        stats.kills++;
        grid[e.y][e.x] = FLOOR;
        createTrapEffect(e.x, e.y);
        createDeathEffect(e.x, e.y);
        log(`⚠️ ${e.type} guard stepped on trap and died!`, "#ff3333");
        return;
    }
    
    // Check for rice
    if(e.alive && grid[e.y][e.x] === RICE) {
        e.state = 'eating';
        e.poisonTimer = Math.floor(Math.random() * 5) + 1;
        grid[e.y][e.x] = FLOOR;
        e.thought = getRandomThought('rice');
        e.thoughtTimer = 5;
        log(`🍚 ${e.type} guard found rice!`, "#33ff33");
        return;
    }
    
    // Rice poisoning
    if(e.alive && e.state === 'eating' && e.poisonTimer > 0) {
        e.poisonTimer--;
        e.thought = getRandomThought('sick');
        e.thoughtTimer = 2;
        
        if(e.poisonTimer <= 0) {
            e.alive = false;
            e.state = 'dead';
            stats.kills++;
            createDeathEffect(e.x, e.y);
            log(`💀 ${e.type} guard eliminated by poisoned rice!`, "#ff00ff");
            return;
        } else {
            log(`☠️ ${e.type} guard feeling sick (${e.poisonTimer} turns left)`, "#ff00ff");
        }
    }
}

function showEnemyStatus(e) {
    if(Math.random() < 0.4) { // 40% chance to show status
        const status = getEnemyStatusText(e);
        if(status) {
            e.thought = status.emoji;
            e.thoughtTimer = 3;
            log(status.text, status.color);
        }
    }
}

function getEnemyStatusText(e) {
    switch(e.state) {
        case 'patrolling':
            return {
                emoji: getRandomEmoji(['😴', '😐', '😪', '🥱']),
                text: `👁️ ${e.type} guard: "${getRandomThought('patrol')}"`,
                color: '#ff6666'
            };
        case 'investigating':
            return {
                emoji: getRandomEmoji(['👂', '🤔', '🔍', '🎯']),
                text: `🔍 ${e.type} guard: "${getRandomThought('investigate')}"`,
                color: '#ff9900'
            };
        case 'chasing':
            return {
                emoji: getRandomEmoji(['❗', '👁️', '🎯', '⚡']),
                text: `🚨 ${e.type} guard: "${getRandomThought('chase')}"`,
                color: '#ff3333'
            };
        case 'eating':
            if(e.poisonTimer > 0) {
                return {
                    emoji: getRandomEmoji(['🤢', '😫', '🤮', '💀']),
                    text: `☠️ ${e.type} guard: "${getRandomThought('sick')}"`,
                    color: '#ff00ff'
                };
            } else {
                return {
                    emoji: getRandomEmoji(['🍚', '😋', '🤤', '👍']),
                    text: `🍚 ${e.type} guard: "${getRandomThought('eating')}"`,
                    color: '#33ff33'
                };
            }
        default:
            return null;
    }
}

function getRandomThought(type) {
    const thoughts = {
        'patrol': ['Boring shift...', 'When does this end?', 'Nothing happening...', 'So tired...', 'Need coffee...'],
        'investigate': ['What was that?', 'Heard something...', 'Check it out...', 'Probably nothing...', 'Better look...'],
        'spotted': ['INTRUDER!', 'ALERT!', 'GET THEM!', 'ENEMY SPOTTED!', 'ATTACK!'],
        'chase': ['Where did they go?', 'Can\'t lose them!', 'After them!', 'Don\'t escape!', 'Got you now!'],
        'heard': ['A noise?', 'What\'s that sound?', 'Someone there?', 'Better investigate...', 'Stay alert...'],
        'rice': ['Food!', 'I\'m starving!', 'Lunch time!', 'Yummy!', 'For me?'],
        'sick': ['My stomach...', 'Feel sick...', 'Something wrong...', 'Poisoned?!', 'Ugh...'],
        'eating': ['So good!', 'Delicious!', 'Mmm rice!', 'Yum!', 'Tasty!']
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
        
        // Check bounds and walls
        if(nx>=0 && nx<mapDim && ny>=0 && ny<mapDim && grid[ny][nx]!==WALL) {
            // Check if another enemy is at that position (avoid overlapping)
            const enemyAtPos = enemies.find(other => 
                other.alive && other !== e && other.x === nx && other.y === ny
            );
            if(!enemyAtPos) {
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
        // Move toward last seen player position
        const dx = Math.sign(e.lastSeenPlayer.x - e.x);
        const dy = Math.sign(e.lastSeenPlayer.y - e.y);
        
        let moveX = e.x, moveY = e.y;
        let moved = false;
        
        // Try primary direction
        if(Math.abs(dx) > 0 && canMoveTo(e.x + dx, e.y, e)) {
            moveX = e.x + dx;
            e.dir = {x: dx, y: 0};
            moved = true;
        } else if(Math.abs(dy) > 0 && canMoveTo(e.x, e.y + dy, e)) {
            moveY = e.y + dy;
            e.dir = {x: 0, y: dy};
            moved = true;
        } else {
            // Try alternative directions if primary blocked
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
                animMove(e, moveX, moveY, e.speed * 1.5, () => {
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
            e.chaseTurns = 5; // Reset chase timer
        } else if(e.chaseTurns <= 0) {
            // Lost sight of player
            e.state = 'patrolling';
            e.thought = getRandomThought('patrol');
            e.thoughtTimer = 3;
            log(`👁️ ${e.type} guard lost sight of you`, "#ff6666");
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
            e.thought = getRandomThought('patrol');
            e.thoughtTimer = 3;
            log(`👁️ ${e.type} guard giving up investigation`, "#ff6666");
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
            e.thought = '';
            log(`👁️ ${e.type} guard giving up investigation`, "#ff6666");
        }
    }
}

async function handleEatingState(e) {
    // Guard stays in place while eating
    e.thought = getRandomEmoji(['🍚', '😋', '🤤', '👍']);
    e.thoughtTimer = 2;
}

// Helper function to check if enemy can move to position (avoid other enemies)
function canMoveTo(x, y, enemy) {
    if(x < 0 || x >= mapDim || y < 0 || y >= mapDim) return false;
    if(grid[y][x] === WALL) return false;
    
    // Check if another enemy is at that position
    const enemyAtPos = enemies.find(other => 
        other.alive && other !== enemy && other.x === x && other.y === y
    );
    
    return !enemyAtPos;
}