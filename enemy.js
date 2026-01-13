/**
 * Enemy Logic: Shadow Protocol
 * Features: Directional facing, Dynamic Vision Cones, Item Interaction
 */

const ENEMY_STATE = { PATROL: 0, DISTRACTED: 1, INVESTIGATING: 2 };

class Enemy {
    constructor(x, y, range) {
        this.x = x;
        this.y = y;
        this.ax = x; // Animation X
        this.ay = y; // Animation Y
        this.dir = { x: 1, y: 0 };
        this.alive = true;
        this.range = range || 3; // Custom vision depth
        this.state = ENEMY_STATE.PATROL;
        this.target = null; // Coordinates for Rice or Bomb
        this.waitTurns = 0;
    }

    async takeTurn() {
        if (!this.alive) return;

        // 1. Check for immediate hazards (Traps)
        if (grid[this.y][this.x] === TRAP) {
            this.alive = false;
            grid[this.y][this.x] = FLOOR;
            log("Guard eliminated by trap!", "#f44");
            return;
        }

        // 2. Scan for Rice (Prioritize distraction)
        this.scanForRice();

        // 3. Decision Tree based on State
        if (this.state === ENEMY_STATE.DISTRACTED && this.target) {
            await this.moveTowards(this.target.x, this.target.y);
            // If reached rice
            if (this.x === this.target.x && this.y === this.target.y) {
                log("Guard ate poisoned rice...", "#f44");
                grid[this.y][this.x] = FLOOR;
                this.alive = false;
            }
        } 
        else if (this.state === ENEMY_STATE.INVESTIGATING && this.target) {
            await this.moveTowards(this.target.x, this.target.y);
            if (this.x === this.target.x && this.y === this.target.y) {
                log("Guard found nothing at bomb site.", "#aaa");
                this.state = ENEMY_STATE.PATROL;
                this.target = null;
            }
        } 
        else {
            // Standard Patrol
            await this.patrol();
        }
    }

    scanForRice() {
        // Look for rice within range and LOS
        for (let dy = -this.range; dy <= this.range; dy++) {
            for (let dx = -this.range; dx <= this.range; dx++) {
                let tx = this.x + dx, ty = this.y + dy;
                if (grid[ty]?.[tx] === RICE) {
                    if (hasLineOfSight(this, tx, ty)) {
                        this.state = ENEMY_STATE.DISTRACTED;
                        this.target = { x: tx, y: ty };
                        return;
                    }
                }
            }
        }
    }

    async moveTowards(tx, ty) {
        let dx = Math.sign(tx - this.x);
        let dy = Math.sign(ty - this.y);
        
        // Move horizontal first, then vertical (simple pathing)
        let nextX = this.x, nextY = this.y;
        if (dx !== 0 && grid[this.y][this.x + dx] !== WALL) nextX += dx;
        else if (dy !== 0 && grid[this.y + dy][this.x] !== WALL) nextY += dy;

        await new Promise(r => animMove(this, nextX, nextY, 0.2, r));
    }

    async patrol() {
        const moves = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
        // Try to keep moving in current direction, or pick new one
        if (Math.random() > 0.7 || grid[this.y + this.dir.y]?.[this.x + this.dir.x] === WALL) {
            this.dir = moves[Math.floor(Math.random() * 4)];
        }
        
        let nx = this.x + this.dir.x;
        let ny = this.y + this.dir.y;

        if (grid[ny]?.[nx] !== WALL) {
            await new Promise(r => animMove(this, nx, ny, 0.2, r));
        }
    }

    draw(ctx) {
        if (!this.alive) return;
        
        // 1. Draw Guard Sprite
        drawSprite('guard', this.ax, this.ay);

        // 2. Draw Vision Cone (Dynamic Length based on this.range)
        ctx.fillStyle = "rgba(255, 50, 50, 0.15)";
        ctx.beginPath();
        ctx.moveTo(this.ax * TILE + 30, this.ay * TILE + 30);
        
        // Calculate angle based on movement direction
        const baseA = Math.atan2(this.dir.y, this.dir.x);
        const FOV = 0.8; // Width of vision

        for (let a = baseA - FOV; a <= baseA + FOV; a += 0.1) {
            let d = 0;
            while (d < this.range) {
                d += 0.2;
                let checkX = Math.floor(this.x + Math.cos(a) * d);
                let checkY = Math.floor(this.y + Math.sin(a) * d);
                if (grid[checkY]?.[checkX] === WALL) break;
            }
            ctx.lineTo(
                this.ax * TILE + 30 + Math.cos(a) * d * TILE, 
                this.ay * TILE + 30 + Math.sin(a) * d * TILE
            );
        }
        ctx.fill();
    }
}
