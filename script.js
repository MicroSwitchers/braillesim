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

// REPLACE this entire section around line 349:

// First, remove ALL event listeners from the erase mode button
function setupEraseModeButton() {
    // Use the existing button reference from earlier in the code
    // Don't create a new variable
    const newBtn = eraseModeBtn.cloneNode(true);
    eraseModeBtn.parentNode.replaceChild(newBtn, eraseModeBtn);
    
    // Update our reference to point to the new button
    // This avoids the duplicate variable declaration
    Object.keys(buttonKeyMap).forEach(key => {
        if (buttonKeyMap[key] === eraseModeBtn) {
            buttonKeyMap[key] = newBtn;
        }
    });
    
    // Add fresh click handler for mouse
    newBtn.addEventListener('click', () => {
        toggleEraseMode(newBtn);
    });

    // Add dedicated touch handlers
    newBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Visual feedback
        newBtn.classList.add('touch-active');
    }, { passive: false });

    newBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Remove touch feedback
        newBtn.classList.remove('touch-active');
        // Toggle erase mode
        toggleEraseMode(newBtn);
    }, { passive: false });
}

// Centralized function to toggle erase mode
function toggleEraseMode(btn = eraseModeBtn) {
    isEraseMode = !isEraseMode;
    
    // Update visual state
    btn.classList.toggle('active', isEraseMode);
    brailleGrid.classList.toggle('erase-mode', isEraseMode);
    
    // Change cursor
    brailleGrid.style.cursor = isEraseMode ? 'crosshair' : 'default';
    
    // Force redraw for mobile browsers
    btn.style.display = 'none';
    btn.offsetHeight; // Force reflow
    btn.style.display = '';
    
    console.log(`Erase mode ${isEraseMode ? 'enabled' : 'disabled'}`);
}

// Replace the renderBrailleGrid function with this optimized version

