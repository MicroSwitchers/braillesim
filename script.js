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
// Comprehensive Mobile Touch Support - Version 2.0
// Simplified and more reliable approach for mobile touch devices

// Touch state tracking
let touchStartTime = 0;
let touchStartElement = null;
let isTouchDevice = false;

// Detect if this is a touch device
function detectTouchDevice() {
    isTouchDevice = 'ontouchstart' in window || 
                   navigator.maxTouchPoints > 0 || 
                   navigator.msMaxTouchPoints > 0;
    
    if (isTouchDevice) {
        console.log('Touch device detected - enabling touch support');
        document.body.classList.add('touch-device');
        
        // Add immediate visual indicator
        const indicator = document.createElement('div');
        indicator.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            background: lime;
            color: black;
            padding: 10px;
            border-radius: 5px;
            font-weight: bold;
            z-index: 99999;
            font-size: 14px;
        `;
        indicator.textContent = 'TOUCH DEVICE DETECTED';
        document.body.appendChild(indicator);
        
        // Add touch test area
        const touchTest = document.createElement('div');
        touchTest.id = 'touch-test';
        touchTest.style.cssText = `
            position: fixed;
            top: 60px;
            left: 10px;
            width: 100px;
            height: 50px;
            background: red;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            border-radius: 5px;
            z-index: 99999;
        `;
        touchTest.textContent = 'TOUCH TEST';
        document.body.appendChild(touchTest);
        
        // Basic touch test
        touchTest.ontouchstart = function() {
            this.style.background = 'green';
            this.textContent = 'TOUCH WORKS!';
        };
    }
    return isTouchDevice;
}

// Enhanced Touch Debugging and Fallback System
function createTouchDebugPanel() {
    if (!isTouchDevice) return;
    
    const debugPanel = document.createElement('div');
    debugPanel.id = 'touch-debug-panel';
    debugPanel.style.cssText = `
        position: fixed;
        bottom: 10px;
        left: 10px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px;
        border-radius: 5px;
        font-size: 12px;
        z-index: 10001;
        max-width: 300px;
        font-family: monospace;
        pointer-events: none;
    `;
    document.body.appendChild(debugPanel);
    
    return debugPanel;
}

function logTouchDebug(message) {
    console.log(`[TOUCH DEBUG] ${message}`);
    const debugPanel = document.getElementById('touch-debug-panel');
    if (debugPanel) {
        const time = new Date().toLocaleTimeString();
        debugPanel.innerHTML += `<div>${time}: ${message}</div>`;
        // Keep only last 5 messages
        const messages = debugPanel.querySelectorAll('div');
        if (messages.length > 5) {
            messages[0].remove();
        }
    }
}

// Additional fallback touch handlers using different approaches
function setupFallbackTouchHandlers() {
    if (!isTouchDevice) return;
    
    logTouchDebug('Setting up fallback touch handlers');
    
    // Approach 1: Document-level touch handling
    document.addEventListener('touchstart', function(e) {
        const target = e.target.closest('.key, .small-button');
        if (target) {
            logTouchDebug(`Document touch start on ${target.id || target.className}`);
            target.classList.add('touch-active');
        }
    }, { passive: false });
    
    document.addEventListener('touchend', function(e) {
        const target = e.target.closest('.key, .small-button');
        if (target) {
            logTouchDebug(`Document touch end on ${target.id || target.className}`);
            target.classList.remove('touch-active');
            
            // Try to trigger the action
            const clickEvent = new Event('click', { bubbles: true });
            target.dispatchEvent(clickEvent);
        }
    }, { passive: false });
    
    // Approach 2: Pointer events as fallback
    document.addEventListener('pointerdown', function(e) {
        if (e.pointerType === 'touch') {
            const target = e.target.closest('.key, .small-button');
            if (target) {
                logTouchDebug(`Pointer down on ${target.id || target.className}`);
                target.classList.add('touch-active');
            }
        }
    });
    
    document.addEventListener('pointerup', function(e) {
        if (e.pointerType === 'touch') {
            const target = e.target.closest('.key, .small-button');
            if (target) {
                logTouchDebug(`Pointer up on ${target.id || target.className}`);
                target.classList.remove('touch-active');
                
                // Trigger click
                setTimeout(() => {
                    target.click();
                }, 10);
            }
        }
    });
}

// SIMPLE DIRECT TOUCH HANDLER - No event listeners, just direct properties
function setupSimpleTouchHandlers() {
    if (!isTouchDevice) return;
    
    console.log('Setting up SIMPLE touch handlers');
    
    // Get all buttons
    const buttons = {
        dot1: document.getElementById('dot1-btn'),
        dot2: document.getElementById('dot2-btn'),
        dot3: document.getElementById('dot3-btn'),
        dot4: document.getElementById('dot4-btn'),
        dot5: document.getElementById('dot5-btn'),
        dot6: document.getElementById('dot6-btn'),
        space: document.getElementById('space-btn'),
        linespace: document.getElementById('linespace-btn'),
        backspace: document.getElementById('backspace-btn'),
        allClear: document.getElementById('all-clear-btn'),
        eraseMode: document.getElementById('erase-mode-btn'),
        fullscreen: document.getElementById('fullscreen-btn')
    };
    
    // Direct touch handlers using ontouchstart property
    if (buttons.dot1) {
        buttons.dot1.ontouchstart = function(e) {
            e.preventDefault();
            this.style.background = 'red';
            handleDotButtonClick(0);
            setTimeout(() => handleDotButtonRelease(), 100);
        };
        buttons.dot1.ontouchend = function(e) {
            e.preventDefault();
            this.style.background = '';
        };
    }
    
    if (buttons.dot2) {
        buttons.dot2.ontouchstart = function(e) {
            e.preventDefault();
            this.style.background = 'red';
            handleDotButtonClick(1);
            setTimeout(() => handleDotButtonRelease(), 100);
        };
        buttons.dot2.ontouchend = function(e) {
            e.preventDefault();
            this.style.background = '';
        };
    }
    
    if (buttons.dot3) {
        buttons.dot3.ontouchstart = function(e) {
            e.preventDefault();
            this.style.background = 'red';
            handleDotButtonClick(2);
            setTimeout(() => handleDotButtonRelease(), 100);
        };
        buttons.dot3.ontouchend = function(e) {
            e.preventDefault();
            this.style.background = '';
        };
    }
    
    if (buttons.dot4) {
        buttons.dot4.ontouchstart = function(e) {
            e.preventDefault();
            this.style.background = 'red';
            handleDotButtonClick(3);
            setTimeout(() => handleDotButtonRelease(), 100);
        };
        buttons.dot4.ontouchend = function(e) {
            e.preventDefault();
            this.style.background = '';
        };
    }
    
    if (buttons.dot5) {
        buttons.dot5.ontouchstart = function(e) {
            e.preventDefault();
            this.style.background = 'red';
            handleDotButtonClick(4);
            setTimeout(() => handleDotButtonRelease(), 100);
        };
        buttons.dot5.ontouchend = function(e) {
            e.preventDefault();
            this.style.background = '';
        };
    }
    
    if (buttons.dot6) {
        buttons.dot6.ontouchstart = function(e) {
            e.preventDefault();
            this.style.background = 'red';
            handleDotButtonClick(5);
            setTimeout(() => handleDotButtonRelease(), 100);
        };
        buttons.dot6.ontouchend = function(e) {
            e.preventDefault();
            this.style.background = '';
        };
    }
    
    if (buttons.space) {
        buttons.space.ontouchstart = function(e) {
            e.preventDefault();
            this.style.background = 'red';
            insertSpace();
        };
        buttons.space.ontouchend = function(e) {
            e.preventDefault();
            this.style.background = '';
        };
    }
    
    if (buttons.linespace) {
        buttons.linespace.ontouchstart = function(e) {
            e.preventDefault();
            this.style.background = 'red';
            linespace();
        };
        buttons.linespace.ontouchend = function(e) {
            e.preventDefault();
            this.style.background = '';
        };
    }
    
    if (buttons.backspace) {
        buttons.backspace.ontouchstart = function(e) {
            e.preventDefault();
            this.style.background = 'red';
            backspace();
        };
        buttons.backspace.ontouchend = function(e) {
            e.preventDefault();
            this.style.background = '';
        };
    }
    
    if (buttons.allClear) {
        buttons.allClear.ontouchstart = function(e) {
            e.preventDefault();
            this.style.background = 'red';
            grid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => [...EMPTY_CELL]));
            renderBrailleGrid();
        };
        buttons.allClear.ontouchend = function(e) {
            e.preventDefault();
            this.style.background = '';
        };
    }
    
    if (buttons.eraseMode) {
        buttons.eraseMode.ontouchstart = function(e) {
            e.preventDefault();
            this.style.background = 'red';
            isEraseMode = !isEraseMode;
            updateEraseModeButton();
        };
        buttons.eraseMode.ontouchend = function(e) {
            e.preventDefault();
            this.style.background = '';
        };
    }
    
    if (buttons.fullscreen) {
        buttons.fullscreen.ontouchstart = function(e) {
            e.preventDefault();
            this.style.background = 'red';
            const appElement = document.getElementById('braille-writer-app');
            if (!document.fullscreenElement) {
                appElement.requestFullscreen().catch(console.error);
            } else {
                document.exitFullscreen().catch(console.error);
            }
        };
        buttons.fullscreen.ontouchend = function(e) {
            e.preventDefault();
            this.style.background = '';
        };
    }
    
    console.log('Simple touch handlers set up complete');
}

// EMERGENCY OVERLAY SYSTEM - Creates invisible overlays with basic touch
function createTouchOverlays() {
    if (!isTouchDevice) return;
    
    console.log('Creating touch overlays as emergency backup');
    
    const buttonIds = [
        'dot1-btn', 'dot2-btn', 'dot3-btn', 'dot4-btn', 'dot5-btn', 'dot6-btn',
        'space-btn', 'linespace-btn', 'backspace-btn', 
        'all-clear-btn', 'erase-mode-btn', 'fullscreen-btn'
    ];
    
    buttonIds.forEach(buttonId => {
        const originalButton = document.getElementById(buttonId);
        if (!originalButton) return;
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 0, 0, 0.1);
            z-index: 1000;
            pointer-events: auto;
            touch-action: manipulation;
        `;
        
        // Make parent relative if not already
        if (getComputedStyle(originalButton).position === 'static') {
            originalButton.style.position = 'relative';
        }
        
        // Add simple touch handler to overlay
        overlay.ontouchstart = function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.style.background = 'rgba(0, 255, 0, 0.3)';
            originalButton.style.background = 'lime';
            
            // Trigger the original button's action
            setTimeout(() => {
                originalButton.click();
            }, 10);
        };
        
        overlay.ontouchend = function(e) {
            e.preventDefault();
            this.style.background = 'rgba(255, 0, 0, 0.1)';
            originalButton.style.background = '';
        };
        
        originalButton.appendChild(overlay);
    });
}

