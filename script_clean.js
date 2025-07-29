const ROWS = 20;
const COLS = 31;  // Increased from 27 to 31
const EMPTY_CELL = [0, 0, 0, 0, 0, 0];
const keyMap = {
    'f': 0, 'd': 1, 's': 2, 'j': 3, 'k': 4, 'l': 5,
    'g': 'space', 'h': 'space',
    'a': 'linespace', ';': 'backspace',
    'arrowup': 'up', 'arrowdown': 'down', 'arrowleft': 'left', 'arrowright': 'right'
};
const dotKeys = new Set(['f', 'd', 's', 'j', 'k', 'l']);
const spaceKeys = new Set(['g', 'h']);
const movementKeys = new Set(['arrowup', 'arrowdown', 'arrowleft', 'arrowright']);

let grid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => [...EMPTY_CELL]));
let cursor = { row: 0, col: 0 };
let activeKeys = new Set();
let clusterKeys = new Set(); // Track all keys that were part of current cluster
let isEraseMode = false;
let isFullscreen = false;
let isDragging = false;
let isMouseDown = false;
let movementInterval = null;
let sliderTimeout = null;
let activeTouches = new Set();
let bellWarningSpaces = 7;  // Default to 7 spaces before end of line
let previousBellWarningPosition = -1;
let isBellEnabled = true;
let isKeySoundEnabled = true;

const brailleGrid = document.getElementById('braille-grid');
const cursorPosition = document.getElementById('cursor-position');
const slider = document.getElementById('slider');
const cellCount = document.getElementById('cell-count');
const bellWarningSelect = document.getElementById('bell-warning');
const toggleBell = document.getElementById('toggle-bell');
const toggleKeySound = document.getElementById('toggle-key-sound');
const dingSound = new Audio('ding.wav');
const keySound = new Audio('key.wav');
const volumeControl = document.getElementById('volume-control');

// Set initial volume to a much lower value (5% of max volume)
dingSound.volume = 0.05;
keySound.volume = 0.05;

// Update the initial value of the volume control slider
volumeControl.value = 5;

function updateVolume() {
    const volume = volumeControl.value / 100;
    dingSound.volume = volume;
    keySound.volume = volume;
}

volumeControl.addEventListener('input', updateVolume);

// Call this function once to set initial volume
updateVolume();

// Add this to prevent potential audio issues
function playSoundSafely(audioElement) {
    // Clone and play to allow overlapping sounds
    const soundClone = audioElement.cloneNode();
    soundClone.volume = audioElement.volume;
    soundClone.play().catch(err => console.log("Audio play prevented:", err));
}

// Button elements
const linespaceBtn = document.getElementById('linespace-btn');
const dot3Btn = document.getElementById('dot3-btn');
const dot2Btn = document.getElementById('dot2-btn');
const dot1Btn = document.getElementById('dot1-btn');
const spaceBtn = document.getElementById('space-btn');
const dot4Btn = document.getElementById('dot4-btn');
const dot5Btn = document.getElementById('dot5-btn');
const dot6Btn = document.getElementById('dot6-btn');
const backspaceBtn = document.getElementById('backspace-btn');
const allClearBtn = document.getElementById('all-clear-btn');
const eraseModeBtn = document.getElementById('erase-mode-btn');
const fullscreenBtn = document.getElementById('fullscreen-btn');

const buttonKeyMap = {
    'f': dot1Btn,
    'd': dot2Btn,
    's': dot3Btn,
    'j': dot4Btn,
    'k': dot5Btn,
    'l': dot6Btn,
    'g': spaceBtn,
    'h': spaceBtn,
    'a': linespaceBtn,
    ';': backspaceBtn
};

const keyButtonMap = {
    'dot1-btn': 'f',
    'dot2-btn': 'd',
    'dot3-btn': 's',
    'dot4-btn': 'j',
    'dot5-btn': 'k',
    'dot6-btn': 'l',
    'space-btn': 'g',
    'linespace-btn': 'a',
    'backspace-btn': ';'
};

