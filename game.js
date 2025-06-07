const board = document.getElementById('board');
const HEX_RADIUS = 6;
const HEX_SIZE = 50;
// Define CSS variable so piece text scales with hex size
document.documentElement.style.setProperty('--hex-size', `${HEX_SIZE}px`);

const zodiacSymbols = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];

let currentPlayer = 1;
let turnCount = 0;
let currentAP = 3;
const maxAP = 3;
let gamePhase = "placement";

const boardState = {};
let selectedPiece = null;
let selectedPieceHex = null;

const pieceDefinitions = {
  "♈": { name: "Aries", movement: "adjacent", skill: "Ram infinitely", AP: 1, attack: "Kill on ram" },
  "♉": { name: "Taurus", movement: "1-3 straight", skill: "Aura", AP: 2, attack: "None" },
  "♊": { name: "Gemini", movement: "adjacent", skill: "Twin teleport", AP: 1, attack: "Reveal adjacent" },
  "♋": { name: "Cancer", movement: "straight any", skill: "Barrier", AP: 2, attack: "Pinch" },
  "♌": { name: "Leo", movement: "up to 2 adjacent", skill: "Roar", AP: 3, attack: "Kill adjacent" },
  "♍": { name: "Virgo", movement: "adjacent", skill: "Cleanse", AP: 3, attack: "Reveal 2 away" },
  "♎": { name: "Libra", movement: "none", skill: "Swap", AP: 0, attack: "Conditional" },
  "♏": { name: "Scorpio", movement: "forced 3", skill: "Sting", AP: 2, attack: "Capture stunned" },
  "♐": { name: "Sagittarius", movement: "up to 2 adjacent", skill: "None", AP: 3, attack: "Infinite shot" },
  "♑": { name: "Capricorn", movement: "jump", skill: "Multi-jump", AP: 2, attack: "Kill/reveal" },
  "♒": { name: "Aquarius", movement: "adjacent", skill: "Barrier", AP: 3, attack: "None" },
  "♓": { name: "Pisces", movement: "edge slide", skill: "Edge leap", AP: 2, attack: "Kill on edge" }
};

const turnDisplay = document.getElementById("turn-display");
const phaseDisplay = document.getElementById("phase-display");
const resetButton = document.getElementById("reset-button");
const debugPanel = document.getElementById("debug-panel");
const pieceInfoPanel = document.getElementById("piece-info");
const skillButton = document.getElementById("skill-button");

const player1NameInput = document.getElementById("player1-name");
const player2NameInput = document.getElementById("player2-name");

function getCurrentPlayerName() {
  return currentPlayer === 1 ? player1NameInput.value : player2NameInput.value;
}

function updatePhaseDisplay() {
  phaseDisplay.textContent = `Phase: ${gamePhase.charAt(0).toUpperCase() + gamePhase.slice(1)}`;
}

function updateTurnDisplay() {
  const playerName = getCurrentPlayerName();
  turnDisplay.textContent = `Turn: ${turnCount} — ${playerName}'s turn — AP: ${currentAP} / ${maxAP}`;
  updateDebugPanel();
  updateSkillButton();
}

function updateDebugPanel() {
  const playerName = getCurrentPlayerName();
  debugPanel.textContent =
    `[DEBUG]\n` +
    `Phase: ${gamePhase}\n` +
    `Turn: ${turnCount}\n` +
    `Current Player: ${playerName}\n` +
    `Current AP: ${currentAP} / ${maxAP}\n` +
    `BoardState:\n` +
    JSON.stringify(boardState, null, 2);
}

function updateSkillButton() {
  if (gamePhase !== "tactical") {
    skillButton.disabled = true;
    return;
  }

  if (selectedPiece && pieceDefinitions[selectedPiece.dataset.symbol].skill !== "None" && currentAP > 0) {
    skillButton.disabled = false;
  } else {
    skillButton.disabled = true;
  }
}

