// Toute la nouvelle logique d'évaluation doit être écrite ici.
// Ne pas utiliser evaluation.old.js dans le code actif.
// Utilisez-le uniquement pour consultation ou inspiration.

// Nouvelle logique d'évaluation - étape 1 : sélection dynamique de la langue
// Système de cache optimisé pour limiter les appels à SheetDB
// Système de scoring intelligent avec persistance complète

let sheetDBData = null;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes en millisecondes
const CACHE_KEY = 'sheetDB_cache';
const CACHE_TIMESTAMP_KEY = 'sheetDB_cache_timestamp';

// ================================
// SYSTÈME DE SCORING ET PERSISTANCE
// ================================

const EVALUATION_HISTORY_KEY = 'evaluation_history';
const MAX_HISTORY_ENTRIES = 100; // Limite pour éviter l'inflation du localStorage

/**
 * Fonction utilitaire pour gérer la précision des scores
 * @param {number} value - Valeur à formater
 * @param {number} precision - Nombre de décimales (défaut: 2)
 * @returns {number} Valeur avec la précision spécifiée
 */
function formatPreciseScore(value, precision = 2) {
  if (typeof value !== 'number' || isNaN(value)) return 0;
  return Math.round(value * Math.pow(10, precision)) / Math.pow(10, precision);
}

/**
 * Calcule un pourcentage avec la précision demandée
 * @param {number} numerator - Numérateur
 * @param {number} denominator - Dénominateur  
 * @param {number} precision - Précision décimale (défaut: 2)
 * @returns {number} Pourcentage précis
 */
function calculatePrecisePercentage(numerator, denominator, precision = 2) {
  if (!denominator || denominator === 0) return 0;
  const percentage = (numerator / denominator) * 100;
  return formatPreciseScore(percentage, precision);
}

/**
 * Convertit une note sur 10 en pourcentage
 * @param {number} score - Score sur 10
 * @param {number} precision - Précision décimale (défaut: 2)
 * @returns {number} Pourcentage équivalent
 */
function scoreToPercentage(score, precision = 2) {
  if (score === null || score === undefined || typeof score !== 'number') return null;
  return formatPreciseScore((score / 10) * 100, precision);
}

/**
 * Récupère le score d'un thème avec différents formats d'affichage
 * @param {string} language - Langue du thème
 * @param {string} theme - Nom du thème
 * @returns {Object|null} Objet avec les différents formats de score
 */
function getThemeScoreFormats(language, theme) {
  if (typeof getScoreForTheme !== 'function') return null;
  
  const rawScore = getScoreForTheme(language, theme);
  if (rawScore === null) return null;
  
  return {
    raw: rawScore,                           // Score brut sur 10 (ex: 7.235)
    outOf10: formatPreciseScore(rawScore, 2), // Score formaté sur 10 (ex: 7.24/10)
    percentage: scoreToPercentage(rawScore, 2), // Pourcentage précis (ex: 72.35%)
    precisePercentage: scoreToPercentage(rawScore, 4) // Pourcentage ultra-précis (ex: 72.3500%)
  };
}

/**
 * Sauvegarde les résultats d'une session d'évaluation
 * @param {Object} sessionData - Données de la session d'évaluation
 */
function saveEvaluationSession(sessionData) {
  try {
    const history = getEvaluationHistory();
    
    // Crée l'entrée de session
    const sessionEntry = {
      id: generateSessionId(),
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      language: sessionData.language,
      mode: sessionData.mode,
      themes: sessionData.themes,
      totalQuestions: sessionData.totalQuestions,
      correctAnswers: sessionData.correctAnswers,
      score: sessionData.score,
      percentage: sessionData.percentage,
      weightedPercentage: sessionData.weightedPercentage || sessionData.percentage,
      difficultyFactor: sessionData.difficultyFactor || 1,
      duration: sessionData.duration || null,
      averageResponseTime: sessionData.averageResponseTime || null,
      results: sessionData.results, // Détail de chaque question
      themeBreakdown: sessionData.themeBreakdown || {}
    };
    
    // Ajoute au début de l'historique
    history.unshift(sessionEntry);
    
    // Limite la taille de l'historique
    if (history.length > MAX_HISTORY_ENTRIES) {
      history.splice(MAX_HISTORY_ENTRIES);
    }
    
    // Sauvegarde sécurisée avec SafeStorage
    try {
      SafeStorage.setItem(EVALUATION_HISTORY_KEY, history, { autoCleanup: true });
      console.log(`💾 [Evaluation] Session sauvegardée: ${sessionData.score}/${sessionData.totalQuestions} (${sessionData.percentage}%)`);
    } catch (storageError) {
      console.error('❌ [Evaluation] Erreur stockage sécurisé:', storageError);
      // Fallback vers localStorage classique
      localStorage.setItem(EVALUATION_HISTORY_KEY, JSON.stringify(history));
    }
    
    return sessionEntry.id;
    
  } catch (error) {
    console.error('❌ [Evaluation] Erreur sauvegarde session:', error);
    return null;
  }
}

/**
 * Récupère l'historique complet des évaluations
 * @returns {Array} Historique des sessions d'évaluation
 */
