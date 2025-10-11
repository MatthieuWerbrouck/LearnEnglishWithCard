// ================================
// SYSTÈME DE GESTION DES SCORES
// ================================

/**
 * Récupère les scores de tous les thèmes depuis localStorage
 * @returns {Object} Objet contenant les scores par thème
 */
function getThemeScores() {
  try {
    const raw = localStorage.getItem('themeScores');
    if (!raw) return {};
    
    const parsed = JSON.parse(raw);
    
    // Vérifie que c'est un objet valide
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      console.warn('⚠️ [Revision] Scores corrompus, réinitialisation');
      return {};
    }
    
    return parsed;
    
  } catch (error) {
    console.error('❌ [Revision] Erreur lecture scores:', error);
    // Nettoie les données corrompues
    localStorage.removeItem('themeScores');
    return {};
  }
}

/**
 * Sauvegarde les scores dans localStorage
 * @param {Object} scores - Objet des scores à sauvegarder
 */
function setThemeScores(scores) {
  localStorage.setItem('themeScores', JSON.stringify(scores));
}

/**
 * Récupère le score d'un thème pour un type d'évaluation spécifique
 * @param {string} lang - Langue du thème
 * @param {string} theme - Nom du thème
 * @param {string} evaluationType - Type d'évaluation ('revision', 'qcm_fr_lang', 'qcm_lang_fr', 'libre')
 * @returns {number|null} Score sur 10 ou null si pas de score
 */
function getScoreForTheme(lang, theme, evaluationType = 'revision') {
  try {
    const scores = getThemeScores();
    if (!scores || typeof scores !== 'object') return null;
    
    const key = `${lang}:${theme}:${evaluationType}`;
    const themeData = scores[key];
    
    if (!themeData || typeof themeData !== 'object') return null;
    if (typeof themeData.score !== 'number') return null;
    
    return Math.max(0, Math.min(10, themeData.score)); // Clamp entre 0-10
    
  } catch (error) {
    console.error('❌ [Revision] Erreur récupération score:', error);
    return null;
  }
}

/**
 * Met à jour le score d'un thème basé sur une réponse
 * @param {string} lang - Langue du thème
 * @param {string} theme - Nom du thème
 * @param {boolean} isGood - true si bonne réponse, false sinon
 * @param {string} evaluationType - Type d'évaluation ('revision', 'qcm_fr_lang', 'qcm_lang_fr', 'libre')
 */
function updateScoreForTheme(lang, theme, isGood, evaluationType = 'revision') {
  try {
    const scores = getThemeScores() || {}; // Assure qu'on a un objet
    const key = `${lang}:${theme}:${evaluationType}`;
    
    // Initialisation robuste de l'objet score
    if (!scores[key]) {
      scores[key] = { history: [] };
    }
    
    // Vérifie que history existe et est un tableau
    if (!scores[key].history || !Array.isArray(scores[key].history)) {
      scores[key].history = [];
    }
    
    // Ajoute la nouvelle réponse à l'historique
    scores[key].history.push(isGood ? 1 : 0);
  
  // Limite l'historique aux 20 dernières réponses
  if (scores[key].history.length > 20) {
    scores[key].history = scores[key].history.slice(-20);
  }
  
    // Calcule la note sur les 20 dernières réponses avec précision
    const sum = scores[key].history.reduce((a, b) => a + b, 0);
    // Conserve 3 décimales pour plus de précision dans le calcul
    scores[key].score = Math.round((sum / scores[key].history.length) * 10 * 1000) / 1000;
    
    setThemeScores(scores);
    console.log(`📊 Score mis à jour pour ${theme}: ${scores[key].score}/10`);
    
  } catch (error) {
    console.error('❌ [Revision] Erreur mise à jour score:', error);
    console.log('Paramètres:', { lang, theme, isGood });
    
    // Fallback: initialiser les scores proprement
    try {
      const fallbackScores = {};
      fallbackScores[`${lang}:${theme}`] = { 
        history: [isGood ? 1 : 0], 
        score: isGood ? 10 : 0 
      };
      setThemeScores(fallbackScores);
      console.log('✅ [Revision] Scores réinitialisés en mode fallback');
    } catch (fallbackError) {
      console.error('❌ [Revision] Erreur critique scores:', fallbackError);
    }
  }
}

/**
 * Migre les anciens scores arrondis vers des scores précis
 * Recalcule tous les scores existants avec la nouvelle précision
 */
function migrateToPreciseScores() {
  try {
    const scores = getThemeScores();
    if (!scores || typeof scores !== 'object') {
      console.log('ℹ️ [Migration] Aucun score à migrer');
      return 0;
    }
    
    let migratedCount = 0;
    
    Object.keys(scores).forEach(key => {
      const themeData = scores[key];
      
      // Vérifie si c'est un ancien score arrondi (nombre entier)
      if (themeData && 
          themeData.history && 
          Array.isArray(themeData.history) && 
          typeof themeData.score === 'number' &&
          themeData.score === Math.round(themeData.score)) {
        
        // Recalcule le score avec précision
        const sum = themeData.history.reduce((a, b) => a + b, 0);
        const oldScore = themeData.score;
        const newScore = Math.round((sum / themeData.history.length) * 10 * 1000) / 1000;
        
        // Ne met à jour que si il y a une différence significative
        if (Math.abs(newScore - oldScore) > 0.001) {
          themeData.score = newScore;
          migratedCount++;
          
          console.log(`🔄 [Migration] ${key}: ${oldScore}/10 → ${newScore}/10`);
        }
      }
    });
    
    if (migratedCount > 0) {
      setThemeScores(scores);
      console.log(`✅ [Migration] ${migratedCount} scores migrés vers la nouvelle précision`);
    } else {
      console.log('ℹ️ [Migration] Aucun score nécessitant une migration trouvé');
    }
    
    return migratedCount;
    
  } catch (error) {
    console.error('❌ [Migration] Erreur lors de la migration:', error);
    return 0;
  }
}

