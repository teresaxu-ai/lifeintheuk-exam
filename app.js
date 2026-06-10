// State Management
let examsData = {};
let metadata = {};
let currentExam = null;
let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let wrongQuestions = [];
let isMarathon = false;

// Study State
let studyQuestions = [];
let studyIndex = 0;

// Timer State
let timerInterval = null;
let timeLeft = 0;
let startTime = 0;
const EXAM_TIME_LIMIT = 45 * 60;

// DOM Elements
const homeView = document.getElementById('home-view');
const quizView = document.getElementById('quiz-view');
const resultView = document.getElementById('result-view');
const studyView = document.getElementById('study-view');
const examList = document.getElementById('exam-list');
const homeBtn = document.getElementById('home-btn');
const stopBtn = document.getElementById('stop-btn');
const subtitle = document.getElementById('subtitle');
const timerDisplay = document.getElementById('timer');
const progress = document.getElementById('progress');
const questionText = document.getElementById('question-text');
const answersContainer = document.getElementById('answers-container');
const feedbackContainer = document.getElementById('feedback-container');
const resultStatus = document.getElementById('result-status');
const explanationText = document.getElementById('explanation-text');
const checkBtn = document.getElementById('check-btn');
const nextBtn = document.getElementById('next-btn');
const lastUpdatedSpan = document.getElementById('last-updated');
const quizProgressFill = document.getElementById('quiz-progress-fill');
const quizBookmarkBtn = document.getElementById('quiz-bookmark-btn');

// Result View Elements
const scoreText = document.getElementById('score-text');
const scorePercentage = document.getElementById('score-percentage');
const timeTakenText = document.getElementById('time-taken-text');
const timeUpMsg = document.getElementById('time-up-msg');
const wrongAnswersContainer = document.getElementById('wrong-answers-container');
const wrongAnswersList = document.getElementById('wrong-answers-list');
const restartBtn = document.getElementById('restart-btn');
const resultHomeBtn = document.getElementById('result-home-btn');

// Home Mode Buttons
const randomExamBtn = document.getElementById('random-exam-btn');
const marathonBtn = document.getElementById('marathon-btn');
const studyAllBtn = document.getElementById('study-all-btn');
const bookmarksBtn = document.getElementById('bookmarks-btn');
const mistakesRow = document.getElementById('mistakes-row');
const mistakesBtn = document.getElementById('mistakes-btn');
const clearMistakesBtn = document.getElementById('clear-mistakes-btn');

// Study View Elements
const studyProgress = document.getElementById('study-progress');
const studyQuestion = document.getElementById('study-question');
const studyAnswers = document.getElementById('study-answers');
const studyExplanation = document.getElementById('study-explanation');
const studyBookmarkBtn = document.getElementById('study-bookmark-btn');
const studyPrevBtn = document.getElementById('study-prev-btn');
const studyNextBtn = document.getElementById('study-next-btn');

// --- localStorage Helpers ---

function getBookmarks() {
    return JSON.parse(localStorage.getItem('lituk_bookmarks') || '[]');
}

function saveBookmarks(arr) {
    localStorage.setItem('lituk_bookmarks', JSON.stringify(arr));
}

function isBookmarked(questionText) {
    return getBookmarks().includes(questionText);
}

function toggleBookmark(questionText) {
    const bookmarks = getBookmarks();
    const idx = bookmarks.indexOf(questionText);
    if (idx === -1) {
        bookmarks.push(questionText);
    } else {
        bookmarks.splice(idx, 1);
    }
    saveBookmarks(bookmarks);
    return idx === -1;
}

function getMistakes() {
    return JSON.parse(localStorage.getItem('lituk_mistakes') || '[]');
}

function addMistake(question) {
    const mistakes = getMistakes();
    if (!mistakes.includes(question)) {
        mistakes.push(question);
        localStorage.setItem('lituk_mistakes', JSON.stringify(mistakes));
    }
}

function doClearMistakes() {
    localStorage.removeItem('lituk_mistakes');
    updateSpecialModeButtons();
}

// --- Marathon Progress ---

function getMarathonSave() {
    return JSON.parse(localStorage.getItem('lituk_marathon_save') || 'null');
}