function getEvaluationHistory() {
  try {
    const raw = localStorage.getItem(EVALUATION_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn('⚠️ [Evaluation] Erreur lecture historique:', error);
    return [];
  }
}

/**
 * Génère un ID unique pour la session
 * @returns {string} ID de session
 */
function generateSessionId() {
  return 'eval_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Récupère les statistiques de progression détaillées
 * @param {string} language - Langue concernée
 * @param {Array} themes - Thèmes à analyser (optionnel)
 * @returns {Object} Statistiques de progression
 */
function getProgressionStats(language, themes = null) {
  try {
    const history = getEvaluationHistory();
    
    // Filtre par langue et thèmes si spécifiés
    let relevantSessions = history.filter(session => session.language === language);
    if (themes && themes.length > 0) {
      relevantSessions = relevantSessions.filter(session => 
        session.themes && session.themes.some(theme => themes.includes(theme))
      );
    }
    
    if (relevantSessions.length === 0) {
      return { hasData: false, message: 'Aucune donnée de progression disponible' };
    }
    
    // Calcule les statistiques de progression
    const scores = relevantSessions.map(s => ({
      date: s.date,
      timestamp: s.timestamp,
      standardScore: s.percentage,
      weightedScore: s.weightedPercentage || s.percentage,
      duration: s.duration,
      questionsCount: s.totalQuestions
    }));
    
    // Trie par date (plus récent en dernier)
    scores.sort((a, b) => a.timestamp - b.timestamp);
    
    const latestScore = scores[scores.length - 1];
    const firstScore = scores[0];
    
    // Calcule la progression
    const standardProgression = formatPreciseScore(latestScore.standardScore - firstScore.standardScore, 2);
    const weightedProgression = formatPreciseScore(latestScore.weightedScore - firstScore.weightedScore, 2);
    
    // Moyenne mobile sur les 5 dernières sessions
    const recentSessions = scores.slice(-5);
    const avgRecentStandard = formatPreciseScore(
      recentSessions.reduce((sum, s) => sum + s.standardScore, 0) / recentSessions.length, 2
    );
    const avgRecentWeighted = formatPreciseScore(
      recentSessions.reduce((sum, s) => sum + s.weightedScore, 0) / recentSessions.length, 2
    );
    
    return {
      hasData: true,
      totalSessions: relevantSessions.length,
      dateRange: {
        first: new Date(firstScore.timestamp).toLocaleDateString('fr-FR'),
        last: new Date(latestScore.timestamp).toLocaleDateString('fr-FR')
      },
      progression: {
        standard: standardProgression,
        weighted: weightedProgression
      },
      current: {
        standard: latestScore.standardScore,
        weighted: latestScore.weightedScore
      },
      averageRecent: {
        standard: avgRecentStandard,
        weighted: avgRecentWeighted,
        sessionCount: recentSessions.length
      },
      trend: {
        improving: standardProgression > 0,
        stable: Math.abs(standardProgression) <= 2,
        declining: standardProgression < -2
      },
      allScores: scores // Pour graphiques potentiels
    };
    
  } catch (error) {
    console.error('❌ [Progression] Erreur calcul statistiques:', error);
    return { hasData: false, error: error.message };
  }
}

/**
 * Calcule la répartition des scores par thème
 * @param {Array} results - Résultats détaillés de l'évaluation
 * @returns {Object} Breakdown par thème
 */
function calculateThemeBreakdown(results) {
  const breakdown = {};
  
  results.forEach(result => {
    const theme = result.question.theme;
    if (!theme) return;
    
    if (!breakdown[theme]) {
      breakdown[theme] = { correct: 0, total: 0, percentage: 0 };
    }
    
    breakdown[theme].total++;
    if (result.isCorrect) {
      breakdown[theme].correct++;
    }
  });
  
  // Calcule les pourcentages avec précision
  Object.keys(breakdown).forEach(theme => {
    const data = breakdown[theme];
    data.percentage = calculatePrecisePercentage(data.correct, data.total, 2);
    data.precisePercentage = calculatePrecisePercentage(data.correct, data.total, 4); // Version très précise pour analytics
  });
  
  return breakdown;
}

/**
 * Calcule un score pondéré selon le type de question et la difficulté
 * @param {Array} results - Résultats de l'évaluation
 * @param {string} mode - Mode d'évaluation
 * @returns {Object} Score pondéré et métriques
 */
function calculateAdvancedScore(results, mode) {
  // Vérifications de sécurité
  if (!results || !Array.isArray(results) || results.length === 0) {
    console.warn('⚠️ [Evaluation] Résultats invalides pour le calcul du score avancé');
    return {
      weightedScore: 0,
      maxWeightedScore: 0,
      weightedPercentage: 0,
      difficultyFactor: 1.0,
      standardPercentage: 0
    };
  }
  
  let totalWeightedPoints = 0;
  let totalPossiblePoints = 0;
  
  results.forEach(result => {
    // Pondération selon le type de question
    let weight = 1.0; // Base
    
    switch(mode) {
      case 'libre':
        weight = 1.5; // Réponse libre = plus difficile
        break;
      case 'qcm_lang_fr':
        weight = 1.2; // Reconnaissance = moyennement difficile
        break;
      case 'qcm_fr_lang':
        weight = 1.0; // Production = difficulté de base
        break;
      default:
        weight = 1.0; // Défaut sécurisé
    }
    
    // Points obtenus pour cette question
    const questionPoints = result.isCorrect ? weight : 0;
    totalWeightedPoints += questionPoints;
    totalPossiblePoints += weight;
  });
  
  // Calcule le score pondéré avec précision
  const weightedPercentage = totalPossiblePoints > 0 ? 
    calculatePrecisePercentage(totalWeightedPoints, totalPossiblePoints, 2) : 0;
  
  // Métrique de difficulté globale avec précision
  const difficultyFactor = results.length > 0 ? 
    formatPreciseScore(totalPossiblePoints / results.length, 3) : 1.0;
  
  const correctCount = results.filter(r => r && r.isCorrect).length;
  const standardPercentage = results.length > 0 ? 
    calculatePrecisePercentage(correctCount, results.length, 2) : 0;
  
  return {
    weightedScore: formatPreciseScore(totalWeightedPoints, 3),
    maxWeightedScore: formatPreciseScore(totalPossiblePoints, 3),
    weightedPercentage: weightedPercentage,
    preciseWeightedPercentage: calculatePrecisePercentage(totalWeightedPoints, totalPossiblePoints, 4), // Version ultra-précise
    difficultyFactor: difficultyFactor,
    standardPercentage: standardPercentage,
    preciseStandardPercentage: calculatePrecisePercentage(correctCount, results.length, 4), // Version ultra-précise
    rawWeightedScore: totalWeightedPoints, // Score brut non arrondi
    rawMaxScore: totalPossiblePoints // Score max brut non arrondi
  };
}

/**
 * Synchronise les scores d'évaluation avec le système de révision
 * @param {Array} results - Résultats détaillés
 * @param {string} language - Langue évaluée
 */
function syncWithRevisionScores(results, language) {
  try {
    // Utilise les fonctions de revision.js si disponibles
    if (typeof getThemeScores === 'function' && typeof updateScoreForTheme === 'function') {
      console.log('🔗 [Evaluation] Synchronisation avec le système de révision');
      
      // Groupe les résultats par thème
      const themeResults = {};
      results.forEach(result => {
        const theme = result.question.theme;
        if (!theme) return;
        
        if (!themeResults[theme]) {
          themeResults[theme] = [];
        }
        themeResults[theme].push(result.isCorrect);
      });
      
      // Met à jour les scores de révision pour chaque thème
      Object.keys(themeResults).forEach(theme => {
        const themeAnswers = themeResults[theme];
        
        // Calcule le taux de réussite pour ce thème dans cette évaluation
        const successRate = themeAnswers.filter(correct => correct).length / themeAnswers.length;
        
        // Met à jour plusieurs fois selon le nombre de questions pour avoir un impact
        themeAnswers.forEach(isCorrect => {
          updateScoreForTheme(language, theme, isCorrect);
        });
        
        console.log(`📊 [Sync] Thème "${theme}": ${calculatePrecisePercentage(themeData.correct, themeData.total, 2)}% de réussite (précis: ${calculatePrecisePercentage(themeData.correct, themeData.total, 4)}%)`);
      });
      
    } else {
      console.log('⚠️ [Evaluation] Fonctions de révision non disponibles pour la synchronisation');
    }
  } catch (error) {
    console.error('❌ [Evaluation] Erreur synchronisation:', error);
  }
}

// Fonction utilitaire pour afficher le statut du cache
function getCacheStatus() {
  const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
  const cachedData = localStorage.getItem(CACHE_KEY);
  
  if (!timestamp || !cachedData) {
    return { status: 'empty', message: 'Aucun cache' };
  }
  
  const age = Date.now() - parseInt(timestamp);
  const remainingTime = CACHE_DURATION - age;
  
  if (remainingTime <= 0) {
    return { status: 'expired', message: 'Cache expiré' };
  }
  
  const remainingMinutes = Math.floor(remainingTime / (60 * 1000));
  return { 
    status: 'valid', 
    message: `Cache valide (${remainingMinutes} min restantes)`,
    remainingTime: remainingTime
  };
}

// Fonctions de gestion du cache
function getCachedData() {
  try {
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    const cachedData = localStorage.getItem(CACHE_KEY);
    
    if (!timestamp || !cachedData) {
      return null;
    }
    
    const age = Date.now() - parseInt(timestamp);
    if (age > CACHE_DURATION) {
      // Cache expiré, on le supprime
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      return null;
    }
    
    return JSON.parse(cachedData);
  } catch (error) {
    console.warn('Erreur lors de la lecture du cache:', error);
    return null;
  }
}

function setCachedData(data) {
  try {
    // Utilisation de SafeStorage pour la mise en cache
    SafeStorage.setItem(CACHE_KEY, data, { autoCleanup: true });
    SafeStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now(), { autoCleanup: true });
    console.log('✅ Données mises en cache pour 30 minutes avec SafeStorage');
  } catch (error) {
    console.warn('⚠️ Erreur SafeStorage, fallback localStorage:', error);
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (fallbackError) {
      console.error('❌ Erreur lors de la mise en cache (fallback):', fallbackError);
    }
  }
}

function loadSheetDBData() {
  return new Promise(async (resolve, reject) => {
    const cacheKey = 'sheetdb_data';
    
    // 1. Vérifier le cache global en mémoire
    if (sheetDBData) {
      console.log('📦 [Performance] Utilisation des données en mémoire');
      resolve(sheetDBData);
      return;
    }
    
    // 2. NOUVEAU: Vérifier le cache optimisé PerformanceOptimizer
    const optimizedCached = PerformanceOptimizer.getCacheItem(cacheKey);
    if (optimizedCached) {
      console.log('� [Performance] Cache optimisé utilisé');
      sheetDBData = optimizedCached;
      resolve(optimizedCached);
      return;
    }
    
    // 3. Fallback: Vérifier le cache localStorage legacy
    const cachedData = getCachedData();
    if (cachedData) {
      console.log('💾 [Performance] Cache legacy utilisé');
      sheetDBData = cachedData;
      // Migrer vers le cache optimisé
      PerformanceOptimizer.setCacheItem(cacheKey, cachedData, 30);
      resolve(cachedData);
      return;
    }
    
    // 4. Vérifier si les données sont déjà en cours de chargement
    if (window.sheetDBPromise) {
      console.log('⏳ [Performance] Utilisation du chargement en cours...');
      window.sheetDBPromise.then(resolve).catch(reject);
      return;
    }
    
    // 5. OPTIMISÉ: Charger depuis l'API avec retry et optimisations
    console.log('🌐 [Performance] Chargement optimisé depuis SheetDB');
    
    try {
      window.sheetDBPromise = PerformanceOptimizer.optimizedFetch(
        'https://sheetdb.io/api/v1/xg3dj9vsovufe',
        {
          timeout: 15000, // 15 secondes
          retries: 2,
          retryDelay: 2000 // 2 secondes
        }
      )
      .then(response => response.json())
      .then(data => {
        console.log('✅ [Performance] Données SheetDB chargées avec succès');
        sheetDBData = data;
        
        // Cache dans les deux systèmes
        setCachedData(data); // Legacy
        PerformanceOptimizer.setCacheItem(cacheKey, data, 30); // Optimisé
        
        window.sheetDBPromise = null;
        return data;
      })
      .catch(error => {
        console.error('❌ [Performance] Erreur chargement SheetDB:', error);
        window.sheetDBPromise = null;
        throw error;
      });
      
    } catch (error) {
      console.error('❌ [Performance] Erreur configuration requête:', error);
      reject(error);
      return;
    }
    
    window.sheetDBPromise.then(resolve).catch(reject);
  });
}

window.addEventListener('DOMContentLoaded', function() {
  const langSelectDiv = document.getElementById('langSelect');
  if (!langSelectDiv) return;

  function processData(data) {
    // Extrait toutes les langues uniques
    const langs = [...new Set(data.map(card => card.langue && card.langue.trim()).filter(Boolean))];
    // Sécurisation: Remplace innerHTML par création sécurisée
    langSelectDiv.innerHTML = '';
    const title = DOMUtils.createSafeElement('h2', {
      textContent: 'Sélectionnez la langue à étudier :'
    });
    langSelectDiv.appendChild(title);
    langs.forEach(lang => {
      const btn = document.createElement('button');
      btn.textContent = lang.charAt(0).toUpperCase() + lang.slice(1);
      btn.className = 'main-btn';
      btn.style.margin = '12px';
      btn.onclick = function() {
        window.selectedLang = lang;
        langSelectDiv.style.display = 'none';
        showModeSelection();
      };
      langSelectDiv.appendChild(btn);
    });
  }

  function showModeSelection() {
    const modeDiv = document.getElementById('modeSelectDiv');
    if (!modeDiv) return;
    modeDiv.style.display = '';
    // Sécurisation: Remplace innerHTML dangereux par création sécurisée
    modeDiv.innerHTML = '';
    
    const title = DOMUtils.createSafeElement('h2', {
      textContent: 'Choisissez le type d\'évaluation :'
    });
    
    const btn1 = DOMUtils.createSafeElement('button', {
      className: 'main-btn',
      textContent: 'QCM : mot français, choix langue étudiée',
      attributes: { 'data-mode': 'qcm_fr_lang' },
      style: { margin: '12px' }
    });
    
    const btn2 = DOMUtils.createSafeElement('button', {
      className: 'main-btn',
      textContent: 'QCM : mot langue étudiée, choix français',
      attributes: { 'data-mode': 'qcm_lang_fr' },
      style: { margin: '12px' }
    });
    
    const btn3 = DOMUtils.createSafeElement('button', {
      className: 'main-btn', 
      textContent: 'Réponse libre : mot langue étudiée',
      attributes: { 'data-mode': 'libre' },
      style: { margin: '12px' }
    });
    
    modeDiv.appendChild(title);
    modeDiv.appendChild(btn1);
    modeDiv.appendChild(btn2);
    modeDiv.appendChild(btn3);
    Array.from(modeDiv.querySelectorAll('button')).forEach(btn => {
      btn.onclick = function() {
        window.selectedEvalMode = btn.getAttribute('data-mode');
        modeDiv.style.display = 'none';
        showThemeSelection();
      };
    });
  }

  function showThemeSelection() {
    const themeDiv = document.getElementById('themeSelect');
    if (!themeDiv) return;
    themeDiv.style.display = '';
    
    // Ré-affiche le bouton "Retour" du HTML
    const htmlReturnBtn = document.querySelector('button[onclick*="index.html"]');
    if (htmlReturnBtn) htmlReturnBtn.style.display = '';
    // Sécurisation: Remplace innerHTML par création sécurisée
    themeDiv.innerHTML = '';
    const title = DOMUtils.createSafeElement('h2', { 
      textContent: 'Choisissez un ou plusieurs thèmes :' 
    });
    themeDiv.appendChild(title);

    // Ajout de la barre de recherche et des options d'affichage
    const controlsContainer = DOMUtils.createSafeElement('div', {
      style: { 
        display: 'flex', 
        gap: '12px', 
        alignItems: 'center', 
        marginBottom: '12px',
        flexWrap: 'wrap'
      }
    });
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'form-input';
    searchInput.placeholder = 'Rechercher un thème...';
    searchInput.style.flex = '1';
    searchInput.style.minWidth = '200px';
    
    // Bouton pour basculer l'affichage des scores
    const scoreDisplayBtn = DOMUtils.createSafeElement('button', {
      className: 'nav-btn',
      textContent: '📊 % → /10',
      style: {
        fontSize: '0.85em',
        padding: '8px 12px',
        whiteSpace: 'nowrap'
      }
    });
    
    // Variable pour tracker le mode d'affichage (true = pourcentage, false = sur 10)
    let displayAsPercentage = true;
    
    controlsContainer.appendChild(searchInput);
    controlsContainer.appendChild(scoreDisplayBtn);
    themeDiv.appendChild(controlsContainer);

    // Légende des couleurs
    const legend = DOMUtils.createSafeElement('div', {
      style: {
        fontSize: '0.8em',
        color: '#666',
        marginBottom: '8px',
        padding: '8px',
        background: 'rgba(102, 126, 234, 0.1)',
        borderRadius: '6px',
        textAlign: 'center'
      }
    });
    legend.innerHTML = '🏆 Excellent (80%+) | ⭐ Bon (60%+) | 📈 En progression (40%+) | 💪 À travailler (<40%) | 🆕 Nouveau';
    themeDiv.appendChild(legend);
    
    // Ajout d'un conteneur scrollable pour les thèmes
    const scrollContainer = document.createElement('div');
    scrollContainer.style.maxHeight = '220px';
    scrollContainer.style.overflowY = 'auto';
    scrollContainer.style.border = '1px solid #eee';
    scrollContainer.style.borderRadius = '8px';
    scrollContainer.style.padding = '8px';
    scrollContainer.style.background = '#fafafa';
    scrollContainer.style.marginBottom = '12px';
    themeDiv.appendChild(scrollContainer);

    // Récupère les thèmes de la langue sélectionnée
    const rawThemes = [...new Set(sheetDBData
      .filter(card => card.langue && card.langue.trim() === window.selectedLang)
      .map(card => card.theme && card.theme.trim())
      .filter(Boolean)
    )];
    
    // Trie les thèmes par performance (ordre croissant - les plus faibles en premier)
    const themes = rawThemes.sort((themeA, themeB) => {
      // Utilise les scores formatés pour un tri cohérent
      const scoreDataA = getThemeScoreFormats(window.selectedLang, themeA);
      const scoreDataB = getThemeScoreFormats(window.selectedLang, themeB);
      
      // Les thèmes sans score (null) sont placés en premier (priorité max)
      if (!scoreDataA && !scoreDataB) return themeA.localeCompare(themeB);
      if (!scoreDataA) return -1; // themeA avant themeB
      if (!scoreDataB) return 1;  // themeB avant themeA
      
      // Tri par pourcentage croissant (plus faibles en premier pour révision prioritaire)
      return scoreDataA.percentage - scoreDataB.percentage;
    });
    
    console.log('📊 [Evaluation] Thèmes triés par performance:', themes.map(theme => {
      const scoreData = getThemeScoreFormats(window.selectedLang, theme);
      return scoreData ? 
        `${theme} (${scoreData.percentage}% - ${scoreData.outOf10}/10)` : 
        `${theme} (nouveau)`;
    }));

    // Stocke les thèmes cochés (persistant sur toute la sélection)
    let checkedThemes = [];

    // Fonction pour afficher les thèmes filtrés
    function renderThemeCheckboxes(filteredThemes) {
      // Sécurisation: Supprime les anciens checkboxes
      scrollContainer.innerHTML = '';
      filteredThemes.forEach(theme => {
        const label = DOMUtils.createSafeElement('label', {
          style: { display: 'block', marginBottom: '6px' }
        });
        const checkbox = DOMUtils.createSafeElement('input', {
          attributes: {
            type: 'checkbox',
            value: theme
          }
        });
        if (checkedThemes.includes(theme)) checkbox.checked = true;
        checkbox.onchange = function() {
          if (checkbox.checked) {
            if (!checkedThemes.includes(theme)) checkedThemes.push(theme);
          } else {
            checkedThemes = checkedThemes.filter(t => t !== theme);
          }
          updateQuestionCountDefault();
        };
        // Ajoute le tooltip avec le nombre de mots ET la note du thème
        const wordCount = sheetDBData.filter(card =>
          card.langue && card.langue.trim() === window.selectedLang &&
          card.theme && card.theme.trim() === theme
        ).length;
        
        // Récupère le score du thème avec différents formats
        const themeScoreData = getThemeScoreFormats(window.selectedLang, theme);
        
        // Construit le tooltip avec mots + note
        let tooltipText = `${wordCount} mot${wordCount > 1 ? 's' : ''} dans ce thème`;
        if (themeScoreData !== null) {
          // Ajoute la note avec un emoji selon le niveau (basé sur le pourcentage)
          const percentage = themeScoreData.percentage;
          let scoreEmoji = '📖'; // Par défaut
          if (percentage >= 80) scoreEmoji = '🏆'; // Excellent
          else if (percentage >= 60) scoreEmoji = '⭐'; // Bon
          else if (percentage >= 40) scoreEmoji = '📈'; // En progression
          else scoreEmoji = '💪'; // À travailler
          
          tooltipText += `\n${scoreEmoji} Performance: ${percentage}% (${themeScoreData.outOf10}/10)`;
        } else {
          tooltipText += '\n🆕 Nouveau thème (pas encore évalué)';
        }
        
        // Sécurisation: Échappe le contenu du tooltip
        label.title = DOMUtils.escapeHtml(tooltipText);
        label.appendChild(checkbox);
        
        // Construit l'affichage du thème avec emoji de score
        let displayText = ' ' + DOMUtils.escapeHtml(theme);
        let labelStyle = 'color: #333;'; // Style par défaut
        
        if (themeScoreData !== null) {
          const percentage = themeScoreData.percentage;
          let emoji = '📖';
          
          // Utilise des seuils basés sur les pourcentages (plus cohérent)
          if (percentage >= 80) {
            emoji = '🏆';
            labelStyle = 'color: #22c55e; font-weight: 500;'; // Vert pour excellent (80%+)
          } else if (percentage >= 60) {
            emoji = '⭐';
            labelStyle = 'color: #3b82f6; font-weight: 500;'; // Bleu pour bon (60%+)
          } else if (percentage >= 40) {
            emoji = '📈';
            labelStyle = 'color: #f59e0b; font-weight: 500;'; // Orange pour progression (40%+)
          } else {
            emoji = '💪';
            labelStyle = 'color: #ef4444; font-weight: 500;'; // Rouge pour à travailler (<40%)
          }
          
          // Affichage selon le mode sélectionné
          if (displayAsPercentage) {
            displayText = ` ${emoji} ${DOMUtils.escapeHtml(theme)} (${percentage}%)`;
          } else {
            displayText = ` ${emoji} ${DOMUtils.escapeHtml(theme)} (${themeScoreData.outOf10}/10)`;
          }
        } else {
          displayText = ` 🆕 ${DOMUtils.escapeHtml(theme)} (nouveau)`;
          labelStyle = 'color: #6b7280; font-style: italic;'; // Gris pour nouveau
        }
        
        // Applique le style au label
        label.style.cssText += labelStyle;
        
        // Sécurisation: Utilise textContent au lieu de concaténation directe
        const themeText = document.createTextNode(displayText);
        label.appendChild(themeText);
        scrollContainer.appendChild(label);
      });
      updateQuestionCountDefault();
    }

    // Ajout du sélecteur du nombre de questions
    const questionCountDiv = document.getElementById('questionCountDiv');
    if (questionCountDiv) {
      questionCountDiv.style.display = '';
      questionCountDiv.querySelector('#questionCount').value = 1; // Valeur par défaut
    }

    // Fonction pour mettre à jour le nombre de questions par défaut
    function updateQuestionCountDefault() {
      if (!questionCountDiv) return;
      // Calcule la somme des mots dans les thèmes cochés
      let totalWords = 0;
      checkedThemes.forEach(theme => {
        totalWords += sheetDBData.filter(card =>
          card.langue && card.langue.trim() === window.selectedLang &&
          card.theme && card.theme.trim() === theme
        ).length;
      });
      // Met à jour la valeur par défaut
      const questionCountInput = questionCountDiv.querySelector('#questionCount');
      questionCountInput.value = totalWords || 1;
      questionCountInput.max = totalWords || 1;
    }

    // Affiche tous les thèmes au départ
    renderThemeCheckboxes(themes);

    // Event listener pour basculer l'affichage des scores
    scoreDisplayBtn.onclick = function() {
      displayAsPercentage = !displayAsPercentage;
      scoreDisplayBtn.textContent = displayAsPercentage ? '📊 % → /10' : '📊 /10 → %';
      
      // Re-rend les thèmes avec le nouveau format
      const currentSearch = searchInput.value.trim().toLowerCase();
      const filtered = themes.filter(theme => theme.toLowerCase().includes(currentSearch));
      renderThemeCheckboxes(filtered);
    };
    
    // Filtre les thèmes à chaque saisie
    searchInput.oninput = function() {
      const search = searchInput.value.trim().toLowerCase();
      const filtered = themes.filter(theme => theme.toLowerCase().includes(search));
      renderThemeCheckboxes(filtered);
    };

    // Bouton pour valider la sélection des thèmes
    let nextBtn = document.createElement('button');
    nextBtn.textContent = 'Valider les thèmes';
    nextBtn.className = 'main-btn';
    nextBtn.style.marginTop = '18px';
    nextBtn.onclick = function() {
      window.selectedThemes = checkedThemes.slice();
      if (!window.selectedThemes || window.selectedThemes.length === 0) {
        alert('Veuillez sélectionner au moins un thème.');
        return;
      }
      // Récupère le nombre de questions choisi
      const questionCountInput = questionCountDiv ? questionCountDiv.querySelector('#questionCount') : null;
      window.selectedQuestionCount = questionCountInput ? parseInt(questionCountInput.value) || 1 : 1;
      themeDiv.style.display = 'none';
      if (questionCountDiv) questionCountDiv.style.display = 'none';
      showSummaryScreen();
    };

    // Place le bouton sous le choix du nombre de questions (en bloc séparé)
    if (questionCountDiv) {
      // Ajoute un conteneur pour le bouton sous le div questionCountDiv
      let btnContainer = document.createElement('div');
      btnContainer.id = 'themeValidationBtnContainer';
      btnContainer.style.width = '100%';
      btnContainer.style.textAlign = 'center';
      btnContainer.appendChild(nextBtn);
      questionCountDiv.parentNode.insertBefore(btnContainer, questionCountDiv.nextSibling);
    } else {
      themeDiv.appendChild(nextBtn);
    }
  }

  function showSummaryScreen() {
    // Nettoie tous les anciens résumés et TOUS les anciens boutons du DOM
    const parent = DOMUtils.safeQuery('.container');
    if (parent) {
      Array.from(parent.querySelectorAll('#evalSummaryDiv')).forEach(div => div.remove());
    }
    Array.from(document.querySelectorAll('#backEvalBtn')).forEach(btn => btn.remove());
    
    // Nettoie le conteneur de boutons de validation des thèmes
    const themeValidationContainer = DOMUtils.safeQuery('#themeValidationBtnContainer');
    if (themeValidationContainer && themeValidationContainer.parentNode) {
      themeValidationContainer.remove();
    }

    // Crée le conteneur du résumé
    let summaryDiv = document.createElement('div');
    summaryDiv.id = 'evalSummaryDiv';
    summaryDiv.className = 'form-group';
    summaryDiv.style.margin = '32px auto';
    summaryDiv.style.maxWidth = '420px';
    summaryDiv.style.background = '#f8f8f8';
    summaryDiv.style.borderRadius = '12px';
    summaryDiv.style.padding = '24px';
    summaryDiv.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)';
    parent.appendChild(summaryDiv);

    // Masque tous les autres écrans
    if (langSelectDiv) langSelectDiv.style.display = 'none';
    const modeDiv = document.getElementById('modeSelectDiv');
    if (modeDiv) modeDiv.style.display = 'none';
    const themeDiv = document.getElementById('themeSelect');
    if (themeDiv) themeDiv.style.display = 'none';
    const questionCountDiv = document.getElementById('questionCountDiv');
    if (questionCountDiv) questionCountDiv.style.display = 'none';
    
    // Masque le bouton "Retour" du HTML pour éviter la duplication
    const htmlReturnBtn = document.querySelector('button[onclick*="index.html"]');
    if (htmlReturnBtn) htmlReturnBtn.style.display = 'none';

    // Sécurisation: Remplace innerHTML dangereux par création sécurisée
    summaryDiv.innerHTML = '';
    
    const title = DOMUtils.createSafeElement('h2', {
      textContent: 'Résumé de l\'évaluation',
      style: { marginBottom: '18px' }
    });
    
    const langDiv = DOMUtils.createSafeElement('div');
    langDiv.innerHTML = '<b>Langue étudiée :</b> ';
    const langText = DOMUtils.escapeHtml(window.selectedLang ? window.selectedLang.charAt(0).toUpperCase() + window.selectedLang.slice(1) : '');
    langDiv.appendChild(document.createTextNode(langText));
    
    const modeInfoDiv = DOMUtils.createSafeElement('div', {
      style: { marginTop: '8px' }
    });
    modeInfoDiv.innerHTML = '<b>Mode :</b> ';
    const modeText = window.selectedEvalMode === 'qcm_fr_lang' ? 'QCM : mot français, choix langue étudiée' :
      window.selectedEvalMode === 'qcm_lang_fr' ? 'QCM : mot langue étudiée, choix français' :
      window.selectedEvalMode === 'libre' ? 'Réponse libre : mot langue étudiée' : '';
    modeInfoDiv.appendChild(document.createTextNode(DOMUtils.escapeHtml(modeText)));
    
    const themesDiv = DOMUtils.createSafeElement('div', {
      style: { marginTop: '8px' }
    });
    themesDiv.innerHTML = '<b>Thèmes :</b> ';
    const themesText = window.selectedThemes ? window.selectedThemes.join(', ') : '';
    themesDiv.appendChild(document.createTextNode(DOMUtils.escapeHtml(themesText)));
    
    const countDiv = DOMUtils.createSafeElement('div', {
      style: { marginTop: '8px' }
    });
    countDiv.innerHTML = '<b>Nombre de questions :</b> ';
    countDiv.appendChild(document.createTextNode(String(window.selectedQuestionCount || 1)));
    
    const startBtn = DOMUtils.createSafeElement('button', {
      attributes: { id: 'startEvalBtn' },
      className: 'main-btn',
      textContent: 'Démarrer l\'évaluation',
      style: { marginTop: '24px', width: '100%' }
    });
    
    const backBtn = DOMUtils.createSafeElement('button', {
      attributes: { id: 'backEvalBtn' },
      className: 'main-btn', 
      textContent: 'Retour',
      style: { marginTop: '16px', width: '100%' }
    });
    
    summaryDiv.appendChild(title);
    summaryDiv.appendChild(langDiv);
    summaryDiv.appendChild(modeInfoDiv);
    summaryDiv.appendChild(themesDiv);
    summaryDiv.appendChild(countDiv);
    summaryDiv.appendChild(startBtn);
    summaryDiv.appendChild(backBtn);
    summaryDiv.style.display = '';

    document.getElementById('startEvalBtn').onclick = function() {
      summaryDiv.style.display = 'none';
      startEvaluation();
    };

    document.getElementById('backEvalBtn').onclick = function() {
      summaryDiv.style.display = 'none';
      showThemeSelection();
    };
  }

  // Affiche le statut du cache au démarrage
  const cacheStatus = getCacheStatus();
  console.log(`📊 Statut cache SheetDB: ${cacheStatus.message}`);
  
  // Chargement optimisé des données avec cache
  loadSheetDBData()
    .then(data => {
      processData(data);
    })
    .catch(error => {
      console.error('Impossible de charger les données:', error);
      langSelectDiv.innerHTML = `
        <div style="text-align: center; padding: 20px; background: rgba(239, 68, 68, 0.1); border-radius: 12px; border: 2px solid rgba(239, 68, 68, 0.3); color: #dc2626;">
          <h3>❌ Erreur de chargement</h3>
          <p>Impossible de charger les données.</p>
          <button class="nav-btn" onclick="location.reload()" style="margin-top: 12px;">
            🔄 Réessayer
          </button>
        </div>
      `;
    });
}); // <-- Fin correcte de window.addEventListener

