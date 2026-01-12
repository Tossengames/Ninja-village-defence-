// PLAYER CLASS - Player movement and inventory
class Player {
    constructor() {
        this.x = 1;
        this.y = 1;
        this.ax = 1;
        this.ay = 1;
        this.isHidden = false;
        this.inv = { trap: 3, rice: 2, bomb: 1 };
    }

    moveTo(x, y, grid) {
        this.x = x;
        this.y = y;
        this.isHidden = (grid[y][x] === 2); // HIDE tile
        
        if (grid[y][x] === 5) { // COIN
            grid[y][x] = 0;
            return 'coin';
        }
        if (grid[y][x] === 3) { // EXIT
            return 'exit';
        }
        return 'moved';
    }

    canMoveTo(x, y, grid) {
        const dist = Math.max(Math.abs(x - this.x), Math.abs(y - this.y));
        if (dist > 2) return false;
        if (!grid[y] || grid[y][x] === 1) return false; // WALL
        
        // Check diagonal movement through walls
        const dx = x - this.x;
        const dy = y - this.y;
        if (dx !== 0 && dy !== 0) {
            if (!grid[this.y + dy][this.x] && !grid[this.y][this.x + dx]) {
                return false;
            }
        }
        return true;
    }

    useItem(item, x, y, grid, bombs) {
        if (this.inv[item] > 0 && grid[y][x] === 0) {
            grid[y][x] = item === 'trap' ? 6 : item === 'rice' ? 7 : 8;
            this.inv[item]--;
            
            if (item === 'bomb') {
                bombs.push({x, y, t: 3});
            }
            return true;
        }
        return false;
    }
}