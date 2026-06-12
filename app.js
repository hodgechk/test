// ── State ────────────────────────────────────────────────────────────────────
let allQuestions = [];   // full pool, loaded from window.QUESTIONS (questions.js)
let sessionCards = [];   // randomly picked subset for this session
let currentIndex = 0;    // pointer into sessionCards

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
const showAnsBtn    = document.getElementById('show-answer-btn');
const nextBtn       = document.getElementById('next-btn');
const finishEl      = document.getElementById('finish-section');
const backHomeBtn   = document.getElementById('back-home-btn');
const speakBtn      = document.getElementById('speak-btn');

// ── Bootstrap ────────────────────────────────────────────────────────────────
function loadQuestions() {
  // window.QUESTIONS is set by questions.js (loaded via <script> in index.html)
  if (!Array.isArray(window.QUESTIONS) || window.QUESTIONS.length === 0) {
    showError('⚠ 題庫載入失敗，請確認 questions.js 存在且格式正確。');
    startBtn.disabled = true;
    return;
  }
  allQuestions = window.QUESTIONS;
  // Clamp max to the available pool size (ceiling: 100)
  countInput.max = Math.min(100, allQuestions.length);
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

// ── Home → Quiz ──────────────────────────────────────────────────────────────
startBtn.addEventListener('click', () => {
  clearError();
  const count = parseInt(countInput.value, 10);
  if (isNaN(count) || count < 10 || count > 100) {
    showError('請輸入 10 ～ 100 之間的數字。');
    return;
  }
  if (count > allQuestions.length) {
    showError(`題庫只有 ${allQuestions.length} 題，請輸入不超過此數量。`);
    return;
  }

  sessionCards  = shuffle(allQuestions).slice(0, count);
  currentIndex  = 0;
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

  // Reset to "question-only" state
  translationEl.classList.add('hidden');
  showAnsBtn.classList.remove('hidden');
  nextBtn.classList.add('hidden');
  finishEl.classList.add('hidden');
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
        utterance.lang = 'en-US'; // 強制設定為韓文發音
        utterance.rate = 0.8;     // 語速 0.1 ~ 10
        utterance.pitch = 1.0;    // 音調
        
        // 播放聲音
        window.speechSynthesis.speak(utterance);
    } else {
        alert("你的瀏覽器不支援語音朗讀功能");
    }
}

showAnsBtn.addEventListener('click', () => {
  translationEl.classList.remove('hidden');
  showAnsBtn.classList.add('hidden');
  speakBtn.classList.remove('hidden');
  speakWord(sessionCards[currentIndex].word);

  const isLast = currentIndex === sessionCards.length - 1;
  if (isLast) {
    finishEl.classList.remove('hidden');
  } else {
    nextBtn.classList.remove('hidden');
  }
});

speakBtn.addEventListener('click', () => {
  speakWord(sessionCards[currentIndex].word);
});

nextBtn.addEventListener('click', () => {
  currentIndex++;
  renderCard();
});

// ── Quiz → Home ──────────────────────────────────────────────────────────────
backHomeBtn.addEventListener('click', () => {
  switchScreen(homeScreen, quizScreen);
  clearError();
  countInput.value = 10;
});

// ── Init ─────────────────────────────────────────────────────────────────────
loadQuestions();