skillButton.addEventListener("click", () => {
  if (selectedPiece && gamePhase === "tactical") {
    const def = pieceDefinitions[selectedPiece.dataset.symbol];
    console.log(`[SKILL USED] ${def.name} → ${def.skill}`);
    debugPanel.textContent += `\n[SKILL USED] ${def.name} → ${def.skill}`;
    currentAP--;
    if (currentAP <= 0) endTurn();
    updateTurnDisplay();
  }
});

function axialToPixel(q, r) {
  const x = HEX_SIZE * 3/2 * q;
  const y = HEX_SIZE * Math.sqrt(3) * (r + q/2);
  return { x, y };
}


function generateHexGrid(radius) {
  const cells = [];
  for (let q = -radius + 1; q < radius; q++) {
    const r1 = Math.max(-radius + 1, -q - radius + 1);
    const r2 = Math.min(radius - 1, -q + radius - 1);
    for (let r = r1; r <= r2; r++) {
      cells.push({ q, r });
    }
  }
  return cells;
}
 createBoard()
function createBoard() {
  const hexes = generateHexGrid(HEX_RADIUS);
  const offsetX = window.innerWidth / 2;
  const offsetY = window.innerHeight / 2;

  // Clear board SVG
  board.innerHTML = '';
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("viewBox", "-500 -500 1000 1000");
svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

  board.appendChild(svg);

  for (const { q, r } of hexes) {
    const { x, y } = axialToPixel(q, r);

    const points = [];
// Use slightly smaller effective hex size to avoid stroke overlap
const strokePadding = 1.5; // adjust this value if needed
const effectiveHexSize = HEX_SIZE - strokePadding;

for (let i = 0; i < 6; i++) {
  const angle = Math.PI / 3 * i;
  const px = x + effectiveHexSize * Math.cos(angle);
  const py = y + effectiveHexSize * Math.sin(angle);
  points.push(`${px},${py}`);
}


    const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    polygon.setAttribute("points", points.join(" "));
    polygon.setAttribute("class", "svg-hex");
    polygon.dataset.q = q;
    polygon.dataset.r = r;
    polygon.dataset.occupied = "";

    polygon.addEventListener("click", () => {
      if (gamePhase === "tactical") handleHexClick(polygon);
    });

    polygon.addEventListener("dragover", e => {
      if (gamePhase === "placement") e.preventDefault();
    });

  polygon.addEventListener("dragenter", e => {
  if (gamePhase !== "placement") return;
  e.preventDefault();
  if (!window.draggedPiece) return;

  const occupied = polygon.dataset.occupied;

  // Clear both player highlight classes first
  polygon.classList.remove("highlight-placement-legal-player1", "highlight-placement-legal-player2", "highlight-placement-illegal");

  if (occupied === "") {
    if (currentPlayer === 1) {
      polygon.classList.add("highlight-placement-legal-player1");
    } else {
      polygon.classList.add("highlight-placement-legal-player2");
    }
  } else {
    polygon.classList.add("highlight-placement-illegal");
  }
});


 polygon.addEventListener("dragleave", () => {
  if (gamePhase !== "placement") return;
  polygon.classList.remove("highlight-placement-legal-player1", "highlight-placement-legal-player2", "highlight-placement-illegal");
});


    polygon.addEventListener("drop", e => {
      if (gamePhase !== "placement") return;
      e.preventDefault();
      if (!window.draggedPiece) return;

      if (polygon.dataset.occupied !== "") return;

      const q = parseInt(polygon.dataset.q);
      const r = parseInt(polygon.dataset.r);
      const key = `${q},${r}`;
      const symbol = window.draggedPiece.dataset.symbol;

      boardState[key] = {
        player: window.draggedPiece.dataset.player,
        symbol: symbol,
        geminiId: window.draggedPiece.dataset.geminiId ? parseInt(window.draggedPiece.dataset.geminiId) : null,
        revealed: false,
        stunned: false
      };

      polygon.dataset.occupied = window.draggedPiece.dataset.player;
      polygon.classList.remove("highlight-placement-legal", "highlight-placement-illegal");

      polygon.classList.add(`occupied-${window.draggedPiece.dataset.player}`);

      // Add SVG piece (text)
      const pieceSvg = document.createElementNS("http://www.w3.org/2000/svg", "text");
      pieceSvg.setAttribute("x", x);
      pieceSvg.setAttribute("y", y + 5); // vertical center tweak
      pieceSvg.setAttribute("text-anchor", "middle");
      pieceSvg.setAttribute("dominant-baseline", "middle");
      pieceSvg.setAttribute("font-size", "54");
      pieceSvg.setAttribute("fill", currentPlayer === 1 ? "#0f0" : "#f00");
      pieceSvg.textContent = symbol;
pieceSvg.addEventListener("mouseenter", () => {
  const def = pieceDefinitions[pieceSvg.dataset.symbol];
  pieceInfoPanel.textContent = `${def.name} (${pieceSvg.dataset.symbol})\nMovement: ${def.movement}${def.movement !== "none" ? ` (${def.AP} AP)` : ""}\nSkill: ${def.skill}\nAttack: ${def.attack}`;
});

pieceSvg.addEventListener("mouseleave", () => {
  pieceInfoPanel.textContent = "Hover over a piece to view its ability.";
});


      pieceSvg.dataset.q = q;
      pieceSvg.dataset.r = r;
      pieceSvg.dataset.player = window.draggedPiece.dataset.player;
      pieceSvg.dataset.symbol = symbol;
      if (window.draggedPiece.dataset.geminiId) pieceSvg.dataset.geminiId = window.draggedPiece.dataset.geminiId;

      pieceSvg.addEventListener("click", (e) => {
        e.stopPropagation();
        if (gamePhase !== "tactical") return;
        if (pieceSvg.dataset.player !== (currentPlayer === 1 ? "player1" : "player2")) return;
        if (selectedPiece) selectedPiece.classList.remove("selected");
        selectedPiece = pieceSvg;
        selectedPiece.classList.add("selected");
        selectedPieceHex = `${pieceSvg.dataset.q},${pieceSvg.dataset.r}`;
        highlightLegalMoves();
        updateSkillButton();
        updateTurnDisplay();
      });

      svg.appendChild(pieceSvg);

      // Remove from bank
      window.draggedPiece.parentElement.removeChild(window.draggedPiece);
      window.draggedPiece = null;

      // Clear highlights
      document.querySelectorAll(".svg-hex").forEach(hex => {
        hex.classList.remove("highlight-placement-legal", "highlight-placement-illegal");
      });

      currentPlayer = currentPlayer === 1 ? 2 : 1;
      updateTurnDisplay();
      updatePhaseDisplay();

      const unplaced = document.querySelectorAll(`.bank-slot .piece`);
      if (unplaced.length === 0) {
        gamePhase = "tactical";
        currentAP = maxAP;
        turnCount = 0;
        currentPlayer = 1;
        selectedPiece = null;
        selectedPieceHex = null;
        updatePhaseDisplay();
        updateTurnDisplay();
        console.log("ALL PIECES PLACED — GAME STARTED!");
      }
    });

    svg.appendChild(polygon);
  }
}
function createBanks() {
  const player1Grid = document.getElementById("player1");
  const player2Grid = document.getElementById("player2");

  zodiacSymbols.forEach(symbol => {
    const count = symbol === "♊" ? 2 : 1;

    for (let i = 1; i <= count; i++) {
      const geminiId = symbol === "♊" ? i : null;

      const slot1 = document.createElement("div");
      slot1.className = "bank-slot";
      player1Grid.appendChild(slot1);

      const piece1 = createPiece(symbol, "player1", "player1-piece", geminiId);
      slot1.appendChild(piece1);

      const slot2 = document.createElement("div");
      slot2.className = "bank-slot";
      player2Grid.appendChild(slot2);

      const piece2 = createPiece(symbol, "player2", "player2-piece", geminiId);
      slot2.appendChild(piece2);
    }
  });
}

