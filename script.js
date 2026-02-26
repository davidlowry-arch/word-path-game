const GRID_SIZE = 7;
const tilesContainer = document.getElementById('grid-container');
const imagesContainer = document.getElementById('images-container');
const popup = document.getElementById('popup');
const playAgainBtn = document.getElementById('play-again');

const ding = document.getElementById('ding');
const thud = document.getElementById('thud');

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

  // Display images
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

  // Generate a valid path with diagonals
  solutionPath = generatePath(chosenWords);

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
    tile.classList.add('correct');
    selectedTiles.push(tile);
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

// --- Random letter ---
function randomLetter() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return letters[Math.floor(Math.random() * letters.length)];
}

// --- Highlight completed word image ---
function highlightCompletedWord(wordIndex) {
  const images = document.querySelectorAll('#images-container img');
  images.forEach((img, idx) => {
    if (idx === wordIndex) {
      img.classList.add('completed');
    }
  });
}

// --- Generate a valid path ---
function generatePath(wordsArray) {
  const maxRetries = 10000;
  let retries = 0;

  // Calculate total letters needed
  const totalLetters = wordsArray.reduce((acc, w) => acc + w.word.length, 0);
  
  // Minimum steps needed to reach goal from start (Manhattan distance)
  const minStepsToGoal = (GRID_SIZE - 1) + (GRID_SIZE - 1); // 12 steps
  
  // Check if we have enough letters to make a interesting path
  // We need at least enough letters to reach the goal, plus some extra to avoid
  // running out of space
  if (totalLetters < minStepsToGoal) {
    console.warn("Total letters less than minimum steps to goal, extending path");
    // We'll need to add extra steps by revisiting or looping
  }

  while (retries < maxRetries) {
    retries++;
    const path = [];
    const startIndices = [0];
    let x = 0, y = 0;
    let success = true;

    for (let w = 0; w < wordsArray.length; w++) {
      const word = wordsArray[w].word.toUpperCase();

      for (let i = 0; i < word.length; i++) {
        // Add current position to path
        path.push({
          x, y,
          letter: word[i],
          word: wordsArray[w],
          isWordEnd: i === word.length - 1
        });

        // If this is the last letter of the last word
        if (w === wordsArray.length - 1 && i === word.length - 1) {
          // We must be at the goal
          if (x !== GRID_SIZE - 1 || y !== GRID_SIZE - 1) {
            success = false;
          }
          break;
        }

        // Calculate remaining letters (including current word's remaining letters + all subsequent words)
        const remainingInCurrentWord = word.length - i - 1;
        const remainingInLaterWords = wordsArray.slice(w + 1).reduce((acc, w2) => acc + w2.word.length, 0);
        const totalRemaining = remainingInCurrentWord + remainingInLaterWords;
        
        // Calculate steps to goal from current position
        const stepsToGoal = (GRID_SIZE - 1 - x) + (GRID_SIZE - 1 - y);
        
        // CRITICAL FIX: If we're getting too close to goal with many letters left, we need to wander
        if (stepsToGoal < totalRemaining - 2) {
          // We have more letters than steps to goal - need to wander in circles
          // Find moves that DON'T decrease distance to goal
          const wanderingMoves = [];
          
          // Check all 8 surrounding squares
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              
              const newX = x + dx;
              const newY = y + dy;
              
              // Check bounds
              if (newX >= 0 && newX < GRID_SIZE && newY >= 0 && newY < GRID_SIZE) {
                // Check if tile is not already used in path
                if (!path.some(t => t.x === newX && t.y === newY)) {
                  const newDist = (GRID_SIZE - 1 - newX) + (GRID_SIZE - 1 - newY);
                  
                  // Prefer moves that maintain or increase distance to goal
                  if (newDist >= stepsToGoal) {
                    wanderingMoves.push({dx, dy, newX, newY});
                  }
                }
              }
            }
          }
          
          if (wanderingMoves.length > 0) {
            // Take a wandering move
            const selectedMove = wanderingMoves[Math.floor(Math.random() * wanderingMoves.length)];
            x = selectedMove.newX;
            y = selectedMove.newY;
            continue; // Skip the rest of the loop for this iteration
          }
        }

        // Find all possible moves (8 directions including diagonals)
        const possibleMoves = [];
        
        // Check all 8 surrounding squares
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            
            const newX = x + dx;
            const newY = y + dy;
            
            // Check bounds
            if (newX >= 0 && newX < GRID_SIZE && newY >= 0 && newY < GRID_SIZE) {
              // Check if tile is not already used in path
              if (!path.some(t => t.x === newX && t.y === newY)) {
                // Check if we can still reach goal from here
                const manhattanDistToGoal = (GRID_SIZE - 1 - newX) + (GRID_SIZE - 1 - newY);
                
                // We need enough remaining letters to reach goal
                // But also need to ensure we don't reach goal too early
                if (manhattanDistToGoal <= totalRemaining) {
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

        // Weight moves based on the ratio
        const ratio = totalRemaining / stepsToGoal;
        
        let selectedMove;
        
        if (ratio < 1) {
          // Not enough letters to reach goal - this shouldn't happen with our check above
          // But just in case, prioritize moves that decrease distance
          const bestMoves = possibleMoves.filter(move => {
            const newDist = (GRID_SIZE - 1 - move.newX) + (GRID_SIZE - 1 - move.newY);
            return newDist < stepsToGoal;
          });
          
          if (bestMoves.length > 0) {
            selectedMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];
          } else {
            selectedMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
          }
        } else if (ratio > 2) {
          // Plenty of letters left - can wander more
          // Prefer moves that DON'T decrease distance too much
          const wanderingMoves = possibleMoves.filter(move => {
            const newDist = (GRID_SIZE - 1 - move.newX) + (GRID_SIZE - 1 - move.newY);
            return newDist >= stepsToGoal - 1; // Maintain or slightly decrease distance
          });
          
          if (wanderingMoves.length > 0) {
            selectedMove = wanderingMoves[Math.floor(Math.random() * wanderingMoves.length)];
          } else {
            selectedMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
          }
        } else {
          // Balanced approach - random with slight preference for forward movement
          const weightedMoves = [];
          possibleMoves.forEach(move => {
            let weight = 1;
            const newDist = (GRID_SIZE - 1 - move.newX) + (GRID_SIZE - 1 - move.newY);
            
            // Slight preference for moves that move toward goal
            if (newDist < stepsToGoal) weight += 1;
            
            for (let i = 0; i < weight; i++) {
              weightedMoves.push(move);
            }
          });
          
          selectedMove = weightedMoves[Math.floor(Math.random() * weightedMoves.length)];
        }

        // Apply the move
        x = selectedMove.newX;
        y = selectedMove.newY;
      }
      
      // Record where the next word starts
      if (w < wordsArray.length - 1) {
        startIndices.push(path.length);
      }
      
      if (!success) break;
    }

    // Check if we successfully placed all letters and ended at goal
    if (success && x === GRID_SIZE - 1 && y === GRID_SIZE - 1) {
      wordStartIndices = startIndices;
      console.log(`Path generated after ${retries} attempts`);
      return path;
    }
    // Otherwise retry with a new random path
  }

  console.error("Failed to generate a valid path after many retries");
  // Fallback: create a path that deliberately wanders
  return generateWanderingFallback(wordsArray);
}