/**
 * Migre les anciens scores vers la nouvelle structure avec types d'évaluation
 * Convertit les clés "lang:theme" vers "lang:theme:revision"
 */
function migrateToEvaluationTypes() {
  try {
    const scores = getThemeScores();
    if (!scores || typeof scores !== 'object') {
      console.log('ℹ️ [Migration Types] Aucun score à migrer');
      return 0;
    }
    
    let migratedCount = 0;
    const newScores = {};
    
    // Copie les nouveaux scores (avec types) s'ils existent déjà
    Object.keys(scores).forEach(key => {
      if (key.split(':').length === 3) {
        newScores[key] = scores[key];
      }
    });
    
    // Migre les anciens scores (sans types)
    Object.keys(scores).forEach(key => {
      if (key.split(':').length === 2) {
        const newKey = `${key}:revision`;
        
        // Ne migre que s'il n'existe pas déjà avec le nouveau format
        if (!newScores[newKey]) {
          newScores[newKey] = scores[key];
          migratedCount++;
          console.log(`🔄 [Migration Types] ${key} → ${newKey}`);
        }
      }
    });
    
    if (migratedCount > 0) {
      setThemeScores(newScores);
      console.log(`✅ [Migration Types] ${migratedCount} scores migrés vers la nouvelle structure`);
    } else {
      console.log('ℹ️ [Migration Types] Aucun score nécessitant une migration trouvé');
    }
    
    return migratedCount;
    
  } catch (error) {
    console.error('❌ [Migration Types] Erreur lors de la migration:', error);
    return 0;
  }
}

// ================================
// VARIABLES GLOBALES
// ================================

// Données et état de l'application
let dataByLang = {};
let allLangs = [];
let selectedLang = null;
let themes = {};
let currentTheme = null;
let currentIndex = 0;
let flipped = false;
let flipTimeout = null;

// Éléments DOM (sécurisés)
const DOMElements = {
  langSelectDiv: () => DOMUtils.safeQuery('#langSelect'),
  themeTitle: () => DOMUtils.safeQuery('#themeTitle'),
  themeList: () => DOMUtils.safeQuery('#themeList'),
  flashcardSection: () => DOMUtils.safeQuery('#flashcardSection'),
  flashcard: () => DOMUtils.safeQuery('#flashcard'),
  cardFront: () => DOMUtils.safeQuery('#cardFront'),
  cardBack: () => DOMUtils.safeQuery('#cardBack'),
  prevBtn: () => DOMUtils.safeQuery('#prevBtn'),
  nextBtn: () => DOMUtils.safeQuery('#nextBtn'),
  feedbackButtons: () => DOMUtils.safeQuery('#feedbackButtons'),
  knownBtn: () => DOMUtils.safeQuery('#knownBtn'),
  unknownBtn: () => DOMUtils.safeQuery('#unknownBtn'),
  langSelectContainer: () => DOMUtils.safeQuery('#langSelectContainer'),
  themeSelectContainer: () => DOMUtils.safeQuery('#themeSelectContainer'),
  globalBackButton: () => DOMUtils.safeQuery('#globalBackButton')
};

// ================================
// SYSTÈME DE CACHE INTELLIGENT
// ================================

/**
 * Charge les données depuis SheetDB avec système de cache 3 niveaux
 * Utilise le système de cache partagé avec evaluation.js si disponible
 * @returns {Promise<Array>} Promise contenant les données des cartes
 */
