let wordsData = [];
let grid = [];
let solutionPath = [];
let currentIndex = 0;
let selectedTiles = [];
let chosenWords = [];
let currentWordIndex = 0;
let wordStartIndices = [];

const imagesContainer = document.getElementById('images-container');
const gridContainer = document.getElementById('grid-container');
const popup = document.getElementById('popup');
const playAgainBtn = document.getElementById('play-again');

const ding = document.getElementById('ding');
const thud = document.getElementById('thud');

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Load JSON words
fetch('words.json')
  .then(response => response.json())
  .then(data => {
    wordsData = data;
    initGame();
  });

function initGame() {
  currentIndex = 0;
  currentWordIndex = 0;
  selectedTiles = [];
  grid = Array.from({ length: 7 }, () => Array(7).fill(''));
  solutionPath = [];
  wordStartIndices = [];
  gridContainer.innerHTML = '';
  imagesContainer.innerHTML = '';
  popup.classList.add('hidden');

  // Choose 3 random words
  chosenWords = [];
  while (chosenWords.length < 3) {
    const word = wordsData[Math.floor(Math.random() * wordsData.length)];
    if (!chosenWords.includes(word)) chosenWords.push(word);
  }

  // Display images with click to play audio
  chosenWords.forEach((wordObj, index) => {
    const img = document.createElement('img');
    img.src = wordObj.image;
    img.dataset.wordIndex = index;
    img.addEventListener('click', () => {
      const audio = new Audio(wordObj.audio);
      audio.play();
    });
    imagesContainer.appendChild(img);
  });

  generatePath();
  fillRandomLetters();
  drawGrid();
}

// script.js - smart 7x7 word path with diagonals

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

// Load words from JSON
fetch('words.json')
  .then(res => res.json())
  .then(data => {
    words = data;
    startGame();
  });

// --- Start / Reset ---
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

  // Generate a valid path with diagonals
  solutionPath = generatePath(chosenWords);

  // Fill the grid with letters (solution tiles + random letters)
  const grid = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    grid[i] = [];
    for (let j = 0; j < GRID_SIZE; j++) {
      const tileData = solutionPath.find(t => t.x === j && t.y === i);
      grid[i][j] = tileData ? tileData.letter : randomLetter();
    }
  }

  // Render tiles
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

// --- Tile click handler ---
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

    // Play ding/audio only at end of a word
    if (expected.isWordEnd) {
      ding.play();
      new Audio(expected.word.audio).play();
    }

    // Game complete
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

// --- Generate a valid path ---
function generatePath(wordsArray) {
  const maxRetries = 1000;
  let retries = 0;

  while (retries < maxRetries) {
    retries++;
    const path = [];
    let x = 0, y = 0;
    let success = true;

    for (let w = 0; w < wordsArray.length; w++) {
      const word = wordsArray[w].word;

      for (let i = 0; i < word.length; i++) {
        path.push({
          x, y,
          letter: word[i],
          word: wordsArray[w],
          isWordEnd: i === word.length - 1
        });

        // Possible moves: right, down, diagonal
        const moves = [];
        if (x < GRID_SIZE - 1) moves.push([x + 1, y]);
        if (y < GRID_SIZE - 1) moves.push([x, y + 1]);
        if (x < GRID_SIZE - 1 && y < GRID_SIZE - 1) moves.push([x + 1, y + 1]);

        // Remove occupied tiles
        const validMoves = moves.filter(([nx, ny]) => !path.some(t => t.x === nx && t.y === ny));
        if (validMoves.length === 0) {
          success = false;
          break;
        }

        // Check remaining letters can reach bottom-right
        const remainingLetters = word.length - i - 1 + wordsArray.slice(w + 1).reduce((acc, w2) => acc + w2.word.length, 0);
        const distToGoal = (GRID_SIZE - 1 - validMoves[0][0]) + (GRID_SIZE - 1 - validMoves[0][1]);
        if (distToGoal > remainingLetters) {
          success = false;
          break;
        }

        // Pick a random valid move
        [x, y] = validMoves[Math.floor(Math.random() * validMoves.length)];
      }
      if (!success) break;
    }

    if (success && x === GRID_SIZE - 1 && y === GRID_SIZE - 1) return path;
    // else retry
  }

  console.error("Failed to generate a valid path after many retries");
  return [];
}

// --- Play again ---
playAgainBtn.addEventListener('click', startGame);

function fillRandomLetters() {
  for (let y = 0; y < 7; y++) {
    for (let x = 0; x < 7; x++) {
      if (!grid[y][x]) {
        grid[y][x] = alphabet[Math.floor(Math.random() * alphabet.length)];
      }
    }
  }
}

function drawGrid() {
  gridContainer.innerHTML = '';
  
  for (let y = 0; y < 7; y++) {
    for (let x = 0; x < 7; x++) {
      const tile = document.createElement('div');
      tile.classList.add('tile');
      if (x === 0 && y === 0) tile.classList.add('start');
      if (x === 6 && y === 6) tile.classList.add('goal');
      
      tile.textContent = grid[y][x];
      tile.dataset.x = x;
      tile.dataset.y = y;
      tile.addEventListener('click', handleTileClick);
      gridContainer.appendChild(tile);
    }
  }
}

function handleTileClick(e) {
  const x = parseInt(this.dataset.x);
  const y = parseInt(this.dataset.y);
  const expected = solutionPath[currentIndex];

  if (x === expected.x && y === expected.y) {
    this.classList.add('correct');
    selectedTiles.push(this);
    currentIndex++;
    
    // Check if we've completed a word
    const nextWordStart = wordStartIndices[currentWordIndex + 1] || solutionPath.length;
    if (currentIndex === nextWordStart) {
      // Completed current word!
      ding.play();
      const audio = new Audio(chosenWords[currentWordIndex].audio);
      audio.play();
      currentWordIndex++;
      
      // Highlight the completed word's image
      highlightCompletedWord(currentWordIndex - 1);
    }

    if (currentIndex === solutionPath.length) {
      // Game complete - all words found
      setTimeout(() => popup.classList.remove('hidden'), 500);
    }
  } else {
    thud.play();
    // Visual feedback for wrong tile
    this.classList.add('wrong');
    setTimeout(() => this.classList.remove('wrong'), 300);
  }
}

function highlightCompletedWord(wordIndex) {
  const images = document.querySelectorAll('#images-container img');
  images.forEach((img, idx) => {
    if (idx === wordIndex) {
      img.classList.add('completed');
    }
  });
}

playAgainBtn.addEventListener('click', initGame);