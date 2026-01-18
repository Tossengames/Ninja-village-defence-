// ============================================
// ENEMY AI & DETECTION SYSTEM (TURN SAFE)
// ============================================

async function processEnemyTurn(e) {
    if (!e.alive) return;

    // INSTANT TRAP CHECK
    if (grid[e.y][e.x] === TRAP) {
        grid[e.y][e.x] = FLOOR;
        killEnemy(e);
        return;
    }

    // SLEEP
    if (e.isSleeping) {
        e.sleepTimer--;
        if (e.sleepTimer > 0) return;
        e.isSleeping = false;
    }

    // POISON RICE
    if (e.ateRice) {
        e.riceDeathTimer--;
        if (e.riceDeathTimer <= 0) {
            killEnemy(e);
            return;
        }
    }

    // GAS
    const gas = activeGas.find(g => g.x === e.x && g.y === e.y);
    if (gas && !e.isSleeping) {
        e.isSleeping = true;
        e.sleepTimer = Math.floor(Math.random() * 5) + 2;
        return;
    }

    const canSeePlayer =
        !player.isHidden &&
        hasLineOfSight(e, player.x, player.y);

    // =====================
    // SPOT PLAYER
    // =====================
    if (canSeePlayer) {
        if (e.state !== 'chasing') {
            stats.timesSpotted++;
            createAlertEffect(e.x, e.y);
            playSound('alert');
        }

        e.state = 'chasing';
        e.lastSeenPlayer = { x: player.x, y: player.y };
        e.alertTurns = 6;

        await chasePlayer(e);
        return;
    }

    // =====================
    // LOST PLAYER
    // =====================
    if (e.state === 'chasing') {
        e.alertTurns--;

        if (e.alertTurns <= 0) {
            e.state = 'patrolling';
            e.lastSeenPlayer = null;
            return;
        }

        e.state = 'investigating';
        await investigateBehavior(e);
        return;
    }

    // =====================
    // INVESTIGATING
    // =====================
    if (e.state === 'investigating') {
        await investigateBehavior(e);
        return;
    }

    // =====================
    // PATROL
    // =====================
    await patrolBehavior(e);
}

// ============================================
// CHASE PLAYER (1 STEP PER TURN)
// ============================================
async function chasePlayer(e) {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.max(Math.abs(dx), Math.abs(dy));

    // ATTACK
    if (dist <= e.attackRange) {
        await enemyAttack(e);
        return;
    }

    await stepToward(e, player.x, player.y);
}

// ============================================
// INVESTIGATE LAST SEEN POSITION
// ============================================
async function investigateBehavior(e) {
    if (!e.lastSeenPlayer) {
        e.state = 'patrolling';
        return;
    }

    const { x, y } = e.lastSeenPlayer;
    const dist = Math.max(Math.abs(x - e.x), Math.abs(y - e.y));

    if (dist <= 1) {
        e.state = 'patrolling';
        e.lastSeenPlayer = null;
        return;
    }

    await stepToward(e, x, y);
}

// ============================================
// SINGLE TILE STEP (CORE FIX)
// ============================================
async function stepToward(e, tx, ty) {
    let dx = Math.sign(tx - e.x);
    let dy = Math.sign(ty - e.y);

    // Try main axis first
    let candidates = Math.abs(tx - e.x) > Math.abs(ty - e.y)
        ? [{ x: dx, y: 0 }, { x: 0, y: dy }]
        : [{ x: 0, y: dy }, { x: dx, y: 0 }];

    for (const dir of candidates) {
        const nx = e.x + dir.x;
        const ny = e.y + dir.y;

        if (
            nx < 0 || nx >= mapDim ||
            ny < 0 || ny >= mapDim ||
            grid[ny][nx] === WALL
        ) continue;

        const blocked = enemies.find(o =>
            o.alive && o !== e && o.x === nx && o.y === ny
        );
        if (blocked) continue;

        await animMove(e, nx, ny, e.speed, () => {
            e.x = nx;
            e.y = ny;
            e.dir = dir;
        });

        // TRAP
        if (grid[e.y][e.x] === TRAP) {
            grid[e.y][e.x] = FLOOR;
            killEnemy(e);
        }
        return;
    }
}

// ============================================
// ATTACK
// ============================================
async function enemyAttack(e) {
    createSpeechBubble(e.x, e.y, "🎯 ATTACK!", e.color, 2);

    await new Promise(r => setTimeout(r, 200));

    playerHP -= e.damage;
    playerHP = Math.max(0, playerHP);
    shake = 12;

    createDamageEffect(player.x, player.y, e.damage, true);

    if (playerHP <= 0) {
        gameOver = true;
        setTimeout(showGameOverScreen, 400);
    }
}

// ============================================
// PATROL
// ============================================
async function patrolBehavior(e) {
    const dirs = [
        { x: 1, y: 0 }, { x: -1, y: 0 },
        { x: 0, y: 1 }, { x: 0, y: -1 }
    ];

    const dir = dirs[Math.floor(Math.random() * dirs.length)];
    const nx = e.x + dir.x;
    const ny = e.y + dir.y;

    if (
        nx >= 0 && nx < mapDim &&
        ny >= 0 && ny < mapDim &&
        grid[ny][nx] !== WALL
    ) {
        await animMove(e, nx, ny, e.speed, () => {
            e.x = nx;
            e.y = ny;
            e.dir = dir;
        });
    }
}

// ============================================
// KILL ENEMY (HELPER)
// ============================================
function killEnemy(e) {
    e.alive = false;
    e.state = 'dead';
    e.hp = 0;
    stats.kills++;
    createDeathEffect(e.x, e.y);
    createSpeechBubble(e.x, e.y, "💀", "#ff0000", 2);
}