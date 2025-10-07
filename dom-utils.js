// ================================
// UTILITAIRES DOM DÉFENSIFS
// ================================

/**
 * Sélection d'élément sécurisée
 */
function safeQuery(selector, context = document) {
  try {
    const element = context.querySelector(selector);
    if (!element) {
      // Moins verbeux pour certains éléments d'interface attendus
      if (selector === '#evaluationInterface') {
        console.debug(`Interface element not found: ${selector} (this may be normal during transitions)`);
      } else {
        console.warn(`Element not found: ${selector}`);
      }
      return null;
    }
    return element;
  } catch (error) {
    console.error(`Query error for ${selector}:`, error);
    return null;
  }
}

/**
 * Ajout d'event listener sécurisé avec nettoyage automatique
 */
function safeAddEventListener(element, event, handler, options = {}) {
  if (!element) {
    console.warn('Cannot add event listener: element is null');
    return null;
  }
  
  element.addEventListener(event, handler, options);
  
  // Retourne une fonction de nettoyage
  return () => {
    if (element) {
      element.removeEventListener(event, handler, options);
    }
  };
}

/**
 * Création de modal robuste avec nettoyage automatique
 */
function createModal(content, options = {}) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.8); z-index: 1000;
    display: flex; align-items: center; justify-content: center;
  `;
  
  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';
  modalContent.innerHTML = content;
  modalContent.style.cssText = `
    background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
    backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.2);
    border-radius: 20px; padding: 30px; max-width: 90vw; max-height: 80vh;
    overflow-y: auto; color: white; box-sizing: border-box;
  `;
  
  modal.appendChild(modalContent);
  
  // Nettoyeurs d'événements
  const cleanupFunctions = [];
  
  // Fermeture sécurisée
  function closeModal() {
    // Nettoie tous les event listeners
    cleanupFunctions.forEach(cleanup => cleanup());
    
    // Supprime le modal
    if (modal && modal.parentNode) {
      modal.remove();
    }
  }
  
  // Event listeners avec nettoyage
  cleanupFunctions.push(
    safeAddEventListener(modal, 'click', (e) => {
      if (e.target === modal) closeModal();
    })
  );
  
  cleanupFunctions.push(
    safeAddEventListener(document, 'keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    })
  );
  
  // Bouton fermeture si demandé
  if (options.closeButton !== false) {
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = `
      position: absolute; top: 15px; right: 15px;
      background: none; border: none; color: white;
      font-size: 24px; cursor: pointer; width: 30px; height: 30px;
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
    `;
    
    cleanupFunctions.push(
      safeAddEventListener(closeBtn, 'click', closeModal)
    );
    
    modalContent.style.position = 'relative';
    modalContent.appendChild(closeBtn);
  }
  
  document.body.appendChild(modal);
  
  return { modal, closeModal };
}

/**
 * Mise à jour sécurisée du contenu d'un élément
 */
function safeSetContent(selector, content, isHTML = false) {
  const element = safeQuery(selector);
  if (!element) return false;
  
  try {
    if (isHTML) {
      element.innerHTML = content;
    } else {
      element.textContent = content;
    }
    return true;
  } catch (error) {
    console.error(`Error setting content for ${selector}:`, error);
    return false;
  }
}

/**
 * Responsive breakpoint observer
 */
function createBreakpointObserver(breakpoints, callback) {
  const mediaQueries = Object.entries(breakpoints).map(([name, query]) => {
    const mq = window.matchMedia(query);
    return { name, mq };
  });
  
  function checkBreakpoints() {
    const active = mediaQueries
      .filter(({ mq }) => mq.matches)
      .map(({ name }) => name);
    
    callback(active);
  }
  
  // Initial check
  checkBreakpoints();
  
  // Observe changes
  mediaQueries.forEach(({ mq }) => {
    mq.addListener(checkBreakpoints);
  });
  
  // Cleanup function
  return () => {
    mediaQueries.forEach(({ mq }) => {
      mq.removeListener(checkBreakpoints);
    });
  };
}

/**
 * Debounce pour optimiser les événements fréquents
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Sécurise le contenu HTML en échappant les caractères dangereux
 */
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Crée un élément DOM de façon sécurisée
 */
function createSafeElement(tag, options = {}) {
  const element = document.createElement(tag);
  
  // Ajoute les attributs de façon sécurisée
  if (options.attributes) {
    Object.entries(options.attributes).forEach(([key, value]) => {
      element.setAttribute(key, String(value));
    });
  }
  
  // Ajoute le contenu texte (sécurisé)
  if (options.textContent) {
    element.textContent = String(options.textContent);
  }
  
  // Ajoute les classes
  if (options.className) {
    element.className = String(options.className);
  }
  
  // Ajoute les styles inline de façon sécurisée
  if (options.style) {
    Object.entries(options.style).forEach(([prop, value]) => {
      element.style[prop] = String(value);
    });
  }
  
  return element;
}

/**
 * Remplace innerHTML de façon sécurisée avec du HTML structuré
 */
function setSafeHTML(element, htmlStructure) {
  if (!element) return;
  
  // Vide l'élément
  element.innerHTML = '';
  
  // Ajoute les éléments de façon sécurisée
  if (Array.isArray(htmlStructure)) {
    htmlStructure.forEach(item => {
      if (typeof item === 'string') {
        // Texte simple
        element.appendChild(document.createTextNode(item));
      } else if (item.tag) {
        // Élément structuré
        const child = createSafeElement(item.tag, item);
        if (item.children) {
          setSafeHTML(child, item.children);
        }
        element.appendChild(child);
      }
    });
  }
}

/**
 * Template sécurisé pour remplacer les template literals dangereux
 */
function createSafeTemplate(template, data = {}) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return escapeHtml(String(data[key] || ''));
  });
}

/**
 * Gestion sécurisée du localStorage avec limites et gestion d'erreurs
 */
const SafeStorage = {
  // Limites de stockage (en caractères)
  MAX_ITEM_SIZE: 1024 * 1024, // 1MB par item
  MAX_TOTAL_SIZE: 5 * 1024 * 1024, // 5MB total
  MAX_ITEMS: 50, // Maximum 50 items
  
  /**
   * Calcule la taille totale du localStorage
   */
  getTotalSize() {
    let total = 0;
    try {
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          total += localStorage[key].length + key.length;
        }
      }
    } catch (error) {
      console.warn('⚠️ [SafeStorage] Erreur calcul taille:', error);
    }
    return total;
  },
  
  /**
   * Vérifie si le localStorage est disponible et utilisable
   */
  isAvailable() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, 'test');
      localStorage.removeItem(test);
      return true;
    } catch (error) {
      console.error('❌ [SafeStorage] localStorage indisponible:', error);
      return false;
    }
  },
  
  /**
   * Stockage sécurisé avec gestion des erreurs et limites
   */
  setItem(key, value, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('localStorage non disponible');
    }
    
    const stringValue = JSON.stringify(value);
    const itemSize = stringValue.length + key.length;
    
    // Vérifications de limites
    if (itemSize > this.MAX_ITEM_SIZE) {
      throw new Error(`Item trop volumineux: ${itemSize} > ${this.MAX_ITEM_SIZE} caractères`);
    }
    
    if (Object.keys(localStorage).length >= this.MAX_ITEMS) {
      throw new Error(`Trop d'items: ${Object.keys(localStorage).length} >= ${this.MAX_ITEMS}`);
    }
    
    const newTotalSize = this.getTotalSize() + itemSize;
    if (newTotalSize > this.MAX_TOTAL_SIZE) {
      if (options.autoCleanup) {
        this.cleanup();
      } else {
        throw new Error(`Stockage saturé: ${newTotalSize} > ${this.MAX_TOTAL_SIZE} caractères`);
      }
    }
    
    try {
      localStorage.setItem(key, stringValue);
      console.log(`✅ [SafeStorage] Stocké: ${key} (${itemSize} caractères)`);
      return true;
    } catch (error) {
      console.error('❌ [SafeStorage] Erreur stockage:', error);
      
      if (error.name === 'QuotaExceededError' && options.autoCleanup) {
        this.cleanup();
        try {
          localStorage.setItem(key, stringValue);
          return true;
        } catch (retryError) {
          throw new Error('Stockage impossible même après nettoyage: ' + retryError.message);
        }
      }
      throw error;
    }
  },
  
  /**
   * Récupération sécurisée avec gestion d'erreurs
   */
  getItem(key, defaultValue = null) {
    if (!this.isAvailable()) {
      console.warn('⚠️ [SafeStorage] localStorage indisponible, retour valeur par défaut');
      return defaultValue;
    }
    
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item);
    } catch (error) {
      console.error(`❌ [SafeStorage] Erreur lecture ${key}:`, error);
      return defaultValue;
    }
  },
  
  /**
   * Suppression sécurisée
   */
  removeItem(key) {
    try {
      localStorage.removeItem(key);
      console.log(`🗑️ [SafeStorage] Supprimé: ${key}`);
      return true;
    } catch (error) {
      console.error(`❌ [SafeStorage] Erreur suppression ${key}:`, error);
      return false;
    }
  },
  
  /**
   * Nettoyage automatique des anciens items
   */
  cleanup(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 jours par défaut
    console.log('🧹 [SafeStorage] Démarrage nettoyage automatique...');
    let cleaned = 0;
    const now = Date.now();
    
    try {
      // Nettoie les items expirés avec timestamp
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key) && key.includes('_timestamp_')) {
          try {
            const timestamp = parseInt(localStorage[key]);
            if (now - timestamp > maxAge) {
              const dataKey = key.replace('_timestamp_', '');
              localStorage.removeItem(key);
              localStorage.removeItem(dataKey);
              cleaned++;
            }
          } catch (error) {
            console.warn(`⚠️ [SafeStorage] Erreur nettoyage ${key}:`, error);
          }
        }
      }
      
      console.log(`✅ [SafeStorage] Nettoyage terminé: ${cleaned} items supprimés`);
    } catch (error) {
      console.error('❌ [SafeStorage] Erreur durant le nettoyage:', error);
    }
  },
  
  /**
   * Informations sur l'usage du stockage
   */
  getStorageInfo() {
    const totalSize = this.getTotalSize();
    const itemCount = Object.keys(localStorage).length;
    
    return {
      totalSize,
      maxTotalSize: this.MAX_TOTAL_SIZE,
      usagePercent: Math.round((totalSize / this.MAX_TOTAL_SIZE) * 100),
      itemCount,
      maxItems: this.MAX_ITEMS,
      available: this.isAvailable(),
      sizeFormatted: `${Math.round(totalSize / 1024)} KB / ${Math.round(this.MAX_TOTAL_SIZE / 1024)} KB`
    };
  }
};

