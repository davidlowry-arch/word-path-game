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

function generatePath() {
  let x = 0, y = 0;
  let pathIndex = 0;
  
  chosenWords.forEach((wordObj, wordIdx) => {
    const word = wordObj.word.toUpperCase();
    wordStartIndices[wordIdx] = pathIndex;
    
    for (let i = 0; i < word.length; i++) {
      if (x > 6) x = 0, y++;
      if (y > 6) y = 6; // Prevent going out of bounds
      
      grid[y][x] = word[i];
      solutionPath.push({x, y, letter: word[i], word: wordObj, wordIndex: wordIdx});
      pathIndex++;
      
      // Move right, if at edge move down
      if (x < 6) {
        x++;
      } else {
        x = 0;
        y++;
      }
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