function saveMarathonProgress() {
    localStorage.setItem('lituk_marathon_save', JSON.stringify({
        questionOrder: currentQuestions.map(q => q.question),
        index: currentQuestionIndex,
        score: score,
        wrongQuestions: wrongQuestions
    }));
}

function clearMarathonProgress() {
    localStorage.removeItem('lituk_marathon_save');
}

// --- Exam Progress ---

function getExamProgress() {
    return JSON.parse(localStorage.getItem('lituk_exam_progress') || '{}');
}

function saveExamProgress(examNum, percentage) {
    const progress = getExamProgress();
    const existing = progress[examNum] || { attempts: 0, best: 0 };
    existing.attempts += 1;
    existing.best = Math.max(existing.best, percentage);
    progress[examNum] = existing;
    localStorage.setItem('lituk_exam_progress', JSON.stringify(progress));
}

// --- Special Mode Button State ---

function updateSpecialModeButtons() {
    const bookmarks = getBookmarks();
    const mistakes = getMistakes();

    if (bookmarks.length > 0) {
        bookmarksBtn.classList.remove('hidden');
        document.getElementById('bookmarks-sub').textContent = bookmarks.length;
    } else {
        bookmarksBtn.classList.add('hidden');
    }

    if (mistakes.length > 0) {
        mistakesRow.classList.remove('hidden');
        document.getElementById('mistakes-sub').textContent = mistakes.length;
    } else {
        mistakesRow.classList.add('hidden');
    }

    updateSidebarProgress();
    renderDashboardStats();
}

function updateSidebarProgress() {
    const totalExams = Object.keys(examsData).length;
    if (totalExams === 0) return;
    const examProgress = getExamProgress();
    const attempted = Object.keys(examProgress).length;
    const fillEl = document.getElementById('sidebar-progress-fill');
    const subEl = document.getElementById('sidebar-footer-sub');
    if (fillEl) fillEl.style.width = `${Math.round((attempted / totalExams) * 100)}%`;
    if (subEl) subEl.textContent = `${attempted} of ${totalExams} exams done`;
}

// --- Initialization ---

async function init() {
    try {
        const response = await fetch('exams.json');
        const data = await response.json();
        examsData = data.exams || data;
        metadata = data.metadata || {};

        if (metadata.lastUpdated && lastUpdatedSpan) {
            lastUpdatedSpan.textContent = metadata.lastUpdated;
        }

        subtitle.textContent = 'Dashboard';
        renderExamList();
        updateSpecialModeButtons();
    } catch (error) {
        console.error('Failed to load exams data:', error);
        examList.innerHTML = '<p>Error loading exams. Please ensure exams.json exists.</p>';
    }
}

function renderExamList() {
    examList.innerHTML = '';
    const progress = getExamProgress();
    Object.keys(examsData).forEach(examNum => {
        const item = document.createElement('div');
        item.className = 'exam-item';

        const examProgress = progress[examNum];
        let statusBadge = '';
        if (examProgress) {
            const cls = examProgress.best >= 75 ? 'badge-pass' : 'badge-try';
            statusBadge = `<span class="exam-status-badge ${cls}">${examProgress.best}%</span>`;
        }

        item.innerHTML = `
            <div class="exam-card-header">
                <span class="exam-num">Exam ${examNum}</span>
                ${statusBadge}
            </div>
            <div class="exam-card-footer">
                <button class="exam-quiz-btn">Take Exam</button>
                <button class="exam-study-btn">Study</button>
            </div>
        `;

        item.querySelector('.exam-quiz-btn').onclick = () => startExam(examNum);
        item.querySelector('.exam-study-btn').onclick = () => startStudyExam(examNum);
        examList.appendChild(item);
    });
    renderDashboardStats();
}

