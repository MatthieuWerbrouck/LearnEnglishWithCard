// Nouvelle logique : sélection de thèmes avant le quiz
let allCards = [];
let dataByLang = {};
let allLangs = [];
let selectedLang = null;
let themes = [];
let selectedThemes = [];
let cards = [];
let currentIndex = 0;
let score = 0;

const langSelectDiv = document.getElementById('langSelect');
const themeSelectDiv = document.getElementById('themeSelect');
const startBtn = document.getElementById('startBtn');
const selectAllThemesBtn = document.getElementById('selectAllThemesBtn');
const themeSearchInput = document.getElementById('themeSearch');
const modeSelectDiv = document.getElementById('modeSelect');

let evalMode = 'mcq'; // 'mcq' ou 'input'

if (!window.sheetDBData) {
  window.sheetDBPromise = fetch('https://sheetdb.io/api/v1/xg3dj9vsovufe')
    .then(r => r.json())
    .then(data => {
      window.sheetDBData = data;
      return data;
    });
}
window.sheetDBPromise.then(data => {
  allCards = data;
  data.forEach(card => {
    const lang = card.langue && card.langue.trim();
    const theme = card.theme && card.theme.trim();
    if (!lang || !theme) return;
    if (!dataByLang[lang]) dataByLang[lang] = {};
    if (!dataByLang[lang][theme]) dataByLang[lang][theme] = [];
    dataByLang[lang][theme].push(card);
  });
  allLangs = Object.keys(dataByLang);
  showLangSelection();
});

function showLangSelection() {
  langSelectDiv.innerHTML = '<h2>Choisis la langue à évaluer :</h2>';
  allLangs.forEach(lang => {
    const btn = document.createElement('button');
    btn.textContent = lang.charAt(0).toUpperCase() + lang.slice(1);
    btn.className = 'main-btn';
    btn.onclick = () => selectLang(lang);
    langSelectDiv.appendChild(btn);
  });
}

function selectLang(lang) {
  selectedLang = lang;
  themes = Object.keys(dataByLang[lang]);
  langSelectDiv.style.display = 'none';
  modeSelectDiv.style.display = '';
  themeSelectDiv.style.display = '';
  showThemeSelection();
}

function showThemeSelection() {
  themeSelectDiv.innerHTML = '<h2>Choisis un ou plusieurs thèmes :</h2>';
  // Ajoute la barre de recherche et le bouton tout sélectionner
  themeSearchInput.style.display = '';
  themeSelectDiv.appendChild(themeSearchInput);
  selectAllThemesBtn.style.display = '';
  themeSelectDiv.appendChild(selectAllThemesBtn);

  let validThemes = themes.filter(t => t && t.trim() !== '');
  // Stocke la liste complète pour le filtrage
  themeSelectDiv._allThemes = validThemes;

  renderThemeCheckboxes(validThemes);

  startBtn.style.display = '';
  document.getElementById('questionCountDiv').style.display = '';
  updateQuestionCountDefault();
}

