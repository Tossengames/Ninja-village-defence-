// ============================================
// SIMPLE MISSION LOADER - FOR ROOT FOLDER
// ============================================

const MAPS_FOLDER = 'maps/';  // Same folder as your maps
let gameMissions = [];

// Initialize
async function initMissionLoader() {
    console.log("Initializing Mission Loader...");
    console.log("Current location:", window.location.href);
    await loadAllMissions();
    console.log("Mission Loader ready");
}

// Load all missions from maps folder
async function loadAllMissions() {
    console.log("Loading missions from:", MAPS_FOLDER);
    
    gameMissions = [];
    
    try {
        // Try different ways to access the folder
        const folderUrls = [
            MAPS_FOLDER,
            './' + MAPS_FOLDER,
            window.location.pathname.split('/').slice(0, -1).join('/') + '/' + MAPS_FOLDER
        ];
        
        let jsonFiles = [];
        
        for (const url of folderUrls) {
            try {
                console.log("Trying to access:", url);
                const response = await fetch(url);
                if (response.ok) {
                    const html = await response.text();
                    console.log("Got folder HTML, length:", html.length);
                    jsonFiles = extractJsonFiles(html);
                    console.log("Found JSON files:", jsonFiles);
                    break;
                }
            } catch (e) {
                console.log("Failed to access", url, ":", e.message);
            }
        }
        
        // Load each file
        for (const fileName of jsonFiles) {
            await loadMissionFile(fileName);
        }
        
    } catch (error) {
        console.error("Error loading missions:", error);
        // Try fallback method
        await tryCommonMissionFiles();
    }
    
    console.log("Total missions loaded:", gameMissions.length);
}

// Extract .json files from HTML
function extractJsonFiles(html) {
    const files = [];
    
    // Try multiple patterns
    const patterns = [
        /href="([^"]+\.json)"/gi,
        /href='([^']+\.json)'/gi,
        /href="([^"]+)"/gi  // Catch all links and filter later
    ];
    
    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(html)) !== null) {
            const fileName = match[1];
            if (fileName && fileName.endsWith('.json')) {
                // Clean up the filename
                const cleanName = fileName.split('?')[0].split('#')[0];
                if (!files.includes(cleanName)) {
                    files.push(cleanName);
                }
            }
        }
    }
    
    return files;
}

// Load a single mission file
async function loadMissionFile(fileName) {
    try {
        const urls = [
            MAPS_FOLDER + fileName,
            './' + MAPS_FOLDER + fileName,
            fileName  // Try direct if it's in root
        ];
        
        let missionData = null;
        
        for (const url of urls) {
            try {
                console.log("Trying URL:", url);
                const response = await fetch(url);
                if (response.ok) {
                    missionData = await response.json();
                    console.log("✓ Successfully loaded from:", url);
                    break;
                }
            } catch (e) {
                // Try next URL
            }
        }
        
        if (!missionData) {
            console.log("File not found in any location:", fileName);
            return;
        }
        
        // Basic validation
        if (!missionData || !missionData.name || !missionData.width || !missionData.height) {
            console.log("Invalid mission format:", fileName);
            return;
        }
        
        // Add to list
        missionData.id = 'mission_' + fileName.replace('.json', '').replace(/[^a-z0-9]/gi, '_');
        missionData.fileName = fileName;
        gameMissions.push(missionData);
        
        console.log("✓ Loaded mission:", missionData.name);
        
    } catch (error) {
        console.log("Failed to load", fileName, ":", error.message);
    }
}

// Fallback: Try common mission file names
async function tryCommonMissionFiles() {
    console.log("Trying common mission files...");
    
    const commonFiles = [
        'mission1.json',
        'mission2.json',
        'mission3.json',
        'tutorial.json',
        'castle.json',
        'forest.json',
        'escape.json'
    ];
    
    for (const fileName of commonFiles) {
        await loadMissionFile(fileName);
    }
}

