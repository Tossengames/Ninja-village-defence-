// ============================================
// PLAYER MOVEMENT, ITEM PLACEMENT & ATTACK
// ============================================

async function handlePlayerMove(targetX, targetY) {
    if(!playerTurn || gameOver || combatSequence) return;
    
    if(playerHasMovedThisTurn) {
        createSpeechBubble(player.x, player.y, "Already moved this turn!", "#ff9900", 2); // Longer
        return;
    }
    
    if(hasReachedExit) return;
    
    // Check if tile is highlighted (reachable)
    const isHighlighted = highlightedTiles.some(t => t.x === targetX && t.y === targetY);
    if(!isHighlighted) return;
    
    const path = findPath(player.x, player.y, targetX, targetY);
    if(!path || path.length === 0) return;
    
    if(grid[targetY][targetX] === EXIT) {
        hasReachedExit = true;
        playerTurn = false;
        playerHasMovedThisTurn = false;
        playerUsedActionThisTurn = false;
        
        // Move tile by tile to exit
        let stepsTaken = 0;
        
        async function takeStep() {
            if(stepsTaken >= path.length) {
                setTimeout(() => {
                    document.getElementById('toolbar').classList.add('hidden');
                    document.getElementById('ui-controls').classList.add('hidden');
                    showVictoryScreen();
                }, 1000);
                return;
            }
            
            const step = path[stepsTaken];
            
            await new Promise(resolve => {
                animMove(player, step.x, step.y, 0.15, () => {
                    player.x = step.x;
                    player.y = step.y;
                    stepsTaken++;
                    resolve();
                });
            });
            
            await new Promise(resolve => setTimeout(resolve, 100));
            takeStep();
        }
        
        takeStep();
        return;
    }
    
    // Move tile by tile along path (max 3 steps)
    let stepsTaken = 0;
    const maxSteps = Math.min(3, path.length);
    
    async function takeStep() {
        if(stepsTaken >= maxSteps) {
            playerHasMovedThisTurn = true;
            
            // Switch to attack mode if enemy adjacent (and check for stealth kills)
            const adjacentEnemies = enemies.filter(e => 
                e.alive && Math.abs(e.x - player.x) <= 1 && Math.abs(e.y - player.y) <= 1
            );
            
            if(adjacentEnemies.length > 0) {
                setMode('attack');
                // Show stealth kill prompt if available
                checkAndShowStealthKillPrompt();
            } else {
                autoSwitchToMove();
            }
            return;
        }
        
        const step = path[stepsTaken];
        const tile = grid[step.y][step.x];
        
        if(tile === COIN) {
            stats.coins++;
            grid[step.y][step.x] = FLOOR;
            createCoinPickupEffect(step.x, step.y);
        }
        
        const wasHidden = player.isHidden;
        player.isHidden = (tile === HIDE);
        if(player.isHidden !== wasHidden) {
            createHideEffect(step.x, step.y, player.isHidden);
        }
        
        // If player hides after being spotted, enemies lose track
        if(player.isHidden && !wasHidden) {
            enemies.forEach(e => {
                if(e.state === 'alerted' || e.state === 'chasing') {
                    e.state = 'investigating';
                    e.investigationTarget = {x: step.x, y: step.y};
                    e.investigationTurns = 3;
                    createSpeechBubble(e.x, e.y, "Where'd he go?", "#ff9900", 2); // Longer
                }
            });
        }
        
        await new Promise(resolve => {
            animMove(player, step.x, step.y, 0.15, () => {
                player.x = step.x;
                player.y = step.y;
                stepsTaken++;
                resolve();
            });
        });
        
        await new Promise(resolve => setTimeout(resolve, 100));
        takeStep();
    }
    
    takeStep();
}