function updateQuestionCountDefault() {
  const questionCountInput = document.getElementById('questionCount');
  const checkedThemes = Array.from(themeSelectDiv.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
  let totalWords = 0;
  checkedThemes.forEach(theme => {
    totalWords += dataByLang[selectedLang][theme] ? dataByLang[selectedLang][theme].length : 0;
  });
  questionCountInput.value = totalWords || 1;
}

// Fonction pour afficher les thèmes filtrés
function renderThemeCheckboxes(themeList) {
  // Sauvegarde les thèmes actuellement cochés
  const checkedThemes = Array.from(themeSelectDiv.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
  // Supprime les anciens checkboxes
  Array.from(themeSelectDiv.querySelectorAll('label')).forEach(e => e.remove());
  themeList.forEach(theme => {
    const label = document.createElement('label');
    label.style.display = 'block';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = theme;
    // Restaure l'état coché si le thème était sélectionné
    if (checkedThemes.includes(theme)) checkbox.checked = true;
    checkbox.onchange = updateQuestionCountDefault;
    label.appendChild(checkbox);
    // Affiche le score et le nombre de mots à côté du nom du thème
    const key = selectedLang + ':' + theme;
    let scoreText = '';
    let scores = localStorage.getItem('themeScores');
    let scoreObj = scores ? JSON.parse(scores) : {};
    if (scoreObj[key] && typeof scoreObj[key].score === 'number') {
      scoreText = ` (note: ${scoreObj[key].score}/10)`;
    }
    // Nombre de mots
    let wordCount = dataByLang[selectedLang][theme] ? dataByLang[selectedLang][theme].length : 0;
    let countText = ` (${wordCount} mots)`;
    label.appendChild(document.createTextNode(' ' + theme + scoreText + countText));
    themeSelectDiv.appendChild(label);
  });
}

// Barre de recherche : filtre la liste des thèmes
themeSearchInput.oninput = function() {
  const search = themeSearchInput.value.trim().toLowerCase();
  const allThemes = themeSelectDiv._allThemes || [];
  let filtered;
  if (search === '') {
    filtered = allThemes;
  } else {
    filtered = allThemes.filter(theme => theme.toLowerCase().includes(search));
  }
  renderThemeCheckboxes(filtered);
  updateQuestionCountDefault();
};

selectAllThemesBtn.onclick = function() {
  const checkboxes = Array.from(themeSelectDiv.querySelectorAll('input[type="checkbox"]'));
  const allChecked = checkboxes.every(cb => cb.checked);
  checkboxes.forEach(cb => cb.checked = !allChecked);
  updateQuestionCountDefault();
};

startBtn.onclick = function() {
  selectedThemes = Array.from(themeSelectDiv.querySelectorAll('input:checked')).map(cb => cb.value);
  if (selectedThemes.length === 0) {
    alert('Sélectionnez au moins un thème !');
    return;
  }
  // Récupère la valeur choisie (modifiée ou par défaut)
  maxQuestions = parseInt(document.getElementById('questionCount').value) || 1;
  // Filtre les cartes selon la langue et les thèmes choisis
  cards = [];
  selectedThemes.forEach(theme => {
    cards = cards.concat(dataByLang[selectedLang][theme]);
  });
  let langKey = selectedLang === 'anglais' ? 'en' : (selectedLang === 'japonais' ? 'ja' : selectedLang);
  cards = cards.map(card => ({ question: card[langKey], answer: card.fr, theme: card.theme }));
  shuffle(cards);
  currentIndex = 0;
  score = 0;
  themeSelectDiv.style.display = 'none';
  startBtn.style.display = 'none';
  document.getElementById('flashcardSection').style.display = '';
  showCard();
};


// =============================
// 2. Fonction utilitaire pour mélanger un tableau (algorithme de Fisher-Yates)
// =============================
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}


// =============================
// 3. Initialisation des variables d'état
// =============================
// ...variables déjà déclarées plus haut...



// =============================
// 4. Récupération des éléments du DOM
// =============================
const flashcard = document.getElementById('flashcard'); // Élément principal de la carte
const cardFront = document.getElementById('cardFront'); // Face avant (mot anglais)
const answersDiv = document.getElementById('answers');  // Conteneur des réponses
const feedbackDiv = document.getElementById('feedback');// Message de feedback
const nextBtn = document.getElementById('nextBtn');     // Bouton "carte suivante"
// Ajout pour sélection des thèmes
// <div id="themeSelect"></div><button id="startBtn" style="display:none">Démarrer l'évaluation</button>


// =============================
// 5. Affiche la carte courante et génère les réponses aléatoires
// =============================
function showCard() {
  if (!cards.length) return;
  if (currentIndex >= maxQuestions) {
    // Fin de l'évaluation
    answersDiv.innerHTML = '';
    cardFront.textContent = '';
    feedbackDiv.innerHTML = `Évaluation terminée !<br>Score : <b>${score} / ${maxQuestions}</b>`;
    nextBtn.style.display = 'none';
    // Ajoute le bouton recommencer
    let restartBtn = document.createElement('button');
    restartBtn.textContent = 'Recommencer';
    restartBtn.className = 'main-btn';
    restartBtn.style.marginTop = '24px';
    restartBtn.onclick = function() {
      window.location.reload();
    };
    feedbackDiv.appendChild(restartBtn);
    return;
  }
  const card = cards[currentIndex];
  // Affiche le numéro de la question en cours
  let questionNumDiv = document.getElementById('questionNumDiv');
  if (!questionNumDiv) {
    questionNumDiv = document.createElement('div');
    questionNumDiv.id = 'questionNumDiv';
    questionNumDiv.style.textAlign = 'center';
    questionNumDiv.style.fontSize = '1.1em';
    questionNumDiv.style.marginBottom = '12px';
    document.getElementById('flashcardSection').insertBefore(questionNumDiv, document.getElementById('flashcardSection').firstChild);
  }
  questionNumDiv.textContent = `Question ${currentIndex + 1} / ${maxQuestions}`;
  cardFront.textContent = card.question;
  answersDiv.innerHTML = '';
  feedbackDiv.textContent = '';
  nextBtn.style.display = 'none';

  if (getEvalMode() === 'mcq') {
    // Mode QCM (4 choix)
    let wrongAnswers = cards.filter(c => c.answer !== card.answer);
    shuffle(wrongAnswers);
    let options = wrongAnswers.slice(0, 3).map(c => c.answer);
    options.push(card.answer);
    shuffle(options);
    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = '1fr 1fr';
    grid.style.gap = '16px';
    grid.style.maxWidth = '400px';
    grid.style.margin = '0 auto';
    options.forEach(option => {
      const btn = document.createElement('button');
      btn.textContent = option;
      btn.className = 'answer-btn';
      btn.style.width = '100%';
      btn.onclick = () => selectAnswer(option, card.answer, btn);
      grid.appendChild(btn);
    });
    answersDiv.appendChild(grid);
  } else {
    // Mode saisie texte
    const inputDiv = document.createElement('div');
    inputDiv.style.textAlign = 'center';
    inputDiv.style.marginTop = '18px';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-input';
    input.placeholder = 'Écris la réponse...';
    input.style.width = '70%';
    input.style.fontSize = '1.1em';
    inputDiv.appendChild(input);

    const submitBtn = document.createElement('button');
    submitBtn.textContent = 'Valider';
    submitBtn.className = 'main-btn';
    submitBtn.style.marginLeft = '12px';
    submitBtn.onclick = function() {
      submitBtn.disabled = true;
      input.disabled = true;
      selectTextAnswer(input.value, card.answer, input, submitBtn);
    };
    // Ajout : validation avec la touche "Entrée"
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !submitBtn.disabled && !input.disabled) {
        submitBtn.click();
      }
    });

    inputDiv.appendChild(submitBtn);
    answersDiv.appendChild(inputDiv);
  }
}