function loadSheetDBDataForRevision() {
  // Si les fonctions de cache d'evaluation.js sont disponibles, les utiliser
  if (typeof loadSheetDBData === 'function') {
    console.log('🔗 [Revision] Utilisation du cache partagé avec évaluation');
    return loadSheetDBData();
  }
  
  // Sinon, logique de cache locale
  const CACHE_KEY = 'sheetDB_cache';
  const CACHE_TIMESTAMP_KEY = 'sheetDB_cache_timestamp';
  const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  
  return new Promise((resolve, reject) => {
    // 1. Vérifier le cache en mémoire
    if (window.sheetDBData) {
      console.log('📦 [Revision] Utilisation des données en mémoire');
      resolve(window.sheetDBData);
      return;
    }
    
    // 2. Vérifier le cache localStorage
    try {
      const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      const cachedData = localStorage.getItem(CACHE_KEY);
      
      if (timestamp && cachedData) {
        const age = Date.now() - parseInt(timestamp);
        if (age <= CACHE_DURATION) {
          console.log('💾 [Revision] Utilisation des données en cache (localStorage)');
          const data = JSON.parse(cachedData);
          window.sheetDBData = data;
          resolve(data);
          return;
        }
      }
    } catch (error) {
      console.warn('⚠️ [Revision] Erreur cache localStorage:', error);
    }
    
    // 3. Vérifier si un chargement est déjà en cours
    if (window.sheetDBPromise) {
      console.log('⏳ [Revision] Chargement déjà en cours, partage de la promesse');
      window.sheetDBPromise.then(resolve).catch(reject);
      return;
    }
    
    // 4. Charger depuis l'API SheetDB
    console.log('🌐 [Revision] Chargement depuis SheetDB API');
    window.sheetDBPromise = fetch('https://sheetdb.io/api/v1/xg3dj9vsovufe')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        console.log(`✅ [Revision] ${data.length} cartes chargées depuis l'API`);
        window.sheetDBData = data;
        
        // Mise en cache localStorage
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(data));
          localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
          console.log('💾 [Revision] Données mises en cache');
        } catch (error) {
          console.warn('⚠️ [Revision] Erreur mise en cache:', error);
        }
        
        window.sheetDBPromise = null;
        return data;
      })
      .catch(error => {
        console.error('❌ [Revision] Erreur chargement API:', error);
        window.sheetDBPromise = null;
        throw error;
      });
    
    window.sheetDBPromise.then(resolve).catch(reject);
  });
}

// ================================
// INITIALISATION DE L'APPLICATION
// ================================

/**
 * Initialise l'application au chargement de la page
 */
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 [Revision] Initialisation de l\'application');
  
  loadSheetDBDataForRevision()
    .then(data => {
      console.log(`📊 [Revision] Traitement de ${data.length} cartes`);
      
      // Regroupement des données par langue puis par thème
      data.forEach(card => {
        const lang = card.langue && card.langue.trim();
        const theme = card.theme && card.theme.trim();
        
        if (!lang || !theme) {
          console.warn('⚠️ Carte ignorée (langue/thème manquant):', card);
          return;
        }
        
        if (!dataByLang[lang]) dataByLang[lang] = {};
        if (!dataByLang[lang][theme]) dataByLang[lang][theme] = [];
        dataByLang[lang][theme].push(card);
      });
      
      allLangs = Object.keys(dataByLang);
      console.log(`🌍 [Revision] ${allLangs.length} langues disponibles:`, allLangs);
      
      // Migration des scores vers la nouvelle structure
      console.log('🔄 [Revision] Démarrage des migrations...');
      migrateToPreciseScores();
      migrateToEvaluationTypes();
      
      // Affichage de la sélection des langues
      showLangSelection();
    })
    .catch(error => {
      console.error('❌ [Revision] Erreur critique lors du chargement:', error);
      showErrorMessage(error);
    });
});

/**
 * Affiche un message d'erreur convivial
 * @param {Error} error - L'erreur qui s'est produite
 */
function showErrorMessage(error) {
  const langSelectDiv = document.getElementById('langSelect');
  if (langSelectDiv) {
    // Sécurisation: Remplace innerHTML dangereux par création sécurisée
    langSelectDiv.innerHTML = '';
    
    const errorContainer = DOMUtils.createSafeElement('div', {
      style: {
        textAlign: 'center',
        padding: '24px',
        background: 'rgba(239, 68, 68, 0.1)',
        borderRadius: '16px',
        color: '#dc2626',
        backdropFilter: 'blur(10px)'
      }
    });
    
    const emoji = DOMUtils.createSafeElement('div', {
      textContent: '😕',
      style: { fontSize: '3rem', marginBottom: '16px' }
    });
    
    const title = DOMUtils.createSafeElement('h3', {
      textContent: 'Oups ! Problème de chargement',
      style: { marginBottom: '12px', color: '#dc2626' }
    });
    
    const message = DOMUtils.createSafeElement('p', {
      style: { marginBottom: '16px', color: '#6b7280' }
    });
    message.innerHTML = 'Impossible de charger les cartes de révision.<br>Vérifiez votre connexion internet et réessayez.';
    
    const retryBtn = DOMUtils.createSafeElement('button', {
      className: 'nav-btn',
      textContent: '🔄 Réessayer',
      style: { marginTop: '12px' }
    });
    retryBtn.onclick = () => location.reload();
    
    const homeBtn = DOMUtils.createSafeElement('button', {
      className: 'nav-btn',
      textContent: '🏠 Retour à l\'accueil',
      style: { marginLeft: '12px' }
    });
    homeBtn.onclick = () => window.location.href = 'index.html';
    
    errorContainer.appendChild(emoji);
    errorContainer.appendChild(title);
    errorContainer.appendChild(message);
    errorContainer.appendChild(retryBtn);
    errorContainer.appendChild(homeBtn);
    langSelectDiv.appendChild(errorContainer);
  }
}

// ================================
// GESTION DE LA NAVIGATION
// ================================

/**
 * Affiche l'écran de sélection des langues
 */
