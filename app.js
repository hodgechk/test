// ── Configuration & Word Units ───────────────────────────────────────────────
const AVAILABLE_UNITS = [
  { id: 'question', name: 'question', file: 'questions/question.js' },
  { id: 'noun', name: '名詞', file: 'questions/noun.js' },
  { id: 'noun_2', name: '名詞 2', file: 'questions/noun_2.js' },
  { id: 'verb', name: '動詞', file: 'questions/verb.js' },
  { id: 'adjective', name: '形容詞', file: 'questions/adjective.js' },
  { id: 'adverb', name: '副詞', file: 'questions/adverb.js' }
];

const POS_MAP = {
  'adjective': '形容詞 (adj.)',
  'adverb': '副詞 (adv.)',
  'noun': '名詞 (n.)',
  'noun_2': '名詞 2 (n. 2)',
  'verb': '動詞 (v.)',
  'question': 'question'
};

// ── State ────────────────────────────────────────────────────────────────────
let unitWords = {};      // unitId -> array of word objects
let sessionCards = [];   // randomly picked subset for this session
let currentIndex = 0;    // pointer into sessionCards
let correctCount = 0;    // number of correct answers
let wrongCount = 0;      // number of wrong answers
let wrongList = [];      // array of wrong questions

// ── DOM References ───────────────────────────────────────────────────────────
const homeScreen    = document.getElementById('home-screen');
const quizScreen    = document.getElementById('quiz-screen');
const countInput    = document.getElementById('count-input');
const startBtn      = document.getElementById('start-btn');
const errorMsg      = document.getElementById('error-msg');

const progressEl    = document.getElementById('progress');
const progressBar   = document.getElementById('progress-bar');
const wordEl        = document.getElementById('word');
const translationEl = document.getElementById('translation');
const posTagEl      = document.getElementById('pos-tag');
const showAnsBtn    = document.getElementById('show-answer-btn');
const speakBtn      = document.getElementById('speak-btn');

// Quiz layout wrappers
const quizContent       = document.getElementById('quiz-content');
const resultScreen      = document.getElementById('result-screen');
const selfGradeButtons  = document.getElementById('self-grade-buttons');
const gradeWrongBtn     = document.getElementById('grade-wrong-btn');
const gradeRightBtn     = document.getElementById('grade-right-btn');

// Result Stats references
const resultScore       = document.getElementById('result-score');
const resultCorrect     = document.getElementById('result-correct');
const resultWrong       = document.getElementById('result-wrong');
const wrongAnswersContainer = document.getElementById('wrong-answers-container');
const wrongListEl       = document.getElementById('wrong-list');

const backHomeBtn   = document.getElementById('back-home-btn');

// Unit Selection DOM references
const unitCheckboxesDiv = document.getElementById('unit-checkboxes');
const selectAllBtn      = document.getElementById('select-all-btn');
const deselectAllBtn    = document.getElementById('deselect-all-btn');

// ── Script Loading & Bootstrap ────────────────────────────────────────────────
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src + '?v=v4';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

async function initUnits() {
  unitCheckboxesDiv.innerHTML = '<div class="loading-text">正在載入題庫單元...</div>';
  startBtn.disabled = true;
  
  let loadedCount = 0;
  
  // Load each JS file sequentially to avoid over-writing window.QUESTIONS in parallel
  for (const unit of AVAILABLE_UNITS) {
    try {
      window.QUESTIONS = undefined;
      await loadScript(unit.file);
      
      if (Array.isArray(window.QUESTIONS)) {
        unitWords[unit.id] = window.QUESTIONS.map(q => ({
          ...q,
          pos: unit.id
        }));
        loadedCount++;
      } else {
        console.warn(`Unit ${unit.id} did not define window.QUESTIONS correctly.`);
        unitWords[unit.id] = [];
      }
    } catch (e) {
      console.error(`Failed to load unit ${unit.id} (${unit.file}):`, e);
      unitWords[unit.id] = [];
    }
  }
  
  // Clean up global questions property
  delete window.QUESTIONS;
  
  if (loadedCount === 0) {
    unitCheckboxesDiv.innerHTML = '<div class="error-msg">所有單元載入失敗，請確認 questions 資料夾存在。</div>';
    return;
  }
  
  renderCheckboxes();
  setupCheckboxListeners();
}

