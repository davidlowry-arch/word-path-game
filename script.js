const GRID_SIZE = 7;
const tilesContainer = document.getElementById('grid-container');
const imagesContainer = document.getElementById('images-container');
const popup = document.getElementById('popup');
const playAgainBtn = document.getElementById('play-again');

const ding = document.getElementById('ding');
const thud = document.getElementById('thud');

const WORD_COLORS = ['#4CAF50', '#2196F3', '#FF9800']; // Green, Blue, Orange

let words = [];
let solutionPath = [];
let currentIndex = 0;
let currentWordIndex = 0;
let wordStartIndices = [];
let selectedTiles = [];
let chosenWords = [];

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
  currentWordIndex = 0;
  selectedTiles = [];
  solutionPath = [];
  wordStartIndices = [];
  tilesContainer.innerHTML = '';
  imagesContainer.innerHTML = '';
  popup.classList.add('hidden');

  // Pick 3 random words
  chosenWords = [];
  while (chosenWords.length < 3) {
    const w = words[Math.floor(Math.random() * words.length)];
    if (!chosenWords.includes(w)) chosenWords.push(w);
  }

  // Display images immediately (they're safe to show)
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

  // Try to generate a valid path with multiple attempts
  let attempts = 0;
  const maxAttempts = 50;
  let validPath = null;
  
  while (attempts < maxAttempts && !validPath) {
    attempts++;
    const candidatePath = generatePath(chosenWords);
    
    if (validatePath(candidatePath, chosenWords)) {
      validPath = candidatePath;
      console.log(`Found valid path after ${attempts} attempts`);
    } else if (attempts % 10 === 0) {
      console.log(`Attempt ${attempts} failed, retrying...`);
    }
  }
  
  // If we still don't have a valid path, regenerate words
  if (!validPath) {
    console.log("Couldn't generate valid path with these words, trying new words");
    
    // Clear images and try again with different words
    imagesContainer.innerHTML = '';
    
    // Reselect words with preference for longer combinations
    chosenWords = selectWordsWithMinimumLength(11); // Minimum 11 total letters
    
    // Redisplay new images
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
    
    // Try one more time with new words
    validPath = generatePath(chosenWords);
    
    // Final validation
    if (!validatePath(validPath, chosenWords)) {
      console.error("Critical failure: Using fallback path");
      validPath = generateGuaranteedPath(chosenWords);
    }
  }
  
  solutionPath = validPath;

  // Fill the grid with letters (solution tiles + random letters)
  const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(''));
  
  // First place solution path letters
  solutionPath.forEach(step => {
    grid[step.y][step.x] = step.letter;
  });
  
  // Then fill empty cells with random letters
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (!grid[y][x]) {
        grid[y][x] = randomLetter();
      }
    }
  }

  // Render tiles
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const tile = document.createElement('div');
      tile.classList.add('tile');
      tile.textContent = grid[y][x];
      tile.dataset.x = x;
      tile.dataset.y = y;

      if (y === 0 && x === 0) tile.classList.add('start');
      if (y === GRID_SIZE - 1 && x === GRID_SIZE - 1) tile.classList.add('goal');

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
    // Color the tile based on which word it belongs to
    const wordColor = WORD_COLORS[expected.wordIndex % WORD_COLORS.length];
    tile.style.backgroundColor = wordColor;
    tile.style.color = 'white';
    tile.classList.add('correct');
    
    selectedTiles.push(tile);
    currentIndex++;

    // Check if we've completed a word
    if (expected.isWordEnd) {
      // Play ding first, then word audio
      ding.play();
      
      // Slight delay to let ding play before word audio
      setTimeout(() => {
        const audio = new Audio(chosenWords[expected.wordIndex].audio);
        audio.play();
      }, 100);
      
      // Highlight the completed word's image
      highlightCompletedWord(expected.wordIndex);
    }

    // Game complete
    if (currentIndex === solutionPath.length) {
      setTimeout(() => popup.classList.remove('hidden'), 500);
    }
  } else {
    thud.play();
    tile.classList.add('wrong');
    setTimeout(() => tile.classList.remove('wrong'), 300);
  }
}

// --- Highlight completed word image ---
function highlightCompletedWord(wordIndex) {
  const images = document.querySelectorAll('#images-container img');
  images.forEach((img, idx) => {
    if (idx === wordIndex) {
      img.classList.add('completed');
      // Optional: add a subtle border in the word's color
      img.style.borderColor = WORD_COLORS[wordIndex % WORD_COLORS.length];
    }
  });
}

// --- Random letter ---
function randomLetter() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return letters[Math.floor(Math.random() * letters.length)];
}