// REPLACE the entire renderBrailleGrid function with this truly optimized version:
function renderBrailleGrid() {
    // Only create the grid initially if it doesn't exist
    if (brailleGrid.childElementCount === 0) {
        // First-time grid creation
        for (let i = 0; i < ROWS; i++) {
            const rowElement = document.createElement('div');
            rowElement.className = 'braille-row';
            
            for (let j = 0; j < COLS; j++) {
                const cellElement = document.createElement('div');
                cellElement.className = 'braille-cell';
                
                const dotContainer = document.createElement('div');
                dotContainer.className = 'braille-dot-container';
                
                // Visual order mapping for dots
                const visualOrder = [0, 3, 1, 4, 2, 5];
                
                // Modify the dot creation in renderBrailleGrid
                // Find the code where you create dot elements (around line 733)
                // Replace or modify this section:

                for (let k = 0; k < 6; k++) {
                    const dotElement = document.createElement('div');
                    dotElement.className = 'braille-dot braille-dot-inactive';
                    
                    // Add data attributes for event delegation
                    dotElement.dataset.row = i;
                    dotElement.dataset.col = j;
                    dotElement.dataset.dotIndex = visualOrder[k];
                    
                    dotContainer.appendChild(dotElement);
                }

                cellElement.appendChild(dotContainer);
                rowElement.appendChild(cellElement);
            }
            
            brailleGrid.appendChild(rowElement);
        }
        
        // Use event delegation instead of individual listeners
        brailleGrid.addEventListener('mousedown', (e) => {
            const dot = e.target.closest('.braille-dot');
            if (!dot || !isEraseMode) return;
            
            const row = parseInt(dot.dataset.row);
            const col = parseInt(dot.dataset.col);
            const dotIndex = parseInt(dot.dataset.dotIndex);
            
            eraseDot(row, col, dotIndex);
        });
        
        brailleGrid.addEventListener('mouseenter', (e) => {
            const dot = e.target.closest('.braille-dot');
            if (!dot || !isEraseMode || !isMouseDown) return;
            
            const row = parseInt(dot.dataset.row);
            const col = parseInt(dot.dataset.col);
            const dotIndex = parseInt(dot.dataset.dotIndex);
            
            eraseDot(row, col, dotIndex);
        }, true); // Use capture phase for better detection

        // Add touch event handlers for erasing dots
        brailleGrid.addEventListener('touchstart', handleTouchEraser, { passive: false });
        brailleGrid.addEventListener('touchmove', handleTouchEraser, { passive: false });
    }
    
    // Update only what needs to change - cell classes and dot states
    const rows = brailleGrid.children;
    
    for (let i = 0; i < ROWS; i++) {
        const row = rows[i];
        const cells = row.children;
        
        for (let j = 0; j < COLS; j++) {
            const cell = cells[j];
            const isCurrentCell = (i === cursor.row && j === cursor.col);
            
            // Only update cell class if needed
            if (isCurrentCell && !cell.classList.contains('current-cell')) {
                cell.classList.add('current-cell');
            } else if (!isCurrentCell && cell.classList.contains('current-cell')) {
                cell.classList.remove('current-cell');
            }
            
            // Update dot states
            const dotContainer = cell.firstChild;
            const dots = dotContainer.children;
            const visualOrder = [0, 3, 1, 4, 2, 5];
            
            for (let k = 0; k < 6; k++) {
                const dot = dots[k];
                const dotIndex = visualOrder[k];
                const isActive = grid[i][j][dotIndex] === 1;
                
                // Only update dot class if needed
                if (isActive && !dot.classList.contains('braille-dot-active')) {
                    dot.className = 'braille-dot braille-dot-active';
                } else if (!isActive && dot.classList.contains('braille-dot-active')) {
                    dot.className = 'braille-dot braille-dot-inactive';
                }
            }
        }
    }
    
    // Scroll to make cursor visible - use requestAnimationFrame for smoother scrolling
    requestAnimationFrame(() => {
        const currentCell = document.querySelector('.current-cell');
        if (currentCell) {
            currentCell.scrollIntoView({
                behavior: 'auto', // Using auto instead of smooth for better performance
                block: 'nearest',
                inline: 'center'
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

// Replace the entire instructions drawer logic with this simplified version

// Simple drawer toggle function - cleaner approach with no duplicates
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

// Call this function at the VERY END of your script, after all other initialization
setupInstructionsDrawer();

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
        // Refocus app container after a slight delay to allow slider interaction
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

// Add these new functions for touch-based erasing
function handleTouchEraser(e) {
    if (!isEraseMode) return;
    
    e.preventDefault(); // Prevent scrolling while erasing
    
    Array.from(e.changedTouches).forEach(touch => {
        // Get the element under the touch point
        const touchTarget = document.elementFromPoint(touch.clientX, touch.clientY);
        
        // Check if we're touching a dot
        const dot = touchTarget.closest('.braille-dot');
        if (dot && dot.classList.contains('braille-dot-active')) {
            const row = parseInt(dot.dataset.row);
            const col = parseInt(dot.dataset.col);
            const dotIndex = parseInt(dot.dataset.dotIndex);
            
            // Only erase if the dot is active
            eraseDot(row, col, dotIndex);
        }
    });
}

// Replace the eraseDot function with this improved version
function eraseDot(rowIndex, colIndex, dotIndex) {
    // Check if the dot is actually raised before erasing
    if (grid[rowIndex][colIndex][dotIndex] === 1) {
        grid[rowIndex][colIndex][dotIndex] = 0;
        
        // Provide visual feedback for touch devices
        const dot = document.querySelector(`.braille-dot[data-row="${rowIndex}"][data-col="${colIndex}"][data-dot-index="${dotIndex}"]`);
        if (dot) {
            // Add a brief animation effect
            dot.classList.add('erasing');
            setTimeout(() => {
                dot.classList.remove('erasing');
            }, 300);
        }
        
        // Only re-render the specific dot that changed for better performance
        updateDotState(rowIndex, colIndex, dotIndex, false);
    }
}

// Add this new function to update a specific dot without re-rendering everything
function updateDotState(row, col, dotIndex, isActive) {
    const cell = brailleGrid.children[row]?.children[col];
    if (!cell) return;
    
    const dotContainer = cell.firstChild;
    if (!dotContainer) return;
    
    // Find the dot with the matching data attributes
    const dot = Array.from(dotContainer.children).find(
        d => parseInt(d.dataset.row) === row && 
             parseInt(d.dataset.col) === col && 
             parseInt(d.dataset.dotIndex) === dotIndex
    );
    
    if (dot) {
        // Update the dot's class without re-rendering the entire grid
        dot.className = `braille-dot ${isActive ? 'braille-dot-active' : 'braille-dot-inactive'}`;
    }
}

// Replace your existing setupTouchHandlers function with this one

// REPLACE the setupTouchHandlers function with this version

function setupTouchHandlers() {
    // Add touch support to small buttons EXCEPT erase mode which is handled separately
    const smallButtons = document.querySelectorAll('.small-button:not(#erase-mode-btn)');
    smallButtons.forEach(button => {
        // First clean up any existing handlers to prevent duplication
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        // Add new handlers
        newButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            // Visual feedback
            newButton.classList.add('active');
            // Trigger the click event
            setTimeout(() => newButton.click(), 10);
        }, { passive: false });
        
        newButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            
            // Special handling for fullscreen button
            if (newButton.id === 'fullscreen-btn' && isFullscreen) {
                // Keep the active class when enabled
                return;
            }
            
            // For other buttons, remove the active class
            newButton.classList.remove('active');
        }, { passive: false });
    });
}

// Initialize the app with a single call to each setup function
slider.value = cursor.col;
updateCellCount();
renderBrailleGrid();
setupFocusManagement(); // Call this once only
setupTouchHandlers(); // Call this once only

// Initialize the app (single initialization block at the end)
function initApp() {
    // Initial values
    slider.value = cursor.col;
    updateCellCount();
    renderBrailleGrid();
    
    // Set up focus management (once)
    const appContainer = document.getElementById('braille-writer-app');
    appContainer.setAttribute('tabindex', '0');
    appContainer.focus();
    
    // Set up focus event handlers
    appContainer.addEventListener('click', () => appContainer.focus());
    appContainer.addEventListener('mousedown', () => appContainer.focus());
    appContainer.addEventListener('touchstart', () => appContainer.focus());
    
    // Prevent Tab key from moving focus out
    appContainer.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') e.preventDefault();
    });
    
    // Prevent buttons from stealing focus
    document.querySelectorAll('.key, .small-button').forEach(button => {
        button.addEventListener('mousedown', (e) => e.preventDefault());
    });
    
    // Special handling for slider to maintain functionality
    slider.addEventListener('mousedown', () => {
        setTimeout(() => appContainer.focus(), 10);
    });
    
    // Set up touch handlers for all buttons
    const smallButtons = document.querySelectorAll('.small-button');
    smallButtons.forEach(button => {
        button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            button.classList.add('active');
            setTimeout(() => button.click(), 0);
        }, { passive: false });
        
        button.addEventListener('touchend', (e) => {
            e.preventDefault();
            button.classList.remove('active');
        }, { passive: false });
    });
    
    // Prevent double-tap zoom on iOS
    document.addEventListener('touchend', (e) => {
        e.preventDefault();
    }, { passive: false });
    
    // Set up instructions drawer (just add this line)
    setupInstructionsDrawer();
}