function updateGrid(newCell, row, col) {
    grid[row][col] = newCell;
    renderBrailleGrid();
}

function updateCellCount() {
    cellCount.textContent = `Cell: ${cursor.col + 1} / 31`;
}

function checkBellWarning() {
    // Standardize the warning position calculation
    const warningPosition = COLS - bellWarningSpaces - 1;
    
    if (isBellEnabled && cursor.col === warningPosition && previousBellWarningPosition !== cursor.col) {
        playSoundSafely(dingSound);
        previousBellWarningPosition = cursor.col;
    }
    
    // Reset previous warning position when moving away from warning position
    if (cursor.col !== warningPosition) {
        previousBellWarningPosition = -1;
    }
}

function moveCursor(rowDelta, colDelta, rotate = false) {
    cursor.row = Math.max(0, Math.min(ROWS - 1, cursor.row + rowDelta));
    cursor.col = Math.max(0, Math.min(COLS - 1, cursor.col + colDelta));
    updateCellCount();
    slider.value = cursor.col;  // Update slider to match cursor position
    renderBrailleGrid();
    if (rotate) {
        rotateSlider();
    }
    checkBellWarning(); // Call this after updating the cursor position
}

function handleDotInteraction(rowIndex, colIndex) {
    if (isEraseMode) {
        clearCell(rowIndex, colIndex);
        renderBrailleGrid();
    }
}

function handleMouseEnter(rowIndex, colIndex) {
    if (isEraseMode && isMouseDown) {
        clearCell(rowIndex, colIndex);
        renderBrailleGrid();
    }
}

function handleMouseUp() {
    isMouseDown = false;
}

function clearCell(rowIndex, colIndex) {
    const radius = 0; // Define the smaller brush radius
    for (let i = -radius; i <= radius; i++) {
        for (let j = -radius; j <= radius; j++) {
            const row = rowIndex + i;
            const col = colIndex + j;
            if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
                grid[row][col] = [...EMPTY_CELL];
            }
        }
    }
}

function startContinuousMovement(action) {
    clearInterval(movementInterval);  // Ensure any existing interval is cleared
    movementInterval = setInterval(() => {
        if (action === 'left' && cursor.col > 0) {
            moveCursor(0, -1, true);
        } else if (action === 'right' && cursor.col < COLS - 1) {
            moveCursor(0, 1, true);
        }
    }, 100);
}

function handleKeyDown(e) {
    const key = e.key.toLowerCase();
    const action = keyMap[key];

    if (action !== undefined && !activeKeys.has(key)) {
        activeKeys.add(key);
        clusterKeys.add(key); // Track this key as part of current cluster
        
        if (typeof action === 'number') {
            // For dot keys, set the dot immediately for visual feedback
            grid[cursor.row][cursor.col][action] = 1;
            renderBrailleGrid();
            // Play sound only if key sound is enabled
            if (isKeySoundEnabled) {
                playSoundSafely(keySound);
            }
        } else if (movementKeys.has(key)) {
            clearInterval(movementInterval);  // Clear any existing interval to prevent multiple moves
            if (key === 'arrowleft') {
                moveCursor(0, -1, true);
                startContinuousMovement('left');
            } else if (key === 'arrowright') {
                moveCursor(0, 1, true);
                startContinuousMovement('right');
            } else if (key === 'arrowup') {
                moveCursor(-1, 0); // Move up without rotating
            } else if (key === 'arrowdown') {
                moveCursor(1, 0); // Move down without rotating
            }
        }
        
        // Add visual feedback for button press
        const button = buttonKeyMap[key];
        if (button) {
            button.classList.add('active');
        }
    }
}