// --- Validate that a path meets all requirements ---
function validatePath(path, wordsArray) {
  // Basic checks
  if (!path || path.length === 0) return false;
  
  const totalLetters = wordsArray.reduce((acc, w) => acc + w.word.length, 0);
  
  // Check 1: Path length matches total letters
  if (path.length !== totalLetters) {
    console.warn(`Path length mismatch: ${path.length} vs ${totalLetters}`);
    return false;
  }
  
  // Check 2: Starts at (0,0)
  if (path[0].x !== 0 || path[0].y !== 0) {
    console.warn("Path doesn't start at (0,0)");
    return false;
  }
  
  // Check 3: Ends at (6,6)
  const last = path[path.length - 1];
  if (last.x !== GRID_SIZE - 1 || last.y !== GRID_SIZE - 1) {
    console.warn(`Path ends at (${last.x},${last.y}) instead of (6,6)`);
    return false;
  }
  
  // Check 4: All moves are adjacent (including diagonally)
  for (let i = 1; i < path.length; i++) {
    const prev = path[i-1];
    const curr = path[i];
    const dx = Math.abs(curr.x - prev.x);
    const dy = Math.abs(curr.y - prev.y);
    
    if (dx > 1 || dy > 1) {
      console.warn(`Invalid move from (${prev.x},${prev.y}) to (${curr.x},${curr.y})`);
      return false;
    }
  }
  
  // Check 5: No duplicate positions (can't revisit a tile)
  const positions = new Set();
  for (let i = 0; i < path.length; i++) {
    const pos = `${path[i].x},${path[i].y}`;
    if (positions.has(pos)) {
      console.warn(`Duplicate position at ${pos}`);
      return false;
    }
    positions.add(pos);
  }
  
  // Check 6: Word boundaries are correctly marked
  let wordIndex = 0;
  let letterCount = 0;
  for (let i = 0; i < path.length; i++) {
    if (path[i].word !== wordsArray[wordIndex]) {
      console.warn(`Word mismatch at index ${i}`);
      return false;
    }
    
    letterCount++;
    if (letterCount === wordsArray[wordIndex].word.length) {
      if (!path[i].isWordEnd) {
        console.warn(`Word end not marked at index ${i}`);
        return false;
      }
      wordIndex++;
      letterCount = 0;
    }
  }
  
  // Check 7: Can reach goal with remaining letters at each step
  for (let i = 0; i < path.length - 1; i++) {
    const remainingLetters = path.length - i - 1;
    const stepsToGoal = Math.max(GRID_SIZE - 1 - path[i].x, GRID_SIZE - 1 - path[i].y);
    
    if (stepsToGoal > remainingLetters) {
      console.warn(`At step ${i}, need ${stepsToGoal} steps but only ${remainingLetters} letters left`);
      return false;
    }
  }
  
  return true;
}

// --- Select words with minimum total length ---
function selectWordsWithMinimumLength(minTotal) {
  const selected = [];
  let total = 0;
  let attempts = 0;
  const maxAttempts = 500;
  
  while (selected.length < 3 && attempts < maxAttempts) {
    attempts++;
    const w = words[Math.floor(Math.random() * words.length)];
    
    if (!selected.includes(w)) {
      if (selected.length < 2) {
        selected.push(w);
        total += w.word.length;
      } else {
        // Last word - check if it meets minimum
        if (total + w.word.length >= minTotal) {
          selected.push(w);
        }
      }
    }
  }
  
  // If we failed, just take the 3 longest words
  if (selected.length < 3) {
    console.log("Falling back to longest words");
    const sorted = [...words].sort((a, b) => b.word.length - a.word.length);
    return sorted.slice(0, 3);
  }
  
  return selected;
}

// --- Guaranteed path generator for worst case ---
function generateGuaranteedPath(wordsArray) {
  console.log("Using guaranteed path generator");
  const path = [];
  const startIndices = [0];
  const wordCombo = wordsArray.map(w => w.word.toUpperCase()).join('');
  
  // Create a snake pattern that guarantees enough steps
  let x = 0, y = 0;
  let wordIndex = 0;
  let lettersInCurrentWord = 0;
  let goingRight = true;
  
  for (let i = 0; i < wordCombo.length; i++) {
    path.push({
      x, y,
      letter: wordCombo[i],
      word: wordsArray[wordIndex],
      wordIndex: wordIndex,
      isWordEnd: lettersInCurrentWord === wordsArray[wordIndex].word.length - 1
    });
    
    if (i > 0 && lettersInCurrentWord === 0) {
      startIndices.push(i);
    }
    
    // Snake pattern: right, down, left, down, right, etc.
    if (goingRight) {
      if (x < GRID_SIZE - 1) {
        x++;
      } else {
        goingRight = false;
        if (y < GRID_SIZE - 1) y++;
      }
    } else {
      if (x > 0) {
        x--;
      } else {
        goingRight = true;
        if (y < GRID_SIZE - 1) y++;
      }
    }
    
    lettersInCurrentWord++;
    if (lettersInCurrentWord === wordsArray[wordIndex].word.length) {
      wordIndex++;
      lettersInCurrentWord = 0;
    }
  }
  
  wordStartIndices = startIndices;
  return path;
}

