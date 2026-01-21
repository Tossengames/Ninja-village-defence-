// ============================================
// MISSION MANAGER - AUTO DISCOVER MISSIONS
// ============================================

const MISSION_STORAGE_KEY = 'stealthGame_customMissions';
const MAPS_FOLDER = 'maps/';
let customMissions = [];
let localMissions = [];

// Initialize mission manager
async function initMissionManager() {
    console.log("Initializing Mission Manager...");
    
    // Load user-created missions from localStorage
    loadCustomMissions();
    
    // Discover and load all JSON files from maps folder
    await discoverAndLoadMissions();
    
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

// Discover and load ALL .json files from maps folder
async function discoverAndLoadMissions() {
    console.log("Discovering mission files in", MAPS_FOLDER, "...");
    
    localMissions = [];
    let loadedCount = 0;
    
    try {
        // Try to fetch the folder listing (works on some servers)
        const folderResponse = await fetch(MAPS_FOLDER);
        
        if (folderResponse.ok) {
            const html = await folderResponse.text();
            const jsonFiles = await findJsonFilesInHTML(html);
            
            console.log("Found", jsonFiles.length, "JSON files via folder listing");
            
            for (const fileName of jsonFiles) {
                try {
                    const missionData = await loadMissionFile(fileName);
                    if (missionData) {
                        localMissions.push(missionData);
                        loadedCount++;
                        console.log(`✓ Loaded: ${missionData.name} (${fileName})`);
                    }
                } catch (error) {
                    console.log(`✗ Failed to load ${fileName}:`, error.message);
                }
            }
        } else {
            console.log("Could not access folder directly, trying auto-discovery...");
            loadedCount = await autoDiscoverMissions();
        }
        
    } catch (error) {
        console.log("Folder access failed, trying auto-discovery:", error.message);
        loadedCount = await autoDiscoverMissions();
    }
    
    console.log("Total missions loaded:", loadedCount);
}

// Find .json files in HTML directory listing
async function findJsonFilesInHTML(html) {
    const jsonFiles = [];
    
    // Try DOM parsing first
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const links = doc.querySelectorAll('a[href$=".json"], a[href*=".json?"]');
        
        links.forEach(link => {
            let href = link.getAttribute('href');
            if (href) {
                // Clean up the URL
                href = href.split('?')[0].split('#')[0];
                if (href.endsWith('.json')) {
                    jsonFiles.push(href);
                }
            }
        });
    } catch (error) {
        console.log("DOM parsing failed, using regex");
    }
    
    // If DOM parsing didn't work, use regex
    if (jsonFiles.length === 0) {
        const regex = /href\s*=\s*["']([^"']+\.json(?:\?[^"']*)?)["']/gi;
        let match;
        while ((match = regex.exec(html)) !== null) {
            let fileName = match[1];
            fileName = fileName.split('?')[0].split('#')[0];
            if (fileName.endsWith('.json')) {
                jsonFiles.push(fileName);
            }
        }
    }
    
    // Remove duplicates and return
    return [...new Set(jsonFiles)];
}

// Auto-discover missions by trying common patterns
async function autoDiscoverMissions() {
    console.log("Auto-discovering mission files...");
    
    let loadedCount = 0;
    const discoveredFiles = [];
    
    // First, try mission1.json through mission100.json
    for (let i = 1; i <= 100; i++) {
        const fileName = `mission${i}.json`;
        if (!discoveredFiles.includes(fileName)) {
            const mission = await tryLoadFile(fileName);
            if (mission) {
                localMissions.push(mission);
                loadedCount++;
                discoveredFiles.push(fileName);
            }
        }
    }
    
    // Try other common patterns
    const patterns = [
        'level', 'map', 'campaign', 'stage', 
        'tutorial', 'castle', 'forest', 'dungeon',
        'escape', 'heist', 'infiltration', 'assassination'
    ];
    
    for (const pattern of patterns) {
        for (let i = 1; i <= 20; i++) {
            // Try pattern1.json, pattern_1.json, pattern-1.json
            const variations = [
                `${pattern}${i}.json`,
                `${pattern}_${i}.json`,
                `${pattern}-${i}.json`,
                `${pattern}${String(i).padStart(2, '0')}.json`
            ];
            
            for (const fileName of variations) {
                if (!discoveredFiles.includes(fileName)) {
                    const mission = await tryLoadFile(fileName);
                    if (mission) {
                        localMissions.push(mission);
                        loadedCount++;
                        discoveredFiles.push(fileName);
                    }
                }
            }
        }
    }
    
    // Sort missions by name for better display
    localMissions.sort((a, b) => a.name.localeCompare(b.name));
    
    return loadedCount;
}

// Try to load a single file
async function tryLoadFile(fileName) {
    try {
        return await loadMissionFile(fileName);
    } catch (error) {
        return null;
    }
}

