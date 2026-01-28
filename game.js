// game.js

// Get the canvas and its 2D rendering context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Game Configuration ---
const TILE_SIZE = 48;
const GRID_WIDTH = canvas.width / TILE_SIZE;
const GRID_HEIGHT = canvas.height / TILE_SIZE;
const SPAWN_INTERVAL = 500; // ms
const MAX_ATTENDEES = 15;
const ATTENDEE_MOVE_INTERVAL = 500; // ms

// Game state
let score = 0;
let misses = 0;
let attendees = [];
let walkableTiles = [];
let gameOver = false;

// --- Tile & Map Definitions ---
const tileMap = [
    [1, 1, 1, 1, 1, 1, 1, 4, 4, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 3, 3, 0, 0, 2, 0, 0, 2, 0, 0, 3, 3, 0, 1],
    [1, 0, 3, 3, 0, 0, 2, 0, 0, 2, 0, 0, 3, 3, 0, 1],
    [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
    [4, 0, 0, 0, 0, 5, 0, 0, 0, 0, 5, 0, 0, 0, 0, 4],
    [1, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 1],
    [1, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 1],
    [1, 0, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 4, 4, 1, 1, 1, 1, 1, 1, 1],
];

const doors = [
    { x: 7, y: 0 },
    { x: 8, y: 0 },
    { x: 7, y: 10 },
    { x: 8, y: 10 },
    { x: 0, y: 4 },
    { x: 0, y: 5 },
    { x: 15, y: 4 },
    { x: 15, y: 5 },
];

// --- Art Assets ---
const tileArt = {
    0: ['         ', '         ', '         ', '         ', '         ', '         ', '         ', '         ', '         '], // Floor
    1: [ // Wall
        'WWWWWWWWW',
        'W W W W W',
        'WWWWWWWWW',
        'W W W W W',
        'WWWWWWWWW',
        'W W W W W',
        'WWWWWWWWW',
        'W W W W W',
        'WWWWWWWWW'
    ],
    2: [ // Chair
        '    C    ',
        '   CCC   ',
        '  CCCCC  ',
        ' CCCCCCC ',
        ' CCCCCCC ',
        ' C  C  C ',
        ' C  C  C ',
        ' C  C  C ',
        ' C  C  C '
    ],
    3: [ // Table
        'TTTTTTTTT',
        'T       T',
        'T       T',
        'T       T',
        'T       T',
        'T       T',
        'T       T',
        'T       T',
        'TTTTTTTTT'
    ],
    4: [ // Door
        ' DDDDDDD ',
        ' D     D ',
        ' D     D ',
        ' D     D ',
        ' D     D ',
        ' D     D ',
        ' D     D ',
        ' D     D ',
        ' DDDDDDD '
    ],
    5: [ // Water Cooler
        '   BBB   ',
        '  BBBBB  ',
        ' BBBBBBB ',
        'BWWWWWWWB',
        'BWWWWWWWB',
        'BWWWWWWWB',
        ' BBBBBBB ',
        '  BBBBB  ',
        '   BBB   '
    ]
};

const colorMap = {
    'W': '#cccccc', // Wall color
    'C': '#4a4a4a', // Chair/Captured color
    'T': '#8B4513', // Table/Hair color
    'D': '#666666', // Door color
    'B': '#00aedb', // Water cooler blue
    'S': '#333333', // Suit color
    'P': '#f9d49c', // Skin tone
    'E': '#d11141', // Tie/accent color
    'L': '#f37735'  // Lead/accent color
};

const playerArt = [
    '   TTT   ',
    '  TPPPT  ',
    '  SPPPS  ',
    ' SSSESSS ',
    ' SSSSSSS ',
    ' SSSSSSS ',
    ' SSSSSSS ',
    '  SSSSS  ',
    '   SSS   '
];
const enemyArt = [
    '   TTT   ',
    '  TPPPT  ',
    '  LPPPL  ',
    ' LLLLLLL ',
    ' LLLLLLL ',
    ' LLLLLLL ',
    ' LLLLLLL ',
    '  LLLLL  ',
    '   LLL   '
];
const capturedEnemyArt = [
    '   CCC   ',
    '  CPCPC  ',
    '  EPPPE  ',
    ' EEEEEEE ',
    ' EEEEEEE ',
    ' EEEEEEE ',
    ' EEEEEEE ',
    '  EEEEE  ',
    '   EEE   '
];


// --- Game Objects ---
const player = {
    gridX: 8,
    gridY: 7,
    pixelX: 8 * TILE_SIZE,
    pixelY: 7 * TILE_SIZE,
    targetPixelX: 8 * TILE_SIZE,
    targetPixelY: 7 * TILE_SIZE,
    moveSpeed: TILE_SIZE / 4
};

// --- Initialization ---
function init() {
    // Find all walkable tiles
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            if (tileMap[y][x] === 0) {
                walkableTiles.push({ x, y });
            }
        }
    }

    // Start spawning attendees
    setInterval(spawnAttendee, SPAWN_INTERVAL);

    // Start the main game loop
    gameLoop();
}


