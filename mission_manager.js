// ============================================
// MISSION MANAGER - LOCAL GITHUB PAGES VERSION
// ============================================

const MISSION_STORAGE_KEY = 'stealthGame_customMissions';
const MAPS_FOLDER = 'maps/'; // Folder in the same directory
let customMissions = [];
let localMissions = [];

// Initialize mission manager
async function initMissionManager() {
    console.log("Initializing Mission Manager...");
    
    // Load user-created missions from localStorage
    loadCustomMissions();
    
    // Load missions from local maps folder
    await loadMissionsFromLocalFolder();
    
    console.log("Mission Manager initialized");
}

// Load user-created missions from localStorage
function loadCustomMissions() {
    try {
        const saved = localStorage.getItem(MISSION_STORAGE_KEY);
        if (saved) {
            customMissions = JSON.parse(saved);
            console.log("Loaded", customMissions.length, "custom missions from storage");
        } else {
            customMissions = [];
            console.log("No saved custom missions found");
        }
    } catch (error) {
        console.error("Error loading custom missions:", error);
        customMissions = [];
    }
}

// Load missions from local maps folder
async function loadMissionsFromLocalFolder() {
    try {
        console.log("Loading missions from local maps folder...");
        
        // Try to load missions.json which contains the list of available missions
        // This is a better approach than trying to list files directly
        const missionsListUrl = MAPS_FOLDER + 'missions.json';
        
        let missionsList = [];
        
        try {
            const response = await fetch(missionsListUrl);
            if (response.ok) {
                missionsList = await response.json();
                console.log("Found missions.json with", missionsList.length, "missions");
            } else {
                // If missions.json doesn't exist, try to auto-discover .json files
                console.log("missions.json not found, trying to discover mission files...");
                missionsList = await discoverMissionFiles();
            }
        } catch (error) {
            console.log("Error loading missions.json, trying discovery:", error.message);
            missionsList = await discoverMissionFiles();
        }
        
        // Load each mission from the list
        localMissions = [];
        
        for (const missionInfo of missionsList) {
            try {
                const missionUrl = MAPS_FOLDER + missionInfo.file;
                const missionResponse = await fetch(missionUrl);
                
                if (missionResponse.ok) {
                    const missionData = await missionResponse.json();
                    
                    // Validate mission data
                    if (isValidMission(missionData)) {
                        // Add metadata
                        missionData.id = 'local_' + missionInfo.file.replace('.json', '');
                        missionData.source = 'local';
                        missionData.fileName = missionInfo.file;
                        missionData.filePath = missionUrl;
                        
                        // Add name from missionInfo if provided
                        if (missionInfo.name && !missionData.name) {
                            missionData.name = missionInfo.name;
                        }
                        
                        // Add description from missionInfo if provided
                        if (missionInfo.description && !missionData.story) {
                            missionData.story = missionInfo.description;
                        }
                        
                        localMissions.push(missionData);
                        console.log(`Loaded mission: ${missionData.name}`);
                    } else {
                        console.warn(`Invalid mission format in ${missionInfo.file}`);
                    }
                } else {
                    console.warn(`Failed to load ${missionInfo.file}: ${missionResponse.status}`);
                }
            } catch (error) {
                console.error(`Error loading mission ${missionInfo.file}:`, error);
            }
        }
        
        console.log(`Successfully loaded ${localMissions.length} missions from local folder`);
        
        // If no missions were loaded, create a fallback
        if (localMissions.length === 0) {
            console.log("Creating tutorial mission...");
            localMissions.push(createTutorialMission());
        }
        
    } catch (error) {
        console.error("Error loading missions from local folder:", error);
        
        // Create tutorial mission as fallback
        localMissions = [createTutorialMission()];
    }
}

// Try to discover mission files (simulated for GitHub Pages)
async function discoverMissionFiles() {
    // Since GitHub Pages doesn't allow directory listing,
    // we need to know the mission files in advance
    // You should create a missions.json file with the list
    
    // For now, let's try some common mission file names
    const possibleMissions = [
        { file: 'tutorial.json', name: 'Tutorial Mission' },
        { file: 'castle_infiltration.json', name: 'Castle Infiltration' },
        { file: 'forest_escape.json', name: 'Forest Escape' },
        { file: 'silent_assassin.json', name: 'Silent Assassin' }
    ];
    
    const discoveredMissions = [];
    
    // Test each possible mission file
    for (const mission of possibleMissions) {
        try {
            const testResponse = await fetch(MAPS_FOLDER + mission.file);
            if (testResponse.ok) {
                discoveredMissions.push(mission);
                console.log(`Found mission file: ${mission.file}`);
            }
        } catch (error) {
            // File doesn't exist or other error, skip it
        }
    }
    
    return discoveredMissions;
}