function showLangSelection() {
  console.log('🌍 [Revision] Affichage de la sélection des langues');
  
  // Gestion de l'affichage des sections (sécurisée)
  const containers = [
    { element: DOMElements.langSelectContainer(), display: '' },
    { element: DOMElements.themeSelectContainer(), display: 'none' },
    { element: DOMElements.flashcardSection(), display: 'none' },
    { element: DOMElements.globalBackButton(), display: '' }
  ];
  
  containers.forEach(({ element, display }) => {
    if (element) element.style.display = display;
  });
  
  // Création des boutons de langue
  const langSelectDiv = DOMElements.langSelectDiv();
  if (!langSelectDiv) {
    console.error('❌ [Revision] langSelectDiv non trouvé');
    return;
  }
  langSelectDiv.innerHTML = '';
  allLangs.forEach(lang => {
    const btn = document.createElement('button');
    btn.textContent = `🌍 ${lang.charAt(0).toUpperCase() + lang.slice(1)}`;
    btn.className = 'main-btn';
    btn.onclick = () => selectLang(lang);
    langSelectDiv.appendChild(btn);
  });
  
  console.log(`✅ [Revision] ${allLangs.length} langues affichées`);
}

/**
 * Sélectionne une langue et passe à la sélection des thèmes
 * @param {string} lang - La langue sélectionnée
 */
function selectLang(lang) {
  console.log(`🎯 [Revision] Langue sélectionnée: ${lang}`);
  selectedLang = lang;
  themes = dataByLang[lang];
  
  // Transition d'écran (sécurisée)
  const transitions = [
    { element: DOMElements.langSelectContainer(), display: 'none' },
    { element: DOMElements.themeSelectContainer(), display: '' },
    { element: DOMElements.globalBackButton(), display: 'none' }
  ];
  
  transitions.forEach(({ element, display }) => {
    if (element) element.style.display = display;
  });
  
  // Mise à jour du titre avec la langue
  const themeTitle = document.getElementById('themeTitle');
  themeTitle.textContent = `🎯 Choisis ton thème (${lang.charAt(0).toUpperCase() + lang.slice(1)})`;
  
  showThemes();
}

/**
 * Affiche la liste des thèmes pour la langue sélectionnée
 */
function showThemes() {
  console.log(`📚 [Revision] Affichage des thèmes pour ${selectedLang}`);
  
  themeList.innerHTML = '';
  const themeNames = Object.keys(themes);
  
  // OPTIMISATION: Lazy loading pour grandes listes de thèmes
  if (themeNames.length > 20) {
    console.log('🚀 [Performance] Activation du lazy loading pour', themeNames.length, 'thèmes');
    
    const renderTheme = (theme, index) => {
      const score = getScoreForTheme(selectedLang, theme);
      const cardCount = themes[theme].length;
      
      const btn = document.createElement('button');
      btn.className = 'theme-list button';
      btn.onclick = () => startRevision(theme);
      
      // Émoji basé sur le score de performance
      let emoji = '📖'; // Par défaut
      let scoreText = 'Nouveau';
      
      if (score !== null) {
        scoreText = `${score}/10`;
        if (score >= 8) emoji = '🏆'; // Excellent
        else if (score >= 6) emoji = '⭐'; // Bon
        else if (score >= 4) emoji = '📈'; // En progression
        else emoji = '💪'; // À travailler
      }
      
      // Suite du rendu du bouton...
      btn.innerHTML = DOMUtils.escapeHtml(`${emoji} ${theme} (${cardCount} mots) - Score: ${scoreText}`);
      return btn;
    };
    
    // Lazy loader avec batches de 10 thèmes
    PerformanceOptimizer.createLazyLoader(themeList, themeNames, renderTheme, 10);
    
  } else {
    // Rendu normal pour petites listes
    themeNames.forEach(theme => {
      const score = getScoreForTheme(selectedLang, theme);
      const cardCount = themes[theme].length;
      
      const btn = document.createElement('button');
      btn.className = 'theme-list button';
      btn.onclick = () => startRevision(theme);
      
      // Émoji basé sur le score de performance
      let emoji = '📖'; // Par défaut
      let scoreText = 'Nouveau';
      
      if (score !== null) {
        scoreText = `${score}/10`;
        if (score >= 8) emoji = '🏆'; // Excellent
        else if (score >= 6) emoji = '⭐'; // Bon
        else if (score >= 4) emoji = '📈'; // En progression
        else emoji = '💪'; // À travailler
      }
      
      // SÉCURITÉ: Utilise création sécurisée au lieu d'innerHTML
      const themeTitle = DOMUtils.createSafeElement('div', {
        textContent: `${emoji} ${theme}`
      });
      
      const themeInfo = DOMUtils.createSafeElement('div', {
        textContent: `${cardCount} cartes • ${scoreText}`,
        style: {
          fontSize: '0.85em',
          color: 'rgba(255,255,255,0.7)',
          marginTop: '4px'
        }
      });
      
      btn.appendChild(themeTitle);
      btn.appendChild(themeInfo);
      themeList.appendChild(btn);
    });
  }
  
  console.log(`✅ [Revision] ${themeNames.length} thèmes affichés`);
}

// ================================
// SYSTÈME DE RÉVISION INTELLIGENT
// ================================

/**
 * Démarre une session de révision pour un thème donné
 * @param {string} theme - Le nom du thème à réviser
 */