function handleKeyUp(e) {
    const key = e.key.toLowerCase();
    const action = keyMap[key];

    if (action !== undefined) {
        activeKeys.delete(key);
        clearInterval(movementInterval);

        // Check if all keys are released to determine when to advance cursor
        if (activeKeys.size === 0) {
            // Check if any dot keys or space keys were involved in this cluster
            const hadDotKeys = Array.from(clusterKeys).some(k => dotKeys.has(k));
            const hadSpaceKeys = Array.from(clusterKeys).some(k => spaceKeys.has(k));
            
            // Only move cursor if we had dot keys or space keys
            if (hadDotKeys || hadSpaceKeys) {
                // Move to next cell only after all keys in cluster are released
                moveCursor(0, 1);
            } else if (!movementKeys.has(key)) { 
                // Handle non-dot, non-space, non-movement actions
                handleAction(action);
            }
            
            // Clear cluster tracking when all keys are released
            clusterKeys.clear();
        }
        
        // Remove visual feedback for button release
        const button = buttonKeyMap[key];
        if (button) {
            button.classList.remove('active');
        }
    }
}

function handleAction(action) {
    if (action === 'linespace') {
        moveCursor(1, 0); // Move down one line
        if (isKeySoundEnabled) {
            playSoundSafely(keySound);
        }
    } else if (action === 'up') {
        moveCursor(-1, 0); // Move up one line
    } else if (action === 'down') {
        moveCursor(1, 0); // Move down one line
    } else if (action === 'backspace') {
        if (cursor.col > 0) { // Only backspace if not at beginning of line
            moveCursor(0, -1);
            if (isKeySoundEnabled) {
                playSoundSafely(keySound);
            }
        }
    } else if (action === 'space') {
        moveCursor(0, 1); // Move to next cell
        if (isKeySoundEnabled) {
            playSoundSafely(keySound);
        }
    }
}

function rotateSlider() {
    clearTimeout(sliderTimeout);
    slider.classList.add('rotated');
    sliderTimeout = setTimeout(() => {
        slider.classList.remove('rotated');
    }, 1000);
}

function renderBrailleCell(cell, rowIndex, colIndex) {
    const isCurrentCell = rowIndex === cursor.row && colIndex === cursor.col;
    const cellElement = document.createElement('div');
    cellElement.className = `braille-cell ${isCurrentCell ? 'current-cell' : ''}`;

    const dotContainer = document.createElement('div');
    dotContainer.className = 'braille-dot-container';

    // The dots are ordered in visual order: 1,4,2,5,3,6 which maps to array indices 0,3,1,4,2,5
    [0, 3, 1, 4, 2, 5].forEach((dotIndex, visualPosition) => {
        const dot = document.createElement('div');
        dot.className = `braille-dot ${cell[dotIndex] ? 'braille-dot-active' : 'braille-dot-inactive'}`;
        
        // Store dot data as attributes for eraser tool
        dot.dataset.row = rowIndex;
        dot.dataset.col = colIndex;
        dot.dataset.dotIndex = dotIndex;
        
        // Add event listeners for eraser tool
        dot.addEventListener('mousedown', (e) => {
            if (isEraseMode) {
                eraseDot(rowIndex, colIndex, dotIndex);
            }
        });
        
        dot.addEventListener('mouseenter', (e) => {
            if (isEraseMode && isMouseDown) {
                eraseDot(rowIndex, colIndex, dotIndex);
            }
        });
        
        dotContainer.appendChild(dot);
    });

    cellElement.appendChild(dotContainer);
    return cellElement;
}

// New function to erase a specific dot
function eraseDot(rowIndex, colIndex, dotIndex) {
    if (grid[rowIndex][colIndex][dotIndex] === 1) {
        grid[rowIndex][colIndex][dotIndex] = 0;
        renderBrailleGrid();
    }
}

function handleMouseDown(e) {
    isMouseDown = true;
    
    // Ensure focus is maintained on the app container
    const appContainer = document.getElementById('braille-writer-app');
    if (appContainer) {
        appContainer.focus();
    }
}

// Update mouse handling to work with document-level events
document.addEventListener('mousedown', handleMouseDown);
document.addEventListener('mouseup', handleMouseUp);