// Emergency fallback: Inline touch handlers
function setupInlineTouchHandlers() {
    if (!isTouchDevice) return;
    
    logTouchDebug('Setting up inline touch handlers as emergency fallback');
    
    const buttonMappings = {
        'dot1-btn': () => { handleDotButtonClick(0); handleDotButtonRelease(); },
        'dot2-btn': () => { handleDotButtonClick(1); handleDotButtonRelease(); },
        'dot3-btn': () => { handleDotButtonClick(2); handleDotButtonRelease(); },
        'dot4-btn': () => { handleDotButtonClick(3); handleDotButtonRelease(); },
        'dot5-btn': () => { handleDotButtonClick(4); handleDotButtonRelease(); },
        'dot6-btn': () => { handleDotButtonClick(5); handleDotButtonRelease(); },
        'space-btn': () => insertSpace(),
        'linespace-btn': () => linespace(),
        'backspace-btn': () => backspace(),
        'all-clear-btn': () => {
            grid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => [...EMPTY_CELL]));
            renderBrailleGrid();
        },
        'erase-mode-btn': () => {
            isEraseMode = !isEraseMode;
            updateEraseModeButton();
        },
        'fullscreen-btn': () => {
            const appElement = document.getElementById('braille-writer-app');
            if (!document.fullscreenElement) {
                appElement.requestFullscreen().catch(console.error);
            } else {
                document.exitFullscreen().catch(console.error);
            }
        }
    };
    
    Object.keys(buttonMappings).forEach(buttonId => {
        const button = document.getElementById(buttonId);
        if (button) {
            // Add onclick as absolute fallback
            button.onclick = function(e) {
                e.preventDefault();
                logTouchDebug(`Inline click handler executed for ${buttonId}`);
                buttonMappings[buttonId]();
            };
            
            // Also add ontouchend
            button.ontouchend = function(e) {
                e.preventDefault();
                logTouchDebug(`Inline touch handler executed for ${buttonId}`);
                buttonMappings[buttonId]();
            };
        }
    });
}

