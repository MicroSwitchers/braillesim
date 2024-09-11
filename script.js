const ROWS = 20;
const COLS = 25;  // Updated to 25 columns
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
const dingSound = document.getElementById('ding-sound');
const keySound = document.getElementById('key-sound');
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
    cellCount.textContent = `Cell: ${cursor.col + 1} / ${COLS}`;
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
    checkBellWarning();
}

function handleDotInteraction(rowIndex, colIndex) {
    if (isEraseMode) {
        clearCell(rowIndex, colIndex);
        renderBrailleGrid();
    }
}

function handleMouseDown(rowIndex, colIndex) {
    isMouseDown = true;
    if (isEraseMode) {
        handleDotInteraction(rowIndex, colIndex);
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
                playKeySound();
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
        playKeySound();
    } else if (action === 'up') {
        moveCursor(-1, 0);
    } else if (action === 'down') {
        moveCursor(1, 0);
    } else if (action === 'backspace') {
        if (cursor.col > 0) {
            moveCursor(0, -1);
            playKeySound();
        }
    } else if (action === 'space') {
        moveCursor(0, 1);
        playKeySound();
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

    [0, 3, 1, 4, 2, 5].forEach(i => {
        const dot = document.createElement('div');
        dot.className = `braille-dot ${cell[i] ? 'braille-dot-active' : 'braille-dot-inactive'}`;
        dot.addEventListener('mousedown', () => handleMouseDown(rowIndex, colIndex));
        dot.addEventListener('mouseenter', () => handleMouseEnter(rowIndex, colIndex));
        dotContainer.appendChild(dot);
    });

    cellElement.appendChild(dotContainer);
    return cellElement;
}

function renderBrailleGrid() {
    brailleGrid.innerHTML = '';
    grid.forEach((row, rowIndex) => {
        const rowElement = document.createElement('div');
        rowElement.className = 'braille-row';
        row.forEach((cell, colIndex) => {
            rowElement.appendChild(renderBrailleCell(cell, rowIndex, colIndex));
        });
        brailleGrid.appendChild(rowElement);
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
document.addEventListener('mouseup', handleMouseUp);

eraseModeBtn.addEventListener('click', () => {
    isEraseMode = !isEraseMode;
    eraseModeBtn.classList.toggle('active', isEraseMode);
});

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

// Fullscreen button functionality
fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
            isFullscreen = true;
            fullscreenBtn.classList.add('active');
        }).catch(err => {
            alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen().then(() => {
                isFullscreen = false;
                fullscreenBtn.classList.remove('active');
            }).catch(err => {
                alert(`Error attempting to disable full-screen mode: ${err.message} (${err.name})`);
            });
        }
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
    if (isBellEnabled && cursor.col === warningPosition && cursor.col !== previousBellWarningPosition) {
        dingSound.play();
        previousBellWarningPosition = cursor.col; // Update previous warning position
    }
}

// Play key sound
function playKeySound() {
    if (isKeySoundEnabled) {
        keySound.play();
    }
}

// Initialize the app
slider.value = cursor.col;
updateCellCount();
renderBrailleGrid();
