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

// FIXED: Updated moveCursor function that ensures slider is updated properly
function moveCursor(rowDelta, colDelta, rotate = false) {
    // Calculate new cursor position
    const newRow = Math.max(0, Math.min(ROWS - 1, cursor.row + rowDelta));
    const newCol = Math.max(0, Math.min(COLS - 1, cursor.col + colDelta));
    
    // Only proceed if position actually changed
    if (newRow !== cursor.row || newCol !== cursor.col) {
        cursor.row = newRow;
        cursor.col = newCol;
        
        // Update cell count and UI
        updateCellCount();
        
        // IMPORTANT: Update slider value to match cursor position
        slider.value = cursor.col;
        
        // Render the updated grid
        renderBrailleGrid();
        
        // Apply rotation effect to slider if requested
        if (rotate) {
            rotateSlider();
        }
        
        // Check for bell warning
        checkBellWarning();
        
        // Force refresh the slider appearance
        refreshSlider();
    }
}

// NEW: Add a function to force-refresh the slider appearance
function refreshSlider() {
    // This forces the browser to re-render the slider by causing a reflow
    slider.style.display = 'none';
    slider.offsetHeight; // Force reflow
    slider.style.display = '';
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

// FIXED: Updated handleKeyUp function 
function handleKeyUp(e) {
    const key = e.key.toLowerCase();
    const action = keyMap[key];

    if (action !== undefined) {
        activeKeys.delete(key);
        clearInterval(movementInterval);

        if (activeKeys.size === 0) {
            if (dotKeys.has(key) || spaceKeys.has(key)) {
                // Move cursor forward after entering a dot or space
                moveCursor(0, 1, true); // Added third parameter as 'true' to rotate the slider
                
                // Play sound if key sound is enabled
                if (isKeySoundEnabled) {
                    playSoundSafely(keySound);
                }
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

// FIXED: Updated handleDotButtonRelease function
function handleDotButtonRelease() {
    if (activeKeys.size > 0) {
        // Store all keys that need to be released
        const keysToRelease = Array.from(activeKeys);
        
        // Clear the activeKeys set before dispatching events
        // This prevents issues with cursor movement tracking
        activeKeys.clear();
        
        // Now dispatch keyup events for each key
        keysToRelease.forEach(key => {
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

// FIXED: update slider input event handler to ensure two-way sync
slider.addEventListener('input', (e) => {
    const newCol = parseInt(e.target.value);
    
    // Only update if position actually changed
    if (newCol !== cursor.col) {
        cursor.col = newCol;
        updateCellCount();
        renderBrailleGrid();
        rotateSlider();
        checkBellWarning();
    }
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

// Add touch handlers for erasing
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

// Update a specific dot state
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
    
    // Fullscreen change handler
    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement && isFullscreen) {
            isFullscreen = false;
            fullscreenBtn.classList.remove('active');
            fullscreenBtn.textContent = "Full Screen";
            
            appElement.classList.remove('fullscreen-mode');
            document.body.classList.remove('fullscreen-active');
        }
    });
    
    // Touch support for fullscreen button
    fullscreenBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
    }, { passive: false });
    
    fullscreenBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        fullscreenBtn.click();
    }, { passive: false });
}

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

// FIXED: Consolidated initialization function - this is the ONLY one that should be called
function initializeApp() {
    // Clean up any existing event handlers and intervals
    clearInterval(movementInterval);
    clearTimeout(sliderTimeout);
    
    // Set initial values
    slider.value = cursor.col;
    updateCellCount();
    renderBrailleGrid();
    
    // Set up focus management
    const appContainer = document.getElementById('braille-writer-app');
    appContainer.setAttribute('tabindex', '0');
    appContainer.focus();
    
    // Set up the instructions drawer
    setupInstructionsDrawer();
    
    // Set up touch handlers
    setupTouchHandlers();
    
    // Set up erase button
    setupEraseModeButton();
    
    // Set up fullscreen handler
    setupFullscreenHandler();
    
    console.log("Braille Writer app initialization completed");
}

// IMPORTANT: Remove all other initialize calls and ONLY call this one
initializeApp();