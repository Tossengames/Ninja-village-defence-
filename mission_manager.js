// ============================================
// MISSION MANAGER - COMPLETE VERSION
// ============================================

const MISSION_STORAGE_KEY = 'stealthGame_customMissions';
let customMissions = [];
let availableMissions = []; // Missions from maps folder

// Initialize mission manager
function initMissionManager() {
    loadCustomMissions(); // Load user-created missions from localStorage
    loadAvailableMissions(); // Load missions from maps folder
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

// Load missions from maps folder
function loadAvailableMissions() {
    // Create some default missions if maps folder doesn't exist
    availableMissions = createDefaultMissions();
    
    console.log("Loaded", availableMissions.length, "available missions");
    
    // Try to load from external file (for future enhancement)
    try {
        // This would require a server or a predefined missions.js file
        // For now, we use the default missions
    } catch (error) {
        console.log("Using default missions:", error.message);
    }
}

// Create default missions
function createDefaultMissions() {
    return [
        {
            id: 'mission_castle',
            name: "Castle Infiltration",
            story: "Infiltrate the castle walls and steal the royal scroll.\n\nAvoid the guards patrolling the courtyard.",
            goal: "steal",
            rules: ["no_alert"],
            timeLimit: 30,
            width: 12,
            height: 12,
            tiles: [
                [1,1,1,1,1,1,1,1,1,1,1,1],
                [1,0,0,0,0,0,1,0,0,0,0,1],
                [1,0,1,1,0,0,0,0,0,1,0,1],
                [1,0,0,1,0,1,1,1,0,1,0,1],
                [1,0,0,0,0,0,0,0,0,0,0,1],
                [1,1,0,1,1,1,0,1,1,1,0,1],
                [1,0,0,0,0,0,0,0,0,0,0,1],
                [1,0,1,1,1,1,1,1,1,1,0,1],
                [1,0,0,0,0,0,0,0,0,0,0,1],
                [1,1,0,1,1,1,1,1,0,1,1,1],
                [1,0,0,0,0,0,0,0,0,0,10,1],
                [1,1,1,1,1,1,1,1,1,1,1,1]
            ],
            playerStart: {x: 1, y: 1},
            exit: {x: 10, y: 10},
            enemies: [
                {x: 5, y: 5, type: "NORMAL"},
                {x: 8, y: 3, type: "NORMAL"},
                {x: 6, y: 8, type: "ARCHER"}
            ],
            items: [
                {x: 10, y: 9, type: "scroll"},
                {x: 3, y: 3, type: "coin"},
                {x: 8, y: 7, type: "coin"}
            ],
            difficulty: "medium",
            version: "1.0"
        },
        {
            id: 'mission_forest',
            name: "Forest Escape",
            story: "You've been spotted! Escape through the forest while avoiding pursuit.\n\nUse the trees for cover.",
            goal: "escape",
            rules: ["no_kills", "time_limit"],
            timeLimit: 20,
            width: 10,
            height: 10,
            tiles: [
                [1,1,1,1,1,1,1,1,1,1],
                [1,0,25,0,0,26,0,0,0,1],
                [1,0,0,25,0,0,0,26,0,1],
                [1,0,25,0,0,0,25,0,0,1],
                [1,0,0,0,26,0,0,0,25,1],
                [1,0,25,0,0,0,26,0,0,1],
                [1,0,0,0,25,0,0,0,26,1],
                [1,0,26,0,0,0,25,0,0,1],
                [1,0,0,0,0,0,0,0,3,1],
                [1,1,1,1,1,1,1,1,1,1]
            ],
            playerStart: {x: 1, y: 1},
            exit: {x: 8, y: 8},
            enemies: [
                {x: 5, y: 3, type: "NORMAL"},
                {x: 3, y: 6, type: "SPEAR"},
                {x: 7, y: 4, type: "ARCHER"}
            ],
            items: [
                {x: 4, y: 4, type: "coin"},
                {x: 6, y: 6, type: "coin"}
            ],
            difficulty: "easy",
            version: "1.0"
        },
        {
            id: 'mission_assassin',
            name: "Silent Assassin",
            story: "Eliminate all targets without raising the alarm.\n\nStealth kills only.",
            goal: "kill_all",
            rules: ["no_alert", "no_items"],
            width: 14,
            height: 14,
            tiles: [
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,0,0,0,0,1,0,0,0,1,0,0,0,1],
                [1,0,1,1,0,1,0,1,0,1,0,1,0,1],
                [1,0,1,0,0,0,0,1,0,0,0,1,0,1],
                [1,0,1,0,1,1,1,1,1,1,0,1,0,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,1,1,1,1,0,1,1,1,0,1,1,1,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,0,1,1,1,1,1,1,1,1,1,1,0,1],
                [1,0,0,0,0,0,0,0,0,0,0,0,0,1],
                [1,0,1,0,1,1,1,1,1,1,0,1,0,1],
                [1,0,1,0,0,0,0,0,0,0,0,1,0,1],
                [1,0,0,0,1,0,1,0,1,0,1,0,0,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1]
            ],
            playerStart: {x: 1, y: 1},
            exit: {x: 12, y: 12},
            enemies: [
                {x: 4, y: 4, type: "NORMAL"},
                {x: 9, y: 4, type: "NORMAL"},
                {x: 6, y: 8, type: "SPEAR"},
                {x: 8, y: 10, type: "ARCHER"},
                {x: 11, y: 6, type: "NORMAL"}
            ],
            items: [],
            difficulty: "hard",
            version: "1.0"
        }
    ];
}

