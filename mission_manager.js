// ============================================
// MISSION MANAGER - HANDLES MISSION LOADING/SAVING
// ============================================

// Mission storage
const MISSION_STORAGE_KEY = 'stealthGame_customMissions';
let customMissions = [];

// Initialize mission manager
function initMissionManager() {
    loadCustomMissions();
    console.log("Mission Manager initialized with", customMissions.length, "missions");
}

// Load custom missions from localStorage
function loadCustomMissions() {
    try {
        const saved = localStorage.getItem(MISSION_STORAGE_KEY);
        if (saved) {
            customMissions = JSON.parse(saved);
            console.log("Loaded", customMissions.length, "missions from storage");
        } else {
            customMissions = [];
            console.log("No saved missions found, starting fresh");
        }
    } catch (error) {
        console.error("Error loading missions:", error);
        customMissions = [];
    }
}

// Save custom missions to localStorage
function saveCustomMissions() {
    try {
        localStorage.setItem(MISSION_STORAGE_KEY, JSON.stringify(customMissions));
        console.log("Saved", customMissions.length, "missions to storage");
        return true;
    } catch (error) {
        console.error("Error saving missions:", error);
        return false;
    }
}

// Add a new mission
function addCustomMission(missionData) {
    // Add unique ID and timestamp
    missionData.id = 'mission_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    missionData.createdAt = new Date().toISOString();
    missionData.version = "1.0";
    
    customMissions.push(missionData);
    saveCustomMissions();
    
    console.log("Added new mission:", missionData.name);
    return missionData.id;
}

// Update an existing mission
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

// Delete a mission
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

// Get mission by ID
function getMissionById(missionId) {
    return customMissions.find(m => m.id === missionId);
}

// Get all missions
function getAllMissions() {
    return customMissions;
}

// Get missions by goal type
function getMissionsByGoal(goal) {
    return customMissions.filter(m => m.goal === goal);
}

// Get missions by difficulty
function getMissionsByDifficulty(difficulty) {
    return customMissions.filter(m => m.difficulty === difficulty);
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
                
                // Validate mission data
                if (!missionData.name || !missionData.width || !missionData.height || !missionData.tiles) {
                    reject(new Error("Invalid mission file format"));
                    return;
                }
                
                // Add to missions
                const missionId = addCustomMission(missionData);
                resolve({ success: true, id: missionId, name: missionData.name });
                
            } catch (error) {
                reject(new Error("Error parsing JSON: " + error.message));
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
    
    if (customMissions.length === 0) {
        missionList.innerHTML = `
            <div class="empty-preview">
                <div style="margin-bottom: 10px;">No custom missions yet!</div>
                <div style="font-size: 12px; color: #888;">
                    Create your first mission using the Map Editor
                </div>
            </div>
        `;
        return;
    }
    
    customMissions.forEach(mission => {
        const missionDiv = document.createElement('div');
        missionDiv.className = 'mission-item';
        missionDiv.dataset.missionId = mission.id;
        
        // Truncate long descriptions
        const shortStory = mission.story 
            ? (mission.story.length > 80 ? mission.story.substring(0, 77) + '...' : mission.story)
            : "No description";
        
        missionDiv.innerHTML = `
            <div class="mission-title">${mission.name}</div>
            <div class="mission-description">${shortStory}</div>
            <div class="mission-goal">${mission.goal.toUpperCase().replace('_', ' ')} • ${mission.width}x${mission.height}</div>
            <div style="display: flex; gap: 5px; margin-top: 8px;">
                <button class="small-btn" onclick="playMission('${mission.id}')">▶️ Play</button>
                <button class="small-btn" onclick="editMission('${mission.id}')">✏️ Edit</button>
                <button class="small-btn" onclick="deleteMissionUI('${mission.id}')">🗑️ Delete</button>
                <button class="small-btn" onclick="exportMission('${mission.id}')">📤 Export</button>
            </div>
        `;
        
        missionList.appendChild(missionDiv);
    });
    
    // Add file import button
    const importDiv = document.createElement('div');
    importDiv.className = 'mission-item';
    importDiv.style.textAlign = 'center';
    importDiv.style.padding = '20px';
    
    importDiv.innerHTML = `
        <div style="font-size: 24px; margin-bottom: 10px;">📁</div>
        <div class="mission-title">IMPORT MISSION FILE</div>
        <div class="mission-description">Upload a .json mission file</div>
        <input type="file" id="missionFileInput" accept=".json" style="display: none;">
        <button class="small-btn" onclick="document.getElementById('missionFileInput').click()" style="margin-top: 10px;">
            📥 Choose File
        </button>
    `;
    
    missionList.appendChild(importDiv);
    
    // Set up file input handler
    document.getElementById('missionFileInput')?.addEventListener('change', handleMissionFileUpload);
}

// Handle mission file upload
function handleMissionFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    importMissionFromFile(file)
        .then(result => {
            alert(`Mission "${result.name}" imported successfully!`);
            loadMissionListUI();
            event.target.value = ''; // Reset file input
        })
        .catch(error => {
            alert("Error importing mission: " + error.message);
            event.target.value = ''; // Reset file input
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
    const originalLoadMissionList = window.loadMissionList;
    window.loadMissionList = function() {
        loadMissionListUI();
    };
    
    // Add CSS for small buttons
    if (!document.querySelector('style#mission-manager-styles')) {
        const style = document.createElement('style');
        style.id = 'mission-manager-styles';
        style.textContent = `
            .small-btn {
                background: #333;
                border: 1px solid #444;
                color: #aaa;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 10px;
                cursor: pointer;
                transition: all 0.2s;
            }
            .small-btn:hover {
                background: #3a3a3a;
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
        `;
        document.head.appendChild(style);
    }
    
    console.log("Mission Manager loaded");
});