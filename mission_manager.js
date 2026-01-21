// SIMPLE: LOAD ALL JSON FROM MAPS FOLDER
const MAPS_FOLDER = 'maps/';
let missions = [];

async function loadAllMissions() {
    missions = [];
    
    // FIRST: Create a file called "mission_list.json" in your maps folder
    // Put this in mission_list.json:
    /*
    [
      "my_mission.json",
      "another_mission.json", 
      "test.json"
    ]
    */
    
    try {
        // Try to load the list file first
        const listResponse = await fetch(MAPS_FOLDER + 'mission_list.json');
        if (listResponse.ok) {
            const fileList = await listResponse.json();
            for (const fileName of fileList) {
                await tryLoadFile(fileName);
            }
        }
    } catch (e) {
        // If no list file, try to auto-discover
        await autoDiscoverMissions();
    }
    
    console.log('Total missions:', missions.length);
}

async function autoDiscoverMissions() {
    // Try EVERY possible .json filename combination
    const letters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    
    // Try short names (1-3 characters)
    for (let length = 1; length <= 3; length++) {
        for (let i = 0; i < Math.pow(letters.length, length); i++) {
            let name = '';
            let n = i;
            for (let j = 0; j < length; j++) {
                name += letters[n % letters.length];
                n = Math.floor(n / letters.length);
            }
            await tryLoadFile(name + '.json');
        }
    }
    
    // Also try some common patterns
    const commonNames = [
        'mission', 'level', 'map', 'stage', 'campaign',
        'tutorial', 'castle', 'forest', 'dungeon', 'escape'
    ];
    
    for (const base of commonNames) {
        // Try base.json
        await tryLoadFile(base + '.json');
        // Try with numbers
        for (let i = 1; i <= 20; i++) {
            await tryLoadFile(base + i + '.json');
            await tryLoadFile(base + '_' + i + '.json');
            await tryLoadFile(base + '-' + i + '.json');
        }
    }
}

async function tryLoadFile(fileName) {
    try {
        const response = await fetch(MAPS_FOLDER + fileName);
        if (response.ok) {
            const data = await response.json();
            if (data && data.name && data.width && data.height) {
                data.id = 'mission_' + fileName.replace('.json', '');
                data.fileName = fileName;
                missions.push(data);
                console.log('✓ Loaded:', fileName);
                return true;
            }
        }
    } catch (e) {
        // File doesn't exist, skip it
    }
    return false;
}

// Start loading when page loads
window.addEventListener('load', loadAllMissions);