function createPiece(symbol, player, playerClass, geminiId = null) {
  const piece = document.createElement("div");
  piece.className = `piece ${playerClass}`;
  piece.textContent = symbol;
  piece.draggable = true;
  piece.dataset.player = player;
  piece.dataset.symbol = symbol;
  if (geminiId) piece.dataset.geminiId = geminiId;

  piece.addEventListener("mouseenter", () => {
    const def = pieceDefinitions[symbol];
    pieceInfoPanel.textContent = `${def.name} (${symbol})\nMovement: ${def.movement}${def.movement !== "none" ? ` (${def.AP} AP)` : ""}\nSkill: ${def.skill}\nAttack: ${def.attack}`;
  });

  piece.addEventListener("mouseleave", () => {
    pieceInfoPanel.textContent = "Hover over a piece to view its ability.";
  });

  piece.addEventListener("dragstart", e => {
    if (gamePhase !== "placement") return;
    window.draggedPiece = piece;
  });

  piece.addEventListener("dragend", e => {
    if (gamePhase !== "placement") return;
    window.draggedPiece = null;
    document.querySelectorAll(".svg-hex").forEach(hex => {
      hex.classList.remove("highlight-placement-legal", "highlight-placement-illegal");
    });
  });

  return piece;
}

function findPieceHex(piece) {
  for (const key in boardState) {
    const state = boardState[key];
    if (state.symbol === piece.dataset.symbol &&
        state.player === piece.dataset.player &&
        (state.geminiId ? state.geminiId == piece.dataset.geminiId : true)) {
      return key;
    }
  }
  return null;
}

