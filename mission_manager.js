// ============================================
// MISSION MANAGER - LOAD ALL JSON FROM MAPS FOLDER
// ============================================

const MISSION_STORAGE_KEY = 'stealthGame_customMissions';
const MAPS_FOLDER = './maps/'; // Maps folder in root directory
let customMissions = [];
let localMissions = [];

// Initialize mission manager
async function initMissionManager() {
    console.log("Initializing Mission Manager...");
    
    // Load user-created missions from localStorage
    loadCustomMissions();
    
    // Load missions from local maps folder
    await loadAllJsonFilesFromMapsFolder();
    
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

// Load ALL .json files from maps folder
async function loadAllJsonFilesFromMapsFolder() {
    try {
        console.log("Loading all JSON files from maps folder...");
        
        localMissions = [];
        let loadedCount = 0;
        
        // Method 1: Try to get directory listing
        console.log("Attempting directory listing...");
        try {
            const response = await fetch(MAPS_FOLDER);
            if (response.ok) {
                const html = await response.text();
                const jsonFiles = extractJsonFilesFromHtml(html);
                
                if (jsonFiles.length > 0) {
                    console.log(`Found ${jsonFiles.length} .json files via directory listing`);
                    for (const fileName of jsonFiles) {
                        const loaded = await loadMissionFile(fileName);
                        if (loaded) loadedCount++;
                    }
                    
                    if (loadedCount > 0) {
                        console.log(`Successfully loaded ${loadedCount} missions`);
                        return;
                    }
                }
            }
        } catch (error) {
            console.log("Directory listing not available:", error.message);
        }
        
        // Method 2: Probe for files
        console.log("Probing for mission files...");
        
        // Try mission1.json through mission100.json
        for (let i = 1; i <= 100; i++) {
            const loaded = await loadMissionFile(`mission${i}.json`);
            if (loaded) loadedCount++;
            
            // Stop if we haven't found any in the last 10 tries
            if (i > 10 && loadedCount === 0) break;
        }
        
        // Try other naming patterns
        const patterns = [
            'level', 'map', 'campaign', 'stage', 'mission_',
            'tutorial', 'castle', 'forest', 'dungeon', 'escape'
        ];
        
        for (const pattern of patterns) {
            for (let i = 1; i <= 10; i++) {
                const loaded = await loadMissionFile(`${pattern}${i}.json`);
                if (loaded) loadedCount++;
                
                const loaded2 = await loadMissionFile(`${pattern}_${i}.json`);
                if (loaded2) loadedCount++;
            }
        }
        
        console.log(`Total loaded: ${loadedCount} missions`);
        
    } catch (error) {
        console.error("Error loading missions from folder:", error);
        localMissions = [];
    }
}

// Load a single mission file
async function loadMissionFile(fileName) {
    try {
        const missionUrl = MAPS_FOLDER + fileName;
        const missionResponse = await fetch(missionUrl);
        
        if (missionResponse.ok) {
            const missionData = await missionResponse.json();
            
            // Validate it's a mission file
            if (isValidMission(missionData)) {
                // Generate ID from filename
                const missionId = 'file_' + fileName.replace('.json', '').toLowerCase().replace(/[^a-z0-9]/g, '_');
                
                // Add metadata
                missionData.id = missionId;
                missionData.source = 'game';
                missionData.fileName = fileName;
                missionData.filePath = missionUrl;
                missionData.loadedAt = new Date().toISOString();
                
                // If mission doesn't have a name, use filename
                if (!missionData.name || missionData.name.trim() === '') {
                    missionData.name = formatFileName(fileName);
                }
                
                localMissions.push(missionData);
                console.log(`✓ Loaded: ${missionData.name}`);
                return true;
            } else {
                console.log(`✗ Invalid mission format: ${fileName}`);
            }
        }
        return false;
    } catch (error) {
        return false;
    }
}

// Extract .json files from HTML directory listing
function extractJsonFilesFromHtml(html) {
    const jsonFiles = [];
    
    // Try different patterns for directory listings
    const patterns = [
        /href="([^"]+\.json)"/gi,
        /href='([^']+\.json)'/gi,
        /<a[^>]*href="([^"]+\.json)"[^>]*>/gi,
        /<a[^>]*href='([^']+\.json)'[^>]*>/gi,
        /"([^"]+\.json)"/g,
        /'([^']+\.json)'/g
    ];
    
    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(html)) !== null) {
            const fileName = match[1];
            if (fileName && 
                !fileName.startsWith('http') && 
                !fileName.startsWith('/') && 
                !fileName.includes('?')) {
                jsonFiles.push(fileName);
            }
        }
    }
    
    // Remove duplicates and sort
    return [...new Set(jsonFiles)].sort();
}