// Create tutorial mission
function createTutorialMission() {
    return {
        id: 'local_tutorial',
        name: "Tutorial Mission",
        story: "Welcome to the Stealth Game! Learn the basics:\n\n1. Use arrow keys to move\n2. Avoid guards (red squares)\n3. Collect coins (gold squares)\n4. Reach the exit (green square)\n\nStealth is key - don't get caught!",
        goal: "escape",
        rules: [],
        timeLimit: 90,
        width: 12,
        height: 12,
        tiles: [
            [1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,1,1,1,1,1,1,0,0,1],
            [1,0,0,1,0,0,0,0,1,0,0,1],
            [1,0,0,1,0,5,5,0,1,0,0,1],
            [1,0,0,1,0,5,5,0,1,0,0,1],
            [1,0,0,1,0,0,0,0,1,0,0,1],
            [1,0,0,1,1,1,1,1,1,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,3,1],
            [1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        playerStart: {x: 1, y: 10},
        exit: {x: 10, y: 10},
        enemies: [
            {x: 5, y: 5, type: "NORMAL"}
        ],
        items: [
            {x: 6, y: 5, type: "coin"},
            {x: 5, y: 6, type: "coin"},
            {x: 6, y: 6, type: "coin"}
        ],
        difficulty: "easy",
        source: "builtin",
        version: "1.0"
    };
}

// Validate mission data structure
function isValidMission(missionData) {
    return missionData && 
           typeof missionData.name === 'string' &&
           typeof missionData.width === 'number' &&
           typeof missionData.height === 'number' &&
           Array.isArray(missionData.tiles) &&
           missionData.tiles.length === missionData.height &&
           missionData.playerStart &&
           typeof missionData.playerStart.x === 'number' &&
           typeof missionData.playerStart.y === 'number';
}

// Save custom missions to localStorage
function saveCustomMissions() {
    try {
        localStorage.setItem(MISSION_STORAGE_KEY, JSON.stringify(customMissions));
        console.log("Saved", customMissions.length, "custom missions to storage");
        return true;
    } catch (error) {
        console.error("Error saving missions:", error);
        return false;
    }
}

// Get all missions (both local and custom)
function getAllMissions() {
    return [...localMissions, ...customMissions];
}

// Get mission by ID
function getMissionById(missionId) {
    // Check local missions first
    let mission = localMissions.find(m => m.id === missionId);
    if (!mission) {
        // Check custom missions
        mission = customMissions.find(m => m.id === missionId);
    }
    return mission;
}

// Add a custom mission
function addCustomMission(missionData) {
    // Generate unique ID if not provided
    if (!missionData.id) {
        missionData.id = 'custom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // Add metadata
    missionData.createdAt = new Date().toISOString();
    missionData.isCustom = true;
    missionData.version = "1.0";
    
    customMissions.push(missionData);
    saveCustomMissions();
    
    console.log("Added custom mission:", missionData.name);
    return missionData.id;
}

// Delete a custom mission
function deleteCustomMission(missionId) {
    const index = customMissions.findIndex(m => m.id === missionId);
    if (index !== -1) {
        customMissions.splice(index, 1);
        saveCustomMissions();
        console.log("Deleted mission:", missionId);
        return true;
    }
    return false;
}

// Import mission from JSON string
function importMissionFromJSON(jsonString) {
    try {
        const missionData = JSON.parse(jsonString);
        
        // Validate required fields
        if (!missionData.name || !missionData.width || !missionData.height) {
            throw new Error("Invalid mission data: missing required fields");
        }
        
        // Ensure tiles array exists
        if (!missionData.tiles || !Array.isArray(missionData.tiles)) {
            missionData.tiles = Array(missionData.height).fill().map(() => 
                Array(missionData.width).fill(0)
            );
        }
        
        // Add to custom missions
        const missionId = addCustomMission(missionData);
        return { success: true, id: missionId, name: missionData.name };
        
    } catch (error) {
        console.error("Error importing mission:", error);
        return { success: false, error: error.message };
    }
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
            const result = importMissionFromJSON(e.target.result);
            if (result.success) {
                resolve(result);
            } else {
                reject(new Error(result.error));
            }
        };
        
        reader.onerror = function() {
            reject(new Error("Error reading file"));
        };
        
        reader.readAsText(file);
    });
}