// ── Checkbox & Setup ──────────────────────────────────────────────────────────
function renderCheckboxes() {
  unitCheckboxesDiv.innerHTML = '';
  AVAILABLE_UNITS.forEach(unit => {
    const words = unitWords[unit.id] || [];
    if (words.length === 0) return; // Skip failed/empty units
    
    const label = document.createElement('label');
    label.className = 'checkbox-item';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = unit.id;
    checkbox.checked = true; // checked by default
    
    const spanText = document.createElement('span');
    spanText.className = 'checkbox-label-text';
    spanText.textContent = `${unit.name} (${words.length}字)`;
    
    label.appendChild(checkbox);
    label.appendChild(spanText);
    unitCheckboxesDiv.appendChild(label);
  });
  
  updateAvailableCount();
}

function setupCheckboxListeners() {
  selectAllBtn.addEventListener('click', () => {
    const checkboxes = unitCheckboxesDiv.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = true);
    updateAvailableCount();
  });
  
  deselectAllBtn.addEventListener('click', () => {
    const checkboxes = unitCheckboxesDiv.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
    updateAvailableCount();
  });
  
  unitCheckboxesDiv.addEventListener('change', (e) => {
    if (e.target && e.target.type === 'checkbox') {
      updateAvailableCount();
    }
  });
}