// Call initialization once
initApp();

// Clean up on page unload
window.addEventListener('beforeunload', (e) => {
    clearInterval(movementInterval);
    clearTimeout(sliderTimeout);
    
    // Check if there's any data that would be lost
    const hasContent = grid.some(row => 
        row.some(cell => cell.some(dot => dot === 1))
    );
    
    if (hasContent) {
        const message = "You have unsaved braille text. If you leave now, your work will be lost.";
        e.returnValue = message;
        return message;
    }
});

// Replace your fullscreen button handler with this fixed version

fullscreenBtn.addEventListener('click', () => {
    try {
        const appElement = document.getElementById('braille-writer-app');
        
        if (!document.fullscreenElement) {
            // Enter fullscreen
            appElement.requestFullscreen().then(() => {
                isFullscreen = true;
                // Important: Set active class AFTER fullscreen is successfully entered
                fullscreenBtn.classList.add('active');
                fullscreenBtn.textContent = "Exit Full";
                
                // Apply fullscreen styles
                appElement.classList.add('fullscreen-mode');
                document.body.classList.add('fullscreen-active');
            }).catch(err => {
                console.error(`Fullscreen error: ${err.message}`);
            });
        } else {
            // Exit fullscreen
            document.exitFullscreen().then(() => {
                isFullscreen = false;
                // Important: Remove active class AFTER fullscreen is successfully exited
                fullscreenBtn.classList.remove('active');
                fullscreenBtn.textContent = "Full Screen";
                
                // Remove fullscreen styles
                appElement.classList.remove('fullscreen-mode');
                document.body.classList.remove('fullscreen-active');
            }).catch(err => {
                console.error(`Exit fullscreen error: ${err.message}`);
            });
        }
    } catch (e) {
        console.error("Fullscreen toggle failed:", e);
    }
});

// Add this event listener to handle when user exits fullscreen via browser controls
document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && isFullscreen) {
        // User exited fullscreen via browser controls - update our state
        isFullscreen = false;
        fullscreenBtn.classList.remove('active');
        fullscreenBtn.textContent = "Full Screen";
        
        const appElement = document.getElementById('braille-writer-app');
        appElement.classList.remove('fullscreen-mode');
        document.body.classList.remove('fullscreen-active');
    }
});

