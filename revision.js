
// Récupère toutes les cartes depuis SheetDB et regroupe par langue puis par thème
let dataByLang = {};
let allLangs = [];
let selectedLang = null;
let themes = {};
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

// ...déjà défini plus haut...

function showThemes() {
  themeList.innerHTML = '';
  Object.keys(themes).forEach(theme => {
    const btn = document.createElement('button');
    btn.textContent = theme;
    btn.className = 'main-btn';
    btn.onclick = () => startRevision(theme);
    themeList.appendChild(btn);
  });
}

function startRevision(theme) {
  currentTheme = theme;
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
  }
};

showThemes();