function renderBrailleGrid() {
    // Only create the grid initially if it doesn't exist
    if (brailleGrid.childElementCount === 0) {
        for (let i = 0; i < ROWS; i++) {
            const row = document.createElement('div');
            row.className = 'braille-row';
            
            for (let j = 0; j < COLS; j++) {
                const cell = renderBrailleCell(grid[i][j], i, j);
                row.appendChild(cell);
            }
            
            brailleGrid.appendChild(row);
        }
    } else {
        // Update only what needs to change - cell classes and dot states
        const rows = brailleGrid.children;
        
        for (let i = 0; i < ROWS; i++) {
            const rowElement = rows[i];
            const cells = rowElement.children;
            
            for (let j = 0; j < COLS; j++) {
                const cellElement = cells[j];
                const isCurrentCell = i === cursor.row && j === cursor.col;
                
                // Update current cell class
                cellElement.className = `braille-cell ${isCurrentCell ? 'current-cell' : ''}`;
                
                // Update dot states
                const dotContainer = cellElement.querySelector('.braille-dot-container');
                const dots = dotContainer.children;
                const dotOrder = [0, 3, 1, 4, 2, 5]; // Visual order mapping
                
                for (let k = 0; k < 6; k++) {
                    const dot = dots[k];
                    const dotIndex = dotOrder[k];
                    const isActive = grid[i][j][dotIndex] === 1;
                    
                    dot.className = `braille-dot ${isActive ? 'braille-dot-active' : 'braille-dot-inactive'}`;
                }
            }
        }
    }
    
    // Scroll to make cursor visible
    requestAnimationFrame(() => {
        const currentCell = brailleGrid.querySelector('.current-cell');
        if (currentCell) {
            currentCell.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'nearest',
                inline: 'nearest'
            });
        }
    });
}

// Function to handle dot button clicks
function handleDotButtonClick(dotIndex) {
    const key = Object.keys(keyMap).find(k => keyMap[k] === dotIndex);
    if (key) {
        const keydownEvent = new KeyboardEvent('keydown', { key: key });
        document.dispatchEvent(keydownEvent);
    }
}

// Function to handle dot button release
function handleDotButtonRelease() {
    if (activeKeys.size > 0) {
        activeKeys.forEach(key => {
            const keyupEvent = new KeyboardEvent('keyup', { key: key });
            document.dispatchEvent(keyupEvent);
        });
    }
}

function handleTouchStart(e) {
    e.preventDefault();
    Array.from(e.changedTouches).forEach(touch => {
        activeTouches.add(touch.identifier);
    });
}

function handleTouchEnd(e) {
    e.preventDefault();
    Array.from(e.changedTouches).forEach(touch => {
        activeTouches.delete(touch.identifier);
    });
    if (activeTouches.size === 0) {
        handleDotButtonRelease();
    }
}

function handleTouchCancel(e) {
    e.preventDefault();
    Array.from(e.changedTouches).forEach(touch => {
        activeTouches.delete(touch.identifier);
    });
    if (activeTouches.size === 0) {
        handleDotButtonRelease();
    }
}

// Event listeners
document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);

allClearBtn.addEventListener('click', () => {
    grid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => [...EMPTY_CELL]));
    renderBrailleGrid();
});

slider.addEventListener('input', (e) => {
    cursor.col = parseInt(e.target.value);
    updateCellCount();
    renderBrailleGrid();
    rotateSlider();
    checkBellWarning();
});

// Event listeners for dot buttons
const dotButtons = [dot1Btn, dot2Btn, dot3Btn, dot4Btn, dot5Btn, dot6Btn];
dotButtons.forEach((btn, index) => {
    btn.addEventListener('mousedown', () => handleDotButtonClick(index));
    btn.addEventListener('mouseup', handleDotButtonRelease);
    btn.addEventListener('mouseleave', handleDotButtonRelease);
    btn.addEventListener('touchstart', handleTouchStart, { passive: false });
    btn.addEventListener('touchend', handleTouchEnd, { passive: false });
    btn.addEventListener('touchcancel', handleTouchCancel, { passive: false });
});

// Event listeners for other buttons
[spaceBtn, linespaceBtn, backspaceBtn].forEach(btn => {
    btn.addEventListener('touchstart', handleTouchStart, { passive: false });
});

