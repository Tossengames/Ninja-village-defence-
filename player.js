// ============================================
// PLAYER MOVEMENT, ITEM PLACEMENT & ATTACK
// ============================================

async function handlePlayerMove(targetX, targetY) {
    if(!playerTurn || gameOver || combatSequence) return;
    
    if(hasReachedExit) return;
    
    // Check if tile is highlighted (reachable)
    const isHighlighted = highlightedTiles.some(t => t.x === targetX && t.y === targetY);
    if(!isHighlighted) return;
    
    if(playerHasMovedThisTurn) {
        createSpeechBubble(player.x, player.y, "Already moved this turn!", "#ff9900", 1);
        return;
    }
    
    const tile = grid[targetY][targetX];
    
    if(tile === EXIT) {
        hasReachedExit = true;
        playerTurn = false;
        playerHasMovedThisTurn = false;
        playerUsedActionThisTurn = false;
        
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
        
        // Player has moved
        playerHasMovedThisTurn = true;
        
        // Switch to attack mode if enemy adjacent
        const adjacentEnemies = enemies.filter(e => 
            e.alive && !e.isSleeping && Math.abs(e.x - player.x) <= 1 && Math.abs(e.y - player.y) <= 1
        );
        
        if(adjacentEnemies.length > 0) {
            setMode('attack');
        } else {
            autoSwitchToMove();
        }
    });
}

async function handleAttack(targetX, targetY) {
    if(!playerTurn || gameOver || combatSequence) return;
    
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
    
    if(playerUsedActionThisTurn) {
        createSpeechBubble(player.x, player.y, "Already used action this turn!", "#ff9900", 1);
        return;
    }
    
    playerUsedActionThisTurn = true;
    
    // Check if enemy is alerted/chasing or can see player
    const canSeePlayer = hasLineOfSight(enemy, player.x, player.y) && !player.isHidden;
    
    if(enemy.state === 'alerted' || enemy.state === 'chasing' || canSeePlayer) {
        // Normal combat
        createSpeechBubble(player.x, player.y, `⚔️ VS ${enemy.type}`, "#ff3333", 1);
        
        const enemyDied = await processCombatSequence(true, enemy, 2);
        
        if(!enemyDied && !gameOver) {
            autoSwitchToMove();
        } else if(!gameOver) {
            autoSwitchToMove();
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
        
        autoSwitchToMove();
    }
}

function handleItemPlacement(x, y, type) {
    if(!playerTurn || gameOver || combatSequence) return;
    
    if(inv[type] <= 0) {
        createSpeechBubble(player.x, player.y, `No ${type} left!`, "#ff9900", 1);
        return;
    }
    
    if(grid[y][x] !== FLOOR) return;
    
    const enemyAtTile = enemies.find(e => e.alive && e.x === x && e.y === y);
    const hasItem = grid[y][x] === TRAP || grid[y][x] === RICE || grid[y][x] === BOMB || 
                    grid[y][x] === GAS || grid[y][x] === COIN || grid[y][x] === HIDE || grid[y][x] === EXIT;
    
    if(enemyAtTile || hasItem) {
        createSpeechBubble(player.x, player.y, "Can't place here!", "#ff9900", 1);
        return;
    }
    
    if(playerUsedActionThisTurn) {
        createSpeechBubble(player.x, player.y, "Already used action this turn!", "#ff9900", 1);
        return;
    }
    
    inv[type]--;
    stats.itemsUsed++;
    playerUsedActionThisTurn = true;
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
    
    autoSwitchToMove();
}