// Format filename to nice display name
function formatFileName(fileName) {
    // Remove .json extension
    let name = fileName.replace('.json', '');
    
    // Convert camelCase to spaces
    name = name.replace(/([A-Z])/g, ' $1');
    
    // Convert underscores, hyphens, and dots to spaces
    name = name.replace(/[._-]/g, ' ');
    
    // Capitalize first letter of each word
    name = name.toLowerCase()
               .split(' ')
               .map(word => word.charAt(0).toUpperCase() + word.slice(1))
               .join(' ');
    
    // Remove extra spaces
    name = name.replace(/\s+/g, ' ').trim();
    
    // If it's missionX format, make it "Mission X"
    const missionMatch = name.match(/^Mission\s*(\d+)$/i);
    if (missionMatch) {
        return `Mission ${missionMatch[1]}`;
    }
    
    const levelMatch = name.match(/^Level\s*(\d+)$/i);
    if (levelMatch) {
        return `Level ${levelMatch[1]}`;
    }
    
    return name || 'Unnamed Mission';
}

// Validate mission data structure
function isValidMission(missionData) {
    if (!missionData || typeof missionData !== 'object') {
        return false;
    }
    
    // Check for required properties
    const requiredProps = ['width', 'height', 'tiles', 'playerStart'];
    for (const prop of requiredProps) {
        if (!(prop in missionData)) {
            console.log(`Missing property: ${prop}`);
            return false;
        }
    }
    
    // Check types
    if (typeof missionData.width !== 'number' || 
        typeof missionData.height !== 'number' ||
        missionData.width <= 0 || 
        missionData.height <= 0) {
        console.log('Invalid width/height');
        return false;
    }
    
    if (!Array.isArray(missionData.tiles)) {
        console.log('Tiles is not an array');
        return false;
    }
    
    if (missionData.tiles.length !== missionData.height) {
        console.log(`Tiles height mismatch: ${missionData.tiles.length} != ${missionData.height}`);
        return false;
    }
    
    // Check each row
    for (let y = 0; y < missionData.tiles.length; y++) {
        const row = missionData.tiles[y];
        if (!Array.isArray(row) || row.length !== missionData.width) {
            console.log(`Row ${y} invalid: ${row ? row.length : 'null'} != ${missionData.width}`);
            return false;
        }
    }
    
    // Check player start
    if (!missionData.playerStart || 
        typeof missionData.playerStart.x !== 'number' || 
        typeof missionData.playerStart.y !== 'number') {
        console.log('Invalid player start');
        return false;
    }
    
    // Mission is valid
    return true;
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

// Get all missions (both from folder and custom)
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
                <div style="margin-bottom: 10px;">📁 No missions found!</div>
                <div style="font-size: 12px; color: #888; text-align: left; padding: 10px;">
                    <p>To add missions:</p>
                    <p>1. Place .json mission files in the <strong>maps/</strong> folder</p>
                    <p>2. Use the Map Editor to create and export missions</p>
                    <p>3. Import mission files below</p>
                    <p style="margin-top: 10px; font-size: 11px;">
                        Refresh after adding files to the maps folder.
                    </p>
                </div>
                <div style="margin-top: 20px;">
                    <button class="editor-action-btn" onclick="refreshMissionsFromFolder()" style="width: 100%;">
                        🔄 Refresh Mission List
                    </button>
                </div>
            </div>
        `;
        return;
    }
    
    // Group missions by source
    const gameMissions = allMissions.filter(m => m.source === 'game');
    const customMissionsList = allMissions.filter(m => m.isCustom);
    
    // Game missions section
    if (gameMissions.length > 0) {
        const gameSection = document.createElement('div');
        gameSection.className = 'mission-section';
        gameSection.innerHTML = '<div class="section-title">🗺️ GAME MISSIONS</div>';
        
        gameMissions.forEach(mission => {
            gameSection.appendChild(createMissionItem(mission));
        });
        
        missionList.appendChild(gameSection);
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
        ? (mission.story.length > 80 ? mission.story.substring(0, 77) + '...' : mission.story)
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
    if (mission.source === 'game') {
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
            ${mission.source === 'game' && mission.fileName ? `
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
Source: ${mission.source === 'game' ? 'Game Folder' : 'Custom'}
File: ${mission.fileName || 'Not saved as file'}
Size: ${mission.width}x${mission.height}
Goal: ${mission.goal || 'escape'}
Difficulty: ${mission.difficulty || 'medium'}
${mission.timeLimit ? `Time Limit: ${mission.timeLimit} seconds` : ''}
Enemies: ${mission.enemies ? mission.enemies.length : 0}
Items: ${mission.items ? mission.items.length : 0}
    `.trim();
    
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
        
        await loadAllJsonFilesFromMapsFolder();
        loadMissionListUI();
        
        const allMissions = getAllMissions();
        alert(`Loaded ${allMissions.length} missions total`);
        
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

// Make functions globally available
window.refreshMissionsFromFolder = refreshMissionsFromFolder;
window.showMissionInfo = showMissionInfo;