// Export global pour utilisation facile
window.DOMUtils = {
  safeQuery,
  safeAddEventListener,
  createModal,
  safeSetContent,
  createBreakpointObserver,
  debounce,
  escapeHtml,
  createSafeElement,
  setSafeHTML,
  createSafeTemplate
};

/**
 * Système de validation et sanitization des données
 */
const DataValidator = {
  
  /**
   * Règles de validation par type de donnée
   */
  rules: {
    // Mots de vocabulaire
    word: {
      minLength: 1,
      maxLength: 100,
      pattern: /^[a-zA-ZÀ-ÿ0-9\s\-'.,!?()]+$/,
      sanitize: true
    },
    
    // Thèmes
    theme: {
      minLength: 2,
      maxLength: 50,
      pattern: /^[a-zA-ZÀ-ÿ0-9\s\-_]+$/,
      sanitize: true
    },
    
    // Langues
    language: {
      minLength: 2,
      maxLength: 20,
      pattern: /^[a-zA-Z\s]+$/,
      whitelist: ['anglais', 'francais', 'japonais', 'espagnol', 'allemand', 'italien']
    },
    
    // Modes d'évaluation
    evalMode: {
      whitelist: ['qcm_fr_lang', 'qcm_lang_fr', 'libre']
    },
    
    // Nombres (scores, questions, etc.)
    number: {
      min: 0,
      max: 10000,
      integer: true
    },
    
    // Pourcentages
    percentage: {
      min: 0,
      max: 100,
      integer: false
    }
  },
  
  /**
   * Sanitize une chaîne de caractères
   */
  sanitize(input) {
    if (typeof input !== 'string') return '';
    
    return input
      .trim()
      .replace(/\s+/g, ' ') // Normalise les espaces
      .replace(/[<>\"'&]/g, '') // Supprime caractères dangereux
      .substring(0, 500); // Limite la longueur
  },
  
  /**
   * Valide une donnée selon son type
   */
  validate(value, type, customRules = {}) {
    const rules = { ...this.rules[type], ...customRules };
    const errors = [];
    
    // Conversion en string pour la validation
    let stringValue = String(value || '').trim();
    
    // Sanitization si activée
    if (rules.sanitize) {
      stringValue = this.sanitize(stringValue);
    }
    
    // Validation longueur minimale
    if (rules.minLength && stringValue.length < rules.minLength) {
      errors.push(`Longueur minimale : ${rules.minLength} caractères`);
    }
    
    // Validation longueur maximale
    if (rules.maxLength && stringValue.length > rules.maxLength) {
      errors.push(`Longueur maximale : ${rules.maxLength} caractères`);
    }
    
    // Validation pattern
    if (rules.pattern && !rules.pattern.test(stringValue)) {
      errors.push('Format invalide');
    }
    
    // Validation whitelist
    if (rules.whitelist && !rules.whitelist.includes(stringValue.toLowerCase())) {
      errors.push(`Valeur autorisée: ${rules.whitelist.join(', ')}`);
    }
    
    // Validation numérique
    if (type === 'number' || type === 'percentage') {
      const numValue = parseFloat(value);
      
      if (isNaN(numValue)) {
        errors.push('Doit être un nombre');
      } else {
        if (rules.min !== undefined && numValue < rules.min) {
          errors.push(`Minimum : ${rules.min}`);
        }
        if (rules.max !== undefined && numValue > rules.max) {
          errors.push(`Maximum : ${rules.max}`);
        }
        if (rules.integer && !Number.isInteger(numValue)) {
          errors.push('Doit être un nombre entier');
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: stringValue,
      originalValue: value
    };
  },
  
  /**
   * Valide un objet carte de vocabulaire complet
   */
  validateCard(cardData) {
    const results = {
      fr: this.validate(cardData.fr, 'word'),
      en: this.validate(cardData.en, 'word'),
      ja: cardData.ja ? this.validate(cardData.ja, 'word') : { isValid: true, sanitizedValue: '' },
      theme: this.validate(cardData.theme, 'theme'),
      langue: this.validate(cardData.langue, 'language')
    };
    
    const isValid = Object.values(results).every(r => r.isValid);
    const errors = Object.entries(results)
      .filter(([key, result]) => !result.isValid)
      .reduce((acc, [key, result]) => {
        acc[key] = result.errors;
        return acc;
      }, {});
    
    // Carte sanitizée
    const sanitizedCard = {
      fr: results.fr.sanitizedValue,
      en: results.en.sanitizedValue,
      ja: results.ja.sanitizedValue,
      theme: results.theme.sanitizedValue,
      langue: results.langue.sanitizedValue
    };
    
    return {
      isValid,
      errors,
      sanitizedCard,
      originalCard: cardData
    };
  },
  
  /**
   * Valide les données d'évaluation
   */
  validateEvaluationData(evalData) {
    const results = {
      mode: this.validate(evalData.mode, 'evalMode'),
      language: this.validate(evalData.language, 'language'),
      questionCount: this.validate(evalData.questionCount, 'number', { min: 1, max: 100 }),
      themes: Array.isArray(evalData.themes) ? 
        evalData.themes.map(theme => this.validate(theme, 'theme')) :
        [{ isValid: false, errors: ['Thèmes requis'] }]
    };
    
    const themesValid = results.themes.every(t => t.isValid);
    const isValid = results.mode.isValid && results.language.isValid && 
                   results.questionCount.isValid && themesValid;
    
    return {
      isValid,
      results,
      sanitizedData: {
        mode: results.mode.sanitizedValue,
        language: results.language.sanitizedValue,
        questionCount: parseInt(results.questionCount.sanitizedValue),
        themes: results.themes.map(t => t.sanitizedValue)
      }
    };
  }
};

/**
 * Système d'optimisation des performances
 */
const PerformanceOptimizer = {
  
  /**
   * Cache pour les données fréquemment utilisées
   */
  cache: new Map(),
  
  /**
   * Métriques de performance
   */
  metrics: {
    cacheHits: 0,
    cacheMisses: 0,
    loadTimes: [],
    dataCompressionRatio: 0
  },
  
  /**
   * Compression simple des données JSON
   */
  compressData(data) {
    try {
      const jsonString = JSON.stringify(data);
      
      // Compression simple par suppression des espaces et optimisations
      const compressed = jsonString
        .replace(/\s+/g, ' ')
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .replace(/:\s+/g, ':');
      
      this.metrics.dataCompressionRatio = (jsonString.length - compressed.length) / jsonString.length * 100;
      
      console.log(`🗜️ [Performance] Compression: ${Math.round(this.metrics.dataCompressionRatio)}% économisés`);
      
      return compressed;
    } catch (error) {
      console.warn('⚠️ [Performance] Erreur compression:', error);
      return JSON.stringify(data);
    }
  },
  
  /**
   * Décompression des données
   */
  decompressData(compressedString) {
    try {
      return JSON.parse(compressedString);
    } catch (error) {
      console.error('❌ [Performance] Erreur décompression:', error);
      return null;
    }
  },
  
  /**
   * Cache intelligent avec TTL (Time To Live)
   */
  setCacheItem(key, data, ttlMinutes = 30) {
    const now = Date.now();
    const compressed = this.compressData(data);
    
    this.cache.set(key, {
      data: compressed,
      timestamp: now,
      ttl: ttlMinutes * 60 * 1000, // Conversion en ms
      compressed: true
    });
    
    console.log(`💾 [Performance] Cache mis à jour: ${key} (TTL: ${ttlMinutes}min)`);
  },
  
  /**
   * Récupération depuis le cache avec vérification TTL
   */
  getCacheItem(key) {
    const cached = this.cache.get(key);
    
    if (!cached) {
      this.metrics.cacheMisses++;
      console.log(`❌ [Performance] Cache miss: ${key}`);
      return null;
    }
    
    const now = Date.now();
    const isExpired = (now - cached.timestamp) > cached.ttl;
    
    if (isExpired) {
      this.cache.delete(key);
      this.metrics.cacheMisses++;
      console.log(`⏰ [Performance] Cache expiré: ${key}`);
      return null;
    }
    
    this.metrics.cacheHits++;
    console.log(`✅ [Performance] Cache hit: ${key}`);
    
    return cached.compressed ? 
      this.decompressData(cached.data) : 
      cached.data;
  },
  
  /**
   * Lazy loading pour les grandes listes
   */
  createLazyLoader(container, items, renderFunction, batchSize = 20) {
    let currentIndex = 0;
    let isLoading = false;
    
    const loadBatch = () => {
      if (isLoading || currentIndex >= items.length) return;
      
      isLoading = true;
      const batch = items.slice(currentIndex, currentIndex + batchSize);
      
      // Utilise requestAnimationFrame pour un rendu fluide
      requestAnimationFrame(() => {
        batch.forEach(item => {
          const element = renderFunction(item, currentIndex);
          if (element && container) {
            container.appendChild(element);
          }
        });
        
        currentIndex += batchSize;
        isLoading = false;
        
        console.log(`📦 [Performance] Batch chargé: ${currentIndex}/${items.length}`);
      });
    };
    
    // Chargement initial
    loadBatch();
    
    // Observer pour le scroll infini
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !isLoading) {
          loadBatch();
        }
      });
    }, { threshold: 0.1 });
    
    // Sentinel element pour déclencher le chargement
    const sentinel = document.createElement('div');
    sentinel.style.height = '1px';
    container.appendChild(sentinel);
    observer.observe(sentinel);
    
    return {
      loadMore: loadBatch,
      destroy: () => observer.disconnect()
    };
  },
  
  /**
   * Optimisation des requêtes réseau avec retry et timeout
   */
  async optimizedFetch(url, options = {}) {
    const startTime = Date.now();
    const defaultOptions = {
      timeout: 10000, // 10 secondes
      retries: 3,
      retryDelay: 1000, // 1 seconde
      ...options
    };
    
    for (let attempt = 0; attempt <= defaultOptions.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), defaultOptions.timeout);
        
        const response = await fetch(url, {
          ...defaultOptions,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const endTime = Date.now();
        const loadTime = endTime - startTime;
        this.metrics.loadTimes.push(loadTime);
        
        console.log(`🚀 [Performance] Requête réussie en ${loadTime}ms (tentative ${attempt + 1})`);
        
        return response;
        
      } catch (error) {
        console.warn(`⚠️ [Performance] Tentative ${attempt + 1} échouée:`, error.message);
        
        if (attempt < defaultOptions.retries) {
          // Attente progressive (exponential backoff)
          const delay = defaultOptions.retryDelay * Math.pow(2, attempt);
          console.log(`⏳ [Performance] Nouvelle tentative dans ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
  },
  
  /**
   * Préchargement intelligent des données
   */
  preloadData(urls, priority = 'low') {
    urls.forEach(async (url, index) => {
      try {
        // Délai progressif pour éviter la surcharge
        setTimeout(async () => {
          const cached = this.getCacheItem(url);
          if (cached) return; // Déjà en cache
          
          console.log(`📡 [Performance] Préchargement: ${url}`);
          const response = await this.optimizedFetch(url);
          const data = await response.json();
          
          // Cache automatique pour 1 heure
          this.setCacheItem(url, data, 60);
          
        }, index * 100); // 100ms entre chaque préchargement
        
      } catch (error) {
        console.warn(`⚠️ [Performance] Erreur préchargement ${url}:`, error);
      }
    });
  },
  
  /**
   * Métriques de performance
   */
  getPerformanceReport() {
    const avgLoadTime = this.metrics.loadTimes.length > 0 ?
      this.metrics.loadTimes.reduce((a, b) => a + b, 0) / this.metrics.loadTimes.length : 0;
    
    const cacheEfficiency = this.metrics.cacheHits + this.metrics.cacheMisses > 0 ?
      (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) * 100) : 0;
    
    return {
      cacheHits: this.metrics.cacheHits,
      cacheMisses: this.metrics.cacheMisses,
      cacheEfficiency: Math.round(cacheEfficiency) + '%',
      averageLoadTime: Math.round(avgLoadTime) + 'ms',
      compressionRatio: Math.round(this.metrics.dataCompressionRatio) + '%',
      cacheSize: this.cache.size
    };
  },
  
  /**
   * Nettoyage du cache
   */
  clearExpiredCache() {
    const now = Date.now();
    let cleaned = 0;
    
    this.cache.forEach((value, key) => {
      if (now - value.timestamp > value.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    });
    
    console.log(`🧹 [Performance] Cache nettoyé: ${cleaned} entrées supprimées`);
  }
};

/**
 * Système d'accessibilité avancé
 */
const AccessibilityEnhancer = {
  
  /**
   * Configuration des préférences utilisateur
   */
  preferences: {
    reducedMotion: false,
    highContrast: false,
    largeFonts: false,
    screenReader: false
  },
  
  /**
   * Initialise le système d'accessibilité
   */
  init() {
    this.detectUserPreferences();
    this.setupKeyboardNavigation();
    this.enhanceExistingElements();
    this.setupSkipLinks();
    this.setupFocusManagement();
    
    console.log('♿ [Accessibilité] Système initialisé');
  },
  
  /**
   * Détecte les préférences utilisateur
   */
  detectUserPreferences() {
    // Détection du mode réduit d'animations
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.preferences.reducedMotion = true;
      document.body.classList.add('reduced-motion');
      console.log('♿ [Accessibilité] Mode réduit d\'animation activé');
    }
    
    // Détection du contraste élevé
    if (window.matchMedia('(prefers-contrast: high)').matches) {
      this.preferences.highContrast = true;
      document.body.classList.add('high-contrast');
      console.log('♿ [Accessibilité] Contraste élevé activé');
    }
    
    // Écoute des changements de préférences
    window.matchMedia('(prefers-reduced-motion: reduce)').addListener((e) => {
      this.preferences.reducedMotion = e.matches;
      document.body.classList.toggle('reduced-motion', e.matches);
    });
  },
  
  /**
   * Améliore un élément avec des attributs ARIA
   */
  enhanceElement(element, options = {}) {
    if (!element) return element;
    
    // Attributs ARIA automatiques
    if (options.role) element.setAttribute('aria-role', options.role);
    if (options.label) element.setAttribute('aria-label', options.label);
    if (options.describedBy) element.setAttribute('aria-describedby', options.describedBy);
    if (options.expanded !== undefined) element.setAttribute('aria-expanded', options.expanded);
    if (options.hidden !== undefined) element.setAttribute('aria-hidden', options.hidden);
    if (options.live) element.setAttribute('aria-live', options.live);
    
    // Navigation clavier
    if (options.focusable !== false && !element.hasAttribute('tabindex')) {
      element.setAttribute('tabindex', '0');
    }
    
    // Gestion des touches
    if (options.keyHandler) {
      element.addEventListener('keydown', (e) => {
        switch (e.key) {
          case 'Enter':
          case ' ':
            if (element.tagName.toLowerCase() !== 'input') {
              e.preventDefault();
              element.click();
            }
            break;
          case 'Escape':
            if (options.onEscape) options.onEscape(e);
            break;
        }
      });
    }
    
    return element;
  },
  
  /**
   * Crée un élément accessible
   */
  createAccessibleElement(tag, options = {}) {
    const element = DOMUtils.createSafeElement(tag, options);
    return this.enhanceElement(element, options.accessibility || {});
  },
  
  /**
   * Configuration de la navigation clavier globale
   */
  setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
      // Navigation par flèches dans les listes
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        this.handleArrowNavigation(e);
      }
      
      // Raccourcis clavier
      if (e.altKey) {
        switch (e.key) {
          case '1':
            this.focusMainContent();
            e.preventDefault();
            break;
          case '2':
            this.focusNavigation();
            e.preventDefault();
            break;
          case 'm':
            this.toggleMainMenu();
            e.preventDefault();
            break;
        }
      }
    });
  },
  
  /**
   * Gestion de la navigation par flèches
   */
  handleArrowNavigation(e) {
    const focusedElement = document.activeElement;
    const parent = focusedElement.closest('[role="menu"], [role="listbox"], .theme-list-container, .flashcard-container');
    
    if (!parent) return;
    
    const focusableElements = parent.querySelectorAll('button, [tabindex="0"], input, select, textarea, a[href]');
    const currentIndex = Array.from(focusableElements).indexOf(focusedElement);
    
    if (currentIndex === -1) return;
    
    let nextIndex;
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % focusableElements.length;
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        nextIndex = currentIndex === 0 ? focusableElements.length - 1 : currentIndex - 1;
        break;
    }
    
    if (nextIndex !== undefined) {
      focusableElements[nextIndex].focus();
      e.preventDefault();
    }
  },
  
  /**
   * Améliore les éléments existants
   */
  enhanceExistingElements() {
    // Boutons principaux
    document.querySelectorAll('.main-btn, .nav-btn, .theme-list').forEach(btn => {
      if (!btn.hasAttribute('aria-label') && btn.textContent) {
        btn.setAttribute('aria-label', btn.textContent.trim());
      }
      btn.setAttribute('role', 'button');
    });
    
    // Formulaires
    document.querySelectorAll('input, select, textarea').forEach(input => {
      const label = document.querySelector(`label[for="${input.id}"]`);
      if (label && !input.hasAttribute('aria-labelledby')) {
        input.setAttribute('aria-labelledby', input.id + '-label');
        label.id = input.id + '-label';
      }
      
      // Validation en temps réel accessible
      input.addEventListener('invalid', (e) => {
        this.announceError(input, e.target.validationMessage);
      });
    });
    
    // Sections principales
    document.querySelectorAll('.container').forEach(container => {
      container.setAttribute('role', 'main');
      container.setAttribute('aria-label', 'Contenu principal');
    });
  },
  
  /**
   * Configuration des liens de saut
   */
  setupSkipLinks() {
    const skipLink = this.createAccessibleElement('a', {
      attributes: { href: '#main-content' },
      textContent: 'Aller au contenu principal',
      className: 'skip-link',
      style: {
        position: 'absolute',
        top: '-40px',
        left: '6px',
        background: '#000',
        color: '#fff',
        padding: '8px',
        textDecoration: 'none',
        zIndex: 9999,
        borderRadius: '4px'
      },
      accessibility: {
        label: 'Lien de navigation rapide vers le contenu principal'
      }
    });
    
    // Affichage au focus
    skipLink.addEventListener('focus', () => {
      skipLink.style.top = '6px';
    });
    
    skipLink.addEventListener('blur', () => {
      skipLink.style.top = '-40px';
    });
    
    document.body.insertBefore(skipLink, document.body.firstChild);
  },
  
  /**
   * Gestion avancée du focus
   */
  setupFocusManagement() {
    // Focus visible pour navigation clavier
    document.addEventListener('keydown', () => {
      document.body.classList.add('keyboard-navigation');
    });
    
    document.addEventListener('mousedown', () => {
      document.body.classList.remove('keyboard-navigation');
    });
    
    // Piège à focus pour les modales
    this.setupFocusTrap();
  },
  
  /**
   * Piège à focus pour modales
   */
  setupFocusTrap() {
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      
      const modal = document.querySelector('.modal[aria-modal="true"]');
      if (!modal) return;
      
      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    });
  },
  
  /**
   * Annonce les erreurs aux lecteurs d'écran
   */
  announceError(element, message) {
    let errorElement = document.getElementById(element.id + '-error');
    
    if (!errorElement) {
      errorElement = this.createAccessibleElement('div', {
        attributes: { id: element.id + '-error' },
        className: 'error-message',
        style: {
          color: '#dc3545',
          fontSize: '0.875rem',
          marginTop: '4px'
        },
        accessibility: {
          live: 'polite',
          role: 'alert'
        }
      });
      
      element.parentNode.insertBefore(errorElement, element.nextSibling);
      element.setAttribute('aria-describedby', errorElement.id);
    }
    
    errorElement.textContent = message;
    element.setAttribute('aria-invalid', 'true');
  },
  
  /**
   * Fonctions de navigation rapide
   */
  focusMainContent() {
    const main = document.querySelector('[role="main"], main, .container');
    if (main) {
      main.focus();
      this.announce('Contenu principal');
    }
  },
  
  focusNavigation() {
    const nav = document.querySelector('[role="navigation"], nav, .nav-btn');
    if (nav) {
      nav.focus();
      this.announce('Navigation');
    }
  },
  
  /**
   * Annonces pour lecteurs d'écran
   */
  announce(message, priority = 'polite') {
    const announcer = document.getElementById('aria-announcer') || 
      this.createAnnouncer();
    
    // Efface le contenu précédent pour forcer la relecture
    announcer.textContent = '';
    
    setTimeout(() => {
      announcer.textContent = message;
    }, 100);
  },
  
  /**
   * Crée l'élément d'annonce
   */
  createAnnouncer() {
    const announcer = this.createAccessibleElement('div', {
      attributes: { id: 'aria-announcer' },
      style: {
        position: 'absolute',
        left: '-10000px',
        width: '1px',
        height: '1px',
        overflow: 'hidden'
      },
      accessibility: {
        live: 'polite',
        role: 'status'
      }
    });
    
    document.body.appendChild(announcer);
    return announcer;
  }
};

window.SafeStorage = SafeStorage;
window.DataValidator = DataValidator;
window.PerformanceOptimizer = PerformanceOptimizer;
window.AccessibilityEnhancer = AccessibilityEnhancer;