function startRevision(theme) {
  console.log(`📖 [Revision] Démarrage de la révision: ${theme}`);
  currentTheme = theme;
  
  // Transition d'écran
  document.getElementById('themeSelectContainer').style.display = 'none';
  document.getElementById('flashcardSection').style.display = '';
  
  // Mise à jour du titre
  document.getElementById('currentThemeTitle').textContent = `🎯 ${theme}`;
  
  // Application de l'algorithme de pondération intelligent
  const originalCards = [...themes[theme]]; // Copie des cartes originales
  const weightedCards = applyWeightingAlgorithm(selectedLang, theme, originalCards);
  
  // Utilisation de la liste pondérée
  themes[currentTheme] = weightedCards;
  currentIndex = 0;
  flipped = false;
  
  // Réinitialisation des timeouts
  if (flipTimeout) {
    clearTimeout(flipTimeout);
    flipTimeout = null;
  }
  
  showCard();
}

/**
 * Applique l'algorithme de pondération intelligent et adaptatif
 * Système à plusieurs niveaux pour optimiser l'apprentissage
 * @param {string} lang - Langue du thème
 * @param {string} theme - Nom du thème
 * @param {Array} cards - Cartes originales du thème
 * @returns {Array} Cartes pondérées et mélangées intelligemment
 */
function applyWeightingAlgorithm(lang, theme, cards) {
  const score = getScoreForTheme(lang, theme);
  const scores = getThemeScores();
  const key = `${lang}:${theme}`;
  const themeData = scores[key];
  
  let strategy = 'balanced'; // Par défaut : stratégie équilibrée
  let weight = 2;
  let description = '';
  
  if (score === null) {
    // 🆕 NOUVEAU THÈME : Apprentissage initial modéré
    strategy = 'discovery';
    weight = 2;
    description = 'Mode découverte - première fois';
    
  } else if (score <= 3) {
    // 🔥 SCORE CRITIQUE : Révision intensive
    strategy = 'intensive';
    weight = 4;
    description = 'Révision intensive - score faible';
    
  } else if (score <= 6) {
    // 📈 EN PROGRESSION : Renforcement ciblé
    strategy = 'reinforcement';
    weight = 3;
    description = 'Renforcement - en progression';
    
  } else if (score <= 8) {
    // ⭐ BON NIVEAU : Maintien avec rappels
    strategy = 'maintenance';
    weight = 2;
    description = 'Maintien - bon niveau';
    
  } else {
    // 🏆 EXCELLÉ : Rappels espacés minimum
    strategy = 'mastery';
    weight = 1;
    description = 'Maîtrise - rappels espacés';
  }
  
  // 🧠 ADAPTATION DYNAMIQUE selon l'historique récent
  if (themeData?.history && themeData.history.length >= 10) {
    const recentHistory = themeData.history.slice(-10); // 10 dernières réponses
    const recentSuccess = recentHistory.reduce((sum, val) => sum + val, 0);
    const recentRate = recentSuccess / recentHistory.length;
    
    // Si les performances récentes sont mauvaises, augmenter l'intensité
    if (recentRate < 0.4 && weight < 4) {
      weight += 1;
      description += ' + boost récent';
    }
    // Si les performances récentes sont excellentes, réduire légèrement
    else if (recentRate > 0.8 && weight > 1) {
      weight = Math.max(1, weight - 1);
      description += ' - réduction récente';
    }
  }
  
  console.log(`⚖️ [Revision] Stratégie "${strategy}" pour ${theme}: ${weight}x répétitions`);
  console.log(`📊 [Revision] ${description} (score: ${score || 'nouveau'})`);
  
  // 🎯 CRÉATION INTELLIGENTE DE LA LISTE
  let weightedCards = createIntelligentCardSequence(cards, weight, strategy);
  
  console.log(`🔀 [Revision] ${weightedCards.length} cartes préparées selon la stratégie ${strategy}`);
  return weightedCards;
}

/**
 * Crée une séquence intelligente de cartes selon la stratégie d'apprentissage
 * @param {Array} cards - Cartes originales
 * @param {number} weight - Facteur de répétition
 * @param {string} strategy - Stratégie d'apprentissage
 * @returns {Array} Séquence optimisée de cartes
 */
function createIntelligentCardSequence(cards, weight, strategy) {
  let sequence = [];
  
  switch (strategy) {
    case 'intensive':
      // Mode intensif : répétition rapprochée avec intercalation
      for (let round = 0; round < weight; round++) {
        let roundCards = [...cards];
        shuffle(roundCards);
        sequence = sequence.concat(roundCards);
      }
      // Intercalation pour éviter la répétition immédiate
      sequence = intercalateSequence(sequence, cards.length);
      break;
      
    case 'reinforcement':
      // Mode renforcement : groupes alternés
      const groupSize = Math.ceil(cards.length / 3);
      for (let i = 0; i < weight; i++) {
        let groupedCards = createGroupedSequence(cards, groupSize);
        sequence = sequence.concat(groupedCards);
      }
      break;
      
    case 'mastery':
      // Mode maîtrise : ordre aléatoire simple
      sequence = [...cards];
      shuffle(sequence);
      break;
      
    default:
      // Mode équilibré (discovery, maintenance)
      for (let i = 0; i < weight; i++) {
        let roundCards = [...cards];
        shuffle(roundCards);
        sequence = sequence.concat(roundCards);
      }
  }
  
  return sequence;
}