// REPLACE the initApp function and initialization code at the end of your file

// IMPORTANT: Remove any duplicate calls to setupTouchHandlers and setupFocusManagement
// Delete these lines wherever they appear elsewhere in the file:
// setupTouchHandlers();
// setupFocusManagement();

// Single initialization function - call this only ONCE at the end of your file
function initializeApp() {
    // Initial values
    slider.value = cursor.col;
    updateCellCount();
    renderBrailleGrid();
    
    // Setup focus management
    const appContainer = document.getElementById('braille-writer-app');
    appContainer.setAttribute('tabindex', '0');
    appContainer.focus();
    
    // Setup the instructions drawer
    setupInstructionsDrawer();
    
    // Setup touch handlers for everything except erase button
    setupTouchHandlers();
    
    console.log("App initialization completed");
}

// Call this ONCE at the very end of your file
// Remove other calls to initialization functions
initializeApp();

// Clean up on page unload
window.addEventListener('beforeunload', (e) => {
    clearInterval(movementInterval);
    clearTimeout(sliderTimeout);
    
    // Check if there's any data that would be lost
    const hasContent = grid.some(row => 
        row.some(cell => cell.some(dot => dot === 1))
    );
    
    if (hasContent) {
        const message = "You have unsaved braille text. If you leave now, your work will be lost.";
        e.returnValue = message;
        return message;
    }
});

// Cleanup function to remove duplicate initialization
function cleanup() {
    // Clear any existing intervals and timeouts
    clearInterval(movementInterval);
    clearTimeout(sliderTimeout);
    
    // Remove duplicate event listeners from key elements
    const keysToClean = ['instructions-toggle', 'slider'];
    keysToClean.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const clone = el.cloneNode(true);
            el.parentNode.replaceChild(clone, el);
        }
    });
}

// Single initialization function that calls everything in the correct order
function initialize() {
    cleanup();
    
    // Setup core UI
    slider.value = cursor.col;
    updateCellCount();
    renderBrailleGrid();
    
    // Setup keyboard focus management
    const appContainer = document.getElementById('braille-writer-app');
    appContainer.setAttribute('tabindex', '0');
    appContainer.focus();
    
    // Setup erase button (needs special handling)
    setupEraseModeButton();
    
    // Setup touch handlers for everything except erase button
    setupTouchHandlers();
    
    // Setup drawer last
    setupInstructionsDrawer();
    
    console.log("App initialization completed successfully!");
}

// Function to set up all toggle buttons correctly
function setupToggleButtons() {
    // Get fresh references to buttons after cleanup
    const eraseModeBtn = document.getElementById('erase-mode-btn');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    
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
        eraseModeBtn.click(); // Trigger the click event
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
                    fullscreenBtn.textContent = "Exit Full";
                    appElement.classList.add('fullscreen-mode');
                    document.body.classList.add('fullscreen-active');
                }).catch(err => {
                    console.error("Fullscreen request failed:", err);
                });
            } else {
                // Exit fullscreen
                document.exitFullscreen().then(() => {
                    isFullscreen = false;
                    fullscreenBtn.classList.remove('active');
                    fullscreenBtn.textContent = "Full Screen";
                    appElement.classList.remove('fullscreen-mode');
                    document.body.classList.remove('fullscreen-active');
                }).catch(err => {
                    console.error("Exit fullscreen failed:", err);
                });
            }
        } catch (e) {
            console.error("Fullscreen toggle failed:", e);
        }
    });
    
    // Add touch support
    fullscreenBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
    }, { passive: false });
    
    fullscreenBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        fullscreenBtn.click(); // Trigger the click event
    }, { passive: false });
}

// CALL ONLY THIS FUNCTION ONCE - DELETE ALL OTHER initialization calls
masterInitialize();

// Add this function to properly set up the slider
function setupSliderControls() {
    // Make sure we have a fresh reference to the slider
    const slider = document.getElementById('slider');
    
    // Clear any existing event listeners by cloning the element
    const newSlider = slider.cloneNode(true);
    if (slider.parentNode) {
        slider.parentNode.replaceChild(newSlider, slider);
    }
    
    // Update our reference to the new slider element
    const updatedSlider = document.getElementById('slider');
    
    // Set initial value
    updatedSlider.value = cursor.col;
    
    // Add the input event listener
    updatedSlider.addEventListener('input', (e) => {
        cursor.col = parseInt(e.target.value);
        updateCellCount();
        renderBrailleGrid();
        rotateSlider();
        checkBellWarning();
    });
    
    console.log("Slider controls initialized");
}