// --- Game Logic ---
function findPath(start, end) {
    const queue = [[start]];
    const visited = new Set([`${start.x},${start.y}`]);

    while (queue.length > 0) {
        const path = queue.shift();
        const { x, y } = path[path.length - 1];

        if (x === end.x && y === end.y) {
            return path;
        }

        const neighbors = [{ x, y: y - 1 }, { x, y: y + 1 }, { x: x - 1, y }, { x: x + 1, y }];

        for (const neighbor of neighbors) {
            const { x: nx, y: ny } = neighbor;
            const key = `${nx},${ny}`;

            if (
                nx >= 0 && nx < GRID_WIDTH &&
                ny >= 0 && ny < GRID_HEIGHT &&
                !visited.has(key) &&
                (tileMap[ny] && (tileMap[ny][nx] === 0 || tileMap[ny][nx] === 4))
            ) {
                visited.add(key);
                const newPath = [...path, neighbor];
                queue.push(newPath);
            }
        }
    }
    return null; // No path found
}

function findNearestDoor(start) {
    let nearestDoor = null;
    let shortestPath = null;

    for (const door of doors) {
        const path = findPath(start, door);
        if (path && (!shortestPath || path.length < shortestPath.length)) {
            shortestPath = path;
            nearestDoor = door;
        }
    }
    return { door: nearestDoor, path: shortestPath };
}

function spawnAttendee() {
    if (attendees.length >= MAX_ATTENDEES || gameOver) return;

    let entryDoor, exitDoor;
    do {
        entryDoor = doors[Math.floor(Math.random() * doors.length)];
        exitDoor = doors[Math.floor(Math.random() * doors.length)];
    } while (entryDoor.x === exitDoor.x && entryDoor.y === exitDoor.y);

    const path = findPath(entryDoor, exitDoor);
    if (!path) return; // Don't spawn if no path can be found

    const newAttendee = {
        gridX: entryDoor.x,
        gridY: entryDoor.y,
        pixelX: entryDoor.x * TILE_SIZE,
        pixelY: entryDoor.y * TILE_SIZE,
        targetPixelX: entryDoor.x * TILE_SIZE,
        targetPixelY: entryDoor.y * TILE_SIZE,
        moveSpeed: TILE_SIZE / 8,
        isCaptured: false,
        canMove: true,
        path: path,
        exitDoor: exitDoor,
        decideMove: function(reservedTiles) {
            if (!this.canMove || (this.pixelX !== this.targetPixelX || this.pixelY !== this.targetPixelY)) return;

            let newGridX = this.gridX;
            let newGridY = this.gridY;

            if (this.path && this.path.length > 1) {
                const nextStep = this.path[1];
                newGridX = nextStep.x;
                newGridY = nextStep.y;
            }

            if (this.isMoveValid(newGridX, newGridY, reservedTiles)) {
                this.gridX = newGridX;
                this.gridY = newGridY;
                this.targetPixelX = newGridX * TILE_SIZE;
                this.targetPixelY = newGridY * TILE_SIZE;
                reservedTiles.add(`${newGridX},${newGridY}`);
                if (this.path.length > 1) {
                    this.path.shift();
                }
            }

            this.canMove = false;
            setTimeout(() => { this.canMove = true; }, ATTENDEE_MOVE_INTERVAL);
        },
        isMoveValid: function(x, y, reservedTiles) {
            const tileKey = `${x},${y}`;
            if (reservedTiles.has(tileKey)) return false;
            if (!tileMap[y] || (tileMap[y][x] !== 0 && tileMap[y][x] !== 4)) return false;
            return true;
        }
    };
    attendees.push(newAttendee);
}