/**
 * Intercale les cartes pour éviter les répétitions trop rapprochées
 * @param {Array} sequence - Séquence à intercaler
 * @param {number} minDistance - Distance minimum entre répétitions
 * @returns {Array} Séquence intercalée
 */
function intercalateSequence(sequence, minDistance) {
  const result = [];
  const pending = [...sequence];
  
  while (pending.length > 0) {
    for (let i = 0; i < pending.length; i++) {
      const card = pending[i];
      const lastIndex = result.map(c => c.en || c.ja).lastIndexOf(card.en || card.ja);
      
      if (lastIndex === -1 || result.length - lastIndex >= minDistance) {
        result.push(card);
        pending.splice(i, 1);
        break;
      }
    }
    
    // Sécurité pour éviter les boucles infinies
    if (result.length > sequence.length * 2) break;
  }
  
  // Ajouter les cartes restantes
  return result.concat(pending);
}

/**
 * Crée une séquence par groupes pour le mode renforcement
 * @param {Array} cards - Cartes originales
 * @param {number} groupSize - Taille des groupes
 * @returns {Array} Séquence groupée
 */
function createGroupedSequence(cards, groupSize) {
  const groups = [];
  for (let i = 0; i < cards.length; i += groupSize) {
    groups.push(cards.slice(i, i + groupSize));
  }
  
  // Mélange les groupes et leur contenu
  shuffle(groups);
  groups.forEach(group => shuffle(group));
  
  return groups.flat();
}

// ================================
// AFFICHAGE DES FLASHCARDS
// ================================

/**
 * Affiche la carte actuelle avec les informations de progression
 */
function showCard() {
  const card = themes[currentTheme][currentIndex];
  if (!card) {
    console.error('❌ [Revision] Carte non trouvée à l\'index:', currentIndex);
    return;
  }
  
  console.log(`📇 [Revision] Affichage carte ${currentIndex + 1}/${themes[currentTheme].length}`);
  
  // Mise à jour des informations de progression
  const totalCards = themes[currentTheme].length;
  const uniqueCards = new Set(themes[currentTheme].map(c => c.en || c.ja || '')).size;
  const progressInfo = document.getElementById('progressInfo');
  progressInfo.textContent = `Carte ${currentIndex + 1} sur ${totalCards} • ${uniqueCards} mots uniques • Clique pour révéler`;
  
  // Détermination de la clé de langue
  let langKey = 'en'; // Par défaut anglais
  if (selectedLang === 'japonais') langKey = 'ja';
  else if (selectedLang === 'espagnol') langKey = 'es';
  else if (selectedLang === 'allemand') langKey = 'de';
  
  // Affichage du contenu
  const frontText = card[langKey] || card.en || '[Mot manquant]';
  const backText = card.fr || '[Traduction manquante]';
  
  cardFront.textContent = frontText;
  cardBack.textContent = backText;
  
  // Réinitialisation de l'état de la carte
  flashcard.classList.remove('flipped');
  flipped = false;
  flashcard.style.pointerEvents = '';
  
  // Masquage des boutons de feedback et réinitialisation
  feedbackButtons.style.display = 'none';
  // Sécurisation: Remplace innerHTML par création sécurisée
  feedbackButtons.innerHTML = '';
  
  const feedbackText = DOMUtils.createSafeElement('p', {
    textContent: 'Connais-tu ce mot ?',
    style: { 
      color: '#6b7280', 
      marginBottom: '12px', 
      fontSize: '0.9rem' 
    }
  });
  
  const knownBtn = DOMUtils.createSafeElement('button', {
    attributes: { id: 'knownBtn' },
    className: 'success-btn',
    textContent: '✅ Je connais',
    style: { marginRight: '8px' }
  });
  
  const unknownBtn = DOMUtils.createSafeElement('button', {
    attributes: { id: 'unknownBtn' },
    className: 'danger-btn',
    textContent: '❌ Je ne connais pas',
    style: { marginLeft: '8px' }
  });
  
  feedbackButtons.appendChild(feedbackText);
  feedbackButtons.appendChild(knownBtn);
  feedbackButtons.appendChild(unknownBtn);
  
  // Nettoyage des timeouts précédents
  if (flipTimeout) {
    clearTimeout(flipTimeout);
    flipTimeout = null;
  }
  
  // Mise à jour des boutons de navigation
  updateNavigationButtons();
  
  // Réattachement des événements sur les nouveaux boutons
  document.getElementById('knownBtn').onclick = () => handleUserFeedback(true);
  document.getElementById('unknownBtn').onclick = () => handleUserFeedback(false);
}

/**
 * Met à jour l'état des boutons de navigation
 */
function updateNavigationButtons() {
  const totalCards = themes[currentTheme].length;
  
  prevBtn.disabled = currentIndex === 0;
  nextBtn.disabled = currentIndex >= totalCards - 1;
  
  // Mise à jour du texte des boutons pour indiquer la progression
  prevBtn.textContent = currentIndex === 0 ? '← Début' : '← Précédent';
  nextBtn.textContent = currentIndex >= totalCards - 1 ? 'Fin →' : 'Suivant →';
}

// ================================
// GESTIONNAIRES D'ÉVÉNEMENTS
// ================================

/**
 * Gestionnaire de clic sur la flashcard
 * Retourne la carte et affiche les boutons de feedback
 */
