let wordsData = [];
let grid = [];
let solutionPath = [];
let currentIndex = 0;
let selectedTiles = [];
let chosenWords = [];

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
  selectedTiles = [];
  grid = Array.from({ length: 7 }, () => Array(7).fill(''));
  solutionPath = [];
  gridContainer.innerHTML = '';
  imagesContainer.innerHTML = '';
  popup.classList.add('hidden');

  // Choose 3 random words
  chosenWords = [];
  while (chosenWords.length < 3) {
    const word = wordsData[Math.floor(Math.random() * wordsData.length)];
    if (!chosenWords.includes(word)) chosenWords.push(word);
  }

  // Display images
  chosenWords.forEach(wordObj => {
    const img = document.createElement('img');
    img.src = wordObj.image;
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

function generatePath() {
  // For simplicity: linear path from top-left to bottom-right
  let x = 0, y = 0;
  chosenWords.forEach(wordObj => {
    const word = wordObj.word.toUpperCase();
    for (let i = 0; i < word.length; i++) {
      grid[y][x] = word[i];
      solutionPath.push({x, y, letter: word[i], word: wordObj});
      // Move right or down
      if (x < 6) x++;
      else if (y < 6) y++;
    }
  });
  // Mark start and goal
  grid[0][0] = solutionPath[0].letter;
  grid[6][6] = solutionPath[solutionPath.length - 1].letter;
}

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
    ding.play();
    const audio = new Audio(expected.word.audio);
    audio.play();

    if (currentIndex === solutionPath.length) {
      // Game complete
      setTimeout(() => popup.classList.remove('hidden'), 500);
    }
  } else {
    thud.play();
  }
}

playAgainBtn.addEventListener('click', initGame);