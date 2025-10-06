// Gestion de l'ajout de thèmes et de cartes (localStorage)

// Récupère les thèmes existants (stockés ou par défaut)
function getThemes() {
  const local = localStorage.getItem('themes');
  if (local) return JSON.parse(local);
  // Valeurs par défaut si rien en localStorage
  return {
    "Animaux": [
      { en: "cat", fr: "chat" },
      { en: "dog", fr: "chien" },
      { en: "bird", fr: "oiseau" }
    ],
    "Nourriture": [
      { en: "apple", fr: "pomme" },
      { en: "bread", fr: "pain" },
      { en: "cheese", fr: "fromage" }
    ]
  };
}

function saveThemes(themes) {
  localStorage.setItem('themes', JSON.stringify(themes));
}

function updateThemeSelect() {
  const themes = getThemes();
  const select = DOMUtils.safeQuery('#themeSelect');
  if (!select) {
    console.error('❌ [Ajout] themeSelect non trouvé');
    return;
  }
  select.innerHTML = '';
  Object.keys(themes).forEach(theme => {
    const opt = document.createElement('option');
    opt.value = theme;
    opt.textContent = theme;
    select.appendChild(opt);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  updateThemeSelect();

  const form = DOMUtils.safeQuery('#addCardForm');
  const addMsg = DOMUtils.safeQuery('#addMsg');

  if (!form || !addMsg) {
    console.error('❌ [Ajout] Éléments de formulaire non trouvés');
    return;
  }

  form.onsubmit = function(e) {
    e.preventDefault();
    const themes = getThemes();
    
    // Récupération sécurisée des champs
    const themeSelect = DOMUtils.safeQuery('#themeSelect');
    const newThemeInput = DOMUtils.safeQuery('#newTheme');
    const enInput = DOMUtils.safeQuery('#enWord');
    const frInput = DOMUtils.safeQuery('#frWord');
    
    if (!themeSelect || !newThemeInput || !enInput || !frInput) {
      showMessage(addMsg, '❌ Erreur: Champs manquants', 'error');
      return;
    }
    
    let theme = themeSelect.value.trim();
    const newTheme = newThemeInput.value.trim();
    const en = enInput.value.trim();
    const fr = frInput.value.trim();
    
    if (newTheme) theme = newTheme;
    
    // NOUVELLE VALIDATION ROBUSTE avec DataValidator
    const cardData = {
      fr: fr,
      en: en,
      ja: '', // Pas de japonais pour l'instant
      theme: theme,
      langue: 'anglais' // Par défaut pour ajout.js
    };
    
    const validation = DataValidator.validateCard(cardData);
    
    if (!validation.isValid) {
      let errorMessage = '❌ Erreurs de validation:\n';
      Object.entries(validation.errors).forEach(([field, errors]) => {
        errorMessage += `• ${field}: ${errors.join(', ')}\n`;
      });
      showMessage(errorMessage, 'error');
      return;
    }
    
    // Utilise les données sanitizées
    const sanitizedCard = validation.sanitizedCard;
    
    if (!themes[sanitizedCard.theme]) themes[sanitizedCard.theme] = [];
    
    // SÉCURITÉ: Utilise les données sanitizées au lieu des données brutes
    themes[sanitizedCard.theme].push({ 
      en: sanitizedCard.en, 
      fr: sanitizedCard.fr,
      langue: sanitizedCard.langue
    });
    
    console.log('✅ [Ajout] Carte validée et sanitizée:', sanitizedCard);
    saveThemes(themes);
    updateThemeSelect();
    form.reset();
    
    showMessage(`✅ Carte "${sanitizedCard.en} → ${sanitizedCard.fr}" ajoutée au thème "${sanitizedCard.theme}" !`, 'success');
  };

  function showMessage(text, type, element = null) {
    const addMsg = element || DOMUtils.safeQuery('#addMsg');
    if (!addMsg) {
      console.error('❌ [Ajout] addMsg non trouvé');
      return;
    }
    addMsg.textContent = text;
    addMsg.style.display = 'block';
    
    if (type === 'success') {
      addMsg.style.background = 'rgba(16, 185, 129, 0.1)';
      addMsg.style.border = '2px solid rgba(16, 185, 129, 0.3)';
      addMsg.style.color = '#065f46';
    } else if (type === 'error') {
      addMsg.style.background = 'rgba(239, 68, 68, 0.1)';
      addMsg.style.border = '2px solid rgba(239, 68, 68, 0.3)';
      addMsg.style.color = '#991b1b';
    }
    
    setTimeout(() => {
      addMsg.style.display = 'none';
    }, 4000);
  }

  /**
   * Validation en temps réel des champs
   */
  function setupLiveValidation() {
    const fields = [
      { id: 'enWord', type: 'word', label: 'Mot anglais' },
      { id: 'frWord', type: 'word', label: 'Mot français' },
      { id: 'newTheme', type: 'theme', label: 'Nouveau thème' }
    ];
    
    fields.forEach(field => {
      const input = document.getElementById(field.id);
      if (!input) return;
      
      // Validation à la frappe
      input.addEventListener('input', function() {
        const validation = DataValidator.validate(this.value, field.type);
        
        // Style visuel selon validation
        if (this.value.trim() === '') {
          // Champ vide - style neutre
          this.style.borderColor = '';
          this.style.boxShadow = '';
          this.title = '';
        } else if (validation.isValid) {
          // Valide - bordure verte
          this.style.borderColor = '#28a745';
          this.style.boxShadow = '0 0 0 0.2rem rgba(40, 167, 69, 0.25)';
          this.title = '✅ Format valide';
        } else {
          // Invalide - bordure rouge
          this.style.borderColor = '#dc3545';
          this.style.boxShadow = '0 0 0 0.2rem rgba(220, 53, 69, 0.25)';
          this.title = '❌ ' + validation.errors.join(', ');
        }
      });
      
      // Validation à la perte de focus
      input.addEventListener('blur', function() {
        if (this.value.trim() !== '') {
          const validation = DataValidator.validate(this.value, field.type);
          if (validation.isValid && validation.sanitizedValue !== this.value) {
            // Applique la sanitization automatiquement
            this.value = validation.sanitizedValue;
            console.log(`🧹 [Validation] ${field.label} sanitizé:`, validation.sanitizedValue);
          }
        }
      });
    });
  }

  // Configuration des validations
  setupLiveValidation();
});