function getLegalMoves(symbol, fromQ, fromR) {
  const def = pieceDefinitions[symbol];
  const moves = [];

  const directions = [
    [1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]
  ];

  if (def.movement === "adjacent") {
    directions.forEach(([dq, dr]) => {
      const q = fromQ + dq;
      const r = fromR + dr;
      moves.push(`${q},${r}`);
    });
  }

  if (def.movement === "1-3 straight") {
    directions.forEach(([dq, dr]) => {
      for (let step = 1; step <= 3; step++) {
        const q = fromQ + dq * step;
        const r = fromR + dr * step;
        moves.push(`${q},${r}`);
      }
    });
  }

  if (def.movement === "up to 2 adjacent") {
    directions.forEach(([dq, dr]) => {
      for (let step = 1; step <= 2; step++) {
        const q = fromQ + dq * step;
        const r = fromR + dr * step;
        moves.push(`${q},${r}`);
      }
    });
  }

  if (def.movement === "forced 3") {
    directions.forEach(([dq, dr]) => {
      const q = fromQ + dq * 3;
      const r = fromR + dr * 3;
      moves.push(`${q},${r}`);
    });
  }

  if (def.movement === "straight any") {
    directions.forEach(([dq, dr]) => {
      for (let step = 1; step <= HEX_RADIUS * 2; step++) {
        const q = fromQ + dq * step;
        const r = fromR + dr * step;
        moves.push(`${q},${r}`);
      }
    });
  }

  if (def.movement === "jump") {
    directions.forEach(([dq, dr]) => {
      const q = fromQ + dq * 2;
      const r = fromR + dr * 2;
      moves.push(`${q},${r}`);
    });
  }

  if (def.movement === "edge slide") {
    // Simple example: allow move to any adjacent edge hex (improve later)
    directions.forEach(([dq, dr]) => {
      const q = fromQ + dq;
      const r = fromR + dr;
      if (Math.abs(q) === HEX_RADIUS - 1 || Math.abs(r) === HEX_RADIUS - 1 || Math.abs(-q - r) === HEX_RADIUS - 1) {
        moves.push(`${q},${r}`);
      }
    });
  }

  return moves;
}

function highlightLegalMoves() {
  document.querySelectorAll(".svg-hex").forEach(hex => {
    hex.classList.remove("highlight-move");
  });

  if (!selectedPiece || !selectedPieceHex) return;

  const symbol = selectedPiece.dataset.symbol;
  const def = pieceDefinitions[symbol];
  if (def.movement === "none") {
    debugPanel.textContent += `\n[WARNING] Illegal move: This piece cannot move.`;
    return;
  }

  const [q, r] = selectedPieceHex.split(",").map(Number);
  const legalMoves = getLegalMoves(symbol, q, r);

  legalMoves.forEach(key => {
    const hex = document.querySelector(`.svg-hex[data-q="${key.split(",")[0]}"][data-r="${key.split(",")[1]}"]`);
    if (hex && hex.dataset.occupied === "") {
      hex.classList.add("highlight-move");
    }
  });
}