// Legacy touch functions (keeping for compatibility)
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

// Direct action functions for touch events
function insertSpace() {
    handleAction('space');
}

function linespace() {
    handleAction('linespace');
}

function backspace() {
    handleAction('backspace');
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

// Add touch support for all clear button
allClearBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
    allClearBtn.classList.add('touch-active');
    console.log('All Clear touch start'); // Debug
}, { passive: false });

allClearBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    e.stopPropagation();
    allClearBtn.classList.remove('touch-active');
    console.log('All Clear touch end'); // Debug
    
    // Direct action
    grid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => [...EMPTY_CELL]));
    renderBrailleGrid();
    
    // Backup click
    setTimeout(() => {
        allClearBtn.click();
    }, 10);
}, { passive: false });

slider.addEventListener('input', (e) => {
    cursor.col = parseInt(e.target.value);
    updateCellCount();
    renderBrailleGrid();
    rotateSlider();
    checkBellWarning();
});

// Debug function for touch events
function debugTouch(element, eventType) {
    console.log(`Touch ${eventType} on ${element.id || element.className}`);
    
    // Add visual indicator
    if (eventType === 'start') {
        element.style.backgroundColor = '#ff6b6b';
    } else if (eventType === 'end') {
        setTimeout(() => {
            element.style.backgroundColor = '';
        }, 100);
    }
}