// Récupère le mode choisi
function getEvalMode() {
  const radios = document.getElementsByName('evalMode');
  for (let r of radios) {
    if (r.checked) return r.value;
  }
  return 'mcq';
}

// Met à jour le mode à chaque changement
modeSelectDiv.addEventListener('change', function() {
  evalMode = getEvalMode();
});

// =============================
// 6. Gestion de la sélection d'une réponse
// =============================
function selectAnswer(selected, correct, btn) {
  // Désactive tous les boutons de réponse
  const grid = answersDiv.querySelector('div');
  if (grid) {
    Array.from(grid.children).forEach(b => b.disabled = true);
  }
  // Mise à jour du score du thème courant
  if (cards && cards.length) {
    let theme = null;
    // On récupère le thème de la carte courante si présent et non vide
    if (
      cards[currentIndex] &&
      typeof cards[currentIndex].theme === "string" &&
      cards[currentIndex].theme.length > 0
    ) {
      theme = cards[currentIndex].theme;
    } else if (
      selectedThemes &&
      selectedThemes.length === 1 &&
      typeof selectedThemes[0] === "string" &&
      selectedThemes[0].length > 0
    ) {
      theme = selectedThemes[0];
    }
    // Correction : vérifie que theme est une chaîne non vide
    if (typeof theme === "string" && theme.length > 0) {
      const scores = localStorage.getItem('themeScores');
      let obj = scores ? JSON.parse(scores) : {};
      const key = selectedLang + ':' + theme;
      // Correction : initialisation stricte de obj[key] et obj[key].history
      if (!obj[key] || !Array.isArray(obj[key].history)) {
        obj[key] = { history: [] };
      }
      obj[key].history.push(selected === correct ? 1 : 0);
      if (obj[key].history.length > 20) obj[key].history = obj[key].history.slice(-20);
      const sum = obj[key].history.reduce((a, b) => a + b, 0);
      obj[key].score = Math.round((sum / obj[key].history.length) * 10);
      localStorage.setItem('themeScores', JSON.stringify(obj));
    }
  }
  if (selected === correct) {
    btn.style.background = '#4caf50'; // vert
    feedbackDiv.textContent = 'Bonne réponse !';
    score++;
  } else {
    btn.style.background = '#e74c3c'; // rouge
    feedbackDiv.textContent = `Mauvaise réponse. La bonne réponse était : ${correct}`;
    // Met en surbrillance la bonne réponse
    const grid = answersDiv.querySelector('div');
    if (grid) {
      Array.from(grid.children).forEach(b => {
        if (b.textContent === correct) b.style.background = '#4caf50';
      });
    }
  }
  nextBtn.style.display = '';
}

