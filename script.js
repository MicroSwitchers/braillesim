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

// Remove bell warning check from updateCellCount function
function updateCellCount() {
    cellCount.textContent = `Cell: ${cursor.col + 1} / 31`;
    // Remove the bell warning check from here - it's now handled in checkBellWarning()
}

// Fix the checkBellWarning function to be the single source of bell warnings
function checkBellWarning() {
    // Standardize the warning position calculation
    const warningPosition = COLS - bellWarningSpaces - 1;
    
    if (isBellEnabled && cursor.col === warningPosition && previousBellWarningPosition !== cursor.col) {
        // Only play bell when reaching warning position and we haven't played it already
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
        handleDotInteraction(rowIndex, colIndex);
    }
}

function handleMouseUp() {
    isMouseDown = false;
}

function clearCell(rowIndex, colIndex) {
    const radius = 0; // Define the smaller brush radius
    for (let i = -radius; i <= radius; i++) {
        for (let j = -radius; j <= radius; j++) {
            const newRow = rowIndex + i;
            const newCol = colIndex + j;
            if (newRow >= 0 && newRow < ROWS && newCol >= 0 && newCol < COLS) {
                grid[newRow][newCol] = [...EMPTY_CELL];
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
        if (typeof action === 'number') {
            grid[cursor.row][cursor.col][action] = 1;
            renderBrailleGrid();
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

        if (activeKeys.size === 0) {
            if (dotKeys.has(key) || spaceKeys.has(key)) {
                moveCursor(0, 1);
                playSoundSafely(keySound);
            } else if (!movementKeys.has(key)) { // Prevent cursor movement on arrow key release
                handleAction(action);
            }
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
        moveCursor(1, 0);
        playSoundSafely(keySound);
    } else if (action === 'up') {
        moveCursor(-1, 0);
    } else if (action === 'down') {
        moveCursor(1, 0);
    } else if (action === 'backspace') {
        if (cursor.col > 0) {
            moveCursor(0, -1);
            playSoundSafely(keySound);
        }
    } else if (action === 'space') {
        moveCursor(0, 1);
        playSoundSafely(keySound);
    }
}

function rotateSlider() {
    clearTimeout(sliderTimeout);
    slider.classList.add('rotated');
    sliderTimeout = setTimeout(() => {
        slider.classList.remove('rotated');
    }, 1000);
}

// Replace these functions with improved versions for more precise erasing

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

// New function to erase a specific dot without playing the embossing sound
function eraseDot(rowIndex, colIndex, dotIndex) {
    if (grid[rowIndex][colIndex][dotIndex] === 1) {
        grid[rowIndex][colIndex][dotIndex] = 0;
        
        // Remove the sound playback - erasing should be silent
        // No playSoundSafely(keySound) here
        
        // Only re-render the grid if a dot was actually erased
        renderBrailleGrid();
    }
}

// Replace the existing handleMouseDown function
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

// Improve the erase mode button to provide better visual feedback
eraseModeBtn.addEventListener('click', () => {
    isEraseMode = !isEraseMode;
    eraseModeBtn.classList.toggle('active', isEraseMode);
    
    // Toggle the erase-mode class on the braille grid
    brailleGrid.classList.toggle('erase-mode', isEraseMode);
    
    // Change cursor to indicate eraser mode
    if (isEraseMode) {
        brailleGrid.style.cursor = 'crosshair';
    } else {
        brailleGrid.style.cursor = 'default';
    }
});

// Replace the renderBrailleGrid function with this optimized version

function renderBrailleGrid() {
    // Don't recreate the entire grid on every update
    // Only update what has changed
    
    // First, ensure we have the right number of rows
    while (brailleGrid.childElementCount < ROWS) {
        const rowElement = document.createElement('div');
        rowElement.className = 'braille-row';
        brailleGrid.appendChild(rowElement);
    }
    
    // Now update each cell in each row
    for (let i = 0; i < ROWS; i++) {
        const rowElement = brailleGrid.children[i];
        
        // Make sure this row has the right number of cells
        while (rowElement.childElementCount < COLS) {
            const cellElement = document.createElement('div');
            cellElement.className = 'braille-cell';
            
            const dotContainer = document.createElement('div');
            dotContainer.className = 'braille-dot-container';
            
            // Create 6 dots in each cell
            for (let k = 0; k < 6; k++) {
                const dot = document.createElement('div');
                dot.className = 'braille-dot braille-dot-inactive';
                dot.dataset.dotIndex = k;
                dotContainer.appendChild(dot);
            }
            
            cellElement.appendChild(dotContainer);
            rowElement.appendChild(cellElement);
        }
        
        // Update each cell in this row
        for (let j = 0; j < COLS; j++) {
            const cellElement = rowElement.children[j];
            const isCurrentCell = i === cursor.row && j === cursor.col;
            
            // Update cell class without recreating the element
            cellElement.className = `braille-cell ${isCurrentCell ? 'current-cell' : ''}`;
            
            // Update dot states
            const dotContainer = cellElement.firstChild;
            const visualOrder = [0, 3, 1, 4, 2, 5]; // Visual dot order
            
            for (let k = 0; k < 6; k++) {
                const dotElement = dotContainer.children[k];
                const dotIndex = visualOrder[k];
                const isActive = grid[i][j][dotIndex] === 1;
                
                // Update dot appearance
                dotElement.className = `braille-dot ${isActive ? 'braille-dot-active' : 'braille-dot-inactive'}`;
                
                // Ensure dot has proper data attributes and event listeners
                dotElement.dataset.row = i;
                dotElement.dataset.col = j;
                
                // Clean up old listeners (using a common technique with cloneNode)
                const newDot = dotElement.cloneNode(true);
                
                // Add event listeners for eraser tool
                newDot.addEventListener('mousedown', (e) => {
                    if (isEraseMode) {
                        eraseDot(i, j, dotIndex);
                    }
                });
                
                newDot.addEventListener('mouseenter', (e) => {
                    if (isEraseMode && isMouseDown) {
                        eraseDot(i, j, dotIndex);
                    }
                });
                
                dotContainer.replaceChild(newDot, dotElement);
            }
        }
    }
    
    // Scroll to make cursor visible
    const currentCell = document.querySelector('.current-cell');
    if (currentCell) {
        currentCell.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center'
        });
    }
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

// Replace the existing handleTouchStart and handleTouchEnd functions

function handleTouchStart(e) {
    e.preventDefault();
    Array.from(e.changedTouches).forEach(touch => {
        const target = touch.target.closest('.key');
        if (target) {
            // Add visual feedback immediately
            target.classList.add('active');
            
            const key = keyButtonMap[target.id];
            if (key) {
                activeTouches.add(touch.identifier);
                const keydownEvent = new KeyboardEvent('keydown', { key: key });
                document.dispatchEvent(keydownEvent);
            }
        }
    });
}

function handleTouchEnd(e) {
    e.preventDefault();
    Array.from(e.changedTouches).forEach(touch => {
        const target = touch.target.closest('.key');
        if (target) {
            // Remove visual feedback
            target.classList.remove('active');
        }
        
        if (activeTouches.has(touch.identifier)) {
            activeTouches.delete(touch.identifier);
            if (activeTouches.size === 0) {
                handleDotButtonRelease();
            }
        }
    });
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
    checkBellWarning(); // Make sure we check for bell warning here
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
    btn.addEventListener('touchend', handleTouchEnd, { passive: false });
    btn.addEventListener('touchcancel', handleTouchCancel, { passive: false });
});

spaceBtn.addEventListener('click', () => {
    const keydownEvent = new KeyboardEvent('keydown', { key: 'g' });
    const keyupEvent = new KeyboardEvent('keyup', { key: 'g' });
    document.dispatchEvent(keydownEvent);
    document.dispatchEvent(keyupEvent);
});
linespaceBtn.addEventListener('click', () => {
    const keydownEvent = new KeyboardEvent('keydown', { key: 'a' });
    const keyupEvent = new KeyboardEvent('keyup', { key: 'a' });
    document.dispatchEvent(keydownEvent);
    document.dispatchEvent(keyupEvent);
});
backspaceBtn.addEventListener('click', () => {
    const keydownEvent = new KeyboardEvent('keydown', { key: ';' });
    const keyupEvent = new KeyboardEvent('keyup', { key: ';' });
    document.dispatchEvent(keydownEvent);
    document.dispatchEvent(keyupEvent);
});

// Instructions drawer functionality
const instructionsDrawer = document.getElementById('instructions-drawer');
const instructionsToggle = document.getElementById('instructions-toggle');

instructionsToggle.addEventListener('click', () => {
    instructionsDrawer.classList.toggle('open');
    instructionsToggle.textContent = instructionsDrawer.classList.contains('open') ? 'Close Instructions & Settings' : 'Instructions & Settings';
});

// Replace the fullscreen button handler with this improved version

fullscreenBtn.addEventListener('click', () => {
    try {
        const appElement = document.getElementById('braille-writer-app');
        
        if (!document.fullscreenElement) {
            // Enter fullscreen - use the app container instead of documentElement
            appElement.requestFullscreen().then(() => {
                isFullscreen = true;
                fullscreenBtn.classList.add('active');
                fullscreenBtn.textContent = "Exit Full";
                
                // Apply fullscreen-specific styling
                appElement.classList.add('fullscreen-mode');
                document.body.classList.add('fullscreen-active');
            }).catch(err => {
                console.error(`Fullscreen error: ${err.message} (${err.name})`);
            });
        } else {
            // Exit fullscreen
            document.exitFullscreen().then(() => {
                isFullscreen = false;
                fullscreenBtn.classList.remove('active');
                fullscreenBtn.textContent = "Full Screen";
                
                // Remove fullscreen-specific styling
                appElement.classList.remove('fullscreen-mode');
                document.body.classList.remove('fullscreen-active');
            }).catch(err => {
                console.error(`Exit fullscreen error: ${err.message} (${err.name})`);
            });
        }
    } catch (e) {
        console.error("Fullscreen toggle failed:", e);
    }
});

// Add event listener for fullscreen change to ensure proper cleanup
document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
        // User exited fullscreen via browser controls - clean up
        isFullscreen = false;
        fullscreenBtn.classList.remove('active');
        fullscreenBtn.textContent = "Full Screen";
        
        const appElement = document.getElementById('braille-writer-app');
        appElement.classList.remove('fullscreen-mode');
        document.body.classList.remove('fullscreen-active');
    }
});