// Event listeners for dot buttons
const dotButtons = [dot1Btn, dot2Btn, dot3Btn, dot4Btn, dot5Btn, dot6Btn];
dotButtons.forEach((btn, index) => {
    // Mouse events
    btn.addEventListener('mousedown', () => handleDotButtonClick(index));
    btn.addEventListener('mouseup', handleDotButtonRelease);
    btn.addEventListener('mouseleave', handleDotButtonRelease);
    
    // Click event as backup for touch
    btn.addEventListener('click', (e) => {
        console.log(`Dot button ${index} clicked, detail: ${e.detail}`);
        if (e.detail === 0) { // Programmatic click from touch
            handleDotButtonClick(index);
            setTimeout(() => handleDotButtonRelease(), 100);
        }
    });
    
    // Touch events - multiple approaches
    btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        debugTouch(btn, 'start');
        btn.classList.add('touch-active');
        
        // Direct function call
        handleDotButtonClick(index);
        
        console.log(`Dot ${index} touch start`);
    }, { passive: false });
    
    btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        debugTouch(btn, 'end');
        btn.classList.remove('touch-active');
        
        // Direct function call
        handleDotButtonRelease();
        
        console.log(`Dot ${index} touch end`);
        
        // Multiple backup approaches
        setTimeout(() => {
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                detail: 0
            });
            btn.dispatchEvent(clickEvent);
        }, 10);
        
        setTimeout(() => {
            btn.click();
        }, 20);
    }, { passive: false });
    
    btn.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        e.stopPropagation();
        btn.classList.remove('touch-active');
        handleDotButtonRelease();
        console.log(`Dot ${index} touch cancel`);
    }, { passive: false });
});

// Event listeners for other buttons
[spaceBtn, linespaceBtn, backspaceBtn].forEach(btn => {
    // Add touch support with direct function calls
    btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        btn.classList.add('touch-active');
    }, { passive: false });
    
    btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        btn.classList.remove('touch-active');
        
        // Call the appropriate function directly
        if (btn === spaceBtn) {
            insertSpace();
        } else if (btn === linespaceBtn) {
            linespace();
        } else if (btn === backspaceBtn) {
            backspace();
        }
        
        // Also trigger click as backup
        setTimeout(() => {
            btn.click();
        }, 10);
    }, { passive: false });
    
    btn.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        e.stopPropagation();
        btn.classList.remove('touch-active');
    }, { passive: false });
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
                    fullscreenBtn.classList.add('in-fullscreen');
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
                    fullscreenBtn.classList.remove('in-fullscreen');
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