// ========== LOGIQUE D'ÉVALUATION ==========

// Variables globales pour l'évaluation
let evaluationQuestions = [];
let currentQuestionIndex = 0;
let evaluationResults = [];
let evaluationStartTime = null;
let questionStartTime = null;

function startEvaluation() {
  // VALIDATION DES DONNÉES D'ÉVALUATION
  const evalData = {
    mode: window.selectedEvalMode,
    language: window.selectedLang,
    themes: window.selectedThemes,
    questionCount: window.selectedQuestionCount
  };
  
  const validation = DataValidator.validateEvaluationData(evalData);
  
  if (!validation.isValid) {
    console.error('❌ [Evaluation] Données invalides:', validation.results);
    DOMUtils.createModal({
      title: '❌ Erreur de validation',
      content: 'Les paramètres d\'évaluation sont invalides. Veuillez recommencer.',
      type: 'error',
      closeButton: true
    });
    return;
  }
  
  // Utilise les données validées et sanitizées
  const sanitizedData = validation.sanitizedData;
  window.selectedEvalMode = sanitizedData.mode;
  window.selectedLang = sanitizedData.language;
  window.selectedThemes = sanitizedData.themes;
  window.selectedQuestionCount = sanitizedData.questionCount;
  
  console.log('✅ [Evaluation] Données validées:', sanitizedData);
  
  // Démarrage du chrono de session
  evaluationStartTime = Date.now();
  console.log('⏱️ [Evaluation] Session démarrée');
  
  // Étape 1 : Préparer les données de questions
  prepareEvaluationData();
  
  // Étape 2 : Initialiser l'interface d'évaluation
  initEvaluationInterface();
  
  // Étape 3 : Afficher la première question
  showQuestion(0);
}

