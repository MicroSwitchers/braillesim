let ROWS = 20; 
let COLS = 31;  // Will be dynamically calculated
const EMPTY_CELL = [0, 0, 0, 0, 0, 0];
let MIN_COLS = 15; // Minimum number of columns to ensure usability
const keyMap = {
    'f': 0, 'd': 1, 's': 2, 'j': 3, 'k': 4, 'l': 5,
    'g': 'space', 'h': 'space',
    'a': 'linespace', ';': 'backspace',
    'arrowup': 'up', 'arrowdown': 'down', 'arrowleft': 'left', 'arrowright': 'right'
};
const dotKeys = new Set(['f', 'd', 's', 'j', 'k', 'l']);
const spaceKeys = new Set(['g', 'h']);
const movementKeys = new Set(['arrowup', 'arrowdown', 'arrowleft', 'arrowright']);

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
    cellCount.textContent = `Cell: ${cursor.col + 1} / ${COLS}`;
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
    // Use requestAnimationFrame for smoother rendering
    requestAnimationFrame(() => {
        // Check if we need to create the grid from scratch or can update it
        if (brailleGrid.children.length === 0) {
            createFullGrid();
        } else {
            updateExistingGrid();
        }
        
        // Scroll to make cursor visible with less jank
        const currentCell = document.querySelector('.current-cell');
        if (currentCell) {
            // Only scroll if needed
            const rect = currentCell.getBoundingClientRect();
            const containerRect = brailleGrid.getBoundingClientRect();
            
            if (rect.left < containerRect.left || 
                rect.right > containerRect.right ||
                rect.top < containerRect.top || 
                rect.bottom > containerRect.bottom) {
                    
                currentCell.scrollIntoView({
                    behavior: 'auto', // Changed from 'smooth' for better performance
                    block: 'nearest',
                    inline: 'center'
                });
            }
        }
    });
}

// Function to create the entire grid
function createFullGrid() {
    const fragment = document.createDocumentFragment(); // Use document fragment for better performance
    
    for (let i = 0; i < ROWS; i++) {
        const rowElement = document.createElement('div');
        rowElement.className = 'braille-row';
        rowElement.dataset.row = i;
        
        for (let j = 0; j < COLS; j++) {
            const cellElement = createBrailleCell(grid[i][j], i, j);
            rowElement.appendChild(cellElement);
        }
        
        fragment.appendChild(rowElement);
    }
    
    brailleGrid.innerHTML = ''; // Clear existing content
    brailleGrid.appendChild(fragment);
}

// Function to update only changed cells
function updateExistingGrid() {
    // Update current cell indicators
    document.querySelectorAll('.current-cell').forEach(cell => {
        cell.classList.remove('current-cell');
    });
    
    // Find the current row and appropriate cell
    const rowElement = brailleGrid.children[cursor.row];
    if (rowElement && rowElement.children[cursor.col]) {
        rowElement.children[cursor.col].classList.add('current-cell');
    }
    
    // Update dot states for visible cells only
    for (let i = Math.max(0, cursor.row - 5); i <= Math.min(ROWS - 1, cursor.row + 5); i++) {
        const rowElement = brailleGrid.children[i];
        if (!rowElement) continue;
        
        for (let j = Math.max(0, cursor.col - 15); j <= Math.min(COLS - 1, cursor.col + 15); j++) {
            const cellElement = rowElement.children[j];
            if (!cellElement) continue;
            
            const dotContainer = cellElement.querySelector('.braille-dot-container');
            if (!dotContainer) continue;
            
            // Update each dot's state if needed
            const dots = dotContainer.querySelectorAll('.braille-dot');
            [0, 3, 1, 4, 2, 5].forEach((dotIndex, visualPosition) => {
                const dot = dots[visualPosition];
                const isActive = grid[i][j][dotIndex] === 1;
                const hasActiveClass = dot.classList.contains('braille-dot-active');
                
                // Only update if the state changed
                if (isActive !== hasActiveClass) {
                    dot.classList.toggle('braille-dot-active');
                    dot.classList.toggle('braille-dot-inactive');
                }
            });
        }
    }
}

// Optimize cell creation with event delegation
function createBrailleCell(cell, rowIndex, colIndex) {
    const isCurrentCell = rowIndex === cursor.row && colIndex === cursor.col;
    const cellElement = document.createElement('div');
    cellElement.className = `braille-cell ${isCurrentCell ? 'current-cell' : ''}`;
    cellElement.dataset.row = rowIndex;
    cellElement.dataset.col = colIndex;

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
        
        // Remove individual event listeners and use delegation
        dotContainer.appendChild(dot);
    });

    cellElement.appendChild(dotContainer);
    return cellElement;
}

