// ============================================
// PLAYER MOVEMENT, ITEM PLACEMENT & ATTACK
// ============================================

async function handlePlayerMove(targetX, targetY) {
    if(!playerTurn || gameOver || combatSequence) return;
    if(playerHasMovedThisTurn) return; // Player already moved this turn
    
    if(hasReachedExit) return;
    
    // Find direct path to target (no pathfinding - move directly if highlighted)
    const dx = targetX - player.x;
    const dy = targetY - player.y;
    const dist = Math.max(Math.abs(dx), Math.abs(dy));
    
    if(dist > 3) return; // Too far
    
    // Check if path is clear (simple line check)
    let canMove = true;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    
    for(let i = 1; i <= steps; i++) {
        const tx = player.x + Math.round(dx * i / steps);
        const ty = player.y + Math.round(dy * i / steps);
        
        if(grid[ty][tx] === WALL || grid[ty][tx] === undefined) {
            canMove = false;
            break;
        }
        
        const enemyAtTile = enemies.find(e => e.alive && e.x === tx && e.y === ty);
        if(enemyAtTile) {
            canMove = false;
            break;
        }
    }
    
    if(!canMove) return;
    
    if(grid[targetY][targetX] === EXIT) {
        hasReachedExit = true;
        playerTurn = false;
        playerHasMovedThisTurn = false;
        
        animMove(player, targetX, targetY, 0.2, () => {
            player.x = targetX;
            player.y = targetY;
            
            setTimeout(() => {
                document.getElementById('toolbar').classList.add('hidden');
                document.getElementById('ui-controls').classList.add('hidden');
                showVictoryScreen();
            }, 1000);
        });
        return;
    }
    
    const tile = grid[targetY][targetX];
    
    if(tile === COIN) {
        stats.coins++;
        grid[targetY][targetX] = FLOOR;
        createCoinPickupEffect(targetX, targetY);
    }
    
    const wasHidden = player.isHidden;
    player.isHidden = (tile === HIDE);
    if(player.isHidden !== wasHidden) {
        createHideEffect(targetX, targetY, player.isHidden);
    }
    
    // If player hides after being spotted, enemies lose track
    if(player.isHidden && !wasHidden) {
        enemies.forEach(e => {
            if(e.state === 'alerted' || e.state === 'chasing') {
                e.state = 'investigating';
                e.investigationTarget = {x: targetX, y: targetY};
                e.investigationTurns = 3;
                createSpeechBubble(e.x, e.y, "Where'd he go?", "#ff9900", 1.5);
            }
        });
    }
    
    animMove(player, targetX, targetY, 0.2, () => {
        player.x = targetX;
        player.y = targetY;
        
        // Player has moved, can now use items or attack
        playerHasMovedThisTurn = true;
        
        // Switch to attack mode if enemy adjacent
        const adjacentEnemies = enemies.filter(e => 
            e.alive && !e.isSleeping && Math.abs(e.x - player.x) <= 1 && Math.abs(e.y - player.y) <= 1
        );
        
        if(adjacentEnemies.length > 0) {
            setMode('attack');
        } else {
            setMode('move');
        }
    });
}

async function handleAttack(targetX, targetY) {
    if(!playerTurn || gameOver || combatSequence) return;
    if(!playerHasMovedThisTurn) return; // Must move first
    
    const enemy = enemies.find(e => e.alive && e.x === targetX && e.y === targetY);
    if(!enemy) {
        createSpeechBubble(player.x, player.y, "❌ No enemy!", "#ff0000", 1);
        return;
    }
    
    // If enemy is sleeping, can't attack (must be awake)
    if(enemy.isSleeping) {
        createSpeechBubble(player.x, player.y, "Enemy is sleeping!", "#9932cc", 1);
        return;
    }
    
    playerTurn = false;
    playerHasMovedThisTurn = false;
    
    // Check if enemy is alerted/chasing or can see player
    const canSeePlayer = hasLineOfSight(enemy, player.x, player.y) && !player.isHidden;
    
    if(enemy.state === 'alerted' || enemy.state === 'chasing' || canSeePlayer) {
        // Normal combat
        createSpeechBubble(player.x, player.y, `⚔️ VS ${enemy.type}`, "#ff3333", 1);
        
        const enemyDied = await processCombatSequence(true, enemy, 2);
        
        if(!enemyDied && !gameOver) {
            await new Promise(resolve => setTimeout(resolve, 300));
            endTurn();
        } else if(!gameOver) {
            autoSwitchToMove();
            await new Promise(resolve => setTimeout(resolve, 300));
            endTurn();
        }
    } else {
        // STEALTH KILL - INSTANT KILL if enemy not alerted
        createSpeechBubble(player.x, player.y, "🗡️ STEALTH KILL!", "#00ff00", 1);
        await new Promise(resolve => setTimeout(resolve, 300));
        
        enemy.alive = false;
        enemy.state = 'dead';
        enemy.hp = 0;
        stats.kills++;
        stats.stealthKills++;
        createDeathEffect(targetX, targetY);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        autoSwitchToMove();
        
        if(!gameOver) {
            await new Promise(resolve => setTimeout(resolve, 300));
            endTurn();
        }
    }
}

function handleItemPlacement(x, y, type) {
    if(!playerTurn || gameOver || combatSequence) return;
    if(!playerHasMovedThisTurn) return; // Must move first
    
    if(inv[type] <= 0) return;
    
    if(grid[y][x] !== FLOOR) return;
    
    const enemyAtTile = enemies.find(e => e.alive && e.x === x && e.y === y);
    const hasItem = grid[y][x] === TRAP || grid[y][x] === RICE || grid[y][x] === BOMB || 
                    grid[y][x] === GAS || grid[y][x] === COIN || grid[y][x] === HIDE || grid[y][x] === EXIT;
    
    if(enemyAtTile || hasItem) return;
    
    inv[type]--;
    stats.itemsUsed++;
    updateToolCounts();
    
    switch(type) {
        case 'trap':
            grid[y][x] = TRAP;
            createSpeechBubble(x, y, "⚠️ TRAP SET", "#ff6464", 1);
            createTrapEffect(x, y);
            break;
        case 'rice':
            grid[y][x] = RICE;
            createSpeechBubble(x, y, "🍚 RICE SET", "#ffff64", 1);
            break;
        case 'bomb':
            grid[y][x] = BOMB;
            activeBombs.push({x: x, y: y, t: 3});
            createSpeechBubble(x, y, "💣 BOMB SET", "#ff3296", 1);
            break;
        case 'gas':
            grid[y][x] = GAS;
            activeGas.push({x: x, y: y, t: Math.floor(Math.random() * 3) + 1});
            createGasEffect(x, y);
            break;
    }
    
    // Player can continue to use other items or attack
    // Don't end turn automatically
}