// Ajoutez cette fonction pour le mode texte
function selectTextAnswer(userInput, correct, input, submitBtn) {
  // Normalisation pour comparaison (minuscule, trim)
  const user = userInput.trim().toLowerCase();
  const corr = correct.trim().toLowerCase();
  let theme = null;
  if (
    cards[currentIndex] &&
    typeof cards[currentIndex].theme === "string" &&
    cards[currentIndex].theme.length > 0
  ) {
    theme = cards[currentIndex].theme;
  } else if (
    selectedThemes &&
    selectedThemes.length === 1 &&
    typeof selectedThemes[0] === "string" &&
    selectedThemes[0].length > 0
  ) {
    theme = selectedThemes[0];
  }
  if (typeof theme === "string" && theme.length > 0) {
    const scores = localStorage.getItem('themeScores');
    let obj = scores ? JSON.parse(scores) : {};
    const key = selectedLang + ':' + theme;
    if (!obj[key] || !Array.isArray(obj[key].history)) {
      obj[key] = { history: [] };
    }
    obj[key].history.push(user === corr ? 1 : 0);
    if (obj[key].history.length > 20) obj[key].history = obj[key].history.slice(-20);
    const sum = obj[key].history.reduce((a, b) => a + b, 0);
    obj[key].score = Math.round((sum / obj[key].history.length) * 10);
    localStorage.setItem('themeScores', JSON.stringify(obj));
  }
  if (user === corr) {
    input.style.background = '#d1fae5'; // vert
    feedbackDiv.textContent = 'Bonne réponse !';
    score++;
  } else {
    input.style.background = '#fee2e2'; // rouge
    feedbackDiv.innerHTML = `Mauvaise réponse.<br>La bonne réponse était : <b>${correct}</b>`;
  }
  nextBtn.style.display = '';
}


// =============================
// 7. Gestion du bouton "carte suivante" (manuel)
// =============================
nextBtn.onclick = function() {
  currentIndex++;
  showCard();
};


// =============================
// 8. Affichage initial de la première carte
// =============================
// ...fin du script...

