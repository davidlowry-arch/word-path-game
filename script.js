// script.js

const GRID_SIZE = 7;
const tilesContainer = document.getElementById('grid');
const popup = document.getElementById('popup');
const playAgainBtn = document.getElementById('play-again');

const ding = new Audio('audio/ding.mp3');
const thud = new Audio('audio/thud.mp3');

let words = [];
let solutionPath = [];
let currentIndex = 0;
let selectedTiles = [];

// Load word data
fetch('words.json')
  .then(res => res.json())
  .then(data => {
    words = data;
    startGame();
  });

// --- Start / Reset Game ---
function startGame() {
  currentIndex = 0;
  selectedTiles = [];
  solutionPath = [];
  tilesContainer.innerHTML = '';
  popup.classList.add('hidden');

  // Pick 3 random words
  const chosenWords = [];
  while (chosenWords.length < 3) {
    const w = words[Math.floor(Math.random() * words.length)];
    if (!chosenWords.includes(w)) chosenWords.push(w);
  }

  // Generate path for the words
  solutionPath = generatePath(chosenWords);

  // Fill the rest of the grid with random letters
  const grid = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    grid[i] = [];
    for (let j = 0; j < GRID_SIZE; j++) {
      const tileData = solutionPath.find(t => t.x === j && t.y === i);
      if (tileData) {
        grid[i][j] = tileData.letter;
      } else {
        grid[i][j] = randomLetter();
      }
    }
  }

  // Render the grid
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      const tile = document.createElement('div');
      tile.classList.add('tile');
      tile.textContent = grid[i][j];
      tile.dataset.x = j;
      tile.dataset.y = i;

      // Mark start and goal
      if (i === 0 && j === 0) tile.classList.add('start');
      if (i === GRID_SIZE - 1 && j === GRID_SIZE - 1) tile.classList.add('goal');

      tile.addEventListener('click', handleTileClick);
      tilesContainer.appendChild(tile);
    }
  }
}

// --- Tile Click ---
function handleTileClick(e) {
  const tile = e.currentTarget;
  const x = parseInt(tile.dataset.x);
  const y = parseInt(tile.dataset.y);

  const expected = solutionPath[currentIndex];
  if (!expected) return;

  if (x === expected.x && y === expected.y) {
    tile.classList.add('correct');
    selectedTiles.push(tile);
    currentIndex++;

    // Only play ding/audio if this is the last letter of the word
    if (expected.isWordEnd) {
      ding.play();
      new Audio(expected.word.audio).play();
    }

    // Check if game complete
    if (currentIndex === solutionPath.length) {
      setTimeout(() => popup.classList.remove('hidden'), 500);
    }
  } else {
    thud.play();
  }
}

// --- Random letter ---
function randomLetter() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return letters[Math.floor(Math.random() * letters.length)];
}

// --- Generate path for words ---
function generatePath(wordsArray) {
  const path = [];
  let x = 0, y = 0;

  wordsArray.forEach(word => {
    for (let i = 0; i < word.word.length; i++) {
      path.push({
        x,
        y,
        letter: word.word[i],
        word: word,
        isWordEnd: i === word.word.length - 1
      });

      // Move to next tile: simple approach (horizontal first)
      if (x < GRID_SIZE - 1) x++;
      else if (y < GRID_SIZE - 1) y++;
      else x++; // fallback if at edge
    }
  });

  return path;
}

// --- Play Again ---
playAgainBtn.addEventListener('click', startGame);