// Setup fullscreen button dancing animation
function setupFullscreenDanceAnimation() {
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    let danceInterval;

    function triggerDance() {
        // Only dance if not in fullscreen
        if (!isFullscreen && !document.fullscreenElement) {
            fullscreenBtn.classList.remove('dance');
            // Force reflow to restart animation
            fullscreenBtn.offsetHeight;
            fullscreenBtn.classList.add('dance');
        }
    }

    function startDanceTimer() {
        // Clear any existing timer
        if (danceInterval) {
            clearInterval(danceInterval);
        }
        
        // Start dancing every 4 seconds if not in fullscreen
        danceInterval = setInterval(() => {
            triggerDance();
        }, 4000);
        
        // Initial dance after 3 seconds
        setTimeout(triggerDance, 3000);
    }

    function stopDanceTimer() {
        if (danceInterval) {
            clearInterval(danceInterval);
        }
        fullscreenBtn.classList.remove('dance');
    }

    // Listen for fullscreen changes
    document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement) {
            stopDanceTimer();
        } else {
            startDanceTimer();
        }
    });

    // Start the dance timer initially
    startDanceTimer();
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
    detectTouchDevice();
    if (isTouchDevice) {
        setupSimpleTouchHandlers();
        createTouchOverlays();
        console.log('Touch device setup complete');
    }
    setupSettingsControls();
    setupToggleButtons();
    setupFullscreenHandler();
    setupFullscreenDanceAnimation();
    setupInstructionsDrawer();
    
    console.log("Initialization completed successfully!");
}

// PWA Service Worker Registration and Management
function initializePWA() {
    // Check if service workers are supported
    if ('serviceWorker' in navigator) {
        // Register service worker
        navigator.serviceWorker.register('./sw.js')
            .then((registration) => {
                console.log('Service Worker registered successfully:', registration.scope);
                
                // Force icon cache refresh by checking service worker version
                forceIconCacheRefresh(registration);
                
                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // New version available
                                showUpdateNotification(newWorker);
                            }
                        });
                    }
                });
            })
            .catch((error) => {
                console.log('Service Worker registration failed:', error);
            });

        // Listen for service worker messages
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'SW_UPDATED') {
                showUpdateNotification();
            }
        });
    }

    // Handle app installation
    let deferredPrompt;
    
    window.addEventListener('beforeinstallprompt', (e) => {
        console.log('PWA install prompt available');
        e.preventDefault();
        deferredPrompt = e;
        showInstallButton();
    });

    // Track if app was installed
    window.addEventListener('appinstalled', (e) => {
        console.log('PWA was installed');
        hideInstallButton();
        // Track installation analytics here if needed
    });

    // Handle offline/online status
    window.addEventListener('online', () => {
        console.log('App is back online');
        showConnectionStatus('online');
        // Sync any pending data
        syncOfflineData();
    });

    window.addEventListener('offline', () => {
        console.log('App is now offline');
        showConnectionStatus('offline');
    });
}

// Force icon cache refresh for updated icons
function forceIconCacheRefresh(registration) {
    // Clear old icon caches and preload new icon
    if ('caches' in window) {
        caches.keys().then(cacheNames => {
            cacheNames.forEach(cacheName => {
                if (cacheName.includes('braille-writer-static-v1.0.0')) {
                    // Delete old cache with old icon
                    caches.delete(cacheName);
                    console.log('Deleted old cache with outdated icon:', cacheName);
                }
            });
        });
    }
    
    // Preload the new icon to ensure it's fresh
    const iconLink = document.querySelector('link[rel="icon"]');
    if (iconLink) {
        const newIcon = new Image();
        newIcon.onload = () => {
            console.log('Updated icon preloaded successfully');
        };
        newIcon.onerror = () => {
            console.warn('Failed to preload updated icon');
        };
        newIcon.src = iconLink.href;
    }
}

// Show update notification
function showUpdateNotification(newWorker) {
    const updateBanner = document.createElement('div');
    updateBanner.className = 'update-banner';
    updateBanner.innerHTML = `
        <div class="update-content">
            <span>🔄 New version available!</span>
            <button id="update-btn" class="update-button">Update</button>
            <button id="dismiss-btn" class="dismiss-button">×</button>
        </div>
    `;
    
    document.body.appendChild(updateBanner);
    
    // Handle update button
    document.getElementById('update-btn').addEventListener('click', () => {
        if (newWorker) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
        }
        window.location.reload();
    });
    
    // Handle dismiss button
    document.getElementById('dismiss-btn').addEventListener('click', () => {
        updateBanner.remove();
    });
    
    // Auto-dismiss after 10 seconds
    setTimeout(() => {
        if (updateBanner.parentNode) {
            updateBanner.remove();
        }
    }, 10000);
}