// Modify the masterInitialize function to call setupSliderControls
function masterInitialize() {
    // First clean up any existing handlers to start fresh
    cleanupDuplicateHandlers();
    
    // Basic UI initialization
    const slider = document.getElementById('slider');
    slider.value = cursor.col;
    updateCellCount();
    renderBrailleGrid();
    
    // Set up the slider controls properly
    setupSliderControls();
    
    // Focus management setup
    const appContainer = document.getElementById('braille-writer-app');
    appContainer.setAttribute('tabindex', '0');
    appContainer.focus();
    
    // Set up special buttons with proper toggle states
    setupToggleButtons();
    
    // Register fullscreen handler
    setupFullscreenHandler();
    
    // Set up drawer AFTER cleaning up handlers
    setupInstructionsDrawer();
    
    console.log("Master initialization completed successfully!");
}

// Add this function to clean up duplicate handlers
function cleanupDuplicateHandlers() {
    // Elements that need cleanup
    const elementsToClean = [
        'slider', 
        'erase-mode-btn', 
        'fullscreen-btn',
        'instructions-toggle'
    ];
    
    // Clone and replace each element to remove existing listeners
    elementsToClean.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            const clone = element.cloneNode(true);
            element.parentNode.replaceChild(clone, element);
        }
    });
    
    console.log("Cleaned up duplicate handlers");
}

// Add this function to properly set up the slider
function setupSliderControls() {
    // Get fresh reference to slider after cleanup
    const slider = document.getElementById('slider');
    
    // Set initial value
    slider.value = cursor.col;
    
    // Add the input event listener
    slider.addEventListener('input', (e) => {
        cursor.col = parseInt(e.target.value);
        updateCellCount();
        renderBrailleGrid();
        rotateSlider();
        checkBellWarning();
    });
    
    console.log("Slider controls initialized");
}

// Add this function to set up toggle buttons correctly
function setupToggleButtons() {
    // Get fresh references after cleanup
    const eraseModeBtn = document.getElementById('erase-mode-btn');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    
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
        eraseModeBtn.click(); // Trigger the click event
    }, { passive: false });
}

// Setup fullscreen functionality
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
                    fullscreenBtn.textContent = "Exit Full";
                    appElement.classList.add('fullscreen-mode');
                    document.body.classList.add('fullscreen-active');
                }).catch(err => {
                    console.error("Fullscreen request failed:", err);
                });
            } else {
                // Exit fullscreen
                document.exitFullscreen().then(() => {
                    isFullscreen = false;
                    fullscreenBtn.classList.remove('active');
                    fullscreenBtn.textContent = "Full Screen";
                    appElement.classList.remove('fullscreen-mode');
                    document.body.classList.remove('fullscreen-active');
                }).catch(err => {
                    console.error("Exit fullscreen failed:", err);
                });
            }
        } catch (e) {
            console.error("Fullscreen toggle failed:", e);
        }
    });
    
    // Add touch support
    fullscreenBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
    }, { passive: false });
    
    fullscreenBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        fullscreenBtn.click(); // Trigger the click event
    }, { passive: false });
}

// Modify the masterInitialize function to call all setup functions
function masterInitialize() {
    // First clean up any existing handlers to start fresh
    cleanupDuplicateHandlers();
    
    // Basic UI initialization
    const slider = document.getElementById('slider');
    slider.value = cursor.col;
    updateCellCount();
    renderBrailleGrid();
    
    // Set up the slider controls properly
    setupSliderControls();
    
    // Focus management setup
    const appContainer = document.getElementById('braille-writer-app');
    appContainer.setAttribute('tabindex', '0');
    appContainer.focus();
    
    // Set up special buttons with proper toggle states
    setupToggleButtons();
    
    // Register fullscreen handler
    setupFullscreenHandler();
    
    // Set up drawer AFTER cleaning up handlers
    setupInstructionsDrawer();
    
    console.log("Master initialization completed successfully!");
}

// ADD THIS COMPLETE INITIALIZATION SYSTEM

// Global references - IMPORTANT: always get fresh references
const elements = {
    get slider() { return document.getElementById('slider'); },
    get eraseModeBtn() { return document.getElementById('erase-mode-btn'); },
    get fullscreenBtn() { return document.getElementById('fullscreen-btn'); },
    get instructionsToggle() { return document.getElementById('instructions-toggle'); },
    get brailleGrid() { return document.getElementById('braille-grid'); },
    get appContainer() { return document.getElementById('braille-writer-app'); }
};

