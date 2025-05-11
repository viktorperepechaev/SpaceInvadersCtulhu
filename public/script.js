const splashScreenElement = document.getElementById('splash-screen');
const splashClickableAreaElement = document.getElementById('splash-clickable-area');
const mainContentWrapperElement = document.getElementById('main-content-wrapper');

if (splashScreenElement && splashClickableAreaElement && mainContentWrapperElement) {
  splashClickableAreaElement.addEventListener('click', () => {
    splashScreenElement.style.display = 'none';
    mainContentWrapperElement.classList.remove('hidden-by-default');
  }, {
    once: true
  });
} else {
  if (mainContentWrapperElement) {
    mainContentWrapperElement.classList.remove('hidden-by-default');
  }
  console.warn('Элементы приветственного экрана не найдены. Отображается основное содержимое.');
}

const menuButtons = document.querySelectorAll('#menu button[data-section-anchor]');

menuButtons.forEach(button => {
  button.addEventListener('click', () => {
    const sectionId = button.getAttribute('data-section-anchor');
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
      targetSection.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

const gameSection = document.getElementById('game-section');
const startInvadersButton = document.getElementById('start-invaders-button');
const invadersGameActiveElements = document.getElementById('invaders-game-active-elements');

const grid = gameSection ? gameSection.querySelector(".grid") : null;
const resultDisplay = gameSection ? gameSection.querySelector(".results") : null;
const reloadBarProgressElement = document.getElementById("reload-bar-progress");
const elapsedTimeDisplayElement = document.getElementById("game-timer");

const invadersWinDialog = document.getElementById('invaders-win-dialog');

const finalInvadersTimeDisplay = document.getElementById('final-invaders-time');
const invaderPlayerNameInput = document.getElementById('invader-player-name');
const saveInvadersScoreButton = document.getElementById('save-invaders-score-button');
const playAgainFromWinButton = document.getElementById('play-again-from-win-button');

let currentShooterIndex = 202;
const width = 15;
const aliensRemoved = [];
let invadersId = null;
let isGoingRight = true;
let direction = 1;
let results = 0;
let totalAlienInvaders = 0;

let laserCooldown = false;
const cooldownDuration = 500;
let reloadInterval = null;

let gameStartTime = 0;
let gameTimerIntervalId = null;

let squares = [];
let alienInvaders = [];

let isInvadersGameActive = false;
let finalWinTimeNumeric = NaN;
const backgroundMusic = document.getElementById('background-music');
const battleMusic = document.getElementById('battle-music');

if (backgroundMusic) {
  backgroundMusic.volume = 0.5;
  backgroundMusic.play().catch(error => {
    console.log("Автовоспроизведение музыки заблокировано браузером. Кликните где-нибудь на странице, чтобы включить музыку.");
    document.addEventListener('click', function enableAudio() {
      backgroundMusic.play();
      document.removeEventListener('click', enableAudio);
    }, {
      once: true
    });
  });
}

function fadeOut(audioElement, duration = 1000) {
  const startVolume = audioElement.volume;
  const startTime = Date.now();

  function updateVolume() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);

    audioElement.volume = startVolume * (1 - progress);

    if (progress < 1) {
      requestAnimationFrame(updateVolume);
    } else {
      audioElement.pause();
      audioElement.volume = startVolume;
    }
  }

  updateVolume();
}

function fadeIn(audioElement, targetVolume = 0.5, duration = 1000) {
  audioElement.volume = 0;
  audioElement.play();

  const startTime = Date.now();

  function updateVolume() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);

    audioElement.volume = targetVolume * progress;

    if (progress < 1) {
      requestAnimationFrame(updateVolume);
    }
  }

  updateVolume();
}

function draw() {
  for (let i = 0; i < alienInvaders.length; i++) {
    if (!aliensRemoved.includes(i) && squares[alienInvaders[i]]) {
      squares[alienInvaders[i]].classList.add("invader");
    }
  }
}

function remove() {
  for (let i = 0; i < alienInvaders.length; i++) {
    if (squares[alienInvaders[i]]) {
      squares[alienInvaders[i]].classList.remove("invader");
    }
  }
}