// Export mission to file
function exportMissionToFile(missionId) {
    const mission = getMissionById(missionId);
    if (!mission) {
        alert("Mission not found");
        return;
    }
    
    const jsonString = JSON.stringify(mission, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = mission.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
}

// Load mission list in UI
function loadMissionListUI() {
    const missionList = document.getElementById('missionList');
    if (!missionList) return;
    
    missionList.innerHTML = '';
    
    const allMissions = getAllMissions();
    
    if (allMissions.length === 0) {
        missionList.innerHTML = `
            <div class="empty-preview">
                <div style="margin-bottom: 10px;">No missions available yet!</div>
                <div style="font-size: 12px; color: #888; text-align: left; padding: 10px;">
                    <p>To add missions:</p>
                    <p>1. Create mission files in the <strong>maps/</strong> folder</p>
                    <p>2. Or use the Map Editor to create missions</p>
                    <p>3. Or import mission files below</p>
                    <p style="margin-top: 10px; font-size: 11px;">
                        Mission files should be .json format and follow the mission structure.
                    </p>
                </div>
            </div>
        `;
        return;
    }
    
    // Group missions by source
    const localMissionsList = allMissions.filter(m => m.source === 'local' || m.source === 'builtin');
    const customMissionsList = allMissions.filter(m => m.isCustom);
    
    // Local missions section
    if (localMissionsList.length > 0) {
        const localSection = document.createElement('div');
        localSection.className = 'mission-section';
        localSection.innerHTML = '<div class="section-title">🗺️ GAME MISSIONS</div>';
        
        localMissionsList.forEach(mission => {
            localSection.appendChild(createMissionItem(mission));
        });
        
        missionList.appendChild(localSection);
    }
    
    // Custom missions section
    if (customMissionsList.length > 0) {
        const customSection = document.createElement('div');
        customSection.className = 'mission-section';
        customSection.innerHTML = '<div class="section-title">💾 YOUR MISSIONS</div>';
        
        customMissionsList.forEach(mission => {
            customSection.appendChild(createMissionItem(mission));
        });
        
        missionList.appendChild(customSection);
    }
    
    // Add import button at the end
    const importDiv = document.createElement('div');
    importDiv.className = 'mission-section';
    importDiv.innerHTML = `
        <div class="section-title">📥 IMPORT MISSION</div>
        <div class="mission-item" style="text-align: center; padding: 20px;">
            <div style="font-size: 24px; margin-bottom: 10px;">📁</div>
            <div class="mission-title">IMPORT FROM FILE</div>
            <div class="mission-description">Upload a .json mission file</div>
            <input type="file" id="missionFileInput" accept=".json" style="display: none;">
            <button class="import-btn" onclick="document.getElementById('missionFileInput').click()">
                📥 Choose File
            </button>
            <div style="margin-top: 15px; font-size: 12px; color: #888;">
                <button class="refresh-btn" onclick="refreshMissionsFromFolder()" style="background: transparent; border: none; color: var(--accent); cursor: pointer; text-decoration: underline;">
                    🔄 Refresh Mission List
                </button>
            </div>
        </div>
    `;
    
    missionList.appendChild(importDiv);
    
    // Set up file input handler
    const fileInput = document.getElementById('missionFileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleMissionFileUpload);
    }
}

// Create a mission item for the UI
function createMissionItem(mission) {
    const missionDiv = document.createElement('div');
    missionDiv.className = 'mission-item';
    missionDiv.dataset.missionId = mission.id;
    
    // Truncate long descriptions
    const shortStory = mission.story 
        ? (mission.story.length > 60 ? mission.story.substring(0, 57) + '...' : mission.story)
        : "No description";
    
    // Difficulty badge
    const difficultyColors = {
        easy: '#33cc33',
        medium: '#ff9900',
        hard: '#ff3333'
    };
    
    const difficultyColor = difficultyColors[mission.difficulty] || '#888';
    
    // Source indicator
    let sourceIndicator = '';
    if (mission.source === 'local') {
        sourceIndicator = '<span style="background: #3366cc; color: #fff; padding: 2px 6px; border-radius: 10px; font-size: 9px; font-weight: bold; margin-left: 5px;">Game</span>';
    } else if (mission.isCustom) {
        sourceIndicator = '<span style="background: #ff9900; color: #000; padding: 2px 6px; border-radius: 10px; font-size: 9px; font-weight: bold; margin-left: 5px;">Custom</span>';
    }
    
    missionDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start;">
            <div>
                <div class="mission-title">${mission.name} ${sourceIndicator}</div>
                <div class="mission-description">${shortStory}</div>
            </div>
            <div style="background: ${difficultyColor}; color: #000; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: bold;">
                ${mission.difficulty ? mission.difficulty.toUpperCase() : 'MEDIUM'}
            </div>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 11px; color: #888;">
            <div>${mission.goal ? mission.goal.toUpperCase().replace('_', ' ') : 'ESCAPE'}</div>
            <div>${mission.width}x${mission.height}</div>
        </div>
        <div style="display: flex; gap: 5px; margin-top: 10px;">
            <button class="small-btn play-btn">▶️ Play</button>
            ${mission.isCustom ? `
                <button class="small-btn edit-btn">✏️ Edit</button>
                <button class="small-btn delete-btn">🗑️ Delete</button>
                <button class="small-btn export-btn">📤 Export</button>
            ` : ''}
            ${mission.source === 'local' && mission.fileName ? `
                <button class="small-btn info-btn" onclick="showMissionInfo('${mission.id}')">ℹ️ Info</button>
            ` : ''}
        </div>
    `;
    
    // Add event listeners to buttons
    const playBtn = missionDiv.querySelector('.play-btn');
    const editBtn = missionDiv.querySelector('.edit-btn');
    const deleteBtn = missionDiv.querySelector('.delete-btn');
    const exportBtn = missionDiv.querySelector('.export-btn');
    
    playBtn.onclick = (e) => {
        e.stopPropagation();
        playMission(mission.id);
    };
    
    if (editBtn) {
        editBtn.onclick = (e) => {
            e.stopPropagation();
            editMission(mission.id);
        };
    }
    
    if (deleteBtn) {
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteMissionUI(mission.id);
        };
    }
    
    if (exportBtn) {
        exportBtn.onclick = (e) => {
            e.stopPropagation();
            exportMission(mission.id);
        };
    }
    
    // Make whole item clickable for play
    missionDiv.onclick = (e) => {
        if (!e.target.closest('button')) {
            playMission(mission.id);
        }
    };
    
    return missionDiv;
}

// Show mission info
function showMissionInfo(missionId) {
    const mission = getMissionById(missionId);
    if (!mission) return;
    
    const infoText = `
        Mission: ${mission.name}
        Source: ${mission.source === 'local' ? 'Game Folder' : 'Custom'}
        File: ${mission.fileName || 'Not saved as file'}
        Size: ${mission.width}x${mission.height}
        Goal: ${mission.goal || 'escape'}
        Difficulty: ${mission.difficulty || 'medium'}
        ${mission.timeLimit ? `Time Limit: ${mission.timeLimit} seconds` : ''}
    `;
    
    alert(infoText);
}

// Handle mission file upload
function handleMissionFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    importMissionFromFile(file)
        .then(result => {
            alert(`Mission "${result.name}" imported successfully!`);
            loadMissionListUI();
            event.target.value = '';
        })
        .catch(error => {
            alert("Error importing mission: " + error.message);
            event.target.value = '';
        });
}

// Refresh missions from folder
async function refreshMissionsFromFolder() {
    try {
        console.log("Refreshing missions from folder...");
        
        // Show loading indicator
        const missionList = document.getElementById('missionList');
        if (missionList) {
            missionList.innerHTML = `
                <div class="empty-preview">
                    <div style="margin-bottom: 10px;">🔄 Loading missions...</div>
                </div>
            `;
        }
        
        await loadMissionsFromLocalFolder();
        loadMissionListUI();
        
        console.log("Missions refreshed");
        alert(`Loaded ${localMissions.length} game missions and ${customMissions.length} custom missions`);
        
    } catch (error) {
        console.error("Error refreshing missions:", error);
        alert("Error refreshing missions: " + error.message);
    }
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
        alert("Game functions not available. Please reload the page.");
    }
}

// Edit mission in editor
function editMission(missionId) {
    const mission = getMissionById(missionId);
    if (!mission) {
        alert("Mission not found");
        return;
    }
    
    // Only custom missions can be edited
    if (!mission.isCustom) {
        alert("Game missions cannot be edited. You can create a copy:\n1. Export this mission\n2. Import it back\n3. Edit the copy");
        return;
    }
    
    // Load mission into editor
    if (typeof initMapEditor === 'function') {
        initMapEditor();
        setTimeout(() => {
            if (typeof loadMissionData === 'function') {
                loadMissionData(mission);
            }
        }, 100);
    } else {
        alert("Editor not available. Please reload the page.");
    }
}

// Delete mission with confirmation
function deleteMissionUI(missionId) {
    const mission = getMissionById(missionId);
    if (!mission) return;
    
    if (!mission.isCustom) {
        alert("Game missions cannot be deleted.");
        return;
    }
    
    if (confirm(`Delete mission "${mission.name}"? This cannot be undone.`)) {
        if (deleteCustomMission(missionId)) {
            loadMissionListUI();
            alert("Mission deleted");
        } else {
            alert("Error deleting mission");
        }
    }
}

// Export mission
function exportMission(missionId) {
    exportMissionToFile(missionId);
}

// Initialize on page load
window.addEventListener('load', function() {
    initMissionManager();
    
    // Override the loadMissionList function from core_main.js
    if (typeof window.loadMissionList === 'function') {
        const originalLoadMissionList = window.loadMissionList;
        window.loadMissionList = function() {
            loadMissionListUI();
        };
    } else {
        window.loadMissionList = loadMissionListUI;
    }
    
    // Add CSS for mission manager
    if (!document.querySelector('style#mission-manager-styles')) {
        const style = document.createElement('style');
        style.id = 'mission-manager-styles';
        style.textContent = `
            .mission-section {
                margin-bottom: 20px;
            }
            
            .section-title {
                color: var(--accent);
                font-size: 12px;
                font-weight: bold;
                margin-bottom: 8px;
                padding-left: 5px;
                border-left: 3px solid var(--accent);
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .small-btn {
                background: #333;
                border: 1px solid #444;
                color: #aaa;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 10px;
                cursor: pointer;
                transition: all 0.2s;
                white-space: nowrap;
            }
            
            .small-btn:hover {
                background: #3a3a3a;
                color: #ccc;
                border-color: #666;
            }
            
            .import-btn {
                background: linear-gradient(to bottom, #333, #222);
                border: 1px solid #444;
                color: #aaa;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                margin-top: 10px;
                transition: all 0.2s;
            }
            
            .import-btn:hover {
                background: linear-gradient(to bottom, #3a3a3a, #2a2a2a);
                color: #ccc;
                border-color: #666;
            }
            
            .mission-item .small-btn {
                opacity: 0;
                transition: opacity 0.2s;
            }
            
            .mission-item:hover .small-btn {
                opacity: 1;
            }
            
            @media (max-width: 768px) {
                .mission-item .small-btn {
                    opacity: 1;
                    padding: 6px 10px;
                    font-size: 11px;
                }
                
                .mission-item {
                    padding: 15px;
                }
            }
            
            .refresh-btn {
                background: transparent;
                border: none;
                color: var(--accent);
                cursor: pointer;
                font-size: inherit;
                text-decoration: underline;
                padding: 0;
                margin: 0;
            }
            
            .refresh-btn:hover {
                color: #fff;
            }
            
            .info-btn {
                background: #3366cc !important;
                color: white !important;
                border-color: #4488ee !important;
            }
            
            .empty-preview {
                text-align: center;
                padding: 40px 20px;
                color: #888;
                background: rgba(0, 0, 0, 0.3);
                border-radius: 10px;
                border: 2px dashed #444;
            }
        `;
        document.head.appendChild(style);
    }
    
    console.log("Mission Manager loaded successfully");
});