// Master initialization function - the ONLY one to call
function initMaster() {
    console.log("Starting master initialization...");
    
    // First cleanup ALL event listeners by replacing elements
    cleanupAllEventListeners();
    
    // Set up each component with FRESH element references
    setupSliderWithEvents();
    setupEraseModeButtonWithEvents();
    setupFullscreenButtonWithEvents();
    setupInstructionsDrawerWithEvents();
    
    // Core UI setup
    updateCellCount();
    renderBrailleGrid();
    
    // Focus management
    setupFocusHandling();
    
    console.log("Master initialization complete!");
}

// Clean ALL event listeners
function cleanupAllEventListeners() {
    console.log("Cleaning up all event listeners...");
    
    const elementsToClean = [
        'slider', 
        'erase-mode-btn', 
        'fullscreen-btn',
        'instructions-toggle'
    ];
    
    // Clone and replace each element
    elementsToClean.forEach(id => {
        const element = document.getElementById(id);
        if (element && element.parentNode) {
            const clone = element.cloneNode(true);
            element.parentNode.replaceChild(clone, element);
            console.log(`✓ Cleaned up: ${id}`);
        }
    });
    
    // Clear any running timers
    clearInterval(movementInterval);
    clearTimeout(sliderTimeout);
}

// Set up slider with events using FRESH element reference
function setupSliderWithEvents() {
    console.log("Setting up slider controls...");
    
    // ALWAYS get a fresh reference after cleanup
    const slider = elements.slider;
    
    // Set initial value
    slider.value = cursor.col;
    
    // Add event listener
    slider.addEventListener('input', (e) => {
        cursor.col = parseInt(e.target.value);
        updateCellCount();
        renderBrailleGrid();
        rotateSlider();
        checkBellWarning();
        console.log("Slider moved to:", cursor.col);
    });
    
    console.log("✓ Slider setup complete");
}

// Set up erase mode button with events
function setupEraseModeButtonWithEvents() {
    console.log("Setting up erase mode button...");
    
    // ALWAYS get a fresh reference after cleanup
    const eraseModeBtn = elements.eraseModeBtn;
    
    // Reset visual state
    eraseModeBtn.classList.toggle('active', isEraseMode);
    elements.brailleGrid.classList.toggle('erase-mode', isEraseMode);
    
    // Click handler
    eraseModeBtn.addEventListener('click', () => {
        isEraseMode = !isEraseMode;
        eraseModeBtn.classList.toggle('active', isEraseMode);
        elements.brailleGrid.classList.toggle('erase-mode', isEraseMode);
        elements.brailleGrid.style.cursor = isEraseMode ? 'crosshair' : 'default';
        console.log(`Erase mode ${isEraseMode ? 'enabled' : 'disabled'}`);
    });
    
    // Touch support
    eraseModeBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
    }, { passive: false });
    
    eraseModeBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        eraseModeBtn.click();
    }, { passive: false });
    
    console.log("✓ Erase mode button setup complete");
}

// Set up fullscreen button with events
function setupFullscreenButtonWithEvents() {
    console.log("Setting up fullscreen button...");
    
    // ALWAYS get a fresh reference after cleanup
    const fullscreenBtn = elements.fullscreenBtn;
    
    // Reset visual state
    fullscreenBtn.classList.toggle('active', isFullscreen);
    fullscreenBtn.textContent = isFullscreen ? "Exit Full" : "Full Screen";
    
    // Click handler
    fullscreenBtn.addEventListener('click', () => {
        try {
            if (!document.fullscreenElement) {
                // Enter fullscreen
                elements.appContainer.requestFullscreen().then(() => {
                    isFullscreen = true;
                    fullscreenBtn.classList.add('active');
                    fullscreenBtn.textContent = "Exit Full";
                    elements.appContainer.classList.add('fullscreen-mode');
                    document.body.classList.add('fullscreen-active');
                }).catch(err => {
                    console.error("Fullscreen request failed:", err);
                });
            } else {
                // Exit fullscreen
                document.exitFullscreen().then(() => {
                    isFullscreen = false;
                    fullscreenBtn.classList.remove('active');
                    fullscreenBtn.textContent = "Full Screen";
                    elements.appContainer.classList.remove('fullscreen-mode');
                    document.body.classList.remove('fullscreen-active');
                }).catch(err => {
                    console.error("Exit fullscreen failed:", err);
                });
            }
        } catch (e) {
            console.error("Fullscreen toggle failed:", e);
        }
    });
    
    // Touch support
    fullscreenBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
    }, { passive: false });
    
    fullscreenBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        fullscreenBtn.click();
    }, { passive: false });
    
    console.log("✓ Fullscreen button setup complete");
}