// Bell warning functionality
bellWarningSelect.addEventListener('change', (e) => {
    bellWarningSpaces = parseInt(e.target.value);
    previousBellWarningPosition = -1; // Reset previous warning position
});

// Toggle Bell functionality
toggleBell.addEventListener('change', (e) => {
    isBellEnabled = e.target.checked;
});

// Toggle Key Sound functionality
toggleKeySound.addEventListener('change', (e) => {
    isKeySoundEnabled = e.target.checked;
});

function checkBellWarning() {
    const warningPosition = COLS - bellWarningSpaces;
    
    // Debug log to verify position calculation
    console.log(`Current pos: ${cursor.col}, Warning pos: ${warningPosition}, Bell spaces: ${bellWarningSpaces}`);
    
    if (isBellEnabled && cursor.col === warningPosition) {
        // Always play bell when reaching warning position, regardless of previous position
        playSoundSafely(dingSound);
        previousBellWarningPosition = cursor.col;
    }
    
    // Reset previous warning position when moving away from warning position
    if (cursor.col !== warningPosition) {
        previousBellWarningPosition = -1;
    }
}

// Play key sound
function playKeySound() {
    if (isKeySoundEnabled) {
        playSoundSafely(keySound);
    }
}

// Prevent zooming when double-tapping on controls

