// ============================================
// SIMPLE MISSION LOADER FOR GITHUB PAGES
// ============================================

const MISSION_STORAGE_KEY = 'stealthGame_customMissions';
let customMissions = [];
let gameMissions = [];

// List of mission files to load - YOU NEED TO UPDATE THIS ARRAY!
let MISSION_FILES = [
    // Add your mission file names here:
    'mission1.json',
    'mission2.json',
    'mission3.json'
    // Add more as you create them...
];

// Initialize mission manager
async function initMissionManager() {
    console.log("Initializing Mission Manager...");
    
    // Load user-created missions from localStorage
    loadCustomMissions();
    
    // Load game missions
    await loadGameMissions();
    
    console.log("Mission Manager initialized");
}

// Load user-created missions from localStorage
function loadCustomMissions() {
    try {
        const saved = localStorage.getItem(MISSION_STORAGE_KEY);
        if (saved) {
            customMissions = JSON.parse(saved);
            console.log("Loaded", customMissions.length, "custom missions");
        } else {
            customMissions = [];
            console.log("No saved custom missions");
        }
    } catch (error) {
        console.error("Error loading custom missions:", error);
        customMissions = [];
    }
}

// Load game missions from the files list
async function loadGameMissions() {
    console.log("Loading game missions...");
    
    gameMissions = [];
    let loadedCount = 0;
    
    for (const fileName of MISSION_FILES) {
        try {
            const mission = await loadMissionFile(fileName);
            if (mission) {
                gameMissions.push(mission);
                loadedCount++;
                console.log(`✓ Loaded: ${mission.name}`);
            }
        } catch (error) {
            console.log(`✗ Failed to load ${fileName}:`, error.message);
        }
    }
    
    console.log(`Loaded ${loadedCount}/${MISSION_FILES.length} missions`);
}

// Load a single mission file
async function loadMissionFile(fileName) {
    try {
        // Try different paths
        const paths = [
            `maps/${fileName}`,
            `./maps/${fileName}`,
            `${fileName}`,
            `./${fileName}`
        ];
        
        let missionData = null;
        
        for (const path of paths) {
            try {
                const response = await fetch(path);
                if (response.ok) {
                    missionData = await response.json();
                    console.log(`Found ${fileName} at: ${path}`);
                    break;
                }
            } catch (e) {
                // Try next path
            }
        }
        
        if (!missionData) {
            throw new Error(`File not found: ${fileName}`);
        }
        
        // Validate mission
        if (!isValidMission(missionData)) {
            throw new Error("Invalid mission format");
        }
        
        // Add metadata
        missionData.id = 'game_' + fileName.replace('.json', '');
        missionData.source = 'game';
        missionData.fileName = fileName;
        missionData.isCustom = false;
        
        // Ensure mission has a name
        if (!missionData.name || missionData.name.trim() === '') {
            missionData.name = formatFileName(fileName);
        }
        
        return missionData;
        
    } catch (error) {
        console.error(`Error loading ${fileName}:`, error);
        return null;
    }
}

// Simple validation
function isValidMission(data) {
    return data && 
           data.name && 
           data.width && 
           data.height && 
           data.tiles && 
           Array.isArray(data.tiles) &&
           data.playerStart &&
           typeof data.playerStart.x === 'number' &&
           typeof data.playerStart.y === 'number';
}