// Get all missions (both available and custom)
function getAllMissions() {
    return [...availableMissions, ...customMissions];
}

// Get mission by ID
function getMissionById(missionId) {
    // Check available missions first
    let mission = availableMissions.find(m => m.id === missionId);
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

// Update a custom mission
function updateCustomMission(missionId, missionData) {
    const index = customMissions.findIndex(m => m.id === missionId);
    if (index !== -1) {
        missionData.updatedAt = new Date().toISOString();
        customMissions[index] = { ...customMissions[index], ...missionData };
        saveCustomMissions();
        console.log("Updated mission:", missionId);
        return true;
    }
    return false;
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
                <div style="margin-bottom: 10px;">No missions available!</div>
                <div style="font-size: 12px; color: #888;">
                    Create your first mission using the Map Editor
                </div>
            </div>
        `;
        return;
    }
    
    // Add default missions first
    const defaultMissions = allMissions.filter(m => !m.isCustom);
    const customMissionsList = allMissions.filter(m => m.isCustom);
    
    // Default missions section
    if (defaultMissions.length > 0) {
        const defaultSection = document.createElement('div');
        defaultSection.className = 'mission-section';
        defaultSection.innerHTML = '<div class="section-title">📁 DEFAULT MISSIONS</div>';
        
        defaultMissions.forEach(mission => {
            defaultSection.appendChild(createMissionItem(mission));
        });
        
        missionList.appendChild(defaultSection);
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
        </div>
    `;
    
    missionList.appendChild(importDiv);
    
    // Set up file input handler
    document.getElementById('missionFileInput')?.addEventListener('change', handleMissionFileUpload);
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
    
    missionDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start;">
            <div>
                <div class="mission-title">${mission.name}</div>
                <div class="mission-description">${shortStory}</div>
            </div>
            <div style="background: ${difficultyColor}; color: #000; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: bold;">
                ${mission.difficulty ? mission.difficulty.toUpperCase() : 'MEDIUM'}
            </div>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 11px; color: #888;">
            <div>${mission.goal.toUpperCase().replace('_', ' ')}</div>
            <div>${mission.width}x${mission.height}</div>
        </div>
        <div style="display: flex; gap: 5px; margin-top: 10px;">
            <button class="small-btn play-btn">▶️ Play</button>
            ${mission.isCustom ? `
                <button class="small-btn edit-btn">✏️ Edit</button>
                <button class="small-btn delete-btn">🗑️ Delete</button>
                <button class="small-btn export-btn">📤 Export</button>
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
        alert("Default missions cannot be edited. Create a copy using the Map Editor.");
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
        alert("Default missions cannot be deleted.");
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
        `;
        document.head.appendChild(style);
    }
    
    console.log("Mission Manager loaded successfully");
});