function renderDashboardStats() {
    const statsEl = document.getElementById('dashboard-stats');
    if (!statsEl) return;
    const totalExams = Object.keys(examsData).length;
    const progress = getExamProgress();
    const attempted = Object.values(progress);
    const passed = attempted.filter(p => p.best >= 75).length;
    const avgScore = attempted.length > 0
        ? Math.round(attempted.reduce((a, b) => a + b.best, 0) / attempted.length)
        : 0;
    const bookmarkCount = getBookmarks().length;
    statsEl.innerHTML = `
        <div class="stat-card">
            <div class="stat-value">${attempted.length}<span class="stat-total">/${totalExams}</span></div>
            <div class="stat-label">Exams Tried</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${passed}</div>
            <div class="stat-label">Passed (75%+)</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${avgScore > 0 ? avgScore + '%' : '—'}</div>
            <div class="stat-label">Best Avg</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${bookmarkCount}</div>
            <div class="stat-label">Bookmarked</div>
        </div>
    `;
}

// --- Utilities ---

function shuffle(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

function getAllQuestions() {
    let all = [];
    Object.values(examsData).forEach(examQuestions => {
        all = all.concat(examQuestions);
    });
    return all;
}

// --- Quiz Modes ---

function startExam(examNum) {
    currentExam = examNum;
    isMarathon = false;
    setupQuiz(shuffle(examsData[examNum]), `Exam ${examNum}`);
}

function startRandomExam() {
    currentExam = 'Random';
    isMarathon = false;
    const randomSelection = shuffle(getAllQuestions()).slice(0, 24);
    setupQuiz(randomSelection, 'Random Exam');
}

function startMarathon() {
    currentExam = 'Marathon';
    isMarathon = true;

    const saved = getMarathonSave();
    if (saved && saved.index > 0) {
        const allQ = getAllQuestions();
        const qMap = {};
        allQ.forEach(q => { qMap[q.question] = q; });
        const restored = saved.questionOrder.map(qt => qMap[qt]).filter(Boolean);

        if (restored.length === saved.questionOrder.length &&
            confirm(`Resume marathon at question ${saved.index + 1} of ${restored.length}?`)) {
            clearInterval(timerInterval);
            currentQuestions = restored;
            currentQuestionIndex = saved.index;
            score = saved.score;
            wrongQuestions = saved.wrongQuestions;

            homeView.classList.add('hidden');
            resultView.classList.add('hidden');
            studyView.classList.add('hidden');
            quizView.classList.remove('hidden');
            homeBtn.classList.remove('hidden');
            stopBtn.classList.remove('hidden');
            timerDisplay.classList.add('hidden');

            subtitle.textContent = 'Marathon Exam';
            subtitle.classList.remove('hidden');
            renderQuestion();
            return;
        }
        clearMarathonProgress();
    }

    setupQuiz(shuffle(getAllQuestions()), 'Marathon Exam');
}

function startBookmarksQuiz() {
    const bookmarks = getBookmarks();
    const questions = getAllQuestions().filter(q => bookmarks.includes(q.question));
    if (questions.length === 0) return;
    currentExam = 'Bookmarks';
    isMarathon = false;
    setupQuiz(shuffle(questions), `Bookmarked (${questions.length})`);
}

function startMistakesQuiz() {
    const mistakes = getMistakes();
    const questions = getAllQuestions().filter(q => mistakes.includes(q.question));
    if (questions.length === 0) return;
    currentExam = 'Mistakes';
    isMarathon = false;
    setupQuiz(shuffle(questions), `My Mistakes (${questions.length})`);
}

function setupQuiz(questions, subtitleText) {
    clearInterval(timerInterval);
    currentQuestions = questions;
    currentQuestionIndex = 0;
    score = 0;
    wrongQuestions = [];

    homeView.classList.add('hidden');
    resultView.classList.add('hidden');
    studyView.classList.add('hidden');
    quizView.classList.remove('hidden');
    homeBtn.classList.remove('hidden');

    if (isMarathon) {
        stopBtn.classList.remove('hidden');
        timerDisplay.classList.add('hidden');
    } else {
        stopBtn.classList.add('hidden');
        startTimer();
    }

    subtitle.textContent = subtitleText;
    subtitle.classList.remove('hidden');
    renderQuestion();
    if (isMarathon) saveMarathonProgress();
}

// --- Timer ---

function startTimer() {
    timeLeft = EXAM_TIME_LIMIT;
    startTime = Date.now();
    timerDisplay.classList.remove('hidden');
    timerDisplay.classList.remove('warning');
    updateTimerDisplay();

    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft <= 60) timerDisplay.classList.add('warning');
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            showResults(true);
        }
    }, 1000);
}