function prepareEvaluationData() {
  // Détermine la clé de langue (comme dans revision.js)
  let langKey = window.selectedLang === 'anglais' ? 'en' : 
               (window.selectedLang === 'japonais' ? 'ja' : window.selectedLang);
  
  // Debug: affichons la structure des données
  console.log('Données SheetDB:', sheetDBData ? sheetDBData.slice(0, 2) : 'null');
  console.log('Langue sélectionnée:', window.selectedLang, '→ clé:', langKey);
  console.log('Thèmes sélectionnés:', window.selectedThemes);
  
  // Filtre les cartes selon les thèmes sélectionnés et la langue
  const filteredCards = sheetDBData.filter(card => {
    // Vérifie chaque condition avec les bons noms de colonnes
    const langueOk = card.langue && card.langue.trim() === window.selectedLang;
    const themeOk = card.theme && window.selectedThemes.includes(card.theme.trim());
    const francaisOk = card.fr && card.fr.trim();
    const traductionOk = card[langKey] && card[langKey].trim();
    
    return langueOk && themeOk && francaisOk && traductionOk;
  });
  
  console.log('Cartes filtrées:', filteredCards.length);
  
  // CORRECTION: Éliminer les doublons basés sur le contenu des mots
  const uniqueCards = [];
  const seenWords = new Set();
  
  // Détermine la clé principale selon le mode d'évaluation
  const primaryKey = window.selectedEvalMode === 'qcm_lang_fr' || window.selectedEvalMode === 'libre' ? 
    langKey : 'fr'; // Si on part de la langue étrangère vers français, ou réponse libre
  
  filteredCards.forEach(card => {
    const primaryWord = card[primaryKey]?.trim().toLowerCase();
    const secondaryWord = card[primaryKey === 'fr' ? langKey : 'fr']?.trim().toLowerCase();
    
    // Crée une clé unique basée sur les deux mots (dans les deux sens)
    const uniqueKey1 = `${primaryWord}-${secondaryWord}`;
    const uniqueKey2 = `${secondaryWord}-${primaryWord}`;
    
    // Vérifie qu'aucune des deux combinaisons n'a déjà été vue
    if (!seenWords.has(uniqueKey1) && !seenWords.has(uniqueKey2) && 
        primaryWord && secondaryWord) {
      seenWords.add(uniqueKey1);
      seenWords.add(uniqueKey2);
      uniqueCards.push(card);
    }
  });
  
  console.log(`📝 [Evaluation] Cartes uniques: ${uniqueCards.length} (éliminé ${filteredCards.length - uniqueCards.length} doublons)`);
  
  // Mélange aléatoirement les cartes uniques
  const shuffledCards = [...uniqueCards].sort(() => Math.random() - 0.5);
  
  // Prend le nombre de questions demandé
  const availableQuestions = Math.min(window.selectedQuestionCount, uniqueCards.length);
  evaluationQuestions = shuffledCards.slice(0, availableQuestions);
  
  // Avertissement si moins de questions que demandé
  if (window.selectedQuestionCount > uniqueCards.length) {
    console.warn(`⚠️ [Evaluation] Seulement ${uniqueCards.length} mots uniques disponibles pour ${window.selectedQuestionCount} questions demandées`);
    // Optionnel: afficher un message à l'utilisateur
    if (window.selectedQuestionCount - uniqueCards.length > 0) {
      const message = `ℹ️ Attention: Seulement ${uniqueCards.length} mots uniques disponibles dans les thèmes sélectionnés.\n` +
        `L'évaluation comportera ${availableQuestions} questions au lieu de ${window.selectedQuestionCount} demandées.`;
      
      // Affiche le message mais continue l'évaluation
      setTimeout(() => {
        if (confirm(message + '\n\nContinuer avec ' + availableQuestions + ' questions ?')) {
          // Continue normalement
        } else {
          // Retourne à la sélection des thèmes
          location.reload();
        }
      }, 100);
    }
  }
  
  // Stocke la clé de langue pour usage ultérieur
  window.currentLangKey = langKey;
  
  // Initialise les variables d'évaluation
  currentQuestionIndex = 0;
  evaluationResults = [];
  
  console.log(`Évaluation préparée: ${evaluationQuestions.length} questions`);
}

