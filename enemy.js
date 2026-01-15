// ============================================
// ENEMY AI & DETECTION SYSTEM
// ============================================

async function processEnemyTurn(e) {
    if(!e.alive) return;
    
    // Update enemy detection
    const canSeePlayer = hasLineOfSight(e, player.x, player.y) && !player.isHidden;
    
    // TRACK WHEN PLAYER IS SPOTTED
    if(canSeePlayer) {
        // Player is spotted!
        if(e.state !== 'alerted' && e.state !== 'chasing') {
            stats.timesSpotted++; // Track being spotted
            createAlertEffect(e.x, e.y);
            createSpeechBubble(e.x, e.y, "! SPOTTED !", "#ff0000", 1.5);
            playSound('alert');
        }
        
        e.state = 'alerted';
        e.lastSeenPlayer = {x: player.x, y: player.y};
        e.chaseTurns = e.chaseMemory;
    }
    
    // State-based behavior
    switch(e.state) {
        case 'patrolling':
            await patrolBehavior(e);
            break;
        case 'alerted':
        case 'chasing':
            await chaseBehavior(e);
            break;
        case 'investigating':
            await investigateBehavior(e);
            break;
        case 'eating':
            await eatBehavior(e);
            break;
    }
    
    // Check for immediate attack after moving
    const distToPlayer = Math.hypot(e.x - player.x, e.y - player.y);
    if(distToPlayer <= e.attackRange && (e.state === 'alerted' || e.state === 'chasing')) {
        await new Promise(resolve => setTimeout(resolve, 300));
        createSpeechBubble(e.x, e.y, "ATTACK!", e.color, 1);
        
        playerHP -= e.damage;
        playerHP = Math.max(0, playerHP);
        createDamageEffect(player.x, player.y, e.damage, true);
        createSpeechBubble(player.x, player.y, `-${e.damage}`, "#ff66ff", 1);
        shake = 15;
        updateHPDisplay();
        
        if(playerHP <= 0) {
            playerHP = 0;
            updateHPDisplay();
            setTimeout(() => {
                showGameOverScreen();
            }, 500);
            return;
        }
    }
}

async function patrolBehavior(e) {
    const directions = [
        {x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1},
        {x: 1, y: 1}, {x: -1, y: -1}, {x: 1, y: -1}, {x: -1, y: 1}
    ];
    
    // Check for sounds
    if(e.hasHeardSound && e.soundLocation) {
        e.state = 'investigating';
        e.investigationTarget = e.soundLocation;
        e.investigationTurns = 5;
        e.hasHeardSound = false;
        createSpeechBubble(e.x, e.y, "Hmm?", "#ff9900", 1);
        return;
    }
    
    // Random patrol movement
    const dir = directions[Math.floor(Math.random() * directions.length)];
    const nx = e.x + dir.x;
    const ny = e.y + dir.y;
    
    if(nx >= 0 && nx < mapDim && ny >= 0 && ny < mapDim && grid[ny][nx] !== WALL) {
        // Check for rice
        if(grid[ny][nx] === RICE) {
            e.state = 'eating';
            grid[ny][nx] = FLOOR;
            createSpeechBubble(e.x, e.y, "🍚 Rice!", "#ffff00", 1.5);
            await animMove(e, e.x, e.y, e.speed, () => {});
            return;
        }
        
        await animMove(e, nx, ny, e.speed, () => {
            e.x = nx;
            e.y = ny;
            e.dir = dir;
        });
    }
}

async function chaseBehavior(e) {
    if(e.chaseTurns <= 0) {
        // Return to patrol
        e.state = 'patrolling';
        createSpeechBubble(e.x, e.y, "Lost them...", "#aaa", 1);
        return;
    }
    
    e.chaseTurns--;
    
    // Move toward last seen player position
    if(e.lastSeenPlayer) {
        const dx = e.lastSeenPlayer.x - e.x;
        const dy = e.lastSeenPlayer.y - e.y;
        
        let moveX = 0, moveY = 0;
        
        if(Math.abs(dx) > Math.abs(dy)) {
            moveX = Math.sign(dx);
        } else {
            moveY = Math.sign(dy);
        }
        
        const nx = e.x + moveX;
        const ny = e.y + moveY;
        
        if(nx >= 0 && nx < mapDim && ny >= 0 && ny < mapDim && grid[ny][nx] !== WALL) {
            await animMove(e, nx, ny, e.speed * 1.5, () => {
                e.x = nx;
                e.y = ny;
                e.dir = {x: moveX, y: moveY};
            });
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
            // Reached investigation target
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
        
        if(nx >= 0 && nx < mapDim && ny >= 0 && ny < mapDim && grid[ny][nx] !== WALL) {
            await animMove(e, nx, ny, e.speed * 1.2, () => {
                e.x = nx;
                e.y = ny;
                e.dir = {x: moveX, y: moveY};
            });
        }
    }
}

async function eatBehavior(e) {
    createSpeechBubble(e.x, e.y, "Eating...", "#00ff00", 1);
    await new Promise(resolve => setTimeout(resolve, 800));
    e.state = 'patrolling';
}