function updateTimerDisplay() {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    timerDisplay.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// --- Quiz Rendering ---

function updateProgressBar() {
    if (!quizProgressFill) return;
    const pct = (currentQuestionIndex / currentQuestions.length) * 100;
    quizProgressFill.style.width = `${pct}%`;
}

function fadeIn(el) {
    if (!el) return;
    el.classList.remove('fade-in');
    void el.offsetWidth;
    el.classList.add('fade-in');
}

function renderQuestion() {
    const question = currentQuestions[currentQuestionIndex];
    const shuffledAnswers = shuffle(question.answers);

    progress.textContent = `Question ${currentQuestionIndex + 1} of ${currentQuestions.length}`;
    questionText.textContent = question.question;
    answersContainer.innerHTML = '';

    feedbackContainer.classList.add('hidden');
    checkBtn.classList.remove('hidden');
    checkBtn.disabled = true;
    nextBtn.classList.add('hidden');

    const bookmarked = isBookmarked(question.question);
    quizBookmarkBtn.textContent = bookmarked ? '⭐' : '☆';
    quizBookmarkBtn.classList.toggle('bookmarked', bookmarked);
    quizBookmarkBtn.title = bookmarked ? 'Remove bookmark' : 'Bookmark this question';

    updateProgressBar();
    fadeIn(document.getElementById('question-container'));

    const inputType = question.answers.filter(a => a.isCorrect).length > 1 ? 'checkbox' : 'radio';

    shuffledAnswers.forEach((ans, idx) => {
        const label = document.createElement('label');
        label.className = 'answer-option';

        const input = document.createElement('input');
        input.type = inputType;
        input.name = 'answer';
        input.value = idx;
        input.dataset.isCorrect = ans.isCorrect;

        input.onchange = () => {
            const checked = answersContainer.querySelectorAll('input:checked');
            checkBtn.disabled = checked.length === 0;
            answersContainer.querySelectorAll('.answer-option').forEach(l => l.classList.remove('selected'));
            checked.forEach(c => c.parentElement.classList.add('selected'));
        };

        label.appendChild(input);
        label.appendChild(document.createTextNode(ans.text));
        answersContainer.appendChild(label);
    });
}

function checkAnswer() {
    const question = currentQuestions[currentQuestionIndex];
    const inputs = answersContainer.querySelectorAll('input');
    let allCorrect = true;
    let anyWrong = false;

    inputs.forEach(input => {
        const isCorrect = input.dataset.isCorrect === 'true';
        const label = input.parentElement;
        if (isCorrect) {
            label.classList.add('correct');
            if (!input.checked) allCorrect = false;
        } else if (input.checked) {
            label.classList.add('incorrect');
            anyWrong = true;
        }
        input.disabled = true;
    });

    const success = allCorrect && !anyWrong;
    if (success) {
        score++;
    } else {
        wrongQuestions.push({
            question: question.question,
            correctAnswer: question.answers.filter(a => a.isCorrect).map(a => a.text).join(', '),
            explanation: question.reference
        });
        addMistake(question.question);
    }

    resultStatus.textContent = success ? '✓ Correct!' : '✗ Incorrect';
    resultStatus.style.color = success ? 'var(--success-color)' : 'var(--danger-color)';
    explanationText.textContent = question.reference || 'No explanation available.';

    feedbackContainer.classList.remove('hidden');
    checkBtn.classList.add('hidden');
    nextBtn.classList.remove('hidden');

    feedbackContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
}

function nextQuestion() {
    currentQuestionIndex++;
    if (isMarathon) saveMarathonProgress();
    if (currentQuestionIndex < currentQuestions.length) {
        renderQuestion();
        scrollTop();
    } else {
        showResults();
    }
}

// --- Results ---

function animateScore(target) {
    let current = 0;
    const increment = Math.max(1, Math.ceil(target / 50));
    const timer = setInterval(() => {
        current = Math.min(current + increment, target);
        scorePercentage.textContent = `${current}%`;
        if (current >= target) clearInterval(timer);
    }, 16);
}

function showResults(isTimeUp = false) {
    clearInterval(timerInterval);
    if (isMarathon) clearMarathonProgress();
    quizView.classList.add('hidden');
    homeBtn.classList.remove('hidden');
    stopBtn.classList.add('hidden');
    timerDisplay.classList.add('hidden');
    resultView.classList.remove('hidden');

    subtitle.textContent = 'Results';
    subtitle.classList.remove('hidden');

    timeUpMsg.classList.toggle('hidden', !isTimeUp);

    const finalTotal = isMarathon ? (score + wrongQuestions.length) : currentQuestions.length;
    const percentage = Math.round((score / finalTotal) * 100) || 0;

    scoreText.textContent = `Your Score: ${score}/${finalTotal}`;
    scorePercentage.textContent = '0%';
    setTimeout(() => animateScore(percentage), 300);

    if (!['Random', 'Marathon', 'Bookmarks', 'Mistakes'].includes(String(currentExam))) {
        saveExamProgress(currentExam, percentage);
        renderExamList();
    }

    if (!isMarathon) {
        const timeSpent = Math.floor((Date.now() - startTime) / 1000);
        const spentMins = Math.floor(timeSpent / 60);
        const spentSecs = timeSpent % 60;
        timeTakenText.textContent = `Time Taken: ${spentMins.toString().padStart(2, '0')}:${spentSecs.toString().padStart(2, '0')}`;
        timeTakenText.classList.remove('hidden');
    } else {
        timeTakenText.classList.add('hidden');
    }

    if (wrongQuestions.length > 0) {
        wrongAnswersContainer.classList.remove('hidden');
        wrongAnswersList.innerHTML = '';
        wrongQuestions.forEach(item => {
            const div = document.createElement('div');
            div.className = 'wrong-item';
            div.innerHTML = `
                <div class="wrong-question">${item.question}</div>
                <div class="correct-answer-was">✓ Correct: ${item.correctAnswer}</div>
                <div class="wrong-explanation">${item.explanation || ''}</div>
            `;
            wrongAnswersList.appendChild(div);
        });
    } else {
        wrongAnswersContainer.classList.add('hidden');
    }

    updateSpecialModeButtons();
    scrollTop();
}

// --- Navigation ---

function goHome() {
    clearInterval(timerInterval);
    homeView.classList.remove('hidden');
    quizView.classList.add('hidden');
    resultView.classList.add('hidden');
    studyView.classList.add('hidden');
    homeBtn.classList.add('hidden');
    stopBtn.classList.add('hidden');
    timerDisplay.classList.add('hidden');

    subtitle.textContent = 'Dashboard';
    setActiveNav('nav-dashboard');

    updateSpecialModeButtons();
    scrollTop();
}

function setActiveNav(activeId) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const el = document.getElementById(activeId);
    if (el) el.classList.add('active');
}