function initEvaluationInterface() {
  const parent = DOMUtils.safeQuery('.container');
  if (!parent) {
    console.error('❌ [Evaluation] Conteneur parent non trouvé');
    return;
  }
  
  // Nettoie l'interface précédente
  const existingEvalDiv = DOMUtils.safeQuery('#evaluationInterface');
  if (existingEvalDiv && existingEvalDiv.parentNode) {
    existingEvalDiv.remove();
  }
  
  // Crée l'interface d'évaluation
  const evalDiv = document.createElement('div');
  evalDiv.id = 'evaluationInterface';
  // Sécurisation: Remplace innerHTML dangereux par création sécurisée
  const progressBar = DOMUtils.createSafeElement('div', {
    attributes: { id: 'progressBar' },
    style: { marginBottom: '24px' }
  });
  
  const progressCounter = DOMUtils.createSafeElement('div', {
    style: { fontSize: '1.1em', marginBottom: '8px', textAlign: 'center' }
  });
  
  const questionCounterSpan = DOMUtils.createSafeElement('span', {
    attributes: { id: 'questionCounter' },
    textContent: `Question 1/${evaluationQuestions.length}`
  });
  
  const progressContainer = DOMUtils.createSafeElement('div', {
    style: { 
      background: '#eee', 
      borderRadius: '10px', 
      height: '8px', 
      marginBottom: '16px' 
    }
  });
  
  const progressFill = DOMUtils.createSafeElement('div', {
    attributes: { id: 'progressFill' },
    style: {
      background: '#4CAF50',
      height: '100%',
      borderRadius: '10px',
      width: `${100/evaluationQuestions.length}%`,
      transition: 'width 0.3s ease'
    }
  });
  
  progressCounter.appendChild(questionCounterSpan);
  progressContainer.appendChild(progressFill);
  progressBar.appendChild(progressCounter);
  progressBar.appendChild(progressContainer);
  evalDiv.appendChild(progressBar);
  
  // Sécurisation: Création sécurisée des éléments restants
  const questionCard = DOMUtils.createSafeElement('div', {
    attributes: { id: 'questionCard' },
    className: 'flashcard',
    style: {
      marginBottom: '24px',
      padding: '24px',
      background: '#f8f9fa',
      borderRadius: '12px',
      textAlign: 'center'
    }
  });
  
  const questionText = DOMUtils.createSafeElement('div', {
    attributes: { id: 'questionText' },
    style: {
      fontSize: '1.4em',
      marginBottom: '20px',
      color: '#333'
    }
  });
  
  const questionContent = DOMUtils.createSafeElement('div', {
    attributes: { id: 'questionContent' }
  });
  
  questionCard.appendChild(questionText);
  questionCard.appendChild(questionContent);
  
  const answerSection = DOMUtils.createSafeElement('div', {
    attributes: { id: 'answerSection' },
    style: { marginBottom: '24px' }
  });
  
  const feedbackSection = DOMUtils.createSafeElement('div', {
    attributes: { id: 'feedbackSection' },
    style: { marginBottom: '24px', minHeight: '60px' }
  });
  
  const navigationSection = DOMUtils.createSafeElement('div', {
    attributes: { id: 'navigationSection' },
    style: { textAlign: 'center' }
  });
  
  const validateBtn = DOMUtils.createSafeElement('button', {
    attributes: { id: 'validateBtn' },
    className: 'main-btn',
    textContent: 'Valider',
    style: { marginRight: '12px' }
  });
  
  const nextBtn = DOMUtils.createSafeElement('button', {
    attributes: { id: 'nextQuestionBtn' },
    className: 'main-btn',
    textContent: 'Question suivante',
    style: { display: 'none' }
  });
  
  const finishBtn = DOMUtils.createSafeElement('button', {
    attributes: { id: 'finishEvalBtn' },
    className: 'main-btn', 
    textContent: 'Voir les résultats',
    style: { display: 'none' }
  });
  
  navigationSection.appendChild(validateBtn);
  navigationSection.appendChild(nextBtn);
  navigationSection.appendChild(finishBtn);
  
  const cancelDiv = DOMUtils.createSafeElement('div', {
    style: {
      textAlign: 'center',
      marginTop: '20px',
      borderTop: '2px solid rgba(102, 126, 234, 0.1)',
      paddingTop: '20px'
    }
  });
  
  const cancelBtn = DOMUtils.createSafeElement('button', {
    attributes: { id: 'cancelEvalBtn' },
    className: 'nav-btn',
    textContent: '❌ Annuler l\'évaluation',
    style: {
      background: 'rgba(239, 68, 68, 0.1)',
      borderColor: 'rgba(239, 68, 68, 0.3)',
      color: '#dc2626',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
      position: 'relative',
      zIndex: '10',
      pointerEvents: 'auto',
      padding: '12px 24px',
      border: '2px solid rgba(239, 68, 68, 0.3)',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: 'bold'
    }
  });
  
  cancelDiv.appendChild(cancelBtn);
  
  console.log('🔨 [Debug] Bouton d\'annulation créé avec ID:', cancelBtn.id);
  
  // Event listener principal avec addEventListener (plus fiable)
  cancelBtn.addEventListener('click', function(e) {
    console.log('🖱️ [Debug] Clic détecté sur le bouton d\'annulation');
    console.log('🔍 [Debug] Fonction cancelEvaluation disponible:', typeof cancelEvaluation);
    console.log('🎯 [Debug] Event details:', e);
    
    // Empêche la propagation et le comportement par défaut
    e.preventDefault();
    e.stopPropagation();
    
    try {
      cancelEvaluation();
    } catch (error) {
      console.error('❌ [Debug] Erreur lors de l\'exécution de cancelEvaluation:', error);
      alert('Erreur: ' + error.message);
    }
  });
  
  // Event listener de secours avec onclick
  cancelBtn.onclick = function(e) {
    console.log('🎯 [Debug] Onclick event listener activé en secours');
    return false; // Pour empêcher le comportement par défaut
  };
  
  console.log('🔨 [Debug] Event listeners attachés au bouton');
  
  evalDiv.appendChild(questionCard);
  evalDiv.appendChild(answerSection);
  evalDiv.appendChild(feedbackSection);
  evalDiv.appendChild(navigationSection);
  evalDiv.appendChild(cancelDiv);
  
  parent.appendChild(evalDiv);
  
  // Vérification post-création que le bouton est bien dans le DOM
  setTimeout(() => {
    const btnCheck = document.getElementById('cancelEvalBtn');
    console.log('✅ [Debug] Vérification bouton dans DOM:', btnCheck ? 'TROUVÉ' : 'NON TROUVÉ');
    if (btnCheck) {
      console.log('✅ [Debug] Style du bouton:', window.getComputedStyle(btnCheck).display);
      console.log('✅ [Debug] Position du bouton:', btnCheck.getBoundingClientRect());
    }
  }, 100);
}

function showFeedback(isCorrect, correctAnswer, question) {
  const feedbackSection = document.getElementById('feedbackSection');
  
  if (isCorrect) {
    feedbackSection.innerHTML = `
      <div style="background: #d4edda; color: #155724; padding: 16px; border-radius: 8px; text-align: center;">
        <div style="font-size: 1.2em; font-weight: bold; margin-bottom: 8px;">✅ Correct !</div>
        <div>Bien joué ! "${correctAnswer}" est la bonne réponse.</div>
      </div>
    `;
  } else {
    feedbackSection.innerHTML = `
      <div style="background: #f8d7da; color: #721c24; padding: 16px; border-radius: 8px; text-align: center;">
        <div style="font-size: 1.2em; font-weight: bold; margin-bottom: 8px;">❌ Incorrect</div>
        <div style="margin-bottom: 8px;">La bonne réponse était : <strong>"${correctAnswer}"</strong></div>
        ${question.theme ? `<div style="font-size: 0.9em; opacity: 0.8;">Thème : ${question.theme}</div>` : ''}
      </div>
    `;
  }
}

function validateAnswer(userAnswer, correctAnswer, question) {
  // Normalise les réponses pour la comparaison (réponse libre)
  const normalizeText = (text) => {
    return text.toLowerCase()
      .trim()
      .replace(/[.,;:!?]/g, '') // Supprime la ponctuation
      .replace(/\s+/g, ' '); // Normalise les espaces
  };
  
  let isCorrect;
  if (window.selectedEvalMode === 'libre') {
    // Pour la réponse libre, on accepte des variantes
    const normalizedUser = normalizeText(userAnswer);
    const normalizedCorrect = normalizeText(correctAnswer);
    isCorrect = normalizedUser === normalizedCorrect;
  } else {
    // Pour les QCM, comparaison exacte
    isCorrect = userAnswer === correctAnswer;
  }
  
  // Calcule le temps de réponse
  const responseTime = questionStartTime ? Date.now() - questionStartTime : null;
  
  // Stocke le résultat
  evaluationResults.push({
    question: question,
    userAnswer: userAnswer,
    correctAnswer: correctAnswer,
    isCorrect: isCorrect,
    mode: window.selectedEvalMode,
    responseTime: responseTime
  });
  
  // Affiche le feedback
  showFeedback(isCorrect, correctAnswer, question);
  
  // Masque le bouton "Valider" et affiche le bouton "Suivant" (sécurisé)
  const validateBtn = DOMUtils.safeQuery('#validateBtn');
  if (validateBtn) validateBtn.style.display = 'none';
  
  if (currentQuestionIndex < evaluationQuestions.length - 1) {
    const nextBtn = DOMUtils.safeQuery('#nextQuestionBtn');
    if (nextBtn) {
      nextBtn.style.display = '';
      // Event listener direct pour la navigation
      nextBtn.onclick = function() {
        showQuestion(currentQuestionIndex + 1);
      };
    }
  } else {
    const finishBtn = DOMUtils.safeQuery('#finishEvalBtn');
    if (finishBtn) {
      finishBtn.style.display = '';
      // Event listener direct pour les résultats
      finishBtn.onclick = function() {
        showEvaluationResults();
      };
    }
  }
  
  // Désactive les boutons de choix pour éviter les modifications (sécurisé)
  document.querySelectorAll('#answerSection .main-btn, #freeResponseInput').forEach(element => {
    element.disabled = true;
    if (element.tagName === 'BUTTON') {
      element.style.opacity = '0.7';
    }
  });
}

