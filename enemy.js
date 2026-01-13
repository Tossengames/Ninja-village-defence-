// Enemy behavior functions (already integrated in core.js)
// This file can be kept for future expansion

class EnemyAI {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.alive = true;
        this.alert = false;
        this.patrolPath = [];
        this.currentPatrolIndex = 0;
    }
    
    // Future: More advanced AI behaviors can be added here
    updatePatrolPath() {
        // Generate patrol path
    }
    
    investigateSound(sourceX, sourceY) {
        // Move toward sound source
    }
}