function restartExam() {
    if (currentExam === 'Random') startRandomExam();
    else if (currentExam === 'Marathon') { clearMarathonProgress(); startMarathon(); }
    else if (currentExam === 'Bookmarks') startBookmarksQuiz();
    else if (currentExam === 'Mistakes') startMistakesQuiz();
    else startExam(currentExam);
}

// --- Study Mode ---

function startStudyAll() {
    studyQuestions = getAllQuestions();
    studyIndex = 0;
    showStudyView('Study: All Questions');
}

function startStudyExam(examNum) {
    studyQuestions = [...examsData[examNum]];
    studyIndex = 0;
    showStudyView(`Study: Exam ${examNum}`);
}

function startStudyBookmarks() {
    const bookmarks = getBookmarks();
    studyQuestions = getAllQuestions().filter(q => bookmarks.includes(q.question));
    studyIndex = 0;
    showStudyView(`Study: Bookmarked (${studyQuestions.length})`);
}

function showStudyView(subtitleText) {
    homeView.classList.add('hidden');
    quizView.classList.add('hidden');
    resultView.classList.add('hidden');
    studyView.classList.remove('hidden');
    homeBtn.classList.remove('hidden');
    timerDisplay.classList.add('hidden');
    stopBtn.classList.add('hidden');

    subtitle.textContent = subtitleText;
    subtitle.classList.remove('hidden');

    renderStudyCard();
    scrollTop();
}