// Use event delegation for dot interaction
brailleGrid.addEventListener('mousedown', (e) => {
    const dot = e.target.closest('.braille-dot');
    if (dot && isEraseMode) {
        const row = parseInt(dot.dataset.row);
        const col = parseInt(dot.dataset.col);
        const dotIndex = parseInt(dot.dataset.dotIndex);
        eraseDot(row, col, dotIndex);
    }
});

brailleGrid.addEventListener('mouseover', (e) => {
    if (isMouseDown && isEraseMode) {
        const dot = e.target.closest('.braille-dot');
        if (dot) {
            const row = parseInt(dot.dataset.row);
            const col = parseInt(dot.dataset.col);
            const dotIndex = parseInt(dot.dataset.dotIndex);
            eraseDot(row, col, dotIndex);
        }
    }
});

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

// Touch event handlers
function handleTouchStart(e) {
    e.preventDefault();
    Array.from(e.changedTouches).forEach(touch => {
        const target = touch.target.closest('.key');
        if (target) {
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

// Replace the existing fullscreen button click handler with this improved version

fullscreenBtn.addEventListener('click', () => {
    const appContainer = document.getElementById('braille-writer-app');
    
    if (!document.fullscreenElement) {
        // Request fullscreen on the app container, not the entire document
        appContainer.requestFullscreen().then(() => {
            isFullscreen = true;
            fullscreenBtn.classList.add('active');
            fullscreenBtn.textContent = "Exit Full";
        }).catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen().then(() => {
                isFullscreen = false;
                fullscreenBtn.classList.remove('active');
                fullscreenBtn.textContent = "Full Screen";
            }).catch(err => {
                console.error(`Error attempting to disable full-screen mode: ${err.message}`);
            });
        }
    }
});

// Add an event listener for fullscreen changes
document.addEventListener('fullscreenchange', () => {
    const isInFullscreen = Boolean(document.fullscreenElement);
    isFullscreen = isInFullscreen;
    
    if (isInFullscreen) {
        fullscreenBtn.classList.add('active');
        fullscreenBtn.textContent = "Exit Full";
    } else {
        fullscreenBtn.classList.remove('active');
        fullscreenBtn.textContent = "Full Screen";
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
document.querySelectorAll('.key, .small-button').forEach(element => {
    element.addEventListener('touchend', (e) => {
        e.preventDefault();
        // Existing handler code...
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

// Add touch event handling for top buttons

function setupTouchSupport() {
    // Get all buttons in the header
    const headerButtons = document.querySelectorAll('.header-buttons .small-button');
    
    // Add touch handlers to each button
    headerButtons.forEach(button => {
        button.addEventListener('touchstart', function(e) {
            // Don't prevent default here to allow the touch to register
            this.classList.add('active');
        }, { passive: true });
        
        button.addEventListener('touchend', function(e) {
            this.classList.remove('active');
            
            // Manually trigger the click event
            this.click();
            
            // Refocus on app container after a slight delay
            setTimeout(() => {
                const appContainer = document.getElementById('braille-writer-app');
                if (appContainer) appContainer.focus();
            }, 100);
        });
    });
    
    // Also add touch support for key buttons
    document.querySelectorAll('.key').forEach(key => {
        key.addEventListener('touchstart', function(e) {
            this.classList.add('active');
            
            // Get the corresponding keyboard key from the button ID
            const buttonId = this.id;
            const keyboardKey = keyButtonMap[buttonId];
            
            if (keyboardKey) {
                // Simulate the keyboard event
                handleKeyDown({ key: keyboardKey, preventDefault: () => {} });
            }
        }, { passive: true });
        
        key.addEventListener('touchend', function(e) {
            this.classList.remove('active');
            
            // Get the corresponding keyboard key from the button ID
            const buttonId = this.id;
            const keyboardKey = keyButtonMap[buttonId];
            
            if (keyboardKey) {
                // Simulate key up
                handleKeyUp({ key: keyboardKey });
            }
            
            // Refocus on app container
            setTimeout(() => {
                const appContainer = document.getElementById('braille-writer-app');
                if (appContainer) appContainer.focus();
            }, 100);
        });
    });
}

// Update the focus management function
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
    
    // MODIFY THIS PART: Don't prevent default for button clicks
    document.querySelectorAll('.key, .small-button').forEach(button => {
        button.addEventListener('mousedown', (e) => {
            // Allow the event to proceed naturally for buttons
            // DON'T call e.preventDefault() here
            
            // Refocus after the event
            setTimeout(() => {
                appContainer.focus();
            }, 10);
        });
    });
    
    // Special handling for slider to maintain functionality
    const slider = document.getElementById('slider');
    slider.addEventListener('mousedown', () => {
        // Refocus app container after a slight delay to allow slider interaction
        setTimeout(() => {
            appContainer.focus();
        }, 10);
    });
}

// Initialize everything in one place
function initializeBrailleWriter() {
    // Do initial size calculation after a small delay to ensure DOM has fully loaded
    setTimeout(() => {
        resizeGridToFit();
    }, 100);
    
    slider.value = cursor.col;
    updateCellCount();
    createFullGrid(); // Use the new function instead of renderBrailleGrid
    setupFocusManagement();
    setupTouchSupport();
    
    // Throttled window resize handler
    let resizeTimeout;
    window.addEventListener('resize', () => {
        if (resizeTimeout) clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            resizeGridToFit(); // Recalculate on resize
        }, 250);
    });
}

// Call this once when document is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeBrailleWriter);
} else {
    initializeBrailleWriter();
}

// Replace the static grid initialization with a function
function initializeGrid(rows, cols) {
    return Array.from({ length: rows }, () => 
        Array.from({ length: cols }, () => [...EMPTY_CELL])
    );
}

// Create initial grid
let grid = initializeGrid(ROWS, COLS);

// Add this function to calculate optimal column count
function calculateOptimalColumnCount() {
    // Get the braille grid width 
    const gridWidth = brailleGrid.clientWidth;
    
    // Calculate cell width including margins (20px cell width + 2px left margin + 2px right margin)
    const cellTotalWidth = 24; 
    
    // Calculate how many cells can fit in the grid width
    const possibleCols = Math.floor(gridWidth / cellTotalWidth);
    
    // Ensure we have at least the minimum number of columns
    return Math.max(possibleCols, MIN_COLS);
}

// Create a function to resize the grid when needed
function resizeGridToFit() {
    const newColCount = calculateOptimalColumnCount();
    
    // Only proceed if column count has changed
    if (newColCount !== COLS) {
        console.log(`Resizing grid: ${COLS} → ${newColCount} columns`);
        
        // Create a new grid with new dimensions
        const newGrid = initializeGrid(ROWS, newColCount);
        
        // Copy existing content to new grid
        for (let i = 0; i < ROWS; i++) {
            for (let j = 0; j < Math.min(COLS, newColCount); j++) {
                if (i < grid.length && j < grid[i].length) {
                    newGrid[i][j] = [...grid[i][j]];
                }
            }
        }
        
        // Update global variables
        COLS = newColCount;
        grid = newGrid;
        
        // Update slider max value
        slider.max = COLS - 1;
        
        // Ensure cursor is within bounds
        cursor.col = Math.min(cursor.col, COLS - 1);
        
        // Update UI
        updateCellCount();
        createFullGrid(); // Recreate the entire grid with new column count
        
        // Update bell warning position
        checkBellWarning();
        
        // Update slider after changing COLS
        updateSlider();
    }
}

// Replace the updateCellCount function
function updateCellCount() {
    cellCount.textContent = `Cell: ${cursor.col + 1} / ${COLS}`;
}

// Modify the initializeBrailleWriter function to include our new resize functionality
function initializeBrailleWriter() {
    // Do initial size calculation after a small delay to ensure DOM has fully loaded
    setTimeout(() => {
        resizeGridToFit();
    }, 100);
    
    slider.value = cursor.col;
    updateCellCount();
    createFullGrid();
    setupFocusManagement();
    setupTouchSupport();
    
    // Throttled window resize handler
    let resizeTimeout;
    window.addEventListener('resize', () => {
        if (resizeTimeout) clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            resizeGridToFit(); // Recalculate on resize
        }, 250);
    });
}

// Add this function to update the slider when column count changes
function updateSlider() {
    // Update slider attributes
    slider.max = COLS - 1;
    
    // Update cell count
    updateCellCount();
    
    // If cursor position exceeds new max, adjust it
    if (cursor.col >= COLS) {
        cursor.col = COLS - 1;
        slider.value = cursor.col;
    }
}

// Call this function in resizeGridToFit() after updating COLS
function resizeGridToFit() {
    const newColCount = calculateOptimalColumnCount();
    
    // Only proceed if column count has changed
    if (newColCount !== COLS) {
        // ...existing code...
        
        // Update slider after changing COLS
        updateSlider();
        
        // ...rest of existing code...
    }
}