// Set up instructions drawer with events
function setupInstructionsDrawerWithEvents() {
    console.log("Setting up instructions drawer...");
    
    // ALWAYS get a fresh reference after cleanup
    const instructionsToggle = elements.instructionsToggle;
    const instructionsDrawer = document.getElementById('instructions-drawer');
    
    // Reset visual state
    const isOpen = instructionsDrawer.classList.contains('open');
    instructionsToggle.textContent = isOpen 
        ? 'Close Instructions & Settings' 
        : 'Instructions & Settings';
    
    // Click handler
    instructionsToggle.addEventListener('click', () => {
        instructionsDrawer.classList.toggle('open');
        instructionsToggle.textContent = instructionsDrawer.classList.contains('open') 
            ? 'Close Instructions & Settings' 
            : 'Instructions & Settings';
    });
    
    // Touch support
    instructionsToggle.addEventListener('touchstart', (e) => {
        e.preventDefault();
        instructionsToggle.classList.add('active');
    }, { passive: false });
    
    instructionsToggle.addEventListener('touchend', (e) => {
        e.preventDefault();
        instructionsToggle.classList.remove('active');
        instructionsToggle.click();
    }, { passive: false });
    
    console.log("✓ Instructions drawer setup complete");
}

// Focus management
function setupFocusHandling() {
    console.log("Setting up focus management...");
    
    // Make app container focusable
    elements.appContainer.setAttribute('tabindex', '0');
    elements.appContainer.focus();
    
    // Event listeners for focus
    elements.appContainer.addEventListener('click', () => elements.appContainer.focus());
    elements.appContainer.addEventListener('mousedown', () => elements.appContainer.focus());
    elements.appContainer.addEventListener('touchstart', () => elements.appContainer.focus());
    
    // Prevent Tab key from moving focus out
    elements.appContainer.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') e.preventDefault();
    });
    
    console.log("✓ Focus management setup complete");
}

// CALL THIS AT THE END - DELETE ALL OTHER INITIALIZATION CALLS
initMaster();

// CRITICAL FIX - ADD THIS TO THE VERY END OF YOUR FILE

// Simple function to fix the slider
function fixCarriageLever() {
    console.log("FIXING CARRIAGE LEVER");
    
    // Get the original slider
    const originalSlider = document.getElementById('slider');
    
    // Create a completely new slider element
    const newSlider = document.createElement('input');
    newSlider.type = 'range';
    newSlider.id = 'slider';
    newSlider.min = '0';
    newSlider.max = '30';
    newSlider.value = cursor.col;
    newSlider.className = 'slider';
    
    // Replace the old slider with the new one
    if (originalSlider && originalSlider.parentNode) {
        originalSlider.parentNode.replaceChild(newSlider, originalSlider);
        console.log("Replaced slider with fresh element");
    }
    
    // Add event listener to new slider
    newSlider.addEventListener('input', (e) => {
        cursor.col = parseInt(e.target.value);
        updateCellCount();
        renderBrailleGrid();
        
        // Call these functions if they exist
        if (typeof rotateSlider === 'function') rotateSlider();
        if (typeof checkBellWarning === 'function') checkBellWarning();
        
        console.log("Slider moved to:", cursor.col);
    });
    
    console.log("✓ Carriage lever fixed!");
    
    // Also fix the erase mode and fullscreen buttons
    fixEraseModeButton();
    fixFullscreenButton();
}

// Fix erase mode button
function fixEraseModeButton() {
    const eraseModeBtn = document.getElementById('erase-mode-btn');
    if (!eraseModeBtn) return;
    
    // Clone to remove existing listeners
    const newEraseBtn = eraseModeBtn.cloneNode(true);
    eraseModeBtn.parentNode.replaceChild(newEraseBtn, eraseModeBtn);
    
    // Add fresh event listener
    newEraseBtn.addEventListener('click', () => {
        isEraseMode = !isEraseMode;
        newEraseBtn.classList.toggle('active', isEraseMode);
        document.getElementById('braille-grid').classList.toggle('erase-mode', isEraseMode);
        document.getElementById('braille-grid').style.cursor = isEraseMode ? 'crosshair' : 'default';
    });
}

