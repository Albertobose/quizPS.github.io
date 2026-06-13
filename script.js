// STATO DEL GIOCO GLOBAL
let dbDomande = [];         // Popolato dinamicamente dal file JSON
let erratePool = [];        // ID delle domande attualmente nel loop degli errori
let sessioneDomande = [];   // Domande filtrate per la sessione corrente
let currentQuestionIndex = 0;
let corretteInSessione = 0;
let errateInSessione = 0;

// ELEMENTI DOM
const setupScreen = document.getElementById('setup-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');
const totalRemainingText = document.getElementById('total-remaining');
const questionQuantityInput = document.getElementById('question-quantity');
const progressText = document.getElementById('progress-text');
const sessionRemainingText = document.getElementById('session-remaining');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const feedback = document.getElementById('feedback');
const startBtn = document.getElementById('start-btn');
const nextBtn = document.getElementById('next-btn');
const restartBtn = document.getElementById('restart-btn');
const resetAllBtn = document.getElementById('reset-all-btn');
const statsCorrect = document.getElementById('stats-correct');
const statsWrong = document.getElementById('stats-wrong');
const resultMessage = document.getElementById('result-message');

// CARICAMENTO DATI ASINCRONO
async function inizializzaApplicazione() {
    try {
        const response = await fetch('domande.json');
        if (!response.ok) throw new Error("Impossibile caricare il file domande.json");
        dbDomande = await response.json();
        
        // Gestione della memoria locale (LocalStorage)
        if (!localStorage.getItem('banca_errate_pool')) {
            SvuotaEResettaProgressi();
        } else {
            erratePool = JSON.parse(localStorage.getItem('banca_errate_pool'));
        }
        
        aggiornaSchermataIniziale();
    } catch (error) {
        console.error("Errore di inizializzazione:", error);
        alert("Errore nel caricamento della banca dati. Verifica che il file domande.json sia presente.");
    }
}

window.addEventListener('DOMContentLoaded', inizializzaApplicazione);

// EVENT LISTENERS
startBtn.addEventListener('click', avviaSessione);
nextBtn.addEventListener('click', prossimaDomanda);
restartBtn.addEventListener('click', () => {
    resultScreen.classList.add('hidden');
    setupScreen.classList.remove('hidden');
    aggiornaSchermataIniziale();
});

resetAllBtn.addEventListener('click', () => {
    if(confirm("Sei sicuro di voler resettare l'intero database? Ricomincerai il quiz con tutte le 6000 domande.")) {
        SvuotaEResettaProgressi();
        aggiornaSchermataIniziale();
    }
});

// LOGICA INTERNA

function SvuotaEResettaProgressi() {
    erratePool = dbDomande.map(d => d.id);
    salvaStato();
}

function aggiornaSchermataIniziale() {
    totalRemainingText.textContent = erratePool.length;
    questionQuantityInput.max = erratePool.length;
    
    if (erratePool.length === 0) {
        totalRemainingText.textContent = "0! Complimenti, hai completato l'intera banca dati!";
        startBtn.disabled = true;
    } else {
        startBtn.disabled = false;
        if(parseInt(questionQuantityInput.value) > erratePool.length) {
            questionQuantityInput.value = erratePool.length;
        }
    }
}

function salvaStato() {
    localStorage.setItem('banca_errate_pool', JSON.stringify(erratePool));
}

function avviaSessione() {
    let quantita = parseInt(questionQuantityInput.value);
    if (isNaN(quantita) || quantita < 1) quantita = 1;
    if (quantita > erratePool.length) quantita = erratePool.length;

    // Seleziona casualmente le domande attingendo solo dal pool delle errate/rimanenti
    const poolMescolato = [...erratePool].sort(() => Math.random() - 0.5);
    const idsSelezionati = poolMescolato.slice(0, quantita);
    
    sessioneDomande = dbDomande.filter(d => idsSelezionati.includes(d.id));
    
    currentQuestionIndex = 0;
    corretteInSessione = 0;
    errateInSessione = 0;

    setupScreen.classList.add('hidden');
    quizScreen.classList.remove('hidden');
    
    mostraDomanda();
}

function mostraDomanda() {
    nextBtn.classList.add('hidden');
    feedback.classList.add('hidden');
    feedback.className = "feedback";
    optionsContainer.innerHTML = "";

    const domandaCorrente = sessioneDomande[currentQuestionIndex];
    
    progressText.textContent = `Domanda ${currentQuestionIndex + 1} di ${sessioneDomande.length}`;
    sessionRemainingText.textContent = `Mancanti: ${sessioneDomande.length - currentQuestionIndex}`;
    
    questionText.textContent = domandaCorrente.q;

    // Nel JSON generato la risposta esatta è sempre all'indice 0
    const rispostaEsattaTesto = domandaCorrente.answers[0]; 
    const risposteMescolate = [...domandaCorrente.answers].sort(() => Math.random() - 0.5);

    risposteMescolate.forEach(risposta => {
        const button = document.createElement('button');
        button.textContent = risposta;
        button.classList.add('option-btn');
        button.addEventListener('click', () => valutaRisposta(button, risposta, rispostaEsattaTesto, domandaCorrente.id));
        optionsContainer.appendChild(button);
    });
}

function valutaRisposta(buttonSelezionato, rispostaScelta, rispostaEsatta, domandaId) {
    const bottoni = optionsContainer.querySelectorAll('.option-btn');
    bottoni.forEach(b => b.disabled = true);

    if (rispostaScelta === rispostaEsatta) {
        buttonSelezionato.classList.add('correct');
        feedback.textContent = "Esatto!";
        feedback.classList.add('correct');
        feedback.classList.remove('hidden');
        
        // Rimuove definitivamente la domanda perché indovinata
        erratePool = erratePool.filter(id => id !== domandaId);
        corretteInSessione++;
    } else {
        buttonSelezionato.classList.add('wrong');
        feedback.textContent = "Risposta Errata!";
        feedback.classList.add('wrong');
        feedback.classList.remove('hidden');

        bottoni.forEach(b => {
            if (b.textContent === rispostaEsatta) b.classList.add('correct');
        });
        errateInSessione++;
    }

    salvaStato();
    nextBtn.classList.remove('hidden');
}

function prossimaDomanda() {
    currentQuestionIndex++;
    if (currentQuestionIndex < sessioneDomande.length) {
        mostraDomanda();
    } else {
        mostraSchermataRisultati();
    }
}

function mostraSchermataRisultati() {
    quizScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');

    statsCorrect.textContent = corretteInSessione;
    statsWrong.textContent = errateInSessione;

    if (erratePool.length === 0) {
        resultMessage.textContent = "Straordinario! Hai azzerato la banca dati superando tutti gli errori!";
        restartBtn.textContent = "Ricomincia da Capo";
        SvuotaEResettaProgressi();
    } else {
        resultMessage.textContent = `Sessione conclusa. Ci sono ancora ${erratePool.length} domande nel loop degli errori.`;
        restartBtn.textContent = "Continua a correggere le Errate";
    }
}