// --- Better fallback that handles short words ---
function generateWanderingFallback(wordsArray) {
  console.log("Using wandering fallback path generator");
  const path = [];
  const startIndices = [0];
  const wordCombo = wordsArray.map(w => w.word.toUpperCase()).join('');
  
  // Create a path that wanders around before heading to goal
  let x = 0, y = 0;
  let wordIndex = 0;
  let lettersInCurrentWord = 0;
  let direction = 1; // 1=right, 2=down, 3=left, 4=up
  let stepsInDirection = 0;
  
  for (let i = 0; i < wordCombo.length; i++) {
    path.push({
      x, y,
      letter: wordCombo[i],
      word: wordsArray[wordIndex],
      isWordEnd: lettersInCurrentWord === wordsArray[wordIndex].word.length - 1
    });
    
    // Record word start indices
    if (i > 0 && lettersInCurrentWord === 0) {
      startIndices.push(i);
    }
    
    // If we're near the end, head for goal
    const remainingLetters = wordCombo.length - i - 1;
    const stepsToGoal = (GRID_SIZE - 1 - x) + (GRID_SIZE - 1 - y);
    
    if (remainingLetters <= stepsToGoal + 1) {
      // Head directly for goal
      if (x < GRID_SIZE - 1 && y < GRID_SIZE - 1) {
        x++;
        y++;
      } else if (x < GRID_SIZE - 1) {
        x++;
      } else if (y < GRID_SIZE - 1) {
        y++;
      }
    } else {
      // Wander around
      stepsInDirection++;
      
      // Change direction occasionally
      if (stepsInDirection > 2 || (x === 0 && direction === 3) || (x === GRID_SIZE-1 && direction === 1) ||
          (y === 0 && direction === 4) || (y === GRID_SIZE-1 && direction === 2)) {
        direction = Math.floor(Math.random() * 4) + 1;
        stepsInDirection = 0;
      }
      
      // Try to move in current direction
      let moved = false;
      let attempts = 0;
      
      while (!moved && attempts < 10) {
        let newX = x, newY = y;
        
        if (direction === 1 && x < GRID_SIZE - 1) newX++;
        else if (direction === 2 && y < GRID_SIZE - 1) newY++;
        else if (direction === 3 && x > 0) newX--;
        else if (direction === 4 && y > 0) newY--;
        
        // Check if this position is already used
        if (!path.some(t => t.x === newX && t.y === newY)) {
          x = newX;
          y = newY;
          moved = true;
        } else {
          direction = Math.floor(Math.random() * 4) + 1;
        }
        attempts++;
      }
      
      if (!moved) {
        // Just move somewhere available
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const newX = x + dx;
            const newY = y + dy;
            if (newX >= 0 && newX < GRID_SIZE && newY >= 0 && newY < GRID_SIZE) {
              if (!path.some(t => t.x === newX && t.y === newY)) {
                x = newX;
                y = newY;
                moved = true;
                break;
              }
            }
          }
          if (moved) break;
        }
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

// --- Play again ---
playAgainBtn.addEventListener('click', startGame);