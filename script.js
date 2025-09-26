let QUESTIONS = [];

// === Estado del juego ===
let state = {
    index: 0,
    collected: [],
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
    const file = document.getElementById('fileInput').files[0];

    if (!file) {
        alert('Por favor selecciona un archivo de preguntas.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);

            // Validación: mínimo 12 preguntas
            if (!Array.isArray(data) || data.length < 11) {
                alert('El archivo debe contener al menos 11 preguntas.');
                return;
            }

            // Si pasa la validación, inicializamos el juego
            QUESTIONS = data;
            welcomeScreen.style.display = 'none';
            document.querySelector('.app').style.display = 'block';
            renderQuestion();

        } catch (err) {
            alert('El archivo no es un JSON válido.');
            console.error(err);
        }
    };

    reader.readAsText(file);
}

// === Render pregunta ===
function renderQuestion() {
    feedback.style.display = 'none';
    pistaEl.style.display = 'none';
    state.answered = false;

    if (state.index >= QUESTIONS.length) {
        showFinalScreen();
        return;
    }

    state.startTime = Date.now();
    const q = QUESTIONS[state.index];
    qText.textContent = `(${state.index + 1}/${QUESTIONS.length}) ${q.question}`;
    choicesEl.innerHTML = '';

    if (q.type === 'mc') {
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
        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'freeInput';
        input.placeholder = 'Escribe tu respuesta aquí...';
        input.style.padding = '10px';
        input.style.borderRadius = '8px';
        input.style.border = '1px solid rgba(255,255,255,0.04)';
        input.style.background = 'transparent';
        input.style.color = 'inherit';
        choicesEl.appendChild(input);
    }

    startTimer();
    updateJokerUI();
    state.usedJokers = [];
}

// === Timer ===
function startTimer() {
    let total = 10 + (state.extraTime || 0);
    if (total > 20) total = 20; // límite máximo
    state.extraTime = 0; // consumir el bono
    state.remaining = total;

    clearInterval(state.timer);
    timerEl.textContent = state.remaining;

    state.timer = setInterval(() => {
        state.remaining--;
        timerEl.textContent = state.remaining;

        if (state.remaining <= 0) {
            clearInterval(state.timer);
            lockedAnswer();
            revealAnswer();
        }
    }, 1000);
}

function selectChoice(btn) {
    Array.from(choicesEl.children).forEach(ch => ch.classList.remove('selected'));
    btn.classList.add('selected');
}

function checkAnswer() {
    if (state.index >= QUESTIONS.length) {
        checkFinalSentence();
    }

    const q = QUESTIONS[state.index];
    let correct = false;
    let chosen = null;

    if (q.type === 'mc') {
        const sel = choicesEl.querySelector('.selected');
        if (!sel) { alert('Selecciona una opción antes de enviar'); return; }
        chosen = parseInt(sel.dataset.idx, 10);
        correct = chosen === q.answer;
    } else {
        const input = document.getElementById('freeInput');
        if (!input || input.value.trim() === '') { alert('Escribe tu respuesta antes de enviar'); return; }
        chosen = input.value.trim();
        correct = chosen.toLowerCase() === String(q.answer).toLowerCase();
        input.disabled = true;
    }

    jokerBtn.disabled = true;
    jokerBtn.classList.add('locked');
    lockedAnswer();

    state.answered = true;
    clearInterval(state.timer);

    // Guardar en collected siempre
    state.collected.push({ word: q.word, position: state.index, correct });

    showFeedback(correct, q.explanation);

    // Bonus de tiempo
    if (correct) {
        const elapsed = (Date.now() - state.startTime) / 1000;
        if (elapsed <= 5) state.extraTime = 3;
    }

    updateFinalSentence();
}


function updateFinalSentence() {
    const blanks = finalSentence.querySelectorAll('.blank');
    blanks.forEach(blank => {
        const pos = parseInt(blank.dataset.pos, 10);
        const collected = state.collected.find(c => c.position === pos);
        if (collected) {
            if (collected.correct) {
                blank.textContent = collected.word;
                blank.classList.add('filled');
            }
        }
    });
}

function lockedAnswer() {
    Array.from(choicesEl.children).forEach(ch => {
        if (!ch.classList.contains('selected')) {
            ch.classList.add('locked');
        }
    });
}

function showFeedback(isCorrect, text) {
    feedback.style.display = 'block';
    feedback.className = 'feedback ' + (isCorrect ? 'correct' : 'wrong');
    feedback.innerHTML = (isCorrect ? '<strong>¡Correcto!</strong> ' : '<strong>Incorrecto</strong> ') + `<div style="margin-top:6px">${text}</div>`;
}

function nextQuestion() {
    if (!state.answered) {
        alert('Debes responder antes de continuar.');
        return;
    }
    state.index += 1;
    renderQuestion();
    jokerBtn.disabled = true;
    jokerBtn.classList.remove('locked');
}