// --- Generate a valid path ---
function generatePath(wordsArray) {
  const maxRetries = 5000;
  let retries = 0;

  const totalLetters = wordsArray.reduce((acc, w) => acc + w.word.length, 0);
  const minStepsToGoal = Math.max(GRID_SIZE - 1, GRID_SIZE - 1);
  const forceWandering = totalLetters < minStepsToGoal + 4;

  while (retries < maxRetries) {
    retries++;
    const path = [];
    let x = 0, y = 0;
    let success = true;
    let hasWandered = false;

    for (let w = 0; w < wordsArray.length; w++) {
      const word = wordsArray[w].word.toUpperCase();

      for (let i = 0; i < word.length; i++) {
        path.push({
          x, y,
          letter: word[i],
          word: wordsArray[w],
          wordIndex: w,
          isWordEnd: i === word.length - 1
        });

        if (w === wordsArray.length - 1 && i === word.length - 1) {
          if (x !== GRID_SIZE - 1 || y !== GRID_SIZE - 1) {
            success = false;
          }
          break;
        }

        const remainingInCurrentWord = word.length - i - 1;
        const remainingInLaterWords = wordsArray.slice(w + 1).reduce((acc, w2) => acc + w2.word.length, 0);
        const totalRemaining = remainingInCurrentWord + remainingInLaterWords;
        const stepsToGoal = Math.max(GRID_SIZE - 1 - x, GRID_SIZE - 1 - y);
        
        // Early exit if impossible
        if (stepsToGoal > totalRemaining) {
          success = false;
          break;
        }

        // Force wandering for short combos
        if (forceWandering && !hasWandered && totalRemaining > stepsToGoal + 2) {
          const awayMoves = [];
          
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              
              const newX = x + dx;
              const newY = y + dy;
              
              if (newX >= 0 && newX < GRID_SIZE && newY >= 0 && newY < GRID_SIZE) {
                if (!path.some(t => t.x === newX && t.y === newY)) {
                  const newDistToGoal = Math.max(GRID_SIZE - 1 - newX, GRID_SIZE - 1 - newY);
                  if (newDistToGoal > stepsToGoal) {
                    awayMoves.push({dx, dy, newX, newY});
                  }
                }
              }
            }
          }
          
          if (awayMoves.length > 0) {
            const selectedMove = awayMoves[Math.floor(Math.random() * awayMoves.length)];
            x = selectedMove.newX;
            y = selectedMove.newY;
            hasWandered = true;
            continue;
          }
        }

        // Find possible moves
        const possibleMoves = [];
        
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            
            const newX = x + dx;
            const newY = y + dy;
            
            if (newX >= 0 && newX < GRID_SIZE && newY >= 0 && newY < GRID_SIZE) {
              if (!path.some(t => t.x === newX && t.y === newY)) {
                const diagonalDistToGoal = Math.max(GRID_SIZE - 1 - newX, GRID_SIZE - 1 - newY);
                if (diagonalDistToGoal <= totalRemaining) {
                  possibleMoves.push({dx, dy, newX, newY});
                }
              }
            }
          }
        }

        if (possibleMoves.length === 0) {
          success = false;
          break;
        }

        // Choose move
        const ratio = totalRemaining / stepsToGoal;
        let selectedMove;
        
        if (ratio < 1.2) {
          const bestMoves = possibleMoves.filter(move => {
            const newDist = Math.max(GRID_SIZE - 1 - move.newX, GRID_SIZE - 1 - move.newY);
            return newDist < stepsToGoal;
          });
          selectedMove = bestMoves.length > 0 
            ? bestMoves[Math.floor(Math.random() * bestMoves.length)]
            : possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        } else {
          const wanderingMoves = possibleMoves.filter(move => {
            const newDist = Math.max(GRID_SIZE - 1 - move.newX, GRID_SIZE - 1 - move.newY);
            return newDist >= stepsToGoal - 1;
          });
          selectedMove = wanderingMoves.length > 0
            ? wanderingMoves[Math.floor(Math.random() * wanderingMoves.length)]
            : possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        }

        x = selectedMove.newX;
        y = selectedMove.newY;
      }
      
      if (!success) break;
    }

    if (success && x === GRID_SIZE - 1 && y === GRID_SIZE - 1) {
      return path;
    }
  }

  return null;
}

// --- Play again button event listener ---
playAgainBtn.addEventListener('click', startGame);