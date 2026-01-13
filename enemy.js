const ENEMY_STATE = { PATROL: 0, DISTRACTED: 1, INVESTIGATING: 2 };

class Enemy {
    constructor(x, y, range) {
        this.x = x;
        this.y = y;
        this.ax = x;
        this.ay = y;
        this.dir = { x: 1, y: 0 };
        this.alive = true;
        this.range = range;
        this.state = ENEMY_STATE.PATROL;
        this.target = null;
    }

    async takeTurn() {
        if (!this.alive) return;

        // Check for Trap
        if (grid[this.y][this.x] === TRAP) {
            this.alive = false;
            grid[this.y][this.x] = FLOOR;
            log("Guard trapped!", "#f44");
            return;
        }

        // Scan for Rice
        this.scanForRice();

        if (this.state === ENEMY_STATE.DISTRACTED && this.target) {
            await this.moveTowards(this.target.x, this.target.y);
            if (this.x === this.target.x && this.y === this.target.y) {
                log("Guard ate poison rice!", "#f44");
                grid[this.y][this.x] = FLOOR;
                this.alive = false;
            }
        } else if (this.state === ENEMY_STATE.INVESTIGATING && this.target) {
            await this.moveTowards(this.target.x, this.target.y);
            if (this.x === this.target.x && this.y === this.target.y) {
                this.state = ENEMY_STATE.PATROL;
                this.target = null;
            }
        } else {
            await this.patrol();
        }
    }

    scanForRice() {
        for (let dy = -this.range; dy <= this.range; dy++) {
            for (let dx = -this.range; dx <= this.range; dx++) {
                let tx = this.x + dx, ty = this.y + dy;
                if (grid[ty]?.[tx] === RICE && hasLineOfSight(this, tx, ty)) {
                    this.state = ENEMY_STATE.DISTRACTED;
                    this.target = { x: tx, y: ty };
                    return;
                }
            }
        }
    }

    async moveTowards(tx, ty) {
        let dx = Math.sign(tx - this.x);
        let dy = Math.sign(ty - this.y);
        let nx = this.x, ny = this.y;
        if (dx !== 0 && grid[this.y][this.x + dx] !== WALL) nx += dx;
        else if (dy !== 0 && grid[this.y + dy][this.x] !== WALL) ny += dy;
        await new Promise(r => animMove(this, nx, ny, 0.2, r));
    }

    async patrol() {
        const moves = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
        if (Math.random() > 0.7 || grid[this.y + this.dir.y]?.[this.x + this.dir.x] === WALL) {
            this.dir = moves[Math.floor(Math.random() * 4)];
        }
        let nx = this.x + this.dir.x, ny = this.y + this.dir.y;
        if (grid[ny]?.[nx] !== WALL) await new Promise(r => animMove(this, nx, ny, 0.2, r));
    }

    draw(ctx) {
        if (!this.alive) return;
        drawSprite('guard', this.ax, this.ay);
        ctx.fillStyle = "rgba(255, 50, 50, 0.15)";
        ctx.beginPath();
        ctx.moveTo(this.ax * TILE + 30, this.ay * TILE + 30);
        const baseA = Math.atan2(this.dir.y, this.dir.x);
        for (let a = baseA - 0.7; a <= baseA + 0.7; a += 0.1) {
            let d = 0;
            while (d < this.range) {
                d += 0.2;
                if (grid[Math.floor(this.y + Math.sin(a) * d)]?.[Math.floor(this.x + Math.cos(a) * d)] === WALL) break;
            }
            ctx.lineTo(this.ax * TILE + 30 + Math.cos(a) * d * TILE, this.ay * TILE + 30 + Math.sin(a) * d * TILE);
        }
        ctx.fill();
    }
}
