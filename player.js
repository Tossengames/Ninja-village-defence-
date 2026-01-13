// Player-specific functions (already integrated in core.js)
// This file can be kept for future expansion

class PlayerAbilities {
    constructor() {
        this.abilities = {
            doubleMove: false,
            silentStep: false,
            throwStone: false
        };
    }
    
    // Future: Special abilities can be added here
    useDoubleMove() {
        if(this.abilities.doubleMove) {
            // Allow two moves in one turn
        }
    }
    
    useSilentStep() {
        if(this.abilities.silentStep) {
            // Move without alerting guards
        }
    }
}