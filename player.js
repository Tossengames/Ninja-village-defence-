// ============================================
// PLAYER MOVEMENT, ITEM PLACEMENT & ATTACK
// ============================================

async function handlePlayerMove(targetX, targetY) {
    if(!playerTurn || gameOver || combatSequence) return;
    
    if(hasReachedExit) {
        log("✅ Already escaped!", "#0f0");
        return;
    }
    
    const path = findPath(player.x, player.y, targetX, targetY);
    if(!path || path.length === 0) {
        log("❌ No path available!", "#f00");
        return;
    }
    
    if(grid[targetY][targetX] === EXIT) {
        log("🚪 Exit reached!", "#0f0");
        hasReachedExit = true;
        playerTurn = false;
        
        setTimeout(() => {
            // Return to menu on win
            document.getElementById('menu').classList.remove('hidden');
            document.getElementById('toolbar').classList.add('hidden');
            document.getElementById('rangeIndicator').classList.add('hidden');
            document.getElementById('logToggle').classList.add('hidden');
            document.getElementById('hpDisplay').classList.add('hidden');
            document.getElementById('ui-controls').classList.add('hidden');
            log("Mission complete! Great job!", "#0f0");
        }, 500);
        
        animMove(player, targetX, targetY, 0.2, () => {
            player.x = targetX;
            player.y = targetY;
        });
        return;
    }
    
    let stepsTaken = 0;
    
    async function takeStep() {
        if(stepsTaken >= path.length) {
            // Keep camera on player for 0.5 seconds after moving
            setTimeout(() => {
                playerTurn = false;
                checkForImmediateAttack();
            }, 500);
            return;
        }
        
        const step = path[stepsTaken];
        const tile = grid[step.y][step.x];
        
        // Check for coin pickup
        if(tile === COIN) {
            stats.coins++;
            grid[step.y][step.x] = FLOOR;
            createCoinPickupEffect(step.x, step.y);
        }
        
        // Check for hide spot
        const wasHidden = player.isHidden;
        player.isHidden = (tile === HIDE);
        if(player.isHidden !== wasHidden) {
            createHideEffect(step.x, step.y, player.isHidden);
        }
        
        // Normal move
        await new Promise(resolve => {
            animMove(player, step.x, step.y, 0.2, () => {
                player.x = step.x;
                player.y = step.y;
                stepsTaken++;
                resolve();
            });
        });
        
        // Faster movement between steps
        await new Promise(resolve => setTimeout(resolve, 50));
        takeStep();
    }
    
    takeStep();
}

function checkForImmediateAttack() {
    // Check if player can attack immediately after moving
    const adjacentEnemies = enemies.filter(e => 
        e.alive && Math.abs(e.x - player.x) <= 1 && Math.abs(e.y - player.y) <= 1
    );
    
    if(adjacentEnemies.length > 0 && !combatSequence) {
        // Player can attack immediately
        playerTurn = true;
        setMode('attack');
        log("Enemy nearby! You can attack immediately.", "#ff9900");
    } else {
        // No enemies nearby, proceed with enemy turn
        endTurn();
    }
}

async function handleAttack(targetX, targetY) {
    if(!playerTurn || gameOver || combatSequence) return;
    
    // Check if target tile has an enemy
    const enemy = enemies.find(e => e.alive && e.x === targetX && e.y === targetY);
    if(!enemy) {
        createSpeechBubble(player.x, player.y, "❌ No enemy!", "#ff0000", 1);
        return;
    }
    
    // Check if enemy can see player (straight line vision)
    const canSeePlayer = hasLineOfSight(enemy, player.x, player.y) && !player.isHidden;
    
    playerTurn = false;
    
    if(canSeePlayer || enemy.state === 'alerted' || enemy.state === 'chasing') {
        // Enemy sees player - normal combat (no instant kill)
        createSpeechBubble(player.x, player.y, `⚔️ VS ${enemy.type}`, "#ff3333", 1);
        
        const enemyDied = await processCombatSequence(true, enemy, 2);
        
        if(!enemyDied && !gameOver) {
            // Player automatically counterattacks if in range
            const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
            if(dist <= 1) {
                createSpeechBubble(player.x, player.y, "🗡️ COUNTER!", "#00d2ff", 1);
                await new Promise(resolve => setTimeout(resolve, 300));
                
                enemy.hp -= 2;
                createDamageEffect(enemy.x, enemy.y, 2);
                createSpeechBubble(enemy.x, enemy.y, `-2`, "#ff0000", 1);
                
                await new Promise(resolve => setTimeout(resolve, 500));
                
                if(enemy.hp <= 0) {
                    enemy.alive = false;
                    enemy.state = 'dead';
                    stats.kills++;
                    createDeathEffect(enemy.x, enemy.y);
                }
            }
            
            if(!gameOver) {
                await new Promise(resolve => setTimeout(resolve, 300));
                endTurn();
            }
        } else if(!gameOver) {
            autoSwitchToMove();
            await new Promise(resolve => setTimeout(resolve, 300));
            endTurn();
        }
    } else {
        // Enemy doesn't see player - STEALTH KILL (instant kill)
        createSpeechBubble(player.x, player.y, "🗡️ STEALTH KILL!", "#00ff00", 1);
        await new Promise(resolve => setTimeout(resolve, 300));
        
        enemy.alive = false;
        enemy.state = 'dead';
        stats.kills++;
        createDeathEffect(targetX, targetY);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        autoSwitchToMove();
        
        // Check for other enemy reactions
        await checkEnemyAttacks();
        
        if(!gameOver) {
            await new Promise(resolve => setTimeout(resolve, 300));
            endTurn();
        }
    }
}

async function checkEnemyAttacks() {
    // Check if any alerted enemy can attack player
    const attackingEnemies = enemies.filter(e => 
        e.alive && (e.state === 'alerted' || e.state === 'chasing') && 
        Math.hypot(e.x - player.x, e.y - player.y) <= e.attackRange
    );
    
    for(let e of attackingEnemies) {
        createSpeechBubble(e.x, e.y, `🎯 ATTACKING!`, e.color, 1);
        await new Promise(resolve => setTimeout(resolve, 300));
        
        playerHP -= e.damage;
        createDamageEffect(player.x, player.y, e.damage, true);
        createSpeechBubble(player.x, player.y, `-${e.damage} HP`, "#ff66ff", 1);
        updateHPDisplay();
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if(playerHP <= 0) {
            gameOver = true;
            showGameOver();
            return;
        }
    }
}

function handleItemPlacement(x, y, type) {
    if(!playerTurn || gameOver || combatSequence) return;
    
    if(inv[type] <= 0) {
        createSpeechBubble(player.x, player.y, `❌ No ${type}s!`, "#f00", 1);
        return;
    }
    
    if(grid[y][x] !== FLOOR) {
        createSpeechBubble(player.x, player.y, "❌ Can't place here!", "#f00", 1);
        return;
    }
    
    const enemyAtTile = enemies.find(e => e.alive && e.x === x && e.y === y);
    const hasItem = grid[y][x] === TRAP || grid[y][x] === RICE || grid[y][x] === BOMB || 
                    grid[y][x] === COIN || grid[y][x] === HIDE || grid[y][x] === EXIT;
    
    if(enemyAtTile || hasItem) {
        createSpeechBubble(player.x, player.y, "❌ Tile occupied!", "#f00", 1);
        return;
    }
    
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
    }
    
    playerTurn = false;
    autoSwitchToMove();
    
    setTimeout(() => {
        endTurn();
    }, 300);
}

// A* Pathfinding Algorithm
function findPath(startX, startY, targetX, targetY) {
    if(startX === targetX && startY === targetY) return [];
    
    const openSet = [];
    const closedSet = new Set();
    const startNode = {x: startX, y: startY, g: 0, h: 0, f: 0, parent: null};
    
    openSet.push(startNode);
    
    while(openSet.length > 0) {
        let lowestIndex = 0;
        for(let i = 1; i < openSet.length; i++) {
            if(openSet[i].f < openSet[lowestIndex].f) {
                lowestIndex = i;
            }
        }
        
        const current = openSet[lowestIndex];
        
        if(current.x === targetX && current.y === targetY) {
            const path = [];
            let temp = current;
            while(temp) {
                path.push({x: temp.x, y: temp.y});
                temp = temp.parent;
            }
            return path.reverse().slice(1);
        }
        
        openSet.splice(lowestIndex, 1);
        closedSet.add(`${current.x},${current.y}`);
        
        const neighbors = [
            {x: current.x, y: current.y - 1},
            {x: current.x, y: current.y + 1},
            {x: current.x - 1, y: current.y},
            {x: current.x + 1, y: current.y}
        ];
        
        for(const neighbor of neighbors) {
            if(neighbor.x < 0 || neighbor.x >= mapDim || neighbor.y < 0 || neighbor.y >= mapDim) {
                continue;
            }
            
            if(grid[neighbor.y][neighbor.x] === WALL || grid[neighbor.y][neighbor.x] === undefined) {
                continue;
            }
            
            const enemyAtTile = enemies.find(e => e.alive && e.x === neighbor.x && e.y === neighbor.y);
            if(enemyAtTile) {
                continue;
            }
            
            if(closedSet.has(`${neighbor.x},${neighbor.y}`)) {
                continue;
            }
            
            const gScore = current.g + 1;
            const hScore = Math.abs(neighbor.x - targetX) + Math.abs(neighbor.y - targetY);
            const fScore = gScore + hScore;
            
            let existingNode = openSet.find(n => n.x === neighbor.x && n.y === neighbor.y);
            if(existingNode) {
                if(gScore < existingNode.g) {
                    existingNode.g = gScore;
                    existingNode.f = gScore + existingNode.h;
                    existingNode.parent = current;
                }
            } else {
                const newNode = {
                    x: neighbor.x,
                    y: neighbor.y,
                    g: gScore,
                    h: hScore,
                    f: fScore,
                    parent: current
                };
                openSet.push(newNode);
            }
        }
    }
    
    return null;
}