function showEvaluationResults() {
  console.log('🎯 [Evaluation] Affichage des résultats commencé');
  
  try {
    const parent = DOMUtils.safeQuery('.container');
    if (!parent) {
      console.error('❌ [Evaluation] Conteneur parent non trouvé');
      return;
    }
    
    // Nettoie l'interface d'évaluation
    const evalInterface = DOMUtils.safeQuery('#evaluationInterface');
    if (evalInterface && evalInterface.parentNode) {
      evalInterface.remove();
    }
    
    // Vérifie que nous avons des résultats
    if (!evaluationResults || evaluationResults.length === 0) {
      console.error('❌ [Evaluation] Aucun résultat d\'évaluation trouvé');
      return;
    }
    
    console.log(`📊 [Evaluation] Traitement de ${evaluationResults.length} résultats`);
    
    // Calcule les statistiques avancées avec précision
    const totalQuestions = evaluationResults.length;
    const correctAnswers = evaluationResults.filter(r => r.isCorrect).length;
    const scorePercent = calculatePrecisePercentage(correctAnswers, totalQuestions, 2);
    const preciseScorePercent = calculatePrecisePercentage(correctAnswers, totalQuestions, 4);
    
    console.log(`📈 [Evaluation] Score calculé: ${correctAnswers}/${totalQuestions} (${scorePercent}%)`);
    
    // Calcule le score pondéré
    const advancedScore = calculateAdvancedScore(evaluationResults, window.selectedEvalMode);
    console.log('⚖️ [Evaluation] Score pondéré calculé:', advancedScore);
    
    // Synchronise avec les scores de révision
    syncWithRevisionScores(evaluationResults, window.selectedLang);
  
    // Calcule d'abord le breakdown par thème
    const themeBreakdown = calculateThemeBreakdown(evaluationResults);
    
    // Prépare les données de session pour sauvegarde
    const sessionData = {
      language: window.selectedLang,
      mode: window.selectedEvalMode,
      themes: window.selectedThemes,
      totalQuestions: totalQuestions,
      correctAnswers: correctAnswers,
      score: correctAnswers,
      percentage: scorePercent,
      weightedPercentage: advancedScore.weightedPercentage,
      difficultyFactor: advancedScore.difficultyFactor,
      results: evaluationResults,
      duration: evaluationStartTime ? formatPreciseScore((Date.now() - evaluationStartTime) / 1000, 2) : null,
      durationMs: evaluationStartTime ? Date.now() - evaluationStartTime : null, // Durée précise en millisecondes
      averageResponseTime: evaluationResults.reduce((sum, r) => sum + (r.responseTime || 0), 0) / evaluationResults.length,
      themeBreakdown: themeBreakdown
    };
    
    // Sauvegarde la session
    const sessionId = saveEvaluationSession(sessionData);
    console.log(`💾 [Evaluation] Session sauvegardée avec ID: ${sessionId}`);
    
    // Crée l'écran de résultats
    const resultsDiv = document.createElement('div');
    resultsDiv.id = 'evaluationResults';
    resultsDiv.style.maxWidth = '600px';
    resultsDiv.style.margin = '0 auto';
    
    resultsDiv.innerHTML = `
      <div style="text-align: center; margin-bottom: 32px;">
        <h2 style="color: #333; margin-bottom: 24px;">📊 Résultats de l'évaluation</h2>
        
        <!-- Score principal -->
        <div style="background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%); padding: 24px; border-radius: 16px; margin-bottom: 24px; box-shadow: 0 4px 16px rgba(0,0,0,0.1);">
          <div style="font-size: 3em; font-weight: bold; margin: 16px 0; color: ${scorePercent >= 70 ? '#28a745' : scorePercent >= 50 ? '#ffc107' : '#dc3545'};">
            ${correctAnswers}/${totalQuestions}
          </div>
          <div style="font-size: 1.6em; margin-bottom: 12px; color: #333;">Score : ${scorePercent}%</div>
          
          <!-- Scores détaillés -->
          <div style="font-size: 1em; margin-bottom: 16px; color: #666; background: rgba(102, 126, 234, 0.05); border-radius: 12px; padding: 16px;">
            <div style="display: grid; gap: 8px; font-size: 0.9em;">
              <div style="display: flex; justify-content: space-between;">
                <span>� Score standard :</span>
                <span><strong>${scorePercent}%</strong> (précis: ${preciseScorePercent}%)</span>
              </div>
              ${advancedScore.weightedPercentage !== scorePercent ? `
              <div style="display: flex; justify-content: space-between;">
                <span>📈 Score pondéré :</span>
                <span><strong>${advancedScore.weightedPercentage}%</strong> (précis: ${advancedScore.preciseWeightedPercentage}%)</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>⚖️ Facteur difficulté :</span>
                <span><strong>${advancedScore.difficultyFactor}x</strong></span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>🎯 Score brut :</span>
                <span><strong>${advancedScore.rawWeightedScore}</strong>/${advancedScore.rawMaxScore}</span>
              </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; border-top: 1px solid rgba(102, 126, 234, 0.2); padding-top: 8px; margin-top: 8px;">
                <span>⏱️ Durée totale :</span>
                <span><strong>${sessionData.duration}s</strong> (${sessionData.durationMs}ms)</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>⚡ Temps moyen/question :</span>
                <span><strong>${formatPreciseScore(sessionData.averageResponseTime / 1000, 2)}s</strong></span>
              </div>
            </div>
          </div>
          
          <div style="font-size: 1.1em; color: #666; margin-top: 16px;">
            ${scorePercent >= 80 ? '🎉 Excellent travail ! Maîtrise parfaite !' : 
              scorePercent >= 70 ? '👍 Très bon travail ! Continuez ainsi !' : 
              scorePercent >= 50 ? '👌 Bon début, continuez à vous entraîner !' : 
              '💪 Ne vous découragez pas, chaque évaluation est un progrès !'}
          </div>
        </div>
        
        <!-- Analytics par thème -->
        ${Object.keys(themeBreakdown).length > 1 ? `
        <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; margin-bottom: 24px; text-align: left;">
          <h4 style="color: #333; margin-bottom: 16px; text-align: center;">📚 Performance par thème</h4>
          <div style="display: grid; gap: 12px; max-width: 500px; margin: 0 auto;">
            ${Object.entries(themeBreakdown).map(([theme, data]) => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: white; border-radius: 8px; border-left: 4px solid ${data.percentage >= 70 ? '#28a745' : data.percentage >= 50 ? '#ffc107' : '#dc3545'}; margin-bottom: 4px;">
                <div>
                  <div style="font-weight: 500; margin-bottom: 2px;">${theme}</div>
                  <div style="font-size: 0.8em; color: #666;">Précis: ${data.precisePercentage}%</div>
                </div>
                <div style="text-align: right;">
                  <div style="color: ${data.percentage >= 70 ? '#28a745' : data.percentage >= 50 ? '#ffc107' : '#dc3545'}; font-weight: bold;">
                    ${data.correct}/${data.total}
                  </div>
                  <div style="color: ${data.percentage >= 70 ? '#28a745' : data.percentage >= 50 ? '#ffc107' : '#dc3545'}; font-size: 0.9em;">
                    ${data.percentage}%
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
      </div>
      
      ${evaluationResults.some(r => !r.isCorrect) ? `
      <div style="margin-bottom: 32px;">
        <h3 style="color: #dc3545; margin-bottom: 16px;">❌ Questions incorrectes</h3>
        <div id="incorrectAnswers" style="background: #f8f9fa; padding: 20px; border-radius: 12px;">
          ${evaluationResults
            .filter(r => !r.isCorrect)
            .map((result, index) => `
              <div style="margin-bottom: 16px; padding: 12px; background: white; border-radius: 8px; border-left: 4px solid #dc3545;">
                <div style="font-weight: bold; margin-bottom: 4px;">
                  ${result.mode === 'qcm_fr_lang' ? 
                    `"${result.question.fr}" → ${result.question[window.currentLangKey]}` :
                    result.mode === 'qcm_lang_fr' ? 
                    `"${result.question[window.currentLangKey]}" → ${result.question.fr}` :
                    `"${result.question[window.currentLangKey]}" → ${result.question.fr}`
                  }
                </div>
                <div style="color: #dc3545; font-size: 0.9em;">
                  Votre réponse : "${result.userAnswer}"
                </div>
                <div style="color: #28a745; font-size: 0.9em;">
                  Bonne réponse : "${result.correctAnswer}"
                </div>
                ${result.question.theme ? `<div style="color: #666; font-size: 0.8em; margin-top: 4px;">Thème : ${result.question.theme}</div>` : ''}
              </div>
            `).join('')}
        </div>
      </div>
      ` : ''}
      
      <div style="text-align: center;">
        <button id="restartEvalBtn" class="main-btn" style="margin: 6px; background: #007bff;">
          🔄 Recommencer avec les mêmes paramètres
        </button>
        <button id="newEvalBtn" class="main-btn" style="margin: 6px; background: #28a745;">
          ⚙️ Nouvelle évaluation
        </button>
        <button id="exportStatsBtn" class="main-btn" style="margin: 6px; background: #17a2b8;">
          📈 Exporter statistiques détaillées
        </button>
        <button id="backToMenuBtn" class="main-btn" style="margin: 6px; background: #6c757d;">
          🏠 Retour au menu
        </button>
      </div>
    `;
    
    parent.appendChild(resultsDiv);
    
    // Configure les boutons
    document.getElementById('restartEvalBtn').onclick = function() {
      resultsDiv.remove();
      startEvaluation();
    };
    
    document.getElementById('newEvalBtn').onclick = function() {
      resultsDiv.remove();
      // Remet à zéro et recommence la sélection
      window.selectedLang = null;
      window.selectedEvalMode = null;
      window.selectedThemes = null;
      window.selectedQuestionCount = null;
      location.reload();
    };
    
    document.getElementById('exportStatsBtn').onclick = function() {
      exportDetailedStatistics(sessionData, advancedScore, themeBreakdown);
    };
    
    document.getElementById('backToMenuBtn').onclick = function() {
      window.location.href = 'index.html';
    };
    
    console.log('✅ [Evaluation] Résultats affichés avec succès');
    
  } catch (error) {
    console.error('❌ [Evaluation] Erreur lors de l\'affichage des résultats:', error);
    
    // Affichage d'urgence simple
    const parent = document.querySelector('.container');
    if (parent) {
      parent.innerHTML = `
        <div style="text-align: center; padding: 40px;">
          <h2 style="color: #dc3545;">❌ Erreur d'affichage</h2>
          <p>Une erreur s'est produite lors de l'affichage des résultats.</p>
          <p><strong>Score:</strong> ${evaluationResults ? evaluationResults.filter(r => r.isCorrect).length : 0}/${evaluationResults ? evaluationResults.length : 0}</p>
          <button class="main-btn" onclick="window.location.href='index.html'" style="margin-top: 20px;">
            🏠 Retour à l'accueil
          </button>
        </div>
      `;
    }
  }
}

function showQuestion(questionIndex) {
  if (questionIndex >= evaluationQuestions.length) {
    showEvaluationResults();
    return;
  }
  
  // Démarrage du chrono pour cette question
  questionStartTime = Date.now();
  
  const question = evaluationQuestions[questionIndex];
  currentQuestionIndex = questionIndex;
  
  // Met à jour le compteur et la barre de progression
  const questionCounter = DOMUtils.safeQuery('#questionCounter');
  if (questionCounter) {
    questionCounter.textContent = `Question ${questionIndex + 1}/${evaluationQuestions.length}`;
  }
  const progressPercent = ((questionIndex + 1) / evaluationQuestions.length) * 100;
  const progressFill = DOMUtils.safeQuery('#progressFill');
  if (progressFill) {
    progressFill.style.width = `${progressPercent}%`;
  }
  
  // Nettoie les sections précédentes
  // Sécurisation: Utilise un nettoyage sécurisé
  const answerSection = DOMUtils.safeQuery('#answerSection');
  const feedbackSection = DOMUtils.safeQuery('#feedbackSection');
  if (answerSection) answerSection.innerHTML = '';
  if (feedbackSection) feedbackSection.innerHTML = '';
  
  const validateBtn = DOMUtils.safeQuery('#validateBtn');
  const nextQuestionBtn = DOMUtils.safeQuery('#nextQuestionBtn');
  const finishEvalBtn = DOMUtils.safeQuery('#finishEvalBtn');
  if (validateBtn) validateBtn.style.display = '';
  if (nextQuestionBtn) nextQuestionBtn.style.display = 'none';
  if (finishEvalBtn) finishEvalBtn.style.display = 'none';
  
  // Affiche la question selon le mode choisi
  switch(window.selectedEvalMode) {
    case 'qcm_fr_lang':
      showQCMQuestion_FrenchToLang(question);
      break;
    case 'qcm_lang_fr':
      showQCMQuestion_LangToFrench(question);
      break;
    case 'libre':
      showFreeResponseQuestion(question);
      break;
  }
}

function showQCMQuestion_FrenchToLang(question) {
  // Sécurisation: Affiche le mot français
  const questionTextEl = document.getElementById('questionText');
  if (questionTextEl) {
    questionTextEl.textContent = `Quelle est la traduction de "${DOMUtils.escapeHtml(question.fr)}" ?`;
  }
  
  // Génère les choix multiples
  const correctAnswer = question[window.currentLangKey];
  const distractors = generateDistractors(question, window.currentLangKey, 3);
  const choices = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5);
  
  // Sécurisation: Affiche les boutons de choix
  const answerSection = document.getElementById('answerSection');
  answerSection.innerHTML = '';
  const choicesContainer = DOMUtils.createSafeElement('div', {
    style: {
      display: 'grid',
      gap: '12px',
      maxWidth: '400px',
      margin: '0 auto'
    }
  });
  answerSection.appendChild(choicesContainer);
  
  choices.forEach((choice, index) => {
    const button = document.createElement('button');
    button.className = 'main-btn';
    button.textContent = choice;
    button.style.padding = '12px 20px';
    button.style.textAlign = 'left';
    button.onclick = function() {
      selectChoice(button, choices, correctAnswer);
    };
    choicesContainer.appendChild(button);
  });
  
  // Configure le bouton de validation
  document.getElementById('validateBtn').onclick = function() {
    const selectedBtn = document.querySelector('#answerSection .main-btn.selected');
    if (!selectedBtn) {
      alert('Veuillez sélectionner une réponse');
      return;
    }
    validateAnswer(selectedBtn.textContent, correctAnswer, question);
  };
}

