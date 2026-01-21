// campaign.js - Map Selection System
// Load this script AFTER core_main.js

// Global variable to store available maps
window.campaignMaps = [];

// 1. Create a new menu screen in the HTML (dynamically or add it to index.html)
function createCampaignMenu() {
    // This would create/insert a new div with id="campaignMenu"
    // It would list the maps from window.campaignMaps
    console.log("Campaign menu would be built here.");
}

// 2. Function to load the map manifest
function loadCampaignManifest() {
    return fetch('campaign_maps.json')
        .then(response => response.json())
        .then(maps => {
            window.campaignMaps = maps;
            console.log("Loaded maps:", maps);
        })
        .catch(error => {
            console.error("Failed to load campaign manifest:", error);
            // Fallback to a default map list if needed
            window.campaignMaps = [{
                id: 'default',
                name: 'Random Map',
                file: null,
                description: 'The original random generator'
            }];
        });
}

// 3. The KEY FUNCTION: Override the game start to use a specific map
function startCampaignMap(mapData) {
    console.log("Starting map:", mapData.name);

    if (!mapData.file) {
        // If no file, fall back to original random generator
        console.log("Using original random generator.");
        // Call the existing startGame function from core_main.js
        if (typeof window.startGame === 'function') {
            window.startGame();
        }
        return;
    }

    // Fetch the specific map JSON
    fetch(mapData.file)
        .then(response => response.json())
        .then(mapConfig => {
            // Set global variables that core_main.js's initGame() will use
            // You need to know what variables initGame() reads.
            // Let's assume it reads: window.mapDim, window.guardCount, window.selectedItemsForGame
            // We can pass custom data in a new variable.
            window.campaignMapData = mapConfig;

            // Now hide menus and call initGame
            document.getElementById('mainMenu').classList.add('hidden');
            document.getElementById('itemSelection').classList.add('hidden');

            // **This is the critical hook**.
            // You need to override the initGame behavior to use your map data.
            // We'll do this by temporarily replacing the initGame function.
            const originalInitGame = window.initGame;
            window.initGame = function() {
                // Call the ORIGINAL function but with your map data
                console.log("Loading custom map:", mapConfig);

                // You would need to adapt mapConfig to your game's generator.
                // For example, if mapConfig has a 'grid' array, use it.
                if (mapConfig.grid && typeof generateLevel === 'function') {
                    // You might need to modify generateLevel or replace it
                    console.log("Custom grid detected. Need to integrate it.");
                }
                // Call the original to set up the rest
                originalInitGame.call(this);
                // Restore the original function for next time
                window.initGame = originalInitGame;
            };

            // Trigger the game start. This will call our overridden initGame.
            window.initGame();
        })
        .catch(error => {
            console.error("Failed to load map file:", error);
            alert("Could not load the map: " + mapData.name);
        });
}

// 4. Initialize the system when the page loads
window.addEventListener('load', function() {
    // Wait a bit for core_main.js to set up
    setTimeout(() => {
        loadCampaignManifest().then(() => {
            createCampaignMenu();
            console.log("Campaign system ready. Maps available:", window.campaignMaps.length);
        });
    }, 500);
});