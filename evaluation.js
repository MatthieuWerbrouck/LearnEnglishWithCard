

// ...existing code...
// Nouvelle logique : sélection de thèmes avant le quiz
let allCards = [];
let themes = [];
let selectedThemes = [];
let cards = [];
let currentIndex = 0;
let score = 0;

const themeSelectDiv = document.getElementById('themeSelect');
const startBtn = document.getElementById('startBtn');

fetch('https://sheetdb.io/api/v1/xg3dj9vsovufe')
  .then(r => r.json())
  .then(data => {
    allCards = data;
    // DEBUG : affiche les données brutes reçues
    if (window && window.console) {
      console.log('Données SheetDB:', data);
    }
    // Récupère la liste unique des thèmes non vides et non nuls
    const themeSet = new Set();
    allCards.forEach(card => {
      if (card.theme && card.theme.trim() !== '') themeSet.add(card.theme.trim());
    });
    themes = Array.from(themeSet);
    if (window && window.console) {
      console.log('Thèmes trouvés:', themes);
    }
    showThemeSelection();
  });

function showThemeSelection() {
  themeSelectDiv.innerHTML = '<h2>Choisissez un ou plusieurs thèmes :</h2>';
  let validThemes = themes.filter(t => t && t.trim() !== '');
  if (validThemes.length === 0) {
    themeSelectDiv.innerHTML += '<p style="color:red">Aucun thème disponible.</p>';
    startBtn.style.display = 'none';
    return;
  }
  validThemes.forEach(theme => {
    const label = document.createElement('label');
    label.style.display = 'block';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = theme;
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(' ' + theme));
    themeSelectDiv.appendChild(label);
  });
  startBtn.style.display = '';
}

startBtn.onclick = function() {
  selectedThemes = Array.from(themeSelectDiv.querySelectorAll('input:checked')).map(cb => cb.value);
  if (selectedThemes.length === 0) {
    alert('Sélectionnez au moins un thème !');
    return;
  }
  // Filtre les cartes selon les thèmes choisis
  cards = allCards.filter(card => selectedThemes.includes(card.theme)).map(card => ({ en: card.en, fr: card.fr }));
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
  const card = cards[currentIndex];
  cardFront.textContent = card.en;
  // Génère 3 mauvaises réponses + la bonne, puis mélange
  let wrongAnswers = cards.filter(c => c.fr !== card.fr);
  shuffle(wrongAnswers);
  let options = wrongAnswers.slice(0, 3).map(c => c.fr);
  options.push(card.fr);
  shuffle(options);
  // Affiche les boutons de réponse en grille 2x2
  answersDiv.innerHTML = '';
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
    btn.onclick = () => selectAnswer(option, card.fr, btn);
    grid.appendChild(btn);
  });
  answersDiv.appendChild(grid);
  feedbackDiv.textContent = '';
  nextBtn.style.display = 'none';
}




// =============================
// 6. Gestion de la sélection d'une réponse
// =============================
function selectAnswer(selected, correct, btn) {
  // Désactive tous les boutons
  Array.from(answersDiv.children).forEach(b => b.disabled = true);
  if (selected === correct) {
    btn.style.background = '#4caf50'; // vert
    feedbackDiv.textContent = 'Bonne réponse !';
    score++;
  } else {
    btn.style.background = '#e74c3c'; // rouge
    feedbackDiv.textContent = `Mauvaise réponse. La bonne réponse était : ${correct}`;
    // Met en surbrillance la bonne réponse
    Array.from(answersDiv.children).forEach(b => {
      if (b.textContent === correct) b.style.background = '#4caf50';
    });
  }
  nextBtn.style.display = '';
}


// =============================
// 7. Gestion du bouton "carte suivante" (manuel)
// =============================
nextBtn.onclick = function() {
  currentIndex++;
  if (currentIndex >= cards.length) {
    shuffle(cards);
    currentIndex = 0;
  }
  showCard();
};


// =============================
// 8. Affichage initial de la première carte
// =============================
// ...fin du script...

