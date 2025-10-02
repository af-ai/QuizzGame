let SENTENCE = [];
let QUESTIONS = [];
let HIDDENPOSITIONS = [];
const correctSound = new Audio("resources/Correct.mp3");
const wrongSound = new Audio("resources/Wrong.mp3");

// === Estado del juego ===
let state = {
    index: 0,
    jokers: 3,
    answered: false,
    startTime: 0,
    extraTime: 0,   // tiempo extra ganado para la siguiente pregunta
    timer: null,
    remaining: 0,
    usedJokers: []

};

// === Helpers DOM ===
const welcomeScreen = document.getElementById('welcomeScreen');
const qText = document.getElementById('qText');
const choicesEl = document.getElementById('choices');
const feedback = document.getElementById('feedback');
const pistaEl = document.getElementById('pista');
const finalBox = document.getElementById('finalBox');
const finalSentence = document.getElementById('finalSentence');
const collectedWords = document.getElementById('collectedWords');
const joker = document.getElementById('joker');
const timerEl = document.getElementById('timer');

// === Botones ===
const startBtn = document.getElementById('startBtn');
const submitBtn = document.getElementById('submitBtn');
const nextBtn = document.getElementById('nextBtn');
const resetBtn = document.getElementById('resetBtn');
const jokerBtn = document.getElementById('jokerBtn');


function init() {
    welcomeScreen.style.display = 'none';
    document.querySelector('.app').style.display = 'block';

    fetch('resources/preguntas.json').then(response => response.json())
        .then(data => {
            loadData(data);
            renderQuestionCard();
        })
        .catch(err => {
            console.error("Error cargando preguntas:", err.message, err);
            alert("No se pudieron cargar las preguntas.");
        });
}

function loadData(data) {
    SENTENCE = data.sentence.split(" ");
    QUESTIONS = data.questions;
    HIDDENPOSITIONS = data.hiddenPositions;
    renderSentence(HIDDENPOSITIONS);
}

function renderSentence(hiddenPositions) {
    SENTENCE.forEach((word, index) => {
        if (hiddenPositions.includes(index)) {
            const input = document.createElement("input");
            input.type = "text";
            input.disabled = true;
            input.size = word.length;
            input.classList.add("free-input", "free-input-locked");
            input.dataset.position = index;
            finalSentence.appendChild(input);
        } else {
            const span = document.createElement("span");
            span.textContent = word + " ";
            finalSentence.appendChild(span);
        }
    });
}

function renderQuestionCard() {
    state.startTime = Date.now();

    const q = QUESTIONS[state.index];

    renderQuestion(q);
    renderChoices(q);
    updateJokerUI();
    state.usedJokers = [];
    startTimer();
}

function renderQuestion(q) {
    qText.textContent = `(${state.index + 1}/${QUESTIONS.length}) ${q.question}`;
}

function renderChoices(q) {
    choicesEl.innerHTML = '';

    if (q.type === 'mc') {
        submitBtn.style.display = 'none';
        q.choices.forEach((c, i) => {
            const btn = document.createElement('button');
            btn.className = 'choice';
            btn.type = 'button';
            btn.dataset.idx = i;
            btn.textContent = c;
            btn.addEventListener('click', () => selectChoice(btn));
            choicesEl.appendChild(btn);
        });
    } else if (q.type === 'text') {
        submitBtn.style.display = 'block';
        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'freeInput';
        input.className = "free-input";
        input.placeholder = 'Escribe tu respuesta aquí...';
        choicesEl.appendChild(input);
    }
}

function selectChoice(btn) {
    btn.classList.add('selected');
    checkAnswer();
}

function updateJokerUI() {
    joker.textContent = Math.max(0, state.jokers);

    if (state.jokers <= 0) {
        jokerBtn.disabled = true;
        jokerBtn.classList.add('locked');
    } else {
        jokerBtn.disabled = false;
        jokerBtn.classList.remove('locked');
    }
}

function startTimer() {
    let total = 10 + (state.extraTime || 0);
    if (total > 20) total = 20;
    state.extraTime = 0;
    state.remaining = total;

    clearInterval(state.timer);
    timerEl.textContent = state.remaining;

    state.timer = setInterval(() => {
        state.remaining--;
        timerEl.textContent = state.remaining;

        if (state.remaining <= 0) {
            clearInterval(state.timer);
            disableElements();
            showFeedback(false, QUESTIONS[state.index].explanation);
        }
    }, 1000);
}

function showFeedback(isCorrect, explanation) {
    feedback.style.display = 'block';
    feedback.className = 'feedback ' + (isCorrect ? 'correct' : 'wrong');
    feedback.innerHTML = (isCorrect ? '<strong>¡Correcto!</strong> ' : '<strong>Incorrecto</strong> ') + `<div style="margin-top:6px">${explanation}</div>`;
}

function checkAnswer() {
    if (state.index >= QUESTIONS.length) {
        return checkFinalSentence();
    }

    const q = QUESTIONS[state.index];
    let correct = true;
    let chosen = null;

    if (q.type === 'mc') {
        const chosenBtn = document.querySelector('.choice.selected');
        if (!chosenBtn) {
            return alert('Selecciona una opción antes de enviar');
        }
        chosen = Number(chosenBtn.dataset.idx);
        correct = chosen === q.answer;
    } else {
        const input = document.getElementById('freeInput');
        if (!input || input.value.trim() === '') {
            return alert('Escribe tu respuesta antes de enviar');
        }
        input.disabled = true;
        chosen = input.value.trim();
        correct = chosen.toLowerCase() === String(q.answer).toLowerCase();
    }

    playSound(correct);
    disableElements();
    showFeedback(correct, q.explanation);
    clearInterval(state.timer);
    addBonusTime(correct);
    updateFinalSentence(correct);
    state.answered = true;
}

