const svg = document.getElementById('hex-board');

const hexSize = 50; // radius
const hexWidth = Math.sqrt(3) * hexSize;
const hexHeight = 2 * hexSize;
const spacing = 5; // spacing between hexes

const cols = 10;
const rows = 10;

function hexCorner(centerX, centerY, size, i) {
  const angle_deg = 60 * i - 30;
  const angle_rad = Math.PI / 180 * angle_deg;
  return [
    centerX + size * Math.cos(angle_rad),
    centerY + size * Math.sin(angle_rad)
  ];
}

function polygonPoints(centerX, centerY, size) {
  let points = [];
  for (let i = 0; i < 6; i++) {
    const [x, y] = hexCorner(centerX, centerY, size, i);
    points.push(`${x},${y}`);
  }
  return points.join(' ');
}

for (let r = 0; r < rows; r++) {
  for (let q = 0; q < cols; q++) {
    const x = hexWidth * (q + 0.5 * (r & 1)) + spacing * q;
    const y = hexHeight * (3/4) * r + spacing * r;

    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', polygonPoints(x, y, hexSize));
    polygon.setAttribute('data-q', q);
    polygon.setAttribute('data-r', r);

    // Make SVG space a drop target
    polygon.addEventListener('dragover', (e) => e.preventDefault());
    polygon.addEventListener('drop', (e) => {
      e.preventDefault();
      const pieceType = e.dataTransfer.getData('text/plain');
      const px = e.clientX;
      const py = e.clientY;

      const piecesLayer = document.getElementById('pieces-layer');
      const newPiece = document.createElement('div');
      newPiece.className = 'piece';
      newPiece.textContent = pieceType;
      newPiece.style.left = `${px - 25}px`;
      newPiece.style.top = `${py - 25}px`;
      piecesLayer.appendChild(newPiece);

      console.log(`Dropped ${pieceType} on q=${q}, r=${r}`);
    });

    svg.appendChild(polygon);
  }
}