// Format filename
function formatFileName(fileName) {
    return fileName
        .replace('.json', '')
        .replace(/[_-]/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .toLowerCase()
        .replace(/\b\w/g, l => l.toUpperCase())
        .trim();
}

// Get all missions
function getAllMissions() {
    return [...gameMissions, ...customMissions];
}

// Get mission by ID
function getMissionById(missionId) {
    return getAllMissions().find(m => m.id === missionId);
}

// Add custom mission
function addCustomMission(missionData) {
    missionData.id = 'custom_' + Date.now();
    missionData.isCustom = true;
    missionData.createdAt = new Date().toISOString();
    
    customMissions.push(missionData);
    saveCustomMissions();
    
    return missionData.id;
}

// Save custom missions
function saveCustomMissions() {
    try {
        localStorage.setItem(MISSION_STORAGE_KEY, JSON.stringify(customMissions));
        return true;
    } catch (error) {
        console.error("Error saving missions:", error);
        return false;
    }
}

// Delete custom mission
function deleteCustomMission(missionId) {
    const index = customMissions.findIndex(m => m.id === missionId);
    if (index !== -1) {
        customMissions.splice(index, 1);
        saveCustomMissions();
        return true;
    }
    return false;
}

// Import mission from file
function importMissionFromFile(file) {
    return new Promise((resolve, reject) => {
        if (!file || !file.name.endsWith('.json')) {
            reject(new Error("Please select a JSON file"));
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const missionData = JSON.parse(e.target.result);
                
                if (!isValidMission(missionData)) {
                    throw new Error("Invalid mission format");
                }
                
                const missionId = addCustomMission(missionData);
                resolve({ success: true, id: missionId, name: missionData.name });
                
            } catch (error) {
                reject(new Error("Error parsing mission: " + error.message));
            }
        };
        
        reader.onerror = function() {
            reject(new Error("Error reading file"));
        };
        
        reader.readAsText(file);
    });
}

// Load mission list UI
function loadMissionListUI() {
    const missionList = document.getElementById('missionList');
    if (!missionList) return;
    
    missionList.innerHTML = '';
    
    const allMissions = getAllMissions();
    
    if (allMissions.length === 0) {
        missionList.innerHTML = `
            <div class="empty-preview">
                <div style="margin-bottom: 10px;">📁 No missions found!</div>
                <div style="font-size: 12px; color: #888; padding: 10px;">
                    <p>To add missions:</p>
                    <ol style="text-align: left; padding-left: 20px;">
                        <li>Create mission files in the <strong>maps/</strong> folder</li>
                        <li>Update the MISSION_FILES array in the script</li>
                        <li>Or import missions below</li>
                    </ol>
                </div>
                <button class="editor-action-btn" onclick="refreshMissions()" style="margin-top: 20px;">
                    🔄 Refresh
                </button>
            </div>
        `;
        return;
    }
    
    // Display missions
    allMissions.forEach(mission => {
        missionList.appendChild(createMissionItem(mission));
    });
    
    // Add import section
    const importDiv = document.createElement('div');
    importDiv.innerHTML = `
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #444;">
            <div style="text-align: center; color: var(--accent); font-size: 12px; margin-bottom: 10px;">📥 IMPORT MISSION</div>
            <div style="text-align: center;">
                <input type="file" id="missionFileInput" accept=".json" style="display: none;">
                <button class="import-btn" onclick="document.getElementById('missionFileInput').click()" style="width: 100%;">
                    📥 Choose File to Import
                </button>
                <div style="font-size: 11px; color: #888; margin-top: 5px;">
                    <button onclick="refreshMissions()" style="background: none; border: none; color: var(--accent); cursor: pointer; text-decoration: underline;">
                        🔄 Refresh List
                    </button>
                </div>
            </div>
        </div>
    `;
    
    missionList.appendChild(importDiv);
    
    // Setup file input
    document.getElementById('missionFileInput').addEventListener('change', handleFileUpload);
}