spaceBtn.addEventListener('click', () => {
    const keydownEvent = new KeyboardEvent('keydown', { key: 'g' });
    const keyupEvent = new KeyboardEvent('keyup', { key: 'g' });
    document.dispatchEvent(keydownEvent);
    setTimeout(() => document.dispatchEvent(keyupEvent), 100);
});

linespaceBtn.addEventListener('click', () => {
    const keydownEvent = new KeyboardEvent('keydown', { key: 'a' });
    const keyupEvent = new KeyboardEvent('keyup', { key: 'a' });
    document.dispatchEvent(keydownEvent);
    setTimeout(() => document.dispatchEvent(keyupEvent), 100);
});

backspaceBtn.addEventListener('click', () => {
    const keydownEvent = new KeyboardEvent('keydown', { key: ';' });
    const keyupEvent = new KeyboardEvent('keyup', { key: ';' });
    document.dispatchEvent(keydownEvent);
    setTimeout(() => document.dispatchEvent(keyupEvent), 100);
});

// Setup instructions drawer
function setupInstructionsDrawer() {
    const instructionsDrawer = document.getElementById('instructions-drawer');
    const instructionsToggle = document.getElementById('instructions-toggle');
    
    if (!instructionsToggle) {
        console.error('Instructions toggle button not found!');
        return;
    }
    
    // Remove ALL existing event listeners by cloning and replacing
    const newToggle = instructionsToggle.cloneNode(true);
    instructionsToggle.parentNode.replaceChild(newToggle, instructionsToggle);
    
    // Add the single click handler
    newToggle.addEventListener('click', () => {
        instructionsDrawer.classList.toggle('open');
        newToggle.textContent = instructionsDrawer.classList.contains('open') 
            ? 'Close Instructions & Settings' 
            : 'Instructions & Settings';
    });
    
    // Add touch support
    newToggle.addEventListener('touchstart', (e) => {
        e.preventDefault();
        newToggle.classList.add('active');
    }, { passive: false });
    
    newToggle.addEventListener('touchend', (e) => {
        e.preventDefault();
        newToggle.classList.remove('active');
        // Directly toggle the drawer
        instructionsDrawer.classList.toggle('open');
        newToggle.textContent = instructionsDrawer.classList.contains('open') 
            ? 'Close Instructions & Settings' 
            : 'Instructions & Settings';
    }, { passive: false });
}

// Setup settings controls
function setupSettingsControls() {
    // Set up sound and bell toggle controls
    const toggleBell = document.getElementById('toggle-bell');
    const toggleKeySound = document.getElementById('toggle-key-sound');
    const bellWarningSelect = document.getElementById('bell-warning');
    
    // Bell toggle
    if (toggleBell) {
        toggleBell.checked = isBellEnabled; // Set initial state
        toggleBell.addEventListener('change', (e) => {
            isBellEnabled = e.target.checked;
            console.log(`Bell ${isBellEnabled ? 'enabled' : 'disabled'}`);
        });
    }
    
    // Key sound toggle
    if (toggleKeySound) {
        toggleKeySound.checked = isKeySoundEnabled; // Set initial state
        toggleKeySound.addEventListener('change', (e) => {
            isKeySoundEnabled = e.target.checked;
            console.log(`Key sound ${isKeySoundEnabled ? 'enabled' : 'disabled'}`);
        });
    }
    
    // Bell warning spaces setting
    if (bellWarningSelect) {
        bellWarningSelect.value = bellWarningSpaces; // Set initial state
        bellWarningSelect.addEventListener('change', (e) => {
            bellWarningSpaces = parseInt(e.target.value);
            console.log(`Bell warning set to ${bellWarningSpaces} spaces from end`);
        });
    }
}

