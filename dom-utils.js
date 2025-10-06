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
      console.warn(`Element not found: ${selector}`);
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

// Export global pour utilisation facile
window.DOMUtils = {
  safeQuery,
  safeAddEventListener,
  createModal,
  safeSetContent,
  createBreakpointObserver,
  debounce
};