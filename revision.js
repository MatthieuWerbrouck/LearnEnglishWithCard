// Gestion des scores persistants
function getThemeScores() {
  constfunction showLangSelection() {
  // Affiche la section de sélection des langues
  document.getElementById('langSelectContainer').style.display = '';
  document.getElementById('themeSelectContainer').style.display = 'none';
  document.getElementById('flashcardSection').style.display = 'none';
  document.getElementById('globalBackButton').style.display = '';
  
  langSelectDiv.innerHTML = '';
  allLangs.forEach(lang => {
    const btn = document.createElement('button');
    btn.textContent = `🌍 ${lang.charAt(0).toUpperCase() + lang.slice(1)}`;
    btn.className = 'main-btn';
    btn.onclick = () => selectLang(lang);
    langSelectDiv.appendChild(btn);
  });
}

function selectLang(lang) {
  selectedLang = lang;
  themes = dataByLang[lang];
  
  // Masque la sélection des langues et affiche celle des thèmes
  document.getElementById('langSelectContainer').style.display = 'none';
  document.getElementById('themeSelectContainer').style.display = '';
  document.getElementById('globalBackButton').style.display = 'none';
  
  showThemes();
}.getItem('themeScores');
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

// Utilise le système de cache optimisé d'evaluation.js
function loadSheetDBDataForRevision() {
  // Si les fonctions de cache d'evaluation.js sont disponibles, les utiliser
  if (typeof loadSheetDBData === 'function') {
    return loadSheetDBData();
  }
  
  // Sinon, logique simplifiée avec cache localStorage
  const CACHE_KEY = 'sheetDB_cache';
  const CACHE_TIMESTAMP_KEY = 'sheetDB_cache_timestamp';
  const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  
  return new Promise((resolve, reject) => {
    // Vérifier le cache en mémoire
    if (window.sheetDBData) {
      console.log('📦 [Revision] Utilisation des données en mémoire');
      resolve(window.sheetDBData);
      return;
    }
    
    // Vérifier le cache localStorage
    try {
      const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      const cachedData = localStorage.getItem(CACHE_KEY);
      
      if (timestamp && cachedData) {
        const age = Date.now() - parseInt(timestamp);
        if (age <= CACHE_DURATION) {
          console.log('💾 [Revision] Utilisation des données en cache');
          const data = JSON.parse(cachedData);
          window.sheetDBData = data;
          resolve(data);
          return;
        }
      }
    } catch (error) {
      console.warn('[Revision] Erreur cache:', error);
    }
    
    // Charger depuis l'API
    if (window.sheetDBPromise) {
      console.log('⏳ [Revision] Utilisation du chargement en cours...');
      window.sheetDBPromise.then(resolve).catch(reject);
      return;
    }
    
    console.log('🌐 [Revision] Chargement depuis SheetDB');
    window.sheetDBPromise = fetch('https://sheetdb.io/api/v1/xg3dj9vsovufe')
      .then(r => r.json())
      .then(data => {
        window.sheetDBData = data;
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(data));
          localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
        } catch (error) {
          console.warn('[Revision] Erreur mise en cache:', error);
        }
        window.sheetDBPromise = null;
        return data;
      })
      .catch(error => {
        window.sheetDBPromise = null;
        throw error;
      });
    
    window.sheetDBPromise.then(resolve).catch(reject);
  });
}

// Initialisation optimisée avec cache
document.addEventListener('DOMContentLoaded', function() {
  loadSheetDBDataForRevision()
    .then(data => {
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
    })
    .catch(error => {
      console.error('[Revision] Erreur chargement:', error);
      const langSelectDiv = document.getElementById('langSelect');
      if (langSelectDiv) {
        langSelectDiv.innerHTML = `
          <div style="text-align: center; padding: 20px; background: rgba(239, 68, 68, 0.1); border-radius: 12px; color: #dc2626;">
            <h3>❌ Erreur de chargement</h3>
            <p>Impossible de charger les données.</p>
            <button class="nav-btn" onclick="location.reload()" style="margin-top: 12px;">🔄 Réessayer</button>
          </div>
        `;
      }
    });
});

function showLangSelection() {
  // Affiche la section de sélection des langues
  document.getElementById('langSelectContainer').style.display = '';
  document.getElementById('themeSelectContainer').style.display = 'none';
  document.getElementById('flashcardSection').style.display = 'none';
  document.getElementById('globalBackButton').style.display = '';
  
  langSelectDiv.innerHTML = '';
  allLangs.forEach(lang => {
    const btn = document.createElement('button');
    btn.textContent = `🌍 ${lang.charAt(0).toUpperCase() + lang.slice(1)}`;
    btn.className = 'main-btn';
    btn.onclick = () => selectLang(lang);
    langSelectDiv.appendChild(btn);
  });
}

function selectLang(lang) {
  selectedLang = lang;
  themes = dataByLang[lang];
  
  // Masque la sélection des langues et affiche celle des thèmes
  document.getElementById('langSelectContainer').style.display = 'none';
  document.getElementById('themeSelectContainer').style.display = '';
  document.getElementById('globalBackButton').style.display = 'none';
  
  showThemes();
}

function showThemes() {
  themeList.innerHTML = '';
  Object.keys(themes).forEach(theme => {
    const score = getScoreForTheme(selectedLang, theme);
    const btn = document.createElement('button');
    btn.className = 'theme-list button'; // Utilise le style CSS pour les boutons de thèmes
    btn.onclick = () => startRevision(theme);
    
    // Émoji basé sur le score
    let emoji = '📖';
    if (score !== null) {
      if (score >= 8) emoji = '🏆';
      else if (score >= 6) emoji = '⭐';
      else if (score >= 4) emoji = '📈';
      else emoji = '💪';
    }
    
    btn.innerHTML = `${emoji} ${theme}` + (score !== null ? ` <span style="font-size:0.9em;color:rgba(255,255,255,0.8);margin-left:8px;">${score}/10</span>` : '');
    themeList.appendChild(btn);
  });
}

function startRevision(theme) {
  currentTheme = theme;
  
  // Masque la sélection des thèmes et affiche les flashcards
  document.getElementById('themeSelectContainer').style.display = 'none';
  document.getElementById('flashcardSection').style.display = '';
  
  // Met à jour le titre du thème actuel
  document.getElementById('currentThemeTitle').textContent = `🎯 ${theme}`;
  
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
  
  showCard();
}

function showCard() {
  const card = themes[currentTheme][currentIndex];
  
  // Met à jour les informations de progression
  const totalCards = themes[currentTheme].length;
  const progressInfo = document.getElementById('progressInfo');
  progressInfo.textContent = `Carte ${currentIndex + 1} sur ${totalCards} • Clique pour révéler la traduction`;
  
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