function resetGame() {
    if (!confirm('¿Reiniciar el juego y volver a la pantalla de inicio?')) return;

    // Detener temporizador
    clearInterval(state.timer);

    // Resetear estado
    state = {
        index: 0,
        collected: [],
        jokers: 3,
        answered: false,
        startTime: 0,
        extraTime: 0,
        timer: null,
        remaining: 0,
        usedJokers: []
    };

    // Limpiar campos dinámicos
    const blanks = finalSentence.querySelectorAll('.blank');
    blanks.forEach((blank, i) => {
        blank.textContent = blank.dataset.original || '_____';
        blank.classList.remove('filled');
    });

    // Limpiar inputs de elección o texto
    choicesEl.innerHTML = '';
    feedback.style.display = 'none';
    pistaEl.style.display = 'none';

    // Mostrar solo pantalla de bienvenida
    document.querySelector('.app').style.display = 'none';
    welcomeScreen.style.display = 'flex';
    
    // Reiniciar temporizador y botones
    timerEl.textContent = '';
    submitBtn.disabled = false;
    submitBtn.classList.remove('locked');
    nextBtn.disabled = false;
    nextBtn.classList.remove('locked');
    jokerBtn.disabled = false;
    jokerBtn.classList.remove('locked');
}


function showFinalScreen() {
    nextBtn.disabled = true;
    nextBtn.classList.add('locked');
    jokerBtn.disabled = true;
    jokerBtn.classList.add('locked');

    const blanks = finalSentence.querySelectorAll('.blank');
    if (Array.from(blanks).every(blank => blank.classList.contains('filled'))) {
        qText.innerHTML = "¡Felicidades, completaste el desafío!";
        submitBtn.disabled = true;
        submitBtn.classList.add('locked');
        return;
    }

    blanks.forEach(blank => {
        if (!blank.classList.contains('filled')) {
            const pos = parseInt(blank.dataset.pos, 10);
            blank.innerHTML = `<input type="text" class="word-input" data-pos="${pos}" placeholder="...">`;
        }
    });

    submitBtn.textContent = 'Enviar oración';
    qText.innerHTML = "Completa la oración:"
    timerEl.innerHTML = '';
    choicesEl.innerHTML = '';
    feedback.style.display = 'none';
    pistaEl.style.display = 'none';
}


// === Comodines ===
function useJoker() {
    if (state.jokers <= 0) {
        alert('No quedan comodines');
        return;
    }

    const q = QUESTIONS[state.index];
    let effects = ['5050', 'hint', 'time'];

    // Si es pregunta de texto, elimina 50/50
    if (q.type === 'text') effects = effects.filter(e => e !== '5050');

    // Quita los que ya se usaron en esta pregunta
    effects = effects.filter(e => !state.usedJokers.includes(e));

    if (effects.length === 0) {
        alert('Ya usaste todos los comodines posibles en esta pregunta');
        return;
    }

    const choice = effects[Math.floor(Math.random() * effects.length)];

    if (choice === '5050') apply5050();
    if (choice === 'hint') applyHint();
    if (choice === 'time') applyExtraTime();

    state.jokers -= 1;
    state.usedJokers.push(choice); // 👈 marca este comodín como usado
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
    // +3 segundos inmediatos en la pregunta actual, sin alertas
    state.remaining = Math.min(state.remaining + 5, 20); // límite 20s
    timerEl.textContent = state.remaining;
}

function updateJokerUI() {
    joker.textContent = Math.max(0, state.jokers);

    if (state.jokers <= 0) {
        jokerBtn.disabled = true;       // desactiva el botón
        jokerBtn.classList.add('locked'); // opcional: estilo visual
    } else {
        jokerBtn.disabled = false;
        jokerBtn.classList.remove('locked');
    }
}

function revealAnswer() {
    clearInterval(state.timer);
    jokerBtn.disabled = true;
    jokerBtn.classList.add('locked');
    const q = QUESTIONS[state.index];
    const correct = Array.isArray(q.choices) ? q.choices[q.answer] : q.answer;
    showFeedback(false, `Respuesta: ${correct}. \n\n${q.explanation}`);
    state.answered = true;
}

function checkFinalSentence() {
    submitBtn.disabled = true;
    submitBtn.classList.add('locked');

    const blanks = document.querySelectorAll('.blank input');
    if (blanks.length === 0) return;

    let allCorrect = true;

    blanks.forEach(input => {
        const pos = parseInt(input.dataset.pos, 10);
        const userWord = input.value.trim();
        const correctWord = state.collected[pos].word;

        if (userWord.toLowerCase() !== correctWord.toLowerCase()) {
            allCorrect = false;
            input.style.borderColor = 'red';
        } else {
            input.style.borderColor = 'green';
        }
    });

    if (allCorrect) {
        alert('¡Felicidades! Todas las palabras son correctas.');
        resetGame();
    } else {
        alert('Algunas palabras son incorrectas. Aquí está la respuesta correcta:');
        // mostrar las respuestas correctas reemplazando los inputs
        blanks.forEach(input => {
            const pos = parseInt(input.dataset.pos, 10);
            input.parentElement.textContent = state.collected[pos].word;
        });
    }
}


// === Inicialización ===
submitBtn.addEventListener('click', checkAnswer);
nextBtn.addEventListener('click', nextQuestion);
resetBtn.addEventListener('click', resetGame);
jokerBtn.addEventListener('click', useJoker);
startBtn.addEventListener('click', init);