function moveShooter(e) {
  if (!isInvadersGameActive || !squares[currentShooterIndex]) return;

  let moved = false;
  switch (e.key) {
    case "ArrowLeft":
      if (currentShooterIndex % width !== 0) {
        squares[currentShooterIndex].classList.remove("shooter");
        currentShooterIndex -= 1;
        moved = true;
      }
      e.preventDefault();
      break;
    case "ArrowRight":
      if (currentShooterIndex % width < width - 1) {
        squares[currentShooterIndex].classList.remove("shooter");
        currentShooterIndex += 1;
        moved = true;
      }
      e.preventDefault();
      break;
  }
  if (moved && squares[currentShooterIndex]) {
    squares[currentShooterIndex].classList.add("shooter");
  }
}

function moveInvaders() {
  if (!isInvadersGameActive || !alienInvaders.length || !squares.length) return;

  const leftEdge = alienInvaders[0] % width === 0;
  const rightEdge = alienInvaders[alienInvaders.length - 1] % width === width - 1;
  remove();

  if (rightEdge && isGoingRight) {
    for (let i = 0; i < alienInvaders.length; i++) {
      alienInvaders[i] += width + 1;
    }
    direction = -1;
    isGoingRight = false;
  } else if (leftEdge && !isGoingRight) {
    for (let i = 0; i < alienInvaders.length; i++) {
      alienInvaders[i] += width - 1;
    }
    direction = 1;
    isGoingRight = true;
  }

  for (let i = 0; i < alienInvaders.length; i++) {
    alienInvaders[i] += direction;
  }

  draw();

  for (let i = 0; i < alienInvaders.length; i++) {
    if (aliensRemoved.includes(i)) {
      continue;
    }

    if (squares[alienInvaders[i]] && alienInvaders[i] >= width * (width - 1)) {
      if (resultDisplay) resultDisplay.innerHTML = "БЕЗДНА ПОГЛОТИЛА МИР!";
      isInvadersGameActive = false;
      clearInterval(invadersId);
      if (gameTimerIntervalId) clearInterval(gameTimerIntervalId);
      if (startInvadersButton) startInvadersButton.style.display = 'block';
      if (grid) grid.classList.remove('grid-levitating');

      if (battleMusic && !battleMusic.paused) {
        fadeOut(battleMusic);
      }

      if (backgroundMusic) {
        fadeIn(backgroundMusic);
      }

      return;
    }
  }

  if (squares[currentShooterIndex] && squares[currentShooterIndex].classList.contains("invader")) {
    if (resultDisplay) resultDisplay.innerHTML = "ПОГЛОЩЕНЫ БЕЗДНОЙ";
    isInvadersGameActive = false;
    clearInterval(invadersId);
    if (gameTimerIntervalId) clearInterval(gameTimerIntervalId);
    if (startInvadersButton) startInvadersButton.style.display = 'block';
    if (grid) grid.classList.remove('grid-levitating');

    if (battleMusic && !battleMusic.paused) {
      fadeOut(battleMusic);
    }
    if (backgroundMusic) {
      fadeIn(backgroundMusic);
    }
  }

  if (aliensRemoved.length === alienInvaders.length && alienInvaders.length > 0) {
    if (resultDisplay) resultDisplay.innerHTML = "ПОБЕДА!";
    isInvadersGameActive = false;
    clearInterval(invadersId);
    if (gameTimerIntervalId) clearInterval(gameTimerIntervalId);
    if (grid) grid.classList.remove('grid-levitating');

    if (battleMusic && !battleMusic.paused) {
      fadeOut(battleMusic);
    }

    if (backgroundMusic) {
      fadeIn(backgroundMusic);
    }

    if (invadersWinDialog && finalInvadersTimeDisplay && invadersGameActiveElements && startInvadersButton) {
      const fullTimeText = elapsedTimeDisplayElement.textContent;
      const timeMatch = fullTimeText.match(/(\d+\.?\d*)/);
      if (timeMatch && timeMatch[1]) {
        finalInvadersTimeDisplay.textContent = timeMatch[1] + "s";
        finalWinTimeNumeric = parseFloat(timeMatch[1]);
      } else {
        finalInvadersTimeDisplay.textContent = "N/A";
        finalWinTimeNumeric = NaN;
      }
      invadersGameActiveElements.classList.add('hidden');
      invadersWinDialog.classList.remove('hidden');
      invaderPlayerNameInput.focus();
      startInvadersButton.style.display = 'none';
    } else {
      if (startInvadersButton) startInvadersButton.style.display = 'block';
    }
  }
}