// Fix fullscreen button
function fixFullscreenButton() {
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    if (!fullscreenBtn) return;
    
    // Clone to remove existing listeners
    const newFullscreenBtn = fullscreenBtn.cloneNode(true);
    fullscreenBtn.parentNode.replaceChild(newFullscreenBtn, fullscreenBtn);
    
    // Add fresh event listener
    newFullscreenBtn.addEventListener('click', () => {
        const appElement = document.getElementById('braille-writer-app');
        
        try {
            if (!document.fullscreenElement) {
                appElement.requestFullscreen().then(() => {
                    isFullscreen = true;
                    newFullscreenBtn.classList.add('active');
                    newFullscreenBtn.textContent = "Exit Full";
                    appElement.classList.add('fullscreen-mode');
                    document.body.classList.add('fullscreen-active');
                }).catch(err => {
                    console.error("Fullscreen request failed:", err);
                });
            } else {
                document.exitFullscreen().then(() => {
                    isFullscreen = false;
                    newFullscreenBtn.classList.remove('active');
                    newFullscreenBtn.textContent = "Full Screen";
                    appElement.classList.remove('fullscreen-mode');
                    document.body.classList.remove('fullscreen-active');
                }).catch(err => {
                    console.error("Exit fullscreen failed:", err);
                });
            }
        } catch (e) {
            console.error("Fullscreen toggle failed:", e);
        }
    });
}

// Execute this fix immediately
fixCarriageLever();

// ADD THIS AT THE VERY END OF YOUR FILE:

// Simple fix for cursor/slider synchronization
function synchronizeCarriageLever() {
    console.log("FIXING CARRIAGE LEVER SYNCHRONIZATION");
    
    // Override the moveCursor function to always update slider
    const originalMoveCursor = moveCursor;
    moveCursor = function(rowDelta, colDelta, rotate = false) {
        // Call the original function
        originalMoveCursor(rowDelta, colDelta, rotate);
        
        // Explicitly update slider with fresh reference
        const currentSlider = document.getElementById('slider');
        if (currentSlider) {
            currentSlider.value = cursor.col;
        }
    };
    
    // Override handleKeyUp to ensure slider syncs when typing
    const originalHandleKeyUp = handleKeyUp;
    handleKeyUp = function(e) {
        // Call the original function
        originalHandleKeyUp(e);
        
        // Explicitly update slider with fresh reference
        const currentSlider = document.getElementById('slider');
        if (currentSlider) {
            currentSlider.value = cursor.col;
        }
    };
    
    // Make sure the slider is initially set correctly
    const currentSlider = document.getElementById('slider');
    if (currentSlider) {
        currentSlider.value = cursor.col;
    }
    
    console.log("✓ Carriage lever synchronization fixed!");
}

// Call this function to apply the fix
synchronizeCarriageLever();

// ADD THIS AT THE VERY END OF YOUR FILE:

// Fix for slider animation
function fixSliderAnimation() {
    console.log("Fixing slider animation...");
    
    // Replace the rotateSlider function to always use fresh reference
    window.rotateSlider = function() {
        clearTimeout(sliderTimeout);
        
        // Always get a fresh reference to the slider
        const currentSlider = document.getElementById('slider');
        if (!currentSlider) return;
        
        // Add the rotation class
        currentSlider.classList.add('rotated');
        
        // Set timeout to remove it
        sliderTimeout = setTimeout(() => {
            // Get fresh reference again when removing class
            const updatedSlider = document.getElementById('slider');
            if (updatedSlider) {
                updatedSlider.classList.remove('rotated');
            }
        }, 1000);
        
        console.log("Slider rotation animation applied");
    };
    
    // Make sure CSS for slider rotation works properly
    const styleCheck = document.createElement('style');
    styleCheck.textContent = `
        .slider.rotated::-webkit-slider-thumb {
            transform: rotate(20deg);
            transition: transform 0.2s ease-out;
        }
        
        .slider.rotated::-moz-range-thumb {
            transform: rotate(20deg);
            transition: transform 0.2s ease-out;
        }
        
        .slider::-webkit-slider-thumb {
            transition: transform 0.2s ease-in;
        }
        
        .slider::-moz-range-thumb {
            transition: transform 0.2s ease-in;
        }
    `;
    document.head.appendChild(styleCheck);
    
    console.log("✓ Slider animation fixed!");
}

// Call the fix
fixSliderAnimation();