function update() {
    if (gameOver) return;

    // Smooth player movement
    if (player.pixelX !== player.targetPixelX) {
        const direction = Math.sign(player.targetPixelX - player.pixelX);
        player.pixelX += direction * player.moveSpeed;
        if (Math.abs(player.pixelX - player.targetPixelX) < player.moveSpeed) player.pixelX = player.targetPixelX;
    }
    if (player.pixelY !== player.targetPixelY) {
        const direction = Math.sign(player.targetPixelY - player.pixelY);
        player.pixelY += direction * player.moveSpeed;
        if (Math.abs(player.pixelY - player.targetPixelY) < player.moveSpeed) player.pixelY = player.targetPixelY;
    }

    // --- NPC Update Loop ---
    const reservedTiles = new Set();
    reservedTiles.add(`${player.targetPixelX / TILE_SIZE},${player.targetPixelY / TILE_SIZE}`);

    for (let i = attendees.length - 1; i >= 0; i--) {
        const attendee = attendees[i];

        // Remove attendees that reach their exit door
        if (attendee.gridX === attendee.exitDoor.x && attendee.gridY === attendee.exitDoor.y) {
            if (!attendee.isCaptured) {
                misses++;
                if (misses >= score * 6 && misses >= 20 && score >= 2) {
                    gameOver = true;
                }
            }
            attendees.splice(i, 1);
            continue;
        }

        attendee.decideMove(reservedTiles);

        // Smooth attendee movement
        if (attendee.pixelX !== attendee.targetPixelX) {
            const direction = Math.sign(attendee.targetPixelX - attendee.pixelX);
            attendee.pixelX += direction * attendee.moveSpeed;
            if (Math.abs(attendee.pixelX - attendee.targetPixelX) < attendee.moveSpeed) attendee.pixelX = attendee.targetPixelX;
        }
        if (attendee.pixelY !== attendee.targetPixelY) {
            const direction = Math.sign(attendee.targetPixelY - attendee.pixelY);
            attendee.pixelY += direction * attendee.moveSpeed;
            if (Math.abs(attendee.pixelY - attendee.targetPixelY) < attendee.moveSpeed) attendee.pixelY = attendee.targetPixelY;
        }
    }
}

// --- Input Handling ---
document.addEventListener('keydown', (e) => {
    // Only allow new move if player has reached target
    if (player.pixelX !== player.targetPixelX || player.pixelY !== player.targetPixelY) return;

    let newGridX = player.gridX;
    let newGridY = player.gridY;

    if (e.key === 'ArrowUp') newGridY--;
    else if (e.key === 'ArrowDown') newGridY++;
    else if (e.key === 'ArrowLeft') newGridX--;
    else if (e.key === 'ArrowRight') newGridX++;
    else return;

    // Check for wall collision first
    if (!tileMap[newGridY] || tileMap[newGridY][newGridX] !== 0) {
        return; // Blocked by wall
    }

    // Check for attendee collision
    let attendeeAtTarget = null;
    for (const attendee of attendees) {
        if (attendee.gridX === newGridX && attendee.gridY === newGridY) {
            attendeeAtTarget = attendee;
            break;
        }
    }

    if (attendeeAtTarget) {
        if (!attendeeAtTarget.isCaptured) {
            attendeeAtTarget.isCaptured = true;
            score++;
            const { door, path } = findNearestDoor({x: attendeeAtTarget.gridX, y: attendeeAtTarget.gridY});
            if (door) {
                attendeeAtTarget.exitDoor = door;
                attendeeAtTarget.path = path;
            }
        }
        return;
    }

    // If no collision, update grid position and set new pixel target
    player.gridX = newGridX;
    player.gridY = newGridY;
    player.targetPixelX = newGridX * TILE_SIZE;
    player.targetPixelY = newGridY * TILE_SIZE;
});


// --- Drawing Functions ---
function drawPixelArt(art, x, y, width, height) {
    const pixelSizeX = width / art[0].length;
    const pixelSizeY = height / art.length;

    for (let row = 0; row < art.length; row++) {
        for (let col = 0; col < art[row].length; col++) {
            const colorChar = art[row][col];
            if (colorChar !== ' ') {
                ctx.fillStyle = colorMap[colorChar];
                ctx.fillRect(x + col * pixelSizeX, y + row * pixelSizeY, pixelSizeX, pixelSizeY);
            }
        }
    }
}

function draw() {
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#999999'; // Carpet color
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw the tilemap
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            const tileId = tileMap[y][x];
            if (tileId !== 0) {
                drawPixelArt(tileArt[tileId], x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    // Draw the attendees (now leads)
    for (const attendee of attendees) {
        const art = attendee.isCaptured ? capturedEnemyArt : enemyArt;
        drawPixelArt(art, attendee.pixelX, attendee.pixelY, TILE_SIZE, TILE_SIZE);
    }

    // Draw the player
    drawPixelArt(playerArt, player.pixelX, player.pixelY, TILE_SIZE, TILE_SIZE);

    // Draw the score
    ctx.fillStyle = 'white';
    ctx.font = '24px "Press Start 2P"';
    ctx.fillText('Leads: ' + score + ' vs Misses: ' + misses, 20, 40);

    if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '60px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('YOU LOSE', canvas.width / 2, canvas.height / 2);
    }
}

// --- Main Game Loop ---
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Start the game
init();