function handleHexClick(hex) {
  if (!selectedPiece || !selectedPieceHex) return;
  if (currentAP <= 0) {
    debugPanel.textContent += `\n[WARNING] Illegal move: Not enough AP.`;
    return;
  }

  const targetKey = `${hex.dataset.q},${hex.dataset.r}`;
  if (!hex.classList.contains("highlight-move")) {
    debugPanel.textContent += `\n[WARNING] Illegal move: Target hex blocked or not valid.`;
    return;
  }

  const svg = document.querySelector("#board svg");

  // Move the selected SVG piece
  selectedPiece.setAttribute("x", axialToPixel(parseInt(hex.dataset.q), parseInt(hex.dataset.r)).x);
  selectedPiece.setAttribute("y", axialToPixel(parseInt(hex.dataset.q), parseInt(hex.dataset.r)).y + 5);
  selectedPiece.dataset.q = hex.dataset.q;
  selectedPiece.dataset.r = hex.dataset.r;

  // Update board state
  delete boardState[selectedPieceHex];
  boardState[targetKey] = {
    player: selectedPiece.dataset.player,
    symbol: selectedPiece.dataset.symbol,
    geminiId: selectedPiece.dataset.geminiId ? parseInt(selectedPiece.dataset.geminiId) : null,
    revealed: false,
    stunned: false
  };

  hex.dataset.occupied = selectedPiece.dataset.player;
  hex.classList.add(`occupied-${selectedPiece.dataset.player}`);

  document.querySelectorAll(".svg-hex").forEach(h => {
    if (`${h.dataset.q},${h.dataset.r}` === selectedPieceHex) {
      h.dataset.occupied = "";
      h.classList.remove("occupied-player1", "occupied-player2");
    }
  });

  currentAP -= pieceDefinitions[selectedPiece.dataset.symbol].AP;
  if (currentAP <= 0) {
    endTurn();
  }

  selectedPiece.classList.remove("selected");
  selectedPiece = null;
  selectedPieceHex = null;
  document.querySelectorAll(".svg-hex").forEach(h => h.classList.remove("highlight-move"));
  updateTurnDisplay();
}
function endTurn() {
  turnCount++;
  currentPlayer = currentPlayer === 1 ? 2 : 1;
  currentAP = maxAP;
  selectedPiece = null;
  selectedPieceHex = null;
  document.querySelectorAll(".svg-hex").forEach(h => h.classList.remove("highlight-move"));
  updateTurnDisplay();
}

resetButton.addEventListener("click", () => {
  gamePhase = "placement";
  turnCount = 0;
  currentPlayer = 1;
  currentAP = maxAP;
  selectedPiece = null;
  selectedPieceHex = null;

  document.querySelectorAll(".svg-hex").forEach(hex => {
    hex.dataset.occupied = "";
    hex.classList.remove("occupied-player1", "occupied-player2", "highlight-move", "highlight-placement-legal", "highlight-placement-illegal");
  });

  // Clear boardState
  for (const key in boardState) {
    delete boardState[key];
  }

  // Clear SVG pieces
  const svg = document.querySelector("#board svg");
  svg.querySelectorAll("text").forEach(el => el.remove());

  // Reset banks
  const player1Grid = document.getElementById("player1");
  const player2Grid = document.getElementById("player2");
  player1Grid.innerHTML = "";
  player2Grid.innerHTML = "";

  createBanks();

  pieceInfoPanel.textContent = "Hover over a piece to view its ability.";
  updatePhaseDisplay();
  updateTurnDisplay();

  console.log("GAME RESET.");
});

// Initialize game
createBoard();
createBanks();
updatePhaseDisplay();
updateTurnDisplay();