function shoot(e) {
  if (!isInvadersGameActive || e.key !== "ArrowUp") return;
  e.preventDefault();

  if (laserCooldown) return;

  laserCooldown = true;
  if (reloadBarProgressElement) {
    reloadBarProgressElement.style.width = '0%';
    reloadBarProgressElement.style.backgroundColor = '#b33a3a';
  }

  if (reloadInterval) clearInterval(reloadInterval);

  let progress = 0;
  const updateInterval = 50;
  const steps = cooldownDuration / updateInterval;
  const increment = 100 / steps;

  reloadInterval = setInterval(() => {
    progress += increment;
    if (progress <= 100 && reloadBarProgressElement) {
      reloadBarProgressElement.style.width = progress + '%';
    } else {
      clearInterval(reloadInterval);
      if (reloadBarProgressElement) reloadBarProgressElement.style.width = '100%';
    }
  }, updateInterval);

  setTimeout(() => {
    laserCooldown = false;
    if (reloadBarProgressElement) {
      reloadBarProgressElement.style.width = '100%';
      reloadBarProgressElement.style.backgroundColor = '#7F8C5A';
    }
    clearInterval(reloadInterval);
  }, cooldownDuration);

  let laserId;
  let currentLaserIndex = currentShooterIndex;
  let laserImgElement = null;

  function moveLaser() {
    if (laserImgElement && laserImgElement.parentNode) {
      laserImgElement.parentNode.removeChild(laserImgElement);
      laserImgElement = null;
    }

    currentLaserIndex -= width;

    if (!squares[currentLaserIndex] || currentLaserIndex < 0) {
      clearInterval(laserId);
      return;
    }

    laserImgElement = document.createElement('img');
    laserImgElement.src = './images/fireball.png';
    laserImgElement.style.position = 'absolute';

    const targetSquare = squares[currentLaserIndex];
    if (grid && targetSquare) {
      laserImgElement.style.left = (targetSquare.offsetLeft + targetSquare.offsetWidth / 2 - laserImgElement.naturalWidth / 2) + 'px';
      laserImgElement.style.top = (targetSquare.offsetTop + targetSquare.offsetHeight / 2 - laserImgElement.naturalHeight / 2) + 'px';

      grid.appendChild(laserImgElement);
    } else {
      clearInterval(laserId);
      return;
    }

    if (squares[currentLaserIndex].classList.contains("invader")) {
      if (laserImgElement && laserImgElement.parentNode) {
        laserImgElement.parentNode.removeChild(laserImgElement);
      }

      squares[currentLaserIndex].classList.remove("invader");
      squares[currentLaserIndex].classList.add("boom");

      setTimeout(() => {
        if (squares[currentLaserIndex]) squares[currentLaserIndex].classList.remove("boom");
      }, 300);
      clearInterval(laserId);

      const alienIndex = alienInvaders.indexOf(currentLaserIndex);
      if (alienIndex > -1 && !aliensRemoved.includes(alienIndex)) {
        aliensRemoved.push(alienIndex);
        results++;
        if (resultDisplay) resultDisplay.innerHTML = `${results} / ${totalAlienInvaders}`;
      }
    }
  }
  laserId = setInterval(moveLaser, 100);
}