// Replace this block:
document.querySelectorAll('.key, .small-button').forEach(element => {
    element.addEventListener('touchend', (e) => {
        e.preventDefault();
        // Existing handler code...
    }, { passive: false });
});

// With this improved version:
document.querySelectorAll('.key, .small-button').forEach(element => {
    element.addEventListener('touchend', (e) => {
        e.preventDefault();
        // Prevent double-tap zoom and maintain touch feedback
        element.classList.remove('active');
    }, { passive: false });
});

// Initialize the app
slider.value = cursor.col;
updateCellCount();
renderBrailleGrid();

function setupFocusManagement() {
    // Make the braille writer app container focusable
    const appContainer = document.getElementById('braille-writer-app');
    appContainer.setAttribute('tabindex', '0');
    
    // Set initial focus to the app container when page loads
    appContainer.focus();
    
    // Re-focus app when clicking or tapping anywhere in the app
    appContainer.addEventListener('click', () => {
        appContainer.focus();
    });
    
    // Prevent losing focus when interacting with buttons and controls
    // But EXCLUDE the slider from preventDefault to keep it draggable
    document.querySelectorAll('.key, .small-button').forEach(element => {
        element.addEventListener('mousedown', (e) => {
            // Prevent these elements from stealing focus
            e.preventDefault();
        });
    });
    
    // Special handling for slider to maintain focus while still allowing interaction
    const slider = document.getElementById('slider');
    slider.addEventListener('mousedown', () => {
        // Re-focus app container after a slight delay to allow slider interaction to start
        setTimeout(() => {
            appContainer.focus();
        }, 10);
    });
    
    // Prevent Tab key from moving focus out of the app
    appContainer.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
        }
    });
}