async function handleAttack(targetX, targetY) {
    if(!playerTurn || gameOver || combatSequence) return;
    
    const enemy = enemies.find(e => e.alive && e.x === targetX && e.y === targetY);
    if(!enemy) {
        createSpeechBubble(player.x, player.y, "❌ No enemy!", "#ff0000", 2); // Longer
        return;
    }
    
    // SLEEPING ENEMY - INSTANT STEALTH KILL
    if(enemy.isSleeping) {
        createSpeechBubble(player.x, player.y, "🗡️ SLEEPING KILL!", "#00ff00", 2);
        await new Promise(resolve => setTimeout(resolve, 300));
        
        enemy.alive = false;
        enemy.state = 'dead';
        enemy.hp = 0;
        stats.kills++;
        stats.stealthKills++;
        createDeathEffect(targetX, targetY);
        
        playerUsedActionThisTurn = true;
        playerTurn = false;
        
        autoSwitchToMove();
        setTimeout(() => {
            endTurn();
        }, 500);
        return;
    }
    
    if(playerUsedActionThisTurn) {
        createSpeechBubble(player.x, player.y, "Already used action this turn!", "#ff9900", 2);
        return;
    }
    
    playerUsedActionThisTurn = true;
    playerTurn = false; // Immediately end turn after attack
    
    // Check if enemy can see player (CONE VISION ONLY)
    const canSeePlayer = hasLineOfSight(enemy, player.x, player.y) && !player.isHidden;
    
    // FIXED: Check enemy state for stealth kill eligibility
    const enemyIsAlerted = enemy.state === 'chasing' || enemy.state === 'alert' || enemy.state === 'investigating';
    
    if(enemyIsAlerted || canSeePlayer) {
        // Normal combat - enemy can see player or is alerted
        createSpeechBubble(player.x, player.y, `⚔️ ATTACK!`, "#ff3333", 2);
        
        const enemyDied = await processCombatSequence(true, enemy, 2);
        
        if(!enemyDied && !gameOver) {
            autoSwitchToMove();
            setTimeout(() => {
                endTurn();
            }, 500);
        } else if(!gameOver) {
            autoSwitchToMove();
            setTimeout(() => {
                endTurn();
            }, 500);
        }
    } else {
        // STEALTH KILL - INSTANT KILL if enemy can't see player AND is not alerted
        createSpeechBubble(player.x, player.y, "🗡️ STEALTH KILL!", "#00ff00", 2);
        await new Promise(resolve => setTimeout(resolve, 300));
        
        enemy.alive = false;
        enemy.state = 'dead';
        enemy.hp = 0;
        stats.kills++;
        stats.stealthKills++;
        createDeathEffect(targetX, targetY);
        
        autoSwitchToMove();
        setTimeout(() => {
            endTurn();
        }, 500);
    }
}

function handleItemPlacement(x, y, type) {
    if(!playerTurn || gameOver || combatSequence) return;
    
    if(inv[type] <= 0) {
        createSpeechBubble(player.x, player.y, `No ${type} left!`, "#ff9900", 2); // Longer
        return;
    }
    
    if(grid[y][x] !== FLOOR) return;
    
    const enemyAtTile = enemies.find(e => e.alive && e.x === x && e.y === y);
    const hasItem = grid[y][x] === TRAP || grid[y][x] === RICE || grid[y][x] === BOMB || 
                    grid[y][x] === GAS || grid[y][x] === COIN || grid[y][x] === HIDE || grid[y][x] === EXIT;
    
    if(enemyAtTile || hasItem) {
        createSpeechBubble(player.x, player.y, "Can't place here!", "#ff9900", 2); // Longer
        return;
    }
    
    if(playerUsedActionThisTurn) {
        createSpeechBubble(player.x, player.y, "Already used action this turn!", "#ff9900", 2); // Longer
        return;
    }
    
    inv[type]--;
    stats.itemsUsed++;
    playerUsedActionThisTurn = true;
    playerTurn = false; // Immediately end turn after item use
    updateToolCounts();
    
    switch(type) {
        case 'trap':
            grid[y][x] = TRAP;
            createSpeechBubble(x, y, "⚠️ TRAP SET", "#ff6464", 2); // Longer
            createTrapEffect(x, y);
            break;
        case 'rice':
            grid[y][x] = RICE;
            createSpeechBubble(x, y, "🍚 RICE SET", "#ffff64", 2); // Longer
            break;
        case 'bomb':
            grid[y][x] = BOMB;
            activeBombs.push({x: x, y: y, t: 3});
            createSpeechBubble(x, y, "💣 BOMB SET", "#ff3296", 2); // Longer
            break;
        case 'gas':
            grid[y][x] = GAS;
            activeGas.push({x: x, y: y, t: Math.floor(Math.random() * 3) + 1});
            createGasEffect(x, y);
            break;
    }
    
    autoSwitchToMove();
    setTimeout(() => {
        endTurn();
    }, 500);
}

// Function to check and show stealth kill prompt
function checkAndShowStealthKillPrompt() {
    const adjacentEnemies = enemies.filter(e => 
        e.alive && Math.abs(e.x - player.x) <= 1 && Math.abs(e.y - player.y) <= 1
    );
    
    let showPrompt = false;
    
    adjacentEnemies.forEach(enemy => {
        // Check if stealth kill is available
        const canSeePlayer = hasLineOfSight(enemy, player.x, player.y) && !player.isHidden;
        
        // Check if enemy is in alerted state
        const enemyIsAlerted = enemy.state === 'chasing' || enemy.state === 'alert' || enemy.state === 'investigating';
        
        // Stealth kill is available if:
        // 1. Enemy can't see player AND enemy is not alerted
        // 2. OR enemy is sleeping (regardless of state or visibility)
        if((!canSeePlayer && !enemyIsAlerted) || enemy.isSleeping) {
            showPrompt = true;
        }
    });
    
    if(showPrompt) {
        // Show stealth kill prompt above player
        createStealthKillPromptPlayer(player.x, player.y);
    }
}

// Create stealth kill prompt above player
function createStealthKillPromptPlayer(x, y) {
    // This will create a persistent prompt above the player
    // We'll use a speech bubble that lasts longer
    createSpeechBubble(x, y, "🗡️ STEALTH KILL AVAILABLE", "#00ff00", 3); // Even longer
}