function initializeInvadersGame() {
  if (!grid || !resultDisplay || !reloadBarProgressElement || !elapsedTimeDisplayElement) {
    console.error("Required game elements not found for initialization.");
    return;
  }

  if (backgroundMusic && !backgroundMusic.paused) {
    fadeOut(backgroundMusic);
  }
  if (battleMusic) {
    fadeIn(battleMusic);
  }

  isInvadersGameActive = true;
  if (grid) grid.classList.add('grid-levitating');

  grid.innerHTML = '';
  if (invadersId) clearInterval(invadersId);
  if (reloadInterval) clearInterval(reloadInterval);
  if (gameTimerIntervalId) clearInterval(gameTimerIntervalId);
  document.removeEventListener("keydown", moveShooter);
  document.removeEventListener('keydown', shoot);

  squares = [];
  alienInvaders = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
    15, 16, 17, 18, 19, 20, 21, 22, 23, 24,
    30, 31, 32, 33, 34, 35, 36, 37, 38, 39
  ];
  aliensRemoved.length = 0;
  currentShooterIndex = 202;
  isGoingRight = true;
  direction = 1;
  results = 0;
  totalAlienInvaders = alienInvaders.length;
  laserCooldown = false;

  if (resultDisplay) resultDisplay.innerHTML = `${results} / ${totalAlienInvaders}`;
  elapsedTimeDisplayElement.textContent = "Time: 0.0s";

  for (let i = 0; i < width * width; i++) {
    const square = document.createElement("div");
    grid.appendChild(square);
  }
  squares = Array.from(document.querySelectorAll(".grid div"));

  if (squares[currentShooterIndex]) {
    squares[currentShooterIndex].classList.add("shooter");
  }

  draw();

  reloadBarProgressElement.style.width = '100%';
  reloadBarProgressElement.style.backgroundColor = '#7F8C5A';

  gameStartTime = Date.now();
  gameTimerIntervalId = setInterval(() => {
    if (!isInvadersGameActive) {
      clearInterval(gameTimerIntervalId);
      return;
    }
    const elapsedMilliseconds = Date.now() - gameStartTime;
    const elapsedSeconds = (elapsedMilliseconds / 1000).toFixed(1);
    elapsedTimeDisplayElement.textContent = `Time: ${elapsedSeconds}s`;
  }, 40);

  invadersId = setInterval(moveInvaders, 600);
  document.addEventListener("keydown", moveShooter);
  document.addEventListener('keydown', shoot);
}

if (startInvadersButton) {
  startInvadersButton.addEventListener('click', () => {
    if (backgroundMusic && !backgroundMusic.paused) {
      fadeOut(backgroundMusic);
    }

    if (battleMusic) {
      fadeIn(battleMusic);
    }

    if (invadersGameActiveElements) invadersGameActiveElements.classList.remove('hidden');
    startInvadersButton.style.display = 'none';
    if (invadersWinDialog) invadersWinDialog.classList.add('hidden');
    initializeInvadersGame();
  });
} else {
  if (grid) {
    console.warn("Start button not found. Game will not auto-initialize without it.")
  } else {
    console.warn("Space Invaders grid not found. Game will not initialize.");
  }
}

const highscoreTableBody = document.getElementById('highscore-table-body');
const loadingMessage = document.getElementById('loading-message');
const rowsCountSelect = document.getElementById('rows-count');
const tableHeaders = document.querySelectorAll('#highscore-table th[data-sort]');

let currentHighscores = [];
let currentSort = {
  column: 'score',
  direction: 'asc'
};