function generateDistractors(currentQuestion, field, count) {
  // Récupère toutes les valeurs possibles du champ (langKey ou 'fr')
  // CORRECTION: Filtre aussi par les thèmes sélectionnés pour l'évaluation
  const allValues = sheetDBData
    .filter(card => 
      card.langue === window.selectedLang && 
      card.theme && window.selectedThemes.includes(card.theme.trim()) && // Filtre par thèmes sélectionnés
      card[field] && 
      card[field] !== currentQuestion[field]
    )
    .map(card => card[field])
    .filter((value, index, arr) => arr.indexOf(value) === index); // Supprime les doublons
  
  // Vérification de sécurité : s'il n'y a pas assez de distracteurs dans les thèmes sélectionnés,
  // utilise tous les thèmes de la langue comme fallback
  if (allValues.length < count) {
    console.warn(`⚠️ [Evaluation] Pas assez de distracteurs dans les thèmes sélectionnés (${allValues.length}/${count}). Utilisation de tous les thèmes comme fallback.`);
    const fallbackValues = sheetDBData
      .filter(card => 
        card.langue === window.selectedLang && 
        card[field] && 
        card[field] !== currentQuestion[field]
      )
      .map(card => card[field])
      .filter((value, index, arr) => arr.indexOf(value) === index);
    
    // Combine les valeurs des thèmes sélectionnés avec le fallback si nécessaire
    const combinedValues = [...new Set([...allValues, ...fallbackValues])];
    const shuffled = combinedValues.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }
  
  // Mélange et prend le nombre demandé
  const shuffled = allValues.sort(() => Math.random() - 0.5);
  const result = shuffled.slice(0, count);
  
  console.log(`🎯 [Evaluation] Distracteurs générés pour "${currentQuestion[field]}" (${field}):`, result);
  console.log(`📚 [Evaluation] Thèmes utilisés: ${window.selectedThemes.join(', ')}`);
  
  return result;
}

function selectChoice(selectedButton, allChoices, correctAnswer) {
  // Désélectionne tous les autres boutons
  document.querySelectorAll('#answerSection .main-btn').forEach(btn => {
    btn.classList.remove('selected');
    btn.style.background = '';
    btn.style.color = '';
  });
  
  // Sélectionne le bouton cliqué
  selectedButton.classList.add('selected');
  selectedButton.style.background = '#007bff';
  selectedButton.style.color = 'white';
}

function showQCMQuestion_LangToFrench(question) {
  // Sécurisation: Affiche le mot dans la langue étudiée
  const questionTextEl = document.getElementById('questionText');
  if (questionTextEl) {
    questionTextEl.textContent = `Quelle est la traduction française de "${DOMUtils.escapeHtml(question[window.currentLangKey])}" ?`;
  }
  
  // Génère les choix multiples
  const correctAnswer = question.fr;
  const distractors = generateDistractors(question, 'fr', 3);
  const choices = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5);
  
  // Sécurisation: Affiche les boutons de choix
  const answerSection = document.getElementById('answerSection');
  answerSection.innerHTML = '';
  const choicesContainer = DOMUtils.createSafeElement('div', {
    style: {
      display: 'grid',
      gap: '12px',
      maxWidth: '400px',
      margin: '0 auto'
    }
  });
  answerSection.appendChild(choicesContainer);
  
  choices.forEach((choice, index) => {
    const button = document.createElement('button');
    button.className = 'main-btn';
    button.textContent = choice;
    button.style.padding = '12px 20px';
    button.style.textAlign = 'left';
    button.onclick = function() {
      selectChoice(button, choices, correctAnswer);
    };
    choicesContainer.appendChild(button);
  });
  
  // Configure le bouton de validation
  document.getElementById('validateBtn').onclick = function() {
    const selectedBtn = document.querySelector('#answerSection .main-btn.selected');
    if (!selectedBtn) {
      alert('Veuillez sélectionner une réponse');
      return;
    }
    validateAnswer(selectedBtn.textContent, correctAnswer, question);
  };
}