// Show install button
function showInstallButton() {
    let installButton = document.getElementById('install-btn');
    
    if (!installButton) {
        installButton = document.createElement('button');
        installButton.id = 'install-btn';
        installButton.className = 'install-button small-button';
        installButton.textContent = '📱 Install App';
        
        // Add to header buttons
        const headerButtons = document.querySelector('.header-buttons');
        if (headerButtons) {
            headerButtons.appendChild(installButton);
        }
    }
    
    installButton.style.display = 'block';
    
    installButton.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`Install prompt outcome: ${outcome}`);
            deferredPrompt = null;
            hideInstallButton();
        }
    });
}

// Hide install button
function hideInstallButton() {
    const installButton = document.getElementById('install-btn');
    if (installButton) {
        installButton.style.display = 'none';
    }
}

// Show connection status
function showConnectionStatus(status) {
    const statusBanner = document.createElement('div');
    statusBanner.className = `connection-status ${status}`;
    statusBanner.textContent = status === 'online' ? '🌐 Back online' : '📱 Offline mode';
    
    document.body.appendChild(statusBanner);
    
    setTimeout(() => {
        if (statusBanner.parentNode) {
            statusBanner.remove();
        }
    }, 3000);
}

// Sync offline data when back online
function syncOfflineData() {
    // Get current braille data
    const brailleData = {
        grid: grid,
        cursor: cursor,
        timestamp: Date.now()
    };
    
    // Send to service worker for caching
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'CACHE_BRAILLE_DATA',
            payload: brailleData
        });
    }
    
    // Save to localStorage as backup
    try {
        localStorage.setItem('braille-writer-data', JSON.stringify(brailleData));
    } catch (error) {
        console.warn('Failed to save to localStorage:', error);
    }
}

// Load saved data
function loadSavedData() {
    try {
        const savedData = localStorage.getItem('braille-writer-data');
        if (savedData) {
            const data = JSON.parse(savedData);
            if (data.grid && data.cursor) {
                // Ask user if they want to restore
                if (confirm('Restore your previous Braille document?')) {
                    grid = data.grid;
                    cursor = data.cursor;
                    updateCellCount();
                    slider.value = cursor.col;
                    renderBrailleGrid();
                    console.log('Previous session restored');
                }
            }
        }
    } catch (error) {
        console.warn('Failed to load saved data:', error);
    }
}

// Auto-save functionality
function setupAutoSave() {
    let saveTimeout;
    
    function autoSave() {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            syncOfflineData();
        }, 2000); // Save 2 seconds after last change
    }
    
    // Monitor changes to grid
    const originalRenderGrid = renderBrailleGrid;
    renderBrailleGrid = function() {
        originalRenderGrid.call(this);
        autoSave();
    };
}

// Handle app shortcuts from manifest
function handleAppShortcuts() {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('action') === 'new') {
        // Clear all data for new document
        grid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => [...EMPTY_CELL]));
        cursor = { row: 0, col: 0 };
        renderBrailleGrid();
        updateCellCount();
        slider.value = 0;
    }
    
    if (urlParams.get('mode') === 'practice') {
        // Enable sound feedback for practice mode
        isKeySoundEnabled = true;
        isBellEnabled = true;
        const toggleKeySound = document.getElementById('toggle-key-sound');
        const toggleBell = document.getElementById('toggle-bell');
        if (toggleKeySound) toggleKeySound.checked = true;
        if (toggleBell) toggleBell.checked = true;
    }
}

// Call initialization once
initialize();

// Initialize PWA features
initializePWA();

// Load saved data after initialization
setTimeout(() => {
    loadSavedData();
    setupAutoSave();
    handleAppShortcuts();
}, 1000);

// Clean up on page unload
window.addEventListener('beforeunload', (e) => {
    const hasContent = grid.some(row => row.some(cell => cell.some(dot => dot === 1)));
    if (hasContent) {
        // Save data before leaving
        syncOfflineData();
        e.preventDefault();
        e.returnValue = '';
    }
});