const comparators = {
  name: (a, b) => a.name.localeCompare(b.name),
  score: (a, b) => a.score - b.score,
  date: (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
};

async function fetchHighscores() {
  if (!loadingMessage || !highscoreTableBody) return;
  loadingMessage.style.display = 'block';
  loadingMessage.textContent = 'Летописи загружаются из бездны...';
  highscoreTableBody.innerHTML = '';

  try {
    const response = await fetch('/api/scores');
    if (!response.ok) {
      throw new Error('Не удалось призвать летописи из бездны');
    }
    currentHighscores = await response.json();
    renderHighscores();
  } catch (error) {
    console.error('Ошибка загрузки летописей:', error);
    loadingMessage.textContent = 'Ошибка: Летописи не откликаются.';
  }
}

function sortHighscores() {
  const cmp = comparators[currentSort.column];
  currentHighscores.sort((a, b) => {
    let res = currentSort.direction === 'asc' ? cmp(a, b) : -cmp(a, b);
    if (res === 0 && currentSort.column !== 'score') {
      res = a.score - b.score;
    }
    return res;
  });
}


function renderHighscores() {
  if (!highscoreTableBody || !rowsCountSelect || !loadingMessage) return;
  sortHighscores();

  highscoreTableBody.innerHTML = '';
  const rowsToShow = parseInt(rowsCountSelect.value, 10);

  const SlicedHighscores = currentHighscores.slice(0, rowsToShow);

  if (SlicedHighscores.length === 0) {
    loadingMessage.textContent = 'Летописи пусты. Отрази вторжение, чтобы стать первым!';
    loadingMessage.style.display = 'block';
    return;
  }
  loadingMessage.style.display = 'none';

  SlicedHighscores.forEach((record, index) => {
    const row = highscoreTableBody.insertRow();
    row.insertCell().textContent = index + 1;
    row.insertCell().textContent = record.name;
    row.insertCell().textContent = record.score.toFixed(1) + ' сек';
    row.insertCell().textContent = new Date(record.timestamp).toLocaleString('ru-RU', {
      dateStyle: 'short',
      timeStyle: 'medium'
    });
  });

  if (tableHeaders) {
    tableHeaders.forEach(th => {
      th.classList.remove('sort-asc', 'sort-desc');
      if (th.dataset.sort === currentSort.column) {
        th.classList.add(currentSort.direction === 'asc' ? 'sort-asc' : 'sort-desc');
      }
    });
  }
}

if (rowsCountSelect) rowsCountSelect.addEventListener('change', renderHighscores);

if (tableHeaders) {
  tableHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const sortColumn = header.getAttribute('data-sort');
      if (sortColumn === 'rank') return;

      if (currentSort.column === sortColumn) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort.column = sortColumn;
        if (sortColumn === 'score') {
          currentSort.direction = 'asc';
        } else if (sortColumn === 'date') {
          currentSort.direction = 'desc';
        } else {
          currentSort.direction = 'asc';
        }
      }
      renderHighscores();
    });
  });
}

if (document.getElementById('results-section')) {
  fetchHighscores();
}

async function handleSaveInvadersScore() {
  if (!invaderPlayerNameInput || !saveInvadersScoreButton) return;

  const playerName = invaderPlayerNameInput.value.trim();
  const scoreToSave = finalWinTimeNumeric;

  if (!playerName) {
    alert('Пожалуйста, начертайте ваше имя, Страж!');
    return;
  }

  if (isNaN(scoreToSave) || scoreToSave <= 0) {
    alert('Некорректное время для сохранения рекорда.');
    saveInvadersScoreButton.disabled = false;
    saveInvadersScoreButton.textContent = 'Запечатать Подвиг';
    return;
  }

  saveInvadersScoreButton.disabled = true;
  saveInvadersScoreButton.textContent = 'Запечатление...';

  try {
    const response = await fetch('/api/scores', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: playerName,
        score: scoreToSave
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Не удалось запечатать подвиг в летописи');
    }

    alert('Подвиг запечатан в вечности!');
    invaderPlayerNameInput.value = '';
    if (invadersWinDialog) invadersWinDialog.classList.add('hidden');
    if (startInvadersButton) startInvadersButton.style.display = 'block';
    if (document.getElementById('results-section')) {
      fetchHighscores();
    }

  } catch (error) {
    console.error('Ошибка запечатления подвига:', error);
    alert(`Ошибка: ${error.message}`);
  } finally {
    saveInvadersScoreButton.disabled = false;
    saveInvadersScoreButton.textContent = 'Запечатать Подвиг';
  }
}

if (saveInvadersScoreButton) {
  saveInvadersScoreButton.addEventListener('click', handleSaveInvadersScore);
}

if (playAgainFromWinButton) {
  playAgainFromWinButton.addEventListener('click', () => {
    if (invadersWinDialog) invadersWinDialog.classList.add('hidden');
    if (startInvadersButton) {
      startInvadersButton.style.display = 'block';
    }
    if (invaderPlayerNameInput) invaderPlayerNameInput.value = '';
    if (grid) grid.classList.remove('grid-levitating');
  });
}