// Create mission item
function createMissionItem(mission) {
    const div = document.createElement('div');
    div.className = 'mission-item';
    div.dataset.missionId = mission.id;
    
    const badge = mission.isCustom ? 
        '<span style="background: #ff9900; color: #000; padding: 2px 6px; border-radius: 10px; font-size: 9px; font-weight: bold; margin-left: 5px;">Custom</span>' :
        '<span style="background: #3366cc; color: #fff; padding: 2px 6px; border-radius: 10px; font-size: 9px; font-weight: bold; margin-left: 5px;">Game</span>';
    
    const difficultyColor = mission.difficulty === 'easy' ? '#33cc33' :
                          mission.difficulty === 'hard' ? '#ff3333' : '#ff9900';
    
    div.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start;">
            <div>
                <div class="mission-title">${mission.name} ${badge}</div>
                <div class="mission-description">${mission.story || 'No description'}</div>
            </div>
            <div style="background: ${difficultyColor}; color: #000; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: bold;">
                ${mission.difficulty ? mission.difficulty.toUpperCase() : 'MEDIUM'}
            </div>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 11px; color: #888;">
            <div>${mission.goal ? mission.goal.toUpperCase() : 'ESCAPE'}</div>
            <div>${mission.width}x${mission.height}</div>
        </div>
        <div style="display: flex; gap: 5px; margin-top: 10px;">
            <button class="small-btn play-btn">▶️ Play</button>
            ${mission.isCustom ? `
                <button class="small-btn edit-btn">✏️ Edit</button>
                <button class="small-btn delete-btn">🗑️ Delete</button>
            ` : ''}
        </div>
    `;
    
    // Add event listeners
    div.querySelector('.play-btn').onclick = () => playMission(mission.id);
    
    if (mission.isCustom) {
        div.querySelector('.edit-btn').onclick = () => editMission(mission.id);
        div.querySelector('.delete-btn').onclick = () => deleteMissionUI(mission.id);
    }
    
    return div;
}

// Handle file upload
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        const result = await importMissionFromFile(file);
        alert(`Mission "${result.name}" imported successfully!`);
        loadMissionListUI();
    } catch (error) {
        alert("Error importing mission: " + error.message);
    }
    
    event.target.value = '';
}

// Refresh missions
async function refreshMissions() {
    await loadGameMissions();
    loadMissionListUI();
    alert(`Refreshed! Found ${gameMissions.length} game missions and ${customMissions.length} custom missions.`);
}

// Play mission
function playMission(missionId) {
    const mission = getMissionById(missionId);
    if (!mission) {
        alert("Mission not found");
        return;
    }
    
    if (typeof showMissionBriefing === 'function') {
        showMissionBriefing(mission);
    } else {
        alert("Game functions not available");
    }
}

// Edit mission
function editMission(missionId) {
    const mission = getMissionById(missionId);
    if (!mission || !mission.isCustom) {
        alert("Cannot edit this mission");
        return;
    }
    
    if (typeof initMapEditor === 'function') {
        initMapEditor();
        setTimeout(() => {
            if (typeof loadMissionData === 'function') {
                loadMissionData(mission);
            }
        }, 100);
    }
}

// Delete mission UI
function deleteMissionUI(missionId) {
    if (!confirm("Delete this mission?")) return;
    
    if (deleteCustomMission(missionId)) {
        loadMissionListUI();
        alert("Mission deleted");
    } else {
        alert("Error deleting mission");
    }
}

// Initialize
window.addEventListener('load', function() {
    initMissionManager();
    
    // Override loadMissionList
    if (typeof window.loadMissionList === 'function') {
        window.loadMissionList = loadMissionListUI;
    }
    
    // Add styles if needed
    if (!document.querySelector('style#mission-styles')) {
        const style = document.createElement('style');
        style.id = 'mission-styles';
        style.textContent = `
            .mission-item .small-btn {
                background: #333;
                border: 1px solid #444;
                color: #aaa;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 10px;
                cursor: pointer;
            }
            
            .mission-item .small-btn:hover {
                background: #3a3a3a;
                color: #ccc;
            }
            
            .import-btn {
                background: linear-gradient(to bottom, #333, #222);
                border: 1px solid #444;
                color: #aaa;
                padding: 10px;
                border-radius: 6px;
                cursor: pointer;
                width: 100%;
            }
            
            .import-btn:hover {
                background: linear-gradient(to bottom, #3a3a3a, #2a2a2a);
                color: #ccc;
            }
            
            .empty-preview {
                text-align: center;
                padding: 40px 20px;
                color: #888;
                background: rgba(0,0,0,0.3);
                border-radius: 10px;
                border: 2px dashed #444;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Make functions global
    window.refreshMissions = refreshMissions;
    
    console.log("Mission Manager ready");
});

// ============================================
// MANUAL SETUP INSTRUCTIONS:
// ============================================
// 1. Create a "maps" folder in your GitHub repo
// 2. Place your mission1.json, mission2.json files there
// 3. UPDATE THE MISSION_FILES ARRAY ABOVE with your actual file names
// 4. Example: 
//    let MISSION_FILES = ['mission1.json', 'mission2.json', 'my_cool_map.json'];
// ============================================