function renderStudyCard() {
    const q = studyQuestions[studyIndex];
    studyProgress.textContent = `${studyIndex + 1} of ${studyQuestions.length}`;
    studyQuestion.textContent = q.question;
    studyAnswers.innerHTML = '';

    q.answers.forEach(ans => {
        const div = document.createElement('div');
        div.className = 'study-answer' + (ans.isCorrect ? ' correct' : '');
        const icon = document.createElement('span');
        icon.className = 'study-answer-icon';
        icon.textContent = ans.isCorrect ? '✓' : '';
        div.appendChild(icon);
        div.appendChild(document.createTextNode(ans.text));
        studyAnswers.appendChild(div);
    });

    studyExplanation.textContent = q.reference || '';

    const bookmarked = isBookmarked(q.question);
    studyBookmarkBtn.textContent = bookmarked ? '⭐ Bookmarked' : '☆ Bookmark';
    studyBookmarkBtn.classList.toggle('bookmarked', bookmarked);

    studyPrevBtn.disabled = studyIndex === 0;
    studyNextBtn.disabled = studyIndex === studyQuestions.length - 1;

    fadeIn(document.getElementById('study-card'));
}

function studyNext() {
    if (studyIndex < studyQuestions.length - 1) {
        studyIndex++;
        renderStudyCard();
        scrollTop();
    }
}

function studyPrev() {
    if (studyIndex > 0) {
        studyIndex--;
        renderStudyCard();
        scrollTop();
    }
}

function toggleQuizBookmark() {
    const question = currentQuestions[currentQuestionIndex];
    const added = toggleBookmark(question.question);
    quizBookmarkBtn.textContent = added ? '⭐' : '☆';
    quizBookmarkBtn.classList.toggle('bookmarked', added);
    quizBookmarkBtn.title = added ? 'Remove bookmark' : 'Bookmark this question';
}

function toggleStudyBookmark() {
    const q = studyQuestions[studyIndex];
    const added = toggleBookmark(q.question);
    studyBookmarkBtn.textContent = added ? '⭐ Bookmarked' : '☆ Bookmark';
    studyBookmarkBtn.classList.toggle('bookmarked', added);
}

// --- Event Listeners ---

checkBtn.onclick = checkAnswer;
nextBtn.onclick = nextQuestion;
homeBtn.onclick = goHome;
stopBtn.onclick = () => showResults();
randomExamBtn.onclick = () => { startRandomExam(); setActiveNav('random-exam-btn'); };
marathonBtn.onclick = () => { startMarathon(); setActiveNav('marathon-btn'); };
studyAllBtn.onclick = () => { startStudyAll(); setActiveNav('study-all-btn'); };
bookmarksBtn.onclick = startBookmarksQuiz;
mistakesBtn.onclick = startMistakesQuiz;
clearMistakesBtn.onclick = doClearMistakes;
restartBtn.onclick = restartExam;
resultHomeBtn.onclick = goHome;
quizBookmarkBtn.onclick = toggleQuizBookmark;
studyBookmarkBtn.onclick = toggleStudyBookmark;
studyPrevBtn.onclick = studyPrev;
studyNextBtn.onclick = studyNext;
document.getElementById('nav-dashboard').onclick = goHome;

// Scroll helper — the actual scrolling container is #main-wrapper in app mode
function scrollTop() {
    const wrapper = document.getElementById('main-wrapper');
    if (wrapper) wrapper.scrollTop = 0;
}

// Sidebar toggle (mobile)
const sidebarEl = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const sidebarToggle = document.getElementById('sidebar-toggle');
function openSidebar() {
    sidebarEl.classList.add('open');
    sidebarOverlay.classList.remove('hidden');
}
function closeSidebar() {
    sidebarEl.classList.remove('open');
    sidebarOverlay.classList.add('hidden');
}
sidebarToggle.onclick = openSidebar;
sidebarOverlay.onclick = closeSidebar;
// Close sidebar after any nav click on mobile
document.querySelectorAll('.nav-item, .nav-clear-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (window.innerWidth <= 720) closeSidebar();
    });
});

init();
