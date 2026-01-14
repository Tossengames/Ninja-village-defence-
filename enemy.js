// ============================================
// ENEMY AI & BEHAVIOR
// ============================================

async function processEnemyTurn(e) {
    if(!e.alive) return;
    
    // Log enemy state at start of turn
    logEnemyState(e);
    
    // Check for player in line of sight
    if(hasLineOfSight(e, player.x, player.y) && !player.isHidden) {
        e.state = 'alerted';
        e.investigationTarget = {x: player.x, y: player.y};
        e.investigationTurns = 3;
        e.thought = '❗';
        e.thoughtTimer = 5;
        createAlertEffect(e.x, e.y);
        log(`🚨 Guard at (${e.x},${e.y}) spotted you!`, "#ff3333");
        checkGameOver();
        return;
    }
    
    // Check for sounds heard
    if(e.hasHeardSound && e.soundLocation) {
        e.state = 'investigating';
        e.investigationTarget = e.soundLocation;
        e.investigationTurns = 5;
        e.thought = '👂';
        e.thoughtTimer = 3;
        log(`👂 Guard investigating noise at (${e.investigationTarget.x},${e.investigationTarget.y})`, "#ff9900");
        e.hasHeardSound = false;
    }
    
    // Check for trap before moving
    if(grid[e.y][e.x] === TRAP) {
        e.alive = false;
        e.state = 'dead';
        stats.kills++;
        grid[e.y][e.x] = FLOOR; // Remove trap
        createTrapEffect(e.x, e.y);
        createDeathEffect(e.x, e.y);
        log(`⚠️ Guard stepped on trap and died!`, "#ff3333");
        return;
    }
    
    // State-based behavior
    switch(e.state) {
        case 'alerted':
            await handleAlertedState(e);
            break;
        case 'investigating':
            await handleInvestigatingState(e);
            break;
        case 'eating':
            await handleEatingState(e);
            break;
        case 'poisoned':
            await handlePoisonedState(e);
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
        grid[e.y][e.x] = FLOOR; // Remove trap
        createTrapEffect(e.x, e.y);
        createDeathEffect(e.x, e.y);
        log(`⚠️ Guard stepped on trap and died!`, "#ff3333");
        return;
    }
    
    // Check for rice
    if(e.alive && grid[e.y][e.x] === RICE) {
        e.state = 'eating';
        e.poisonTimer = Math.floor(Math.random() * 5) + 1; // Random 1-5 turns
        grid[e.y][e.x] = FLOOR;
        e.thought = '🍚';
        e.thoughtTimer = 5;
        log(`🍚 Guard at (${e.x},${e.y}) started eating rice!`, "#33ff33");
        return;
    }
    
    // ORIGINAL RICE POISONING SYSTEM: Kill after poison timer expires
    if(e.alive && e.state === 'eating' && e.poisonTimer > 0) {
        e.poisonTimer--;
        e.thought = '🤢';
        e.thoughtTimer = 2;
        
        if(e.poisonTimer <= 0) {
            e.alive = false;
            e.state = 'dead';
            stats.kills++;
            createDeathEffect(e.x, e.y);
            log(`💀 Guard eliminated by poisoned rice!`, "#ff00ff");
            return;
        } else {
            log(`☠️ Guard feeling sick (${e.poisonTimer} turns left)`, "#ff00ff");
        }
    }
}

function logEnemyState(e) {
    // Only log important state changes, not every turn
    if(e.state === 'alerted' || e.state === 'eating' || e.state === 'poisoned') {
        const stateLogs = {
            'alerted': `🚨 Guard alerted at (${e.x},${e.y})`,
            'eating': `🍚 Guard eating at (${e.x},${e.y})`
        };
        
        if(stateLogs[e.state]) {
            log(stateLogs[e.state], getStateColor(e.state));
        }
    }
}

function getStateColor(state) {
    const colors = {
        'patrolling': '#ff6666',
        'investigating': '#ff9900',
        'alerted': '#ff3333',
        'eating': '#33ff33',
        'poisoned': '#ff00ff'
    };
    return colors[state] || '#aaa';
}

async function handlePatrollingState(e) {
    const dirs = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
    let validDirs = [];
    
    for(let d of dirs) {
        const nx = e.x + d.x;
        const ny = e.y + d.y;
        if(nx>=0 && nx<mapDim && ny>=0 && ny<mapDim && grid[ny][nx]!==WALL) {
            validDirs.push(d);
        }
    }
    
    if(validDirs.length > 0) {
        const d = validDirs[Math.floor(Math.random()*validDirs.length)];
        e.dir = d;
        const nx = e.x + d.x;
        const ny = e.y + d.y;
        
        await new Promise(resolve => {
            animMove(e, nx, ny, 0.1, () => {
                e.x = nx;
                e.y = ny;
                e.returnToPatrolPos = {x: nx, y: ny};
                resolve();
            });
        });
    }
}

async function handleAlertedState(e) {
    if(e.investigationTarget && e.investigationTurns > 0) {
        // Move toward last known player position
        const dx = Math.sign(e.investigationTarget.x - e.x);
        const dy = Math.sign(e.investigationTarget.y - e.y);
        
        let moveX = e.x, moveY = e.y;
        if(Math.abs(dx) > 0 && grid[e.y][e.x + dx] !== WALL) {
            moveX = e.x + dx;
            e.dir = {x: dx, y: 0};
        } else if(Math.abs(dy) > 0 && grid[e.y + dy][e.x] !== WALL) {
            moveY = e.y + dy;
            e.dir = {x: 0, y: dy};
        }
        
        if(moveX !== e.x || moveY !== e.y) {
            await new Promise(resolve => {
                animMove(e, moveX, moveY, 0.15, () => {
                    e.x = moveX;
                    e.y = moveY;
                    resolve();
                });
            });
        }
        
        e.investigationTurns--;
        if(e.investigationTurns <= 0) {
            e.state = 'patrolling';
            log(`👁️ Guard returning to patrol`, "#ff6666");
        }
    }
}

async function handleInvestigatingState(e) {
    if(e.investigationTarget && e.investigationTurns > 0) {
        const dx = Math.sign(e.investigationTarget.x - e.x);
        const dy = Math.sign(e.investigationTarget.y - e.y);
        
        let moveX = e.x, moveY = e.y;
        if(Math.abs(dx) > 0 && grid[e.y][e.x + dx] !== WALL) {
            moveX = e.x + dx;
            e.dir = {x: dx, y: 0};
        } else if(Math.abs(dy) > 0 && grid[e.y + dy][e.x] !== WALL) {
            moveY = e.y + dy;
            e.dir = {x: 0, y: dy};
        }
        
        if(moveX !== e.x || moveY !== e.y) {
            await new Promise(resolve => {
                animMove(e, moveX, moveY, 0.12, () => {
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
            log(`👁️ Guard giving up investigation`, "#ff6666");
        }
    }
}

async function handleEatingState(e) {
    // Guard stays in place while eating
    e.thought = '🍚';
    e.thoughtTimer = 2;
    
    // The death will be handled in the main processEnemyTurn function
    // by the poisonTimer countdown
}

// Remove poisoned state handler since we're using the original system
// The old poisoned state was replaced with the eating + poisonTimer system