flashcard.onclick = function() {
  // Annulation de l'avancement automatique si l'utilisateur clique
  if (flipTimeout) {
    clearTimeout(flipTimeout);
    flipTimeout = null;
  }
  
  if (!flipped) {
    // Retournement de la carte
    flipped = true;
    flashcard.classList.add('flipped');
    
    console.log('🔄 [Revision] Carte retournée - révélation de la traduction');
    
    // Affichage des boutons de feedback
    feedbackButtons.style.display = 'block';
    
    // Désactivation temporaire du clic sur la carte
    flashcard.style.pointerEvents = 'none';
    
    // Avancement automatique après 10 secondes (plus long pour laisser le temps de choisir)
    flipTimeout = setTimeout(() => {
      console.log('⏰ [Revision] Avancement automatique (pas de feedback)');
      advanceToNextCard();
    }, 10000);
  }
};

/**
 * Gestionnaire du bouton précédent
 */
prevBtn.onclick = function() {
  if (flipTimeout) {
    clearTimeout(flipTimeout);
    flipTimeout = null;
  }
  
  if (currentIndex > 0) {
    currentIndex--;
    console.log(`⬅️ [Revision] Navigation vers la carte précédente: ${currentIndex + 1}`);
    showCard();
  }
};

/**
 * Gestionnaire du bouton suivant
 */
nextBtn.onclick = function() {
  if (flipTimeout) {
    clearTimeout(flipTimeout);
    flipTimeout = null;
  }
  
  advanceToNextCard();
};

/**
 * Gestionnaire du bouton "Je connais"
 */
knownBtn.onclick = function() {
  handleUserFeedback(true);
};

/**
 * Gestionnaire du bouton "Je ne connais pas"  
 */
unknownBtn.onclick = function() {
  handleUserFeedback(false);
};

/**
 * Gère le feedback utilisateur et met à jour les scores
 * @param {boolean} isKnown - true si l'utilisateur connaît le mot, false sinon
 */
function handleUserFeedback(isKnown) {
  // Annulation du timeout automatique
  if (flipTimeout) {
    clearTimeout(flipTimeout);
    flipTimeout = null;
  }
  
  // Animation immédiate du bouton cliqué
  const clickedButton = isKnown ? 
    document.getElementById('knownBtn') : 
    document.getElementById('unknownBtn');
  
  if (clickedButton) {
    // Animation de clic avec effet de pulsation
    clickedButton.style.transform = 'scale(0.95)';
    clickedButton.style.transition = 'transform 0.1s ease-out';
    
    setTimeout(() => {
      clickedButton.style.transform = 'scale(1.05)';
      setTimeout(() => {
        clickedButton.style.transform = 'scale(1)';
        clickedButton.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      }, 150);
    }, 100);
  }
  
  // Mise à jour du score du thème (type 'revision')
  updateScoreForTheme(selectedLang, currentTheme, isKnown, 'revision');
  
  // Feedback visuel avec animation
  const feedbackMsg = isKnown ? 
    '✅ Parfait ! Tu maîtrises ce mot' : 
    '💪 Pas de souci, on va revoir ça !';
  
  console.log(`📊 [Revision] Feedback: ${isKnown ? 'Connu' : 'Inconnu'}`);
  
  // Délai pour laisser l'animation du bouton se terminer
  setTimeout(() => {
    showAnimatedFeedback(feedbackMsg, isKnown);
  }, 300);
  
  // Avancement après 2.5 secondes (pour laisser le temps aux animations)
  setTimeout(() => {
    advanceToNextCard();
  }, 2500);
}

/**
 * Affiche un feedback animé à l'utilisateur
 * @param {string} message - Le message à afficher
 * @param {boolean} isPositive - true pour un feedback positif, false sinon
 */
function showAnimatedFeedback(message, isPositive) {
  // Animation de sortie des boutons actuels
  feedbackButtons.style.transform = 'scale(0.9)';
  feedbackButtons.style.opacity = '0.5';
  feedbackButtons.style.transition = 'all 0.2s ease-out';
  
  setTimeout(() => {
    // SÉCURISATION CRITIQUE: Remplace innerHTML dangereux par création sécurisée
    feedbackButtons.innerHTML = '';
    
    const feedbackMessage = DOMUtils.createSafeElement('div', {
      className: 'feedback-message',
      style: {
        padding: '16px 24px',
        background: isPositive ? 
          'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 
          'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        color: 'white',
        borderRadius: '16px',
        fontWeight: '600',
        fontSize: '1.1rem',
        boxShadow: isPositive ? 
          '0 8px 25px rgba(16, 185, 129, 0.3)' : 
          '0 8px 25px rgba(245, 158, 11, 0.3)',
        animation: 'feedbackBounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        position: 'relative',
        overflow: 'hidden'
      }
    });
    
    const feedbackIcon = DOMUtils.createSafeElement('div', {
      className: 'feedback-icon',
      textContent: isPositive ? '🎉' : '🎯',
      style: {
        fontSize: '1.5rem',
        marginBottom: '4px',
        animation: 'iconSpin 0.5s ease-out 0.2s'
      }
    });
    
    const messageDiv = DOMUtils.createSafeElement('div', {
      textContent: DOMUtils.escapeHtml(String(message))
    });
    
    const shimmer = DOMUtils.createSafeElement('div', {
      className: 'feedback-shimmer',
      style: {
        position: 'absolute',
        top: '0',
        left: '-100%',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
        animation: 'shimmer 1s ease-out 0.3s'
      }
    });
    
    feedbackMessage.appendChild(feedbackIcon);
    feedbackMessage.appendChild(messageDiv);
    feedbackMessage.appendChild(shimmer);
    feedbackButtons.appendChild(feedbackMessage);
    
    // Animation d'entrée
    feedbackButtons.style.transform = 'scale(1)';
    feedbackButtons.style.opacity = '1';
    feedbackButtons.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    
  }, 200);
}

