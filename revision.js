// Gestion des scores persistants
function getThemeScores() {
  const raw = localStorage.getItem('themeScores');
  return raw ? JSON.parse(raw) : {};
}
function setThemeScores(scores) {
  localStorage.setItem('themeScores', JSON.stringify(scores));
}
function getScoreForTheme(lang, theme) {
  const scores = getThemeScores();
  const key = lang + ':' + theme;
  return scores[key] && typeof scores[key].score === 'number' ? scores[key].score : null;
}
function updateScoreForTheme(lang, theme, isGood) {
  const scores = getThemeScores();
  const key = lang + ':' + theme;
  if (!scores[key]) scores[key] = { history: [] };
  // Ajoute la nouvelle réponse à l'historique
  scores[key].history.push(isGood ? 1 : 0);
  // Limite l'historique aux 20 dernières réponses
  if (scores[key].history.length > 20) scores[key].history = scores[key].history.slice(-20);
  // Calcule la note sur les 20 dernières réponses
  const sum = scores[key].history.reduce((a, b) => a + b, 0);
  scores[key].score = Math.round((sum / scores[key].history.length) * 10);
  setThemeScores(scores);
}

// Récupère toutes les cartes depuis SheetDB et regroupe par langue puis par thème
let dataByLang = {};
let allLangs = [];
let selectedLang = null;
let themes = {};
const langSelectDiv = document.getElementById('langSelect');
const themeTitle = document.getElementById('themeTitle');
const themeList = document.getElementById('themeList');
const flashcardSection = document.getElementById('flashcardSection');
const flashcard = document.getElementById('flashcard');
const cardFront = document.getElementById('cardFront');
const cardBack = document.getElementById('cardBack');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

let currentTheme = null;
let currentIndex = 0;
let flipped = false;
let flipTimeout = null;

// Initialisation SheetDB et affichage des langues après chargement du DOM
document.addEventListener('DOMContentLoaded', function() {
  if (!window.sheetDBData) {
    window.sheetDBPromise = fetch('https://sheetdb.io/api/v1/xg3dj9vsovufe')
      .then(r => r.json())
      .then(data => {
        window.sheetDBData = data;
        return data;
      });
  }
  window.sheetDBPromise.then(data => {
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
});

function showLangSelection() {
  langSelectDiv.innerHTML = '';
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
  themes = dataByLang[lang];
  langSelectDiv.style.display = 'none';
  themeTitle.style.display = '';
  themeList.style.display = '';
  showThemes();
}

function showThemes() {
  themeList.innerHTML = '';
  Object.keys(themes).forEach(theme => {
    const score = getScoreForTheme(selectedLang, theme);
    const btn = document.createElement('button');
    btn.className = 'main-btn';
    btn.onclick = () => startRevision(theme);
    btn.innerHTML = theme + (score !== null ? ` <span style="font-size:0.95em;color:#888;">⭐ ${score}/10</span>` : '');
    themeList.appendChild(btn);
  });
}

function startRevision(theme) {
  currentTheme = theme;
  // Pondération uniquement sur le thème choisi
  let scores = getThemeScores();
  let key = selectedLang + ':' + theme;
  let score = scores[key] ? scores[key].score : 5; // score par défaut 5/10
  let weight = 1 + (10 - score); // plus le score est bas, plus le poids est élevé
  let weightedCards = [];
  for (let i = 0; i < weight; i++) {
    weightedCards = weightedCards.concat(themes[theme]);
  }
  // Mélange la liste pondérée
  shuffle(weightedCards);
  // Utilise la liste pondérée pour ce thème
  themes[currentTheme] = weightedCards.length ? weightedCards : themes[currentTheme];
  currentIndex = 0;
  flipped = false;
  themeList.style.display = 'none';
  themeTitle.style.display = 'none';
  flashcardSection.style.display = '';
  showCard();
}

function showCard() {
  const card = themes[currentTheme][currentIndex];
  // Affiche le mot dans la langue sélectionnée (clé: 'en', 'ja', etc.) et la traduction en français
  let langKey = selectedLang === 'anglais' ? 'en' : (selectedLang === 'japonais' ? 'ja' : selectedLang);
  cardFront.textContent = card[langKey] || '';
  cardBack.textContent = card.fr || '';
  flashcard.classList.remove('flipped');
  flipped = false;
  flashcard.style.pointerEvents = '';
  if (flipTimeout) {
    clearTimeout(flipTimeout);
    flipTimeout = null;
  }
}

flashcard.onclick = function() {
  if (flipTimeout) {
    clearTimeout(flipTimeout);
    flipTimeout = null;
  }
  flipped = !flipped;
  flashcard.classList.toggle('flipped', flipped);
  if (flipped) {
    // Affiche la réponse juste après le flip
    setTimeout(() => {
      cardBack.textContent = themes[currentTheme][currentIndex].fr;
    }, 200); // délai court pour laisser l'animation se faire
    // Désactive le clic jusqu'à la prochaine carte
    flashcard.style.pointerEvents = 'none';
    flipTimeout = setTimeout(() => {
      if (currentIndex < themes[currentTheme].length - 1) {
        currentIndex++;
        showCard();
      }
    }, 5000);
  }
};

prevBtn.onclick = function() {
  if (currentIndex > 0) {
    currentIndex--;
    showCard();
  }
};

nextBtn.onclick = function() {
  if (currentIndex < themes[currentTheme].length - 1) {
    currentIndex++;
    showCard();
};
showThemes();
showCard();
    showCard();
  }
showThemes();

// Fonction utilitaire pour mélanger un tableau
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