function showFreeResponseQuestion(question) {
  // Affiche le mot dans la langue étudiée
  document.getElementById('questionText').textContent = `Traduisez en français : "${question[window.currentLangKey]}"`;
  
  // Affiche le champ de saisie
  const answerSection = document.getElementById('answerSection');
  answerSection.innerHTML = `
    <div style="max-width: 400px; margin: 0 auto;">
      <input type="text" id="freeResponseInput" class="form-input" 
             placeholder="Votre réponse en français..." 
             style="width: 100%; padding: 12px; font-size: 1.1em; text-align: center;">
    </div>
  `;
  
  // Focus sur le champ de saisie
  document.getElementById('freeResponseInput').focus();
  
  // Validation avec Entrée (sécurisée)
  const freeInput = DOMUtils.safeQuery('#freeResponseInput');
  const validateBtn = DOMUtils.safeQuery('#validateBtn');
  
  if (freeInput && validateBtn) {
    DOMUtils.safeAddEventListener(freeInput, 'keypress', function(e) {
      if (e.key === 'Enter') {
        validateBtn.click();
      }
    });
    
    // Configure le bouton de validation
    validateBtn.onclick = function() {
    const userAnswer = document.getElementById('freeResponseInput').value.trim();
    if (!userAnswer) {
      alert('Veuillez saisir une réponse');
      return;
    }
    validateAnswer(userAnswer, question.fr, question);
  };
}





// Configuration des boutons de navigation
// Note: Les event listeners sont maintenant attachés directement aux boutons dans validateAnswer()



// Fonction globale pour tester le bouton manuellement depuis la console
window.testCancelButton = function() {
  const btn = document.getElementById('cancelEvalBtn');
  if (btn) {
    console.log('🧪 [Test] Bouton trouvé, simulation du clic...');
    btn.click();
  } else {
    console.error('❌ [Test] Bouton non trouvé !');
  }
};

function cancelEvaluation() {
  console.log('🚀 [Debug] Fonction cancelEvaluation() appelée');
  
  // Demande confirmation avant d'annuler
  const confirmCancel = confirm(
    '⚠️ Êtes-vous sûr de vouloir annuler l\'évaluation ?\n\n' +
    'Votre progression actuelle sera perdue.'
  );
  
  console.log('🤔 [Debug] Réponse de confirmation:', confirmCancel);
  
  if (confirmCancel) {
    // Supprime l'interface d'évaluation
    const evalInterface = document.getElementById('evaluationInterface');
    if (evalInterface) {
      evalInterface.remove();
    }
    
    // Réaffiche le bouton "Retour" du HTML s'il était masqué
    const htmlReturnBtn = document.querySelector('button[onclick*="index.html"]');
    if (htmlReturnBtn) {
      htmlReturnBtn.style.display = '';
    }
    
    // Remet à zéro les variables globales
    evaluationQuestions = [];
    currentQuestionIndex = 0;
    evaluationResults = [];
    window.selectedLang = null;
    window.selectedEvalMode = null;
    window.selectedThemes = null;
    window.selectedQuestionCount = null;
    window.currentLangKey = null;
    
    // Recharge la page pour revenir à l'état initial
    location.reload();
  }
}

/**
 * Exporte les statistiques détaillées de l'évaluation
 * @param {Object} sessionData - Données de session
 * @param {Object} advancedScore - Scores avancés
 * @param {Object} themeBreakdown - Répartition par thème
 */
function exportDetailedStatistics(sessionData, advancedScore, themeBreakdown) {
  try {
    const exportData = {
      // Métadonnées de l'évaluation
      evaluation: {
        timestamp: new Date().toISOString(),
        sessionId: sessionData.sessionId || 'N/A',
        language: sessionData.language,
        mode: sessionData.mode,
        themes: sessionData.themes,
        totalQuestions: sessionData.totalQuestions
      },
      
      // Scores précis
      scores: {
        standard: {
          correct: sessionData.correctAnswers,
          total: sessionData.totalQuestions,
          percentage: calculatePrecisePercentage(sessionData.correctAnswers, sessionData.totalQuestions, 4),
          displayPercentage: calculatePrecisePercentage(sessionData.correctAnswers, sessionData.totalQuestions, 2)
        },
        weighted: {
          score: advancedScore.rawWeightedScore,
          maxScore: advancedScore.rawMaxScore,
          percentage: advancedScore.preciseWeightedPercentage,
          displayPercentage: advancedScore.weightedPercentage,
          difficultyFactor: advancedScore.difficultyFactor
        }
      },
      
      // Métriques temporelles précises
      timing: {
        durationSeconds: sessionData.duration,
        durationMs: sessionData.durationMs,
        averageResponseTimeMs: formatPreciseScore(sessionData.averageResponseTime, 3),
        averageResponseTimeSeconds: formatPreciseScore(sessionData.averageResponseTime / 1000, 3)
      },
      
      // Répartition par thème avec précision maximale
      themeBreakdown: Object.entries(themeBreakdown).map(([theme, data]) => ({
        theme: theme,
        correct: data.correct,
        total: data.total,
        percentage: data.precisePercentage,
        displayPercentage: data.percentage
      })),
      
      // Détail de chaque question
      questionDetails: sessionData.results.map((result, index) => ({
        questionNumber: index + 1,
        question: result.question.fr,
        answer: result.question[sessionData.language === 'anglais' ? 'en' : sessionData.language],
        theme: result.question.theme,
        userAnswer: result.userAnswer,
        correctAnswer: result.correctAnswer,
        isCorrect: result.isCorrect,
        responseTimeMs: result.responseTime,
        responseTimeSeconds: result.responseTime ? formatPreciseScore(result.responseTime / 1000, 3) : null
      }))
    };
    
    // Génère le nom de fichier avec timestamp précis
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `evaluation-stats-${sessionData.language}-${timestamp}.json`;
    
    // Crée et télécharge le fichier
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(dataBlob);
    downloadLink.download = filename;
    downloadLink.style.display = 'none';
    
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    // Affiche un message de confirmation
    DOMUtils.createModal({
      title: '📈 Export réussi',
      content: `Statistiques détaillées exportées dans le fichier :<br><strong>${filename}</strong><br><br>Le fichier contient tous les scores précis et métriques détaillées pour un suivi optimal de vos progrès.`,
      type: 'success',
      closeButton: true
    });
    
    console.log('✅ [Export] Statistiques exportées:', filename);
    
  } catch (error) {
    console.error('❌ [Export] Erreur lors de l\'export:', error);
    alert('Erreur lors de l\'export des statistiques. Vérifiez la console pour plus de détails.');
  }
}

/**
 * Affiche les informations de stockage pour debug et monitoring
 */
function showStorageInfo() {
  if (typeof SafeStorage !== 'undefined') {
    const info = SafeStorage.getStorageInfo();
    console.log('📊 [Storage] Informations de stockage:', {
      usage: info.sizeFormatted,
      percentage: info.usagePercent + '%',
      items: `${info.itemCount}/${info.maxItems}`,
      available: info.available
    });
    
    // Alerte si stockage critique
    if (info.usagePercent > 80) {
      console.warn('⚠️ [Storage] Stockage critique! Nettoyage recommandé.');
      SafeStorage.cleanup();
    }
  }
}

/**
 * Dashboard de performance et métriques
 */
function showPerformanceDashboard() {
  if (typeof PerformanceOptimizer === 'undefined') return;
  
  const report = PerformanceOptimizer.getPerformanceReport();
  const storageInfo = SafeStorage.getStorageInfo();
  
  console.group('📊 DASHBOARD PERFORMANCE');
  console.log('🚀 Cache Performance:', {
    efficiency: report.cacheEfficiency,
    hits: report.cacheHits,
    misses: report.cacheMisses,
    size: report.cacheSize + ' items'
  });
  
  console.log('⚡ Network Performance:', {
    averageLoadTime: report.averageLoadTime,
    compressionRatio: report.compressionRatio
  });
  
  console.log('💾 Storage Status:', {
    usage: storageInfo.sizeFormatted,
    percentage: storageInfo.usagePercent + '%',
    available: storageInfo.available
  });
  console.groupEnd();
  
  // Alertes automatiques
  if (storageInfo.usagePercent > 90) {
    console.warn('🚨 [Performance] Stockage critique! Nettoyage automatique activé.');
    SafeStorage.cleanup();
    PerformanceOptimizer.clearExpiredCache();
  }
}

/**
 * Migre les anciens scores vers des scores précis
 * Cette fonction s'assure que tous les scores stockés utilisent la nouvelle précision
 */
function migrateScoresToPrecision() {
  try {
    const history = getEvaluationHistory();
    let migrationCount = 0;
    
    const migratedHistory = history.map(session => {
      let needsMigration = false;
      
      // Vérifie si des scores précis manquent
      if (session.results && (!session.precisePercentage || !session.preciseWeightedPercentage)) {
        
        // Recalcule les scores précis à partir des données brutes
        const correctAnswers = session.results.filter(r => r.isCorrect).length;
        const totalQuestions = session.results.length;
        
        session.precisePercentage = calculatePrecisePercentage(correctAnswers, totalQuestions, 4);
        session.preciseStandardPercentage = calculatePrecisePercentage(correctAnswers, totalQuestions, 4);
        
        // Recalcule le score pondéré si possible
        if (session.mode && session.results) {
          const advancedScore = calculateAdvancedScore(session.results, session.mode);
          session.preciseWeightedPercentage = advancedScore.preciseWeightedPercentage;
          session.rawWeightedScore = advancedScore.rawWeightedScore;
          session.rawMaxScore = advancedScore.rawMaxScore;
        }
        
        // Recalcule les breakdown de thèmes avec précision
        if (session.themeBreakdown) {
          Object.keys(session.themeBreakdown).forEach(theme => {
            const data = session.themeBreakdown[theme];
            if (!data.precisePercentage) {
              data.precisePercentage = calculatePrecisePercentage(data.correct, data.total, 4);
            }
          });
        }
        
        needsMigration = true;
        migrationCount++;
      }
      
      return session;
    });
    
    // Sauvegarde la version migrée
    if (migrationCount > 0) {
      localStorage.setItem(EVALUATION_HISTORY_KEY, JSON.stringify(migratedHistory));
      console.log(`✅ [Migration] ${migrationCount} sessions migrées vers la nouvelle précision`);
    } else {
      console.log('ℹ️ [Migration] Aucune migration nécessaire, tous les scores sont déjà précis');
    }
    
    return migrationCount;
    
  } catch (error) {
    console.error('❌ [Migration] Erreur lors de la migration:', error);
    return 0;
  }
}

/**
 * Test de diagnostic pour les fonctions critiques
 */
function runDiagnosticTests() {
  console.group('🔧 TESTS DIAGNOSTICS');
  
  // Test localStorage
  try {
    localStorage.setItem('test_key', 'test_value');
    localStorage.removeItem('test_key');
    console.log('✅ localStorage: OK');
  } catch (error) {
    console.error('❌ localStorage: ERREUR', error);
  }
  
  // Test SafeStorage si disponible
  if (window.SafeStorage) {
    try {
      SafeStorage.setItem('test', { test: true });
      SafeStorage.getItem('test');
      console.log('✅ SafeStorage: OK');
    } catch (error) {
      console.error('❌ SafeStorage: ERREUR', error);
    }
  }
  
  console.groupEnd();
}

// Monitoring automatique et accessibilité
document.addEventListener('DOMContentLoaded', function() {
  // Tests diagnostics immédiats
  runDiagnosticTests();
  
  // Délai pour laisser le temps aux autres scripts de se charger
  setTimeout(() => {
    // Migration des scores de thèmes vers la nouvelle précision (revision.js)
    if (typeof migrateToPreciseScores === 'function') {
      const migratedThemeCount = migrateToPreciseScores();
      if (migratedThemeCount > 0) {
        console.log(`🔄 [Evaluation] ${migratedThemeCount} scores de thèmes migrés vers la nouvelle précision`);
      }
    }
    
    // Migration des scores d'évaluation vers la nouvelle précision
    const migratedCount = migrateScoresToPrecision();
    if (migratedCount > 0) {
      console.log(`🔄 [Evaluation] ${migratedCount} sessions d'évaluation migrées vers la nouvelle précision`);
    }
    
    // Performance et stockage
    showStorageInfo();
    showPerformanceDashboard();
    
    // Accessibilité
    if (window.AccessibilityEnhancer) {
      AccessibilityEnhancer.init();
      console.log('♿ [Evaluation] Accessibilité initialisée');
    }
    
    // Nettoyage périodique (toutes les 30 minutes)
    setInterval(() => {
      PerformanceOptimizer.clearExpiredCache();
      SafeStorage.cleanup();
    }, 30 * 60 * 1000);
    
  }, 1000);
});
}

// Fin du fichier evaluation.js