function updateAvailableCount() {
  const checkedBoxes = unitCheckboxesDiv.querySelectorAll('input[type="checkbox"]:checked');
  let totalWords = 0;
  
  checkedBoxes.forEach(cb => {
    const words = unitWords[cb.value] || [];
    totalWords += words.length;
  });
  
  if (totalWords === 0) {
    countInput.min = 0;
    countInput.max = 0;
    countInput.value = 0;
    startBtn.disabled = true;
    showError('請至少勾選一個出題單元！');
  } else {
    countInput.min = Math.min(10, totalWords);
    countInput.max = Math.min(500, totalWords);
    
    let currentVal = parseInt(countInput.value, 10);
    if (isNaN(currentVal) || currentVal < countInput.min) {
      countInput.value = countInput.min;
    } else if (currentVal > countInput.max) {
      countInput.value = countInput.max;
    }
    startBtn.disabled = false;
    clearError();
  }
  
  const countLabel = document.querySelector('label[for="count-input"]');
  if (countLabel) {
    countLabel.textContent = `本次出題數量 (可選範圍: ${countInput.min} ~ ${countInput.max})`;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.hidden = false;
}
function clearError() {
  errorMsg.textContent = '';
  errorMsg.hidden = true;
}

/** Fisher-Yates shuffle — returns a new shuffled array */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function switchScreen(show, hide) {
  show.classList.remove('hidden');
  hide.classList.add('hidden');
}

function formatPOS(pos) {
  if (POS_MAP[pos]) return POS_MAP[pos];
  return pos.charAt(0).toUpperCase() + pos.slice(1);
}

// ── Home → Quiz ──────────────────────────────────────────────────────────────
startBtn.addEventListener('click', () => {
  clearError();
  const count = parseInt(countInput.value, 10);
  const checkedBoxes = unitCheckboxesDiv.querySelectorAll('input[type="checkbox"]:checked');
  
  if (checkedBoxes.length === 0) {
    showError('請至少勾選一個單元！');
    return;
  }
  
  // Combine all questions from selected units
  let activePool = [];
  checkedBoxes.forEach(cb => {
    const words = unitWords[cb.value] || [];
    activePool.push(...words);
  });
  
  if (isNaN(count) || count < countInput.min || count > countInput.max) {
    showError(`請輸入介於 ${countInput.min} ～ ${countInput.max} 之間的出題數量。`);
    return;
  }

  sessionCards  = shuffle(activePool).slice(0, count);
  currentIndex  = 0;
  correctCount  = 0;
  wrongCount    = 0;
  wrongList     = [];
  
  // Ensure quiz interface is visible and result is hidden
  quizContent.classList.remove('hidden');
  resultScreen.classList.add('hidden');
  
  switchScreen(quizScreen, homeScreen);
  renderCard();
});

// ── Quiz Rendering ───────────────────────────────────────────────────────────
function renderCard() {
  const card  = sessionCards[currentIndex];
  const total = sessionCards.length;

  progressEl.textContent      = `第 ${currentIndex + 1} / ${total} 題`;
  progressBar.style.width     = `${((currentIndex + 1) / total) * 100}%`;
  wordEl.textContent          = card.word;
  translationEl.textContent   = card.translation;
  posTagEl.textContent        = formatPOS(card.pos);

  // Reset to "question-only" state
  translationEl.classList.add('hidden');
  posTagEl.classList.add('hidden');
  
  showAnsBtn.classList.remove('hidden');
  selfGradeButtons.classList.add('hidden');
  speakBtn.classList.add('hidden');

  // Trigger entrance animation (reflow trick)
  const cardEl = document.getElementById('flashcard');
  cardEl.classList.remove('card-enter');
  void cardEl.offsetWidth;
  cardEl.classList.add('card-enter');
}

// 發音功能函式
function speakWord(word) {
  if ('speechSynthesis' in window) {
    // 先停止目前正在播放的聲音
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'ko-KR'; // 強制設定為韓文發音
    utterance.rate = 0.8;     // 語速 0.1 ~ 10
    utterance.pitch = 1.0;    // 音調
    
    // 播放聲音
    window.speechSynthesis.speak(utterance);
  } else {
    alert("你的瀏覽器不支援語音朗讀功能");
  }
}

// ── Quiz Action Events ────────────────────────────────────────────────────────
showAnsBtn.addEventListener('click', () => {
  translationEl.classList.remove('hidden');
  posTagEl.classList.remove('hidden');
  showAnsBtn.classList.add('hidden');
  speakBtn.classList.remove('hidden');
  selfGradeButtons.classList.remove('hidden');
  speakWord(sessionCards[currentIndex].word);
});

speakBtn.addEventListener('click', () => {
  speakWord(sessionCards[currentIndex].word);
});

gradeWrongBtn.addEventListener('click', () => {
  wrongCount++;
  wrongList.push(sessionCards[currentIndex]);
  goToNextOrFinish();
});

gradeRightBtn.addEventListener('click', () => {
  correctCount++;
  goToNextOrFinish();
});

function goToNextOrFinish() {
  const isLast = currentIndex === sessionCards.length - 1;
  if (isLast) {
    showResults();
  } else {
    currentIndex++;
    renderCard();
  }
}

// ── Results Display ──────────────────────────────────────────────────────────
function showResults() {
  quizContent.classList.add('hidden');
  resultScreen.classList.remove('hidden');
  
  const total = sessionCards.length;
  const score = Math.round((correctCount / total) * 100);
  
  resultScore.textContent = score;
  resultCorrect.textContent = correctCount;
  resultWrong.textContent = wrongCount;
  
  wrongListEl.innerHTML = '';
  
  if (wrongList.length === 0) {
    wrongAnswersContainer.classList.add('hidden');
    
    const perfectMsg = document.createElement('div');
    perfectMsg.className = 'perfect-msg';
    perfectMsg.textContent = '✨ 完美無缺！恭喜你全部答對！ 🎯';
    wrongListEl.appendChild(perfectMsg);
    wrongAnswersContainer.classList.remove('hidden'); // Show container for perfect message
  } else {
    wrongAnswersContainer.classList.remove('hidden');
    wrongList.forEach(card => {
      const row = document.createElement('div');
      row.className = 'wrong-item';
      
      const wordSpan = document.createElement('span');
      wordSpan.className = 'wrong-word';
      wordSpan.textContent = card.word;
      
      const playBtn = document.createElement('button');
      playBtn.className = 'play-btn-small';
      playBtn.textContent = '🔊';
      playBtn.title = '點擊發音';
      playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        speakWord(card.word);
      });
      
      const posSpan = document.createElement('span');
      posSpan.className = 'wrong-pos';
      posSpan.textContent = formatPOS(card.pos);
      
      const transSpan = document.createElement('span');
      transSpan.className = 'wrong-trans';
      transSpan.textContent = card.translation;
      
      row.appendChild(wordSpan);
      row.appendChild(playBtn);
      row.appendChild(posSpan);
      row.appendChild(transSpan);
      
      wrongListEl.appendChild(row);
    });
  }
}

// ── Quiz → Home ──────────────────────────────────────────────────────────────
backHomeBtn.addEventListener('click', () => {
  switchScreen(homeScreen, quizScreen);
  clearError();
  updateAvailableCount();
});

// ── Init ─────────────────────────────────────────────────────────────────────
initUnits();