function checkFinalSentence() {
    const blanks = document.querySelectorAll('.free-input');
    let allCorrect = true;

    blanks.forEach(input => {
        const userWord = input.value.trim();
        const correctWord = SENTENCE[parseInt(input.dataset.position, 10)];

        if (userWord.toLowerCase() !== correctWord.toLowerCase()) {
            allCorrect = false;
            input.style.borderColor = 'red';
        } else {
            input.style.borderColor = 'green';
        }
    });

    if (allCorrect) {
        qText.innerHTML = '¡Felicidades! Encontraste todas las palabras.';
        resetGame();
    } else {
        alert('Algunas palabras son incorrectas. Aquí está la respuesta correcta:');
        blanks.forEach(input => {
            input.disabled = true;
            const pos = parseInt(input.dataset.position, 10);
            input.value = SENTENCE[pos];
            disableElements();
        });
    }

}

function disableElements() {
    Array.from(choicesEl.children).forEach(ch => {
        if (!ch.classList.contains('selected')) {
            ch.classList.add('locked');
        }
    });
    submitBtn.disabled = true;
    submitBtn.classList.add("locked");
    jokerBtn.disabled = true;
    jokerBtn.classList.add('locked');
}

function updateFinalSentence(isCorrect) {
    if (isCorrect) {
        const index = Math.floor(Math.random() * HIDDENPOSITIONS.length);
        const blankToLoad = document.querySelector(`[data-position="${HIDDENPOSITIONS[index]}"]`);
        if (blankToLoad) {
            const span = document.createElement('span');
            span.textContent = SENTENCE[HIDDENPOSITIONS[index]];
            span.className = "revealed-word";
            blankToLoad.replaceWith(span);
        }

        HIDDENPOSITIONS.splice(index, 1);
    }
}

function addBonusTime(correct) {
    if (correct) {
        const elapsed = (Date.now() - state.startTime) / 1000;
        if (elapsed <= 5) state.extraTime = 3;
    }
}

function nextQuestion() {
    feedback.style.display = 'none';
    pistaEl.style.display = 'none';

    if (!state.answered) {
        return alert('Debes responder antes de continuar.');
    }

    state.index += 1;
    state.answered = false;


    if (state.index >= QUESTIONS.length) {
        return showFinalScreen();
    }

    enableElements();
    renderQuestionCard();
}

function showFinalScreen() {
    if (!document.querySelector('.free-input')) {
        alert('¡Felicidades! Completaste el desafío.');
        return resetGame();
    }
    qText.innerHTML = "Completa la oración:";
    timerEl.innerHTML = '';
    choicesEl.innerHTML = '';
    submitBtn.textContent = 'Enviar oración';
    submitBtn.disabled = false;
    submitBtn.classList.remove('locked');
    nextBtn.disabled = true;
    nextBtn.classList.add('locked');
    jokerBtn.disabled = true;
    jokerBtn.classList.add('locked');
    feedback.style.display = 'none';
    pistaEl.style.display = 'none';
    document.querySelectorAll(".free-input-locked").forEach(input => {
        input.disabled = false;
        input.classList.remove("free-input-locked");
    });
}

function enableElements() {
    submitBtn.disabled = false;
    submitBtn.classList.remove("locked");
    jokerBtn.disabled = false;
    jokerBtn.classList.remove('locked');
}

function useJoker() {
    if (state.jokers <= 0) {
        return alert('No quedan comodines');
    }

    const q = QUESTIONS[state.index];
    let effects = ['5050', 'hint', 'time'];

    if (q.type === 'text') effects = effects.filter(e => e !== '5050');

    effects = effects.filter(e => !state.usedJokers.includes(e));

    if (effects.length === 0) {
        return alert('Ya usaste todos los comodines posibles en esta pregunta');
    }

    const choice = effects[Math.floor(Math.random() * effects.length)];

    if (choice === '5050') apply5050();
    if (choice === 'hint') applyHint();
    if (choice === 'time') applyExtraTime();

    state.jokers -= 1;
    state.usedJokers.push(choice);
    updateJokerUI();
}

function apply5050() {
    const q = QUESTIONS[state.index];
    if (q.type !== 'mc') return;

    const choices = Array.from(choicesEl.children);
    const correctIdx = q.answer;
    const incorrect = choices.filter(ch => parseInt(ch.dataset.idx, 10) !== correctIdx);

    while (incorrect.length > 1) {
        const i = Math.floor(Math.random() * incorrect.length);
        incorrect[i].remove();
        incorrect.splice(i, 1);
    }
}

function applyHint() {
    const q = QUESTIONS[state.index];
    pistaEl.style.display = 'block';
    pistaEl.textContent = `💡 Pista: ${q.hint || 'No hay pista disponible'}`;
}

function applyExtraTime() {
    state.remaining = Math.min(state.remaining + 5, 20);
    timerEl.textContent = state.remaining;
}

function resetGame() {
    location.reload();
}

function playSound(isCorrect) {
    if (isCorrect) {
        return correctSound.play();
    }
    wrongSound.play();
}

submitBtn.addEventListener('click', checkAnswer);
nextBtn.addEventListener('click', nextQuestion);
resetBtn.addEventListener('click', resetGame);
jokerBtn.addEventListener('click', useJoker);
startBtn.addEventListener('click', init);