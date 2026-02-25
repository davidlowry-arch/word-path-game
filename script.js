// original working script.js

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

  // Generate solution path
  solutionPath = [];
  let x = 0, y = 0;
  chosenWords.forEach(word => {
    for (let i = 0; i < word.word.length; i++) {
      solutionPath.push({ x, y, letter: word.word[i], word });
      if (x < GRID_SIZE - 1) x++;
      else if (y < GRID_SIZE - 1) y++;
    }
  });

  // Fill the rest of the grid
  const grid = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    grid[i] = [];
    for (let j = 0; j < GRID_SIZE; j++) {
      const tileData = solutionPath.find(t => t.x === j && t.y === i);
      grid[i][j] = tileData ? tileData.letter : randomLetter();
    }
  }

  // Render grid
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      const tile = document.createElement('div');
      tile.classList.add('tile');
      tile.textContent = grid[i][j];
      tile.dataset.x = j;
      tile.dataset.y = i;

      if (i === 0 && j === 0) tile.classList.add('start');
      if (i === GRID_SIZE - 1 && j === GRID_SIZE - 1) tile.classList.add('goal');

      tile.addEventListener('click', handleTileClick);
      tilesContainer.appendChild(tile);
    }
  }
}

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

    ding.play();
    new Audio(expected.word.audio).play();

    if (currentIndex === solutionPath.length) {
      setTimeout(() => popup.classList.remove('hidden'), 500);
    }
  } else {
    thud.play();
  }
}

function randomLetter() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return letters[Math.floor(Math.random() * letters.length)];
}

playAgainBtn.addEventListener('click', startGame);