function afficherQuestion() {
  if (!cards.length) return;
  if (currentIndex >= maxQuestions) {
    // Fin de l'évaluation
    answersDiv.innerHTML = '';
    cardFront.textContent = '';
    feedbackDiv.innerHTML = `Évaluation terminée !<br>Score : <b>${score} / ${maxQuestions}</b>`;
    nextBtn.style.display = 'none';
    // Ajoute le bouton recommencer
    let restartBtn = document.createElement('button');
    restartBtn.textContent = 'Recommencer';
    restartBtn.className = 'main-btn';
    restartBtn.style.marginTop = '24px';
    restartBtn.onclick = function() {
      window.location.reload();
    };
    feedbackDiv.appendChild(restartBtn);
    return;
  }
  const card = cards[currentIndex];
  // Affiche le numéro de la question en cours
  let questionNumDiv = document.getElementById('questionNumDiv');
  if (!questionNumDiv) {
    questionNumDiv = document.createElement('div');
    questionNumDiv.id = 'questionNumDiv';
    questionNumDiv.style.textAlign = 'center';
    questionNumDiv.style.fontSize = '1.1em';
    questionNumDiv.style.marginBottom = '12px';
    document.getElementById('flashcardSection').insertBefore(questionNumDiv, document.getElementById('flashcardSection').firstChild);
  }
  questionNumDiv.textContent = `Question ${currentIndex + 1} / ${maxQuestions}`;
  cardFront.textContent = card.question;
  answersDiv.innerHTML = '';
  feedbackDiv.textContent = '';
  nextBtn.style.display = 'none';

  if (getEvalMode() === 'mcq') {
    // Mode QCM (4 choix)
    let wrongAnswers = cards.filter(c => c.answer !== card.answer);
    shuffle(wrongAnswers);
    let options = wrongAnswers.slice(0, 3).map(c => c.answer);
    options.push(card.answer);
    shuffle(options);
    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = '1fr 1fr';
    grid.style.gap = '16px';
    grid.style.maxWidth = '400px';
    grid.style.margin = '0 auto';
    options.forEach(option => {
      const btn = document.createElement('button');
      btn.textContent = option;
      btn.className = 'answer-btn';
      btn.style.width = '100%';
      btn.onclick = () => selectAnswer(option, card.answer, btn);
      grid.appendChild(btn);
    });
    answersDiv.appendChild(grid);
  } else if (getEvalMode() === 'qcm_fr_en') {
    // Nouveau mode : mot français, choix anglais
    cardFront.textContent = card.answer;
    // Générer les choix en anglais
    const propositions = genererPropositions(cards, card, 'en');
    afficherPropositions(propositions, card.answer);
  } else {
    // Mode saisie texte
    const inputDiv = document.createElement('div');
    inputDiv.style.textAlign = 'center';
    inputDiv.style.marginTop = '18px';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-input';
    input.placeholder = 'Écris la réponse...';
    input.style.width = '70%';
    input.style.fontSize = '1.1em';
    inputDiv.appendChild(input);

    const submitBtn = document.createElement('button');
    submitBtn.textContent = 'Valider';
    submitBtn.className = 'main-btn';
    submitBtn.style.marginLeft = '12px';
    submitBtn.onclick = function() {
      submitBtn.disabled = true;
      input.disabled = true;
      selectTextAnswer(input.value, card.answer, input, submitBtn);
    };
    // Ajout : validation avec la touche "Entrée"
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !submitBtn.disabled && !input.disabled) {
        submitBtn.click();
      }
    });

    inputDiv.appendChild(submitBtn);
    answersDiv.appendChild(inputDiv);
  }
}

function genererPropositions(cards, currentCard, langue) {
  // Récupère la bonne réponse
  const bonneReponse = currentCard[langue];
  // Prend d'autres réponses aléatoires
  let autres = cards.filter(card => card !== currentCard).map(card => card[langue]);
  autres = melanger(autres).slice(0, 3);
  const propositions = [bonneReponse, ...autres];
  return melanger(propositions);
}

function afficherPropositions(propositions, bonneReponse) {
  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = '1fr 1fr';
  grid.style.gap = '16px';
  grid.style.maxWidth = '400px';
  grid.style.margin = '0 auto';
  propositions.forEach(proposition => {
    const btn = document.createElement('button');
    btn.textContent = proposition;
    btn.className = 'answer-btn';
    btn.style.width = '100%';
    btn.onclick = () => {
      // Désactive tous les boutons de réponse
      Array.from(grid.children).forEach(b => b.disabled = true);
      // Vérifie la réponse
      if (proposition === bonneReponse) {
        btn.style.background = '#4caf50'; // vert
        feedbackDiv.textContent = 'Bonne réponse !';
        score++;
      } else {
        btn.style.background = '#e74c3c'; // rouge
        feedbackDiv.textContent = `Mauvaise réponse. La bonne réponse était : ${bonneReponse}`;
        // Met en surbrillance la bonne réponse
        Array.from(grid.children).forEach(b => {
          if (b.textContent === bonneReponse) b.style.background = '#4caf50';
        });
      }
      nextBtn.style.display = '';
    };
    grid.appendChild(btn);
  });
  answersDiv.appendChild(grid);
}