// Load a single mission file
async function loadMissionFile(fileName) {
    const url = `${MAPS_FOLDER}${fileName}`;
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`Failed to fetch ${fileName}: ${response.status}`);
    }
    
    const missionData = await response.json();
    
    // Validate mission data
    if (!isValidMission(missionData)) {
        throw new Error(`Invalid mission format in ${fileName}`);
    }
    
    // Add metadata
    missionData.id = `mission_${fileName.replace('.json', '').toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    missionData.source = 'maps';
    missionData.fileName = fileName;
    missionData.fileUrl = url;
    missionData.isCustom = false;
    
    // Ensure mission has a name
    if (!missionData.name || missionData.name.trim() === '') {
        missionData.name = formatFileName(fileName);
    }
    
    return missionData;
}

// Validate mission structure
function isValidMission(data) {
    if (!data || typeof data !== 'object') return false;
    
    // Check required properties
    if (!data.width || typeof data.width !== 'number' || data.width <= 0) return false;
    if (!data.height || typeof data.height !== 'number' || data.height <= 0) return false;
    if (!Array.isArray(data.tiles)) return false;
    if (data.tiles.length !== data.height) return false;
    
    // Check tiles array
    for (let row of data.tiles) {
        if (!Array.isArray(row) || row.length !== data.width) return false;
    }
    
    // Check player start
    if (!data.playerStart || 
        typeof data.playerStart.x !== 'number' || 
        typeof data.playerStart.y !== 'number') {
        return false;
    }
    
    return true;
}

// Format filename to display name
function formatFileName(fileName) {
    let name = fileName.replace('.json', '');
    
    // Convert various separators to spaces
    name = name.replace(/[_-]/g, ' ');
    
    // Convert camelCase to spaces
    name = name.replace(/([A-Z])/g, ' $1');
    
    // Capitalize each word
    name = name.toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    
    // Remove extra spaces
    name = name.replace(/\s+/g, ' ').trim();
    
    return name || 'Unnamed Mission';
}

// Get all missions
function getAllMissions() {
    return [...localMissions, ...customMissions];
}

// Get mission by ID
function getMissionById(missionId) {
    return getAllMissions().find(m => m.id === missionId);
}

// Add custom mission
function addCustomMission(missionData) {
    missionData.id = 'custom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    missionData.createdAt = new Date().toISOString();
    missionData.isCustom = true;
    
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
                resolve({ 
                    success: true, 
                    id: missionId, 
                    name: missionData.name 
                });
                
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
                <div style="font-size: 12px; color: #888; text-align: left; padding: 10px;">
                    <p>To add missions:</p>
                    <ol style="text-align: left; padding-left: 20px;">
                        <li>Place .json files in the <strong>maps/</strong> folder</li>
                        <li>Files should have .json extension</li>
                        <li>Or import missions below</li>
                    </ol>
                </div>
                <button class="editor-action-btn" onclick="refreshMissions()" style="margin-top: 20px; width: 100%;">
                    🔄 Refresh Mission List
                </button>
            </div>
        `;
        return;
    }
    
    // Display all missions
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

// Create mission item for display
function createMissionItem(mission) {
    const div = document.createElement('div');
    div.className = 'mission-item';
    div.dataset.missionId = mission.id;
    
    // Truncate description
    const shortStory = mission.story 
        ? (mission.story.length > 80 ? mission.story.substring(0, 77) + '...' : mission.story)
        : "No description";
    
    // Source badge
    const badge = mission.isCustom 
        ? '<span style="background: #ff9900; color: #000; padding: 2px 6px; border-radius: 10px; font-size: 9px; font-weight: bold; margin-left: 5px;">Custom</span>'
        : '<span style="background: #3366cc; color: #fff; padding: 2px 6px; border-radius: 10px; font-size: 9px; font-weight: bold; margin-left: 5px;">Game</span>';
    
    // Difficulty color
    const difficultyColors = {
        easy: '#33cc33',
        medium: '#ff9900',
        hard: '#ff3333'
    };
    const difficultyColor = difficultyColors[mission.difficulty] || '#888';
    
    div.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start;">
            <div>
                <div class="mission-title">${mission.name} ${badge}</div>
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
            ${!mission.isCustom ? `
                <button class="small-btn info-btn" onclick="showMissionInfo('${mission.id}')">ℹ️ Info</button>
            ` : ''}
        </div>
    `;
    
    // Add event listeners
    div.querySelector('.play-btn').onclick = (e) => {
        e.stopPropagation();
        playMission(mission.id);
    };
    
    if (mission.isCustom) {
        div.querySelector('.edit-btn').onclick = (e) => {
            e.stopPropagation();
            editMission(mission.id);
        };
        div.querySelector('.delete-btn').onclick = (e) => {
            e.stopPropagation();
            deleteMissionUI(mission.id);
        };
        div.querySelector('.export-btn').onclick = (e) => {
            e.stopPropagation();
            exportMission(mission.id);
        };
    }
    
    // Make entire item clickable for play
    div.onclick = (e) => {
        if (!e.target.closest('button')) {
            playMission(mission.id);
        }
    };
    
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
    try {
        localMissions = [];
        await discoverAndLoadMissions();
        loadMissionListUI();
        alert(`Refreshed! Found ${localMissions.length} game missions and ${customMissions.length} custom missions.`);
    } catch (error) {
        alert("Error refreshing missions: " + error.message);
    }
}

// Show mission info
function showMissionInfo(missionId) {
    const mission = getMissionById(missionId);
    if (!mission) return;
    
    const info = `
Mission: ${mission.name}
Source: ${mission.isCustom ? 'Custom' : 'Game Folder'}
File: ${mission.fileName || 'Not saved'}
Size: ${mission.width}x${mission.height}
Goal: ${mission.goal || 'escape'}
Difficulty: ${mission.difficulty || 'medium'}
${mission.timeLimit ? `Time Limit: ${mission.timeLimit} turns` : ''}
    `.trim();
    
    alert(info);
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
            
            .info-btn {
                background: #3366cc !important;
                color: white !important;
                border-color: #4488ee !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Make functions global
    window.refreshMissions = refreshMissions;
    window.showMissionInfo = showMissionInfo;
    window.playMission = playMission;
    window.editMission = editMission;
    window.deleteMissionUI = deleteMissionUI;
    window.exportMission = exportMissionToFile;
    
    console.log("Mission Manager ready");
});