// Call this function after initializing the app
slider.value = cursor.col;
updateCellCount();
renderBrailleGrid();
setupFocusManagement(); // Add this line

window.addEventListener('beforeunload', () => {
    clearInterval(movementInterval);
    clearTimeout(sliderTimeout);
});

// Add this code at the end of your script.js file

// Focus management for keyboard input
function setupFocusManagement() {
    // Make the braille writer app container focusable
    const appContainer = document.getElementById('braille-writer-app');
    appContainer.setAttribute('tabindex', '0');
    
    // Set initial focus to the app container when page loads
    window.addEventListener('load', () => {
        appContainer.focus();
    });
    
    // Set focus immediately (in case DOM already loaded)
    appContainer.focus();
    
    // Re-focus app when clicking anywhere in the app
    appContainer.addEventListener('mousedown', () => {
        appContainer.focus();
    });
    
    // Prevent Tab key from moving focus out of the app
    appContainer.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
        }
    });
    
    // Ensure focus remains on the app container even when interacting with buttons
    document.querySelectorAll('.key, .small-button').forEach(button => {
        button.addEventListener('mousedown', (e) => {
            // Allow the click to register but don't change focus
            e.preventDefault();
        });
    });
    
    // Special handling for slider to maintain functionality
    const slider = document.getElementById('slider');
    slider.addEventListener('mousedown', () => {
        // Refocus after slight delay to allow slider interaction
        setTimeout(() => {
            appContainer.focus();
        }, 10);
    });
    
    // Instructions drawer toggle shouldn't steal focus
    const instructionsToggle = document.getElementById('instructions-toggle');
    instructionsToggle.addEventListener('click', (e) => {
        e.preventDefault();
        // Toggle instructions drawer
        const drawer = document.getElementById('instructions-drawer');
        drawer.classList.toggle('open');
        // Return focus to app after toggle
        setTimeout(() => {
            appContainer.focus();
        }, 100);
    });
    
    // Handle touch events as well
    appContainer.addEventListener('touchstart', () => {
        appContainer.focus();
    });
}

// Call the focus management setup
setupFocusManagement();

// Update the existing window.beforeunload event handler to warn about data loss

window.addEventListener('beforeunload', (e) => {
    // Clean up intervals and timeouts
    clearInterval(movementInterval);
    clearTimeout(sliderTimeout);
    
    // Check if there's any data in the grid that would be lost
    const hasContent = grid.some(row => 
        row.some(cell => cell.some(dot => dot === 1))
    );
    
    // Show warning only if there's content to lose
    if (hasContent) {
        // Standard message that will appear in most browsers
        const message = "You have unsaved braille text. If you leave now, your work will be lost.";
        e.returnValue = message; // Standard for most browsers
        return message; // For older browsers
    }
});

// Add this after your existing initialization code

// Ensure all buttons have proper touch support
function setupTouchHandlers() {
    // Add touch support to all small buttons in the header
    const smallButtons = document.querySelectorAll('.small-button');
    smallButtons.forEach(button => {
        button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            // Visual feedback
            button.classList.add('active');
            // Trigger the click event
            setTimeout(() => button.click(), 0);
        }, { passive: false });
        
        button.addEventListener('touchend', (e) => {
            e.preventDefault();
            button.classList.remove('active');
        }, { passive: false });
        
        button.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            button.classList.remove('active');
        }, { passive: false });
    });
    
    // Add touch support for instructions drawer toggle
    const instructionsToggle = document.getElementById('instructions-toggle');
    instructionsToggle.addEventListener('touchstart', (e) => {
        e.preventDefault();
        instructionsToggle.classList.add('active');
        setTimeout(() => instructionsToggle.click(), 0);
    }, { passive: false });
    
    instructionsToggle.addEventListener('touchend', (e) => {
        e.preventDefault();
        instructionsToggle.classList.remove('active');
    }, { passive: false });
}

// Call this after initializing the app
setupTouchHandlers();

// Initialize the app with a single call to each setup function
slider.value = cursor.col;
updateCellCount();
renderBrailleGrid();
setupFocusManagement(); // Call this once only
setupTouchHandlers(); // Call this once only