// Display missions in UI
function displayMissions() {
    const missionList = document.getElementById('missionList');
    if (!missionList) {
        console.error("❌ missionList element not found!");
        console.error("Make sure you have: <div id='missionList'></div> in your HTML");
        return;
    }
    
    missionList.innerHTML = '';
    
    if (gameMissions.length === 0) {
        missionList.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #888;">
                <div>📁 No missions found!</div>
                <div style="font-size: 12px; margin-top: 10px; background: #222; padding: 10px; border-radius: 5px; text-align: left;">
                    <strong>To add missions:</strong>
                    <ol style="margin: 5px 0 0 15px;">
                        <li>Create a folder called "maps" in your repo</li>
                        <li>Add .json mission files to the maps folder</li>
                        <li>Click Refresh button below</li>
                    </ol>
                    <div style="margin-top: 10px; font-size: 11px; color: #aaa;">
                        Current path: ${MAPS_FOLDER}
                    </div>
                </div>
                <button onclick="refreshMissions()" style="margin-top: 15px; padding: 8px 16px; background: #333; color: #aaa; border: 1px solid #444; border-radius: 5px; cursor: pointer;">
                    🔄 Refresh Mission List
                </button>
            </div>
        `;
        return;
    }
    
    gameMissions.forEach(mission => {
        const div = document.createElement('div');
        div.className = 'mission-item';
        div.style.cssText = `
            background: rgba(0,0,0,0.3);
            border: 1px solid #444;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 10px;
            cursor: pointer;
            transition: all 0.2s;
        `;
        div.onmouseover = () => div.style.background = 'rgba(0,0,0,0.5)';
        div.onmouseout = () => div.style.background = 'rgba(0,0,0,0.3)';
        
        div.innerHTML = `
            <div style="font-weight: bold; color: var(--accent, #00d2ff); margin-bottom: 5px;">${mission.name}</div>
            <div style="font-size: 12px; color: #aaa; margin-bottom: 5px;">${mission.story || 'No description'}</div>
            <div style="font-size: 11px; color: #888; display: flex; justify-content: space-between;">
                <span>${mission.width}x${mission.height}</span>
                <span>${(mission.goal || 'escape').toUpperCase()}</span>
                <span>${mission.fileName}</span>
            </div>
        `;
        
        div.onclick = () => {
            console.log("Play mission:", mission.name);
            console.log("Mission data:", mission);
            // Connect this to your game later
            if (typeof showMissionBriefing === 'function') {
                showMissionBriefing(mission);
            } else {
                alert(`Would play: ${mission.name}\n\nAdd the game connection later.`);
            }
        };
        
        missionList.appendChild(div);
    });
    
    // Add refresh button at bottom
    const refreshDiv = document.createElement('div');
    refreshDiv.style.cssText = 'text-align: center; margin-top: 20px;';
    refreshDiv.innerHTML = `
        <button onclick="refreshMissions()" style="padding: 8px 16px; background: #333; color: #aaa; border: 1px solid #444; border-radius: 5px; cursor: pointer;">
            🔄 Refresh List (${gameMissions.length} missions)
        </button>
    `;
    missionList.appendChild(refreshDiv);
}

// Refresh missions
async function refreshMissions() {
    console.log("Refreshing missions...");
    const missionList = document.getElementById('missionList');
    if (missionList) {
        missionList.innerHTML = '<div style="padding: 20px; text-align: center; color: #888;">🔄 Loading missions...</div>';
    }
    
    await loadAllMissions();
    displayMissions();
}

// Initialize when page loads
window.addEventListener('load', async function() {
    console.log("Page loaded, initializing Mission Loader...");
    console.log("GitHub Pages URL:", window.location.href);
    
    // Add a simple test button to main menu if it exists
    const mainMenu = document.getElementById('mainMenu');
    if (mainMenu && !document.getElementById('testMissionsBtn')) {
        const testBtn = document.createElement('button');
        testBtn.id = 'testMissionsBtn';
        testBtn.textContent = 'TEST MISSIONS';
        testBtn.style.cssText = `
            background: #333;
            color: #aaa;
            border: 1px solid #444;
            padding: 10px;
            margin: 5px;
            border-radius: 5px;
            cursor: pointer;
        `;
        testBtn.onclick = function() {
            console.log("Game missions:", gameMissions);
            alert(`Found ${gameMissions.length} missions. Check console for details.`);
        };
        mainMenu.appendChild(testBtn);
    }
    
    await initMissionLoader();
    
    // Override the existing loadMissionList if it exists
    if (typeof window.loadMissionList === 'function') {
        window.loadMissionList = function() {
            displayMissions();
        };
    } else {
        window.loadMissionList = displayMissions;
    }
    
    // Make functions available globally
    window.refreshMissions = refreshMissions;
    window.gameMissions = gameMissions; // For debugging
    
    console.log("✅ Simple Mission Loader ready!");
    console.log("Game missions available:", gameMissions.length);
    
    // Auto-display if we're on the missions page
    if (document.getElementById('missionList') && 
        !document.getElementById('missionList').classList.contains('hidden')) {
        displayMissions();
    }
});

// Quick test function you can run in console
window.testMissionLoader = async function() {
    console.log("=== Testing Mission Loader ===");
    console.log("1. Current MAPS_FOLDER:", MAPS_FOLDER);
    console.log("2. Current gameMissions:", gameMissions);
    console.log("3. Trying to refresh...");
    await refreshMissions();
    console.log("4. Final gameMissions:", gameMissions);
    console.log("=== Test Complete ===");
};