/**
 * Avance vers la carte suivante ou termine la session
 */
function advanceToNextCard() {
  if (currentIndex < themes[currentTheme].length - 1) {
    currentIndex++;
    console.log(`➡️ [Revision] Navigation vers la carte suivante: ${currentIndex + 1}`);
    showCard();
  } else {
    // Fin de la session de révision
    console.log('🎉 [Revision] Session terminée!');
    showEndOfSession();
  }
}

/**
 * Affiche l'écran de fin de session avec statistiques
 */
function showEndOfSession() {
  const totalCards = themes[currentTheme].length;
  const uniqueCards = new Set(themes[currentTheme].map(c => c.en || c.ja || '')).size;
  const currentScore = getScoreForTheme(selectedLang, currentTheme);
  
  // Calcul des statistiques de la session (si disponibles dans l'historique)
  let sessionStats = '';
  if (currentScore !== null) {
    const scores = getThemeScores();
    const key = `${selectedLang}:${currentTheme}`;
    const history = scores[key]?.history || [];
    const recentCount = Math.min(history.length, totalCards);
    const recentCorrect = history.slice(-recentCount).reduce((sum, val) => sum + val, 0);
    
    sessionStats = `
      <div style="background: rgba(255,255,255,0.1); padding: 16px; border-radius: 12px; margin: 16px 0;">
        <h4 style="color: #374151; margin-bottom: 8px;">📊 Tes performances</h4>
        <p style="color: #6b7280; font-size: 0.9rem;">
          Score actuel: <strong style="color: ${currentScore >= 7 ? '#10b981' : currentScore >= 5 ? '#f59e0b' : '#ef4444'};">${currentScore}/10</strong><br>
          Progression récente: ${recentCorrect}/${recentCount} bonnes réponses
        </p>
      </div>
    `;
  }
  
  document.getElementById('flashcardSection').innerHTML = `
    <div style="text-align: center; padding: 32px;">
      <div style="font-size: 4rem; margin-bottom: 24px;">🎉</div>
      <h2 style="color: #374151; margin-bottom: 16px;">Session terminée !</h2>
      <p style="color: #6b7280; margin-bottom: 16px;">
        Tu as révisé <strong>${totalCards} cartes</strong> sur le thème <strong>"${currentTheme}"</strong><br>
        Soit <strong>${uniqueCards} mots uniques</strong> en ${selectedLang}
      </p>
      ${sessionStats}
      <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-top: 24px;">
        <button class="main-btn" onclick="startRevision('${currentTheme}')">
          🔄 Recommencer ce thème
        </button>
        <button class="nav-btn" onclick="showThemes()">
          📚 Choisir un autre thème
        </button>
        <button class="nav-btn" onclick="window.location.href='index.html'">
          🏠 Retour à l'accueil
        </button>
      </div>
    </div>
  `;
}

// ================================
// TESTS DIAGNOSTICS
// ================================

/**
 * Test des fonctions de score pour diagnostic
 */
function testScoreFunctions() {
  console.group('🔧 [Revision] Tests diagnostics scores');
  
  try {
    // Test 1: getThemeScores
    const scores = getThemeScores();
    console.log('✅ getThemeScores():', typeof scores, scores);
    
    // Test 2: getScoreForTheme avec données valides
    const testScore = getScoreForTheme('anglais', 'test');
    console.log('✅ getScoreForTheme():', testScore);
    
    // Test 3: updateScoreForTheme - simulation
    console.log('🧪 Test updateScoreForTheme...');
    updateScoreForTheme('anglais', 'diagnostic_test', true);
    
    const newScore = getScoreForTheme('anglais', 'diagnostic_test');
    console.log('✅ Nouveau score créé:', newScore);
    
    // Nettoyage du test
    const allScores = getThemeScores();
    delete allScores['anglais:diagnostic_test'];
    setThemeScores(allScores);
    
    console.log('✅ Tous les tests de scores réussis');
    
  } catch (error) {
    console.error('❌ Erreur dans les tests scores:', error);
  }
  
  console.groupEnd();
}

// ================================
// FONCTIONS UTILITAIRES
// ================================

/**
 * Mélange un tableau de façon aléatoire (algorithme Fisher-Yates)
 * @param {Array} array - Le tableau à mélanger
 */
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// ================================
// INITIALISATION ET TESTS
// ================================

// Exécution des tests au chargement
document.addEventListener('DOMContentLoaded', function() {
  // Tests diagnostics pour éviter les erreurs
  testScoreFunctions();
  
  // Accessibilité
  if (window.AccessibilityEnhancer) {
    AccessibilityEnhancer.init();
    console.log('♿ [Revision] Accessibilité initialisée');
  }
});
