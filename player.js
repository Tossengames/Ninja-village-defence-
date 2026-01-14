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
            showVictoryStats();
        }, 800);
        
        animMove(player, targetX, targetY, 0.15, () => {
            player.x = targetX;
            player.y = targetY;
        });
        return;
    }
    
    let stepsTaken = 0;
    
    async function takeStep() {
        if(stepsTaken >= path.length) {
            playerTurn = false;
            
            // Check for enemy attacks after moving
            await checkEnemyAttacks();
            
            if(!gameOver) {
                endTurn();
            }
            return;
        }
        
        const step = path[stepsTaken];
        const tile = grid[step.y][step.x];
        
        // Check for coin pickup
        if(tile === COIN) {
            stats.coins++;
            grid[step.y][step.x] = FLOOR;
            createSpeechBubble(step.x, step.y, "💰 +1 GOLD", "#ffd700", 2);
        }
        
        // Check for hide spot
        const wasHidden = player.isHidden;
        player.isHidden = (tile === HIDE);
        if(player.isHidden !== wasHidden) {
            createSpeechBubble(step.x, step.y, player.isHidden ? "🕶️ HIDING" : "👀 VISIBLE", 
                              player.isHidden ? "#00d2ff" : "#ffffff", 2);
        }
        
        // Normal move - ALWAYS MOVE even if enemy nearby
        await new Promise(resolve => {
            animMove(player, step.x, step.y, 0.15, () => {
                player.x = step.x;
                player.y = step.y;
                stepsTaken++;
                resolve();
            });
        });
        
        // Small delay between steps
        await new Promise(resolve => setTimeout(resolve, 100));
        takeStep();
    }
    
    takeStep();
}

async function handleAttack(targetX, targetY) {
    if(!playerTurn || gameOver || combatSequence) return;
    
    // Check if target tile has an enemy
    const enemy = enemies.find(e => e.alive && e.x === targetX && e.y === targetY);
    if(!enemy) {
        createSpeechBubble(player.x, player.y, "❌ No enemy!", "#ff0000", 2);
        return;
    }
    
    // Check if enemy can see player (no stealth kill if seen)
    const canSeePlayer = hasLineOfSight(enemy, player.x, player.y) && !player.isHidden;
    
    playerTurn = false;
    
    if(canSeePlayer) {
        // Normal combat sequence
        createSpeechBubble(player.x, player.y, `⚔️ VS ${enemy.type}`, "#ff3333", 2);
        
        const enemyDied = await processCombatSequence(true, enemy, 2);
        
        if(!enemyDied && !gameOver) {
            // Player automatically counterattacks if in range
            const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
            if(dist <= 1) { // Player attack range is 1
                createSpeechBubble(player.x, player.y, "🗡️ COUNTER!", "#00d2ff", 2);
                await new Promise(resolve => setTimeout(resolve, 500));
                
                enemy.hp -= 2;
                createSpeechBubble(enemy.x, enemy.y, `-2`, "#ff0000", 2);
                
                await new Promise(resolve => setTimeout(resolve, 800));
                
                if(enemy.hp <= 0) {
                    enemy.alive = false;
                    enemy.state = 'dead';
                    stats.kills++;
                    createSpeechBubble(enemy.x, enemy.y, "💀", "#ff0000", 2.5);
                }
            }
            
            if(!gameOver) {
                await new Promise(resolve => setTimeout(resolve, 500));
                endTurn();
            }
        } else if(!gameOver) {
            autoSwitchToMove();
            await new Promise(resolve => setTimeout(resolve, 500));
            endTurn();
        }
    } else {
        // Stealth kill (enemy can't see player)
        createSpeechBubble(player.x, player.y, "🗡️ STEALTH KILL!", "#00ff00", 2);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        enemy.alive = false;
        enemy.state = 'dead';
        stats.kills++;
        createSpeechBubble(enemy.x, enemy.y, "💀", "#ff0000", 2.5);
        
        await new Promise(resolve => setTimeout(resolve, 800));
        
        autoSwitchToMove();
        
        // Check for other enemy reactions
        await checkEnemyAttacks();
        
        if(!gameOver) {
            await new Promise(resolve => setTimeout(resolve, 500));
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
        createSpeechBubble(e.x, e.y, `🎯 ATTACKING!`, e.color, 2);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        playerHP -= e.damage;
        createSpeechBubble(player.x, player.y, `-${e.damage} HP`, "#ff66ff", 2);
        updateHPDisplay();
        
        await new Promise(resolve => setTimeout(resolve, 800));
        
        if(playerHP <= 0) {
            gameOver = true;
            showGameOverStats();
            return;
        }
    }
}

function handleItemPlacement(x, y, type) {
    if(!playerTurn || gameOver || combatSequence) return;
    
    if(inv[type] <= 0) {
        createSpeechBubble(player.x, player.y, `❌ No ${type}s!`, "#f00", 2);
        return;
    }
    
    if(grid[y][x] !== FLOOR) {
        createSpeechBubble(player.x, player.y, "❌ Can't place here!", "#f00", 2);
        return;
    }
    
    inv[type]--;
    stats.itemsUsed++;
    updateToolCounts();
    
    switch(type) {
        case 'trap':
            grid[y][x] = TRAP;
            createSpeechBubble(x, y, "⚠️ TRAP SET", "#ff6464", 2);
            break;
        case 'rice':
            grid[y][x] = RICE;
            createSpeechBubble(x, y, "🍚 RICE SET", "#ffff64", 2);
            break;
        case 'bomb':
            grid[y][x] = BOMB;
            activeBombs.push({x: x, y: y, t: 3});
            createSpeechBubble(x, y, "💣 BOMB SET", "#ff3296", 2);
            break;
    }
    
    playerTurn = false;
    autoSwitchToMove();
    
    setTimeout(() => {
        endTurn();
    }, 500);
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
            
            // Check if tile is occupied by alive enemy
            const enemyAtTile = enemies.find(e => e.alive && e.x === neighbor.x && e.y === neighbor.y);
            if(enemyAtTile) {
                continue; // Don't path through enemies
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