// Setup toggle buttons
function setupToggleButtons() {
    // Get fresh references to buttons after cleanup
    const eraseModeBtn = document.getElementById('erase-mode-btn');
    
    // ERASE MODE BUTTON
    eraseModeBtn.addEventListener('click', () => {
        // Toggle state
        isEraseMode = !isEraseMode;
        
        // Update visual appearance
        eraseModeBtn.classList.toggle('active', isEraseMode);
        brailleGrid.classList.toggle('erase-mode', isEraseMode);
        
        // Update cursor for visual feedback
        brailleGrid.style.cursor = isEraseMode ? 'crosshair' : 'default';
        
        console.log(`Erase mode ${isEraseMode ? 'enabled' : 'disabled'}`);
    });
    
    // Touch support for erase mode button
    eraseModeBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
    }, { passive: false });
    
    eraseModeBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Toggle state
        isEraseMode = !isEraseMode;
        
        // Update visual appearance
        eraseModeBtn.classList.toggle('active', isEraseMode);
        brailleGrid.classList.toggle('erase-mode', isEraseMode);
        
        // Update cursor for visual feedback
        brailleGrid.style.cursor = isEraseMode ? 'crosshair' : 'default';
        
        console.log(`Erase mode ${isEraseMode ? 'enabled' : 'disabled'} (touch)`);
    }, { passive: false });
}

// Setup fullscreen handler
function setupFullscreenHandler() {
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const appElement = document.getElementById('braille-writer-app');
    
    fullscreenBtn.addEventListener('click', () => {
        try {
            if (!document.fullscreenElement) {
                // Enter fullscreen
                appElement.requestFullscreen().then(() => {
                    isFullscreen = true;
                    fullscreenBtn.classList.add('active');
                    fullscreenBtn.textContent = 'Exit Full Screen';
                    appElement.classList.add('fullscreen-mode');
                }).catch((err) => {
                    console.error(`Error attempting to enable fullscreen: ${err.message}`);
                });
            } else {
                // Exit fullscreen
                document.exitFullscreen().then(() => {
                    isFullscreen = false;
                    fullscreenBtn.classList.remove('active');
                    fullscreenBtn.textContent = 'Full Screen';
                    appElement.classList.remove('fullscreen-mode');
                }).catch((err) => {
                    console.error(`Error attempting to exit fullscreen: ${err.message}`);
                });
            }
        } catch (err) {
            console.error('Fullscreen not supported:', err);
        }
    });
    
    // Touch support for fullscreen button
    fullscreenBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        fullscreenBtn.classList.add('touch-active');
    }, { passive: false });
    
    fullscreenBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        fullscreenBtn.classList.remove('touch-active');
        fullscreenBtn.click();
    }, { passive: false });
}

// Handle fullscreen changes
document.addEventListener('fullscreenchange', () => {
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const appElement = document.getElementById('braille-writer-app');
    
    if (!document.fullscreenElement) {
        isFullscreen = false;
        fullscreenBtn.classList.remove('active');
        fullscreenBtn.textContent = 'Full Screen';
        appElement.classList.remove('fullscreen-mode');
    }
});

// Master initialization function
function initialize() {
    console.log("Starting initialization...");
    
    // Basic UI initialization
    slider.value = cursor.col;
    updateCellCount();
    renderBrailleGrid();
    
    // Focus management setup
    const appContainer = document.getElementById('braille-writer-app');
    appContainer.setAttribute('tabindex', '0');
    appContainer.focus();
    
    // Handle click events to maintain focus
    appContainer.addEventListener('click', () => {
        appContainer.focus();
    });

    // Ensure focus is maintained after any user interaction
    appContainer.addEventListener('blur', () => {
        setTimeout(() => {
            appContainer.focus();
        }, 100);
    });
    
    // Set up all components
    setupSettingsControls();
    setupToggleButtons();
    setupFullscreenHandler();
    setupInstructionsDrawer();
    
    console.log("Initialization completed successfully!");
}

// Call initialization once
initialize();

// Clean up on page unload
window.addEventListener('beforeunload', (e) => {
    const hasContent = grid.some(row => row.some(cell => cell.some(dot => dot === 1)));
    if (hasContent) {
        e.preventDefault();
        e.returnValue = '';
    }
});
