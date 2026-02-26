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
  // Clear grid
  grid = Array.from({ length: 7 }, () => Array(7).fill(''));
  
  // Create word combo by concatenating the three words
  const wordCombo = chosenWords.map(w => w.word.toUpperCase()).join('');
  const totalLetters = wordCombo.length;
  
  // Directions: 1=up-left, 2=up, 3=up-right, 4=right, 5=down-right, 6=down, 7=down-left, 8=left
  // For each direction, the delta x,y and the opposite direction
  const directions = {
    1: { dx: -1, dy: -1, opposite: 8 },
    2: { dx: 0, dy: -1, opposite: 7 },
    3: { dx: 1, dy: -1, opposite: 6 },
    4: { dx: 1, dy: 0, opposite: 5 },
    5: { dx: 1, dy: 1, opposite: 4 },
    6: { dx: 0, dy: 1, opposite: 3 },
    7: { dx: -1, dy: 1, opposite: 2 },
    8: { dx: -1, dy: 0, opposite: 1 }
  };
  
  // Track the path
  let path = [];
  let x = 0, y = 0; // Start at top-left
  
  // Place first letter
  grid[y][x] = wordCombo[0];
  path.push({x, y, letter: wordCombo[0]});
  
  // Track which words we've completed for audio triggers
  wordStartIndices = [0]; // First word starts at index 0
  let currentWordLength = chosenWords[0].word.length;
  let nextWordStart = currentWordLength;
  
  // For each subsequent letter
  for (let i = 1; i < totalLetters; i++) {
    // Check if we've completed a word
    if (i === nextWordStart) {
      wordStartIndices.push(i);
      currentWordLength = chosenWords[wordStartIndices.length - 1].word.length;
      nextWordStart += currentWordLength;
    }
    
    // Calculate remaining letters and steps to goal
    const remainingLetters = totalLetters - i;
    const stepsToGoal = Math.max(6 - x, 0) + Math.max(6 - y, 0); // Manhattan distance to bottom-right
    
    // Find available surrounding squares
    const available = [];
    
    // Check all 8 directions
    for (let dir = 1; dir <= 8; dir++) {
      const newX = x + directions[dir].dx;
      const newY = y + directions[dir].dy;
      
      // Check if within grid bounds
      if (newX >= 0 && newX < 7 && newY >= 0 && newY < 7) {
        // Check if square is empty
        if (!grid[newY][newX]) {
          // Check if this isn't the previous square (no immediate backtracking)
          if (path.length > 1) {
            const prev = path[path.length - 2];
            if (!(prev.x === newX && prev.y === newY)) {
              available.push(dir);
            }
          } else {
            available.push(dir);
          }
        }
      }
    }
    
    // Calculate ratio of remaining letters to remaining steps
    const ratio = remainingLetters / stepsToGoal;
    
    // Choose direction with weighted probabilities
    let selectedDir;
    
    if (stepsToGoal === remainingLetters) {
      // Need to take most direct route - prioritize directions toward goal
      const towardGoal = [];
      if (x < 6) towardGoal.push(4); // right
      if (y < 6) towardGoal.push(6); // down
      if (x < 6 && y < 6) towardGoal.push(5); // down-right
      
      // Filter to only available directions
      const possible = towardGoal.filter(d => available.includes(d));
      if (possible.length > 0) {
        selectedDir = possible[Math.floor(Math.random() * possible.length)];
      } else {
        // Fallback to any available
        selectedDir = available[Math.floor(Math.random() * available.length)];
      }
    } else {
      // Weight the directions
      const weights = [];
      let totalWeight = 0;
      
      available.forEach(dir => {
        let weight = 1; // Base weight
        
        // Directions that move toward goal (3,4,5) get bonus when ratio is low
        const isTowardGoal = [3, 4, 5].includes(dir);
        
        if (ratio < 1.5) {
          // Need to head more toward goal
          if (isTowardGoal) weight += 5;
        } else if (ratio > 2) {
          // Can wander more - favor directions away from goal
          if (!isTowardGoal) weight += 3;
        } else {
          // Balanced approach
          if (isTowardGoal) weight += 2;
        }
        
        // Add some randomness
        weight += Math.random() * 2;
        
        weights.push(weight);
        totalWeight += weight;
      });
      
      // Select direction based on weights
      let random = Math.random() * totalWeight;
      let cumulativeWeight = 0;
      
      for (let j = 0; j < available.length; j++) {
        cumulativeWeight += weights[j];
        if (random < cumulativeWeight) {
          selectedDir = available[j];
          break;
        }
      }
    }
    
    // Move to new position
    x += directions[selectedDir].dx;
    y += directions[selectedDir].dy;
    
    // Place the letter
    grid[y][x] = wordCombo[i];
    path.push({x, y, letter: wordCombo[i]});
  }
  
  // Ensure we end at bottom-right (6,6)
  if (x !== 6 || y !== 6) {
    console.warn("Path didn't end at goal, adjusting...");
    // Simple adjustment - move to goal if we're close
    while (x < 6) {
      x++;
      if (!grid[y][x]) {
        grid[y][x] = wordCombo[wordCombo.length - 1];
        path.push({x, y, letter: wordCombo[wordCombo.length - 1]});
      }
    }
    while (y < 6) {
      y++;
      if (!grid[y][x]) {
        grid[y][x] = wordCombo[wordCombo.length - 1];
        path.push({x, y, letter: wordCombo[wordCombo.length - 1]});
      }
    }
  }
  
  // Update solutionPath with word info for audio triggers
  solutionPath = [];
  let wordIdx = 0;
  let letterInWord = 0;
  
  path.forEach((step, index) => {
    solutionPath.push({
      ...step,
      word: chosenWords[wordIdx],
      wordIndex: wordIdx
    });
    
    letterInWord++;
    if (wordStartIndices[wordIdx + 1] === index + 1) {
      wordIdx++;
      letterInWord = 0;
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
        // Get random letter from alphabet
        grid[y][x] = alphabet[Math.floor(Math.random() * alphabet.length)];
      }
    }
  }
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