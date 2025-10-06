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
  const select = document.getElementById('themeSelect');
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

  const form = document.getElementById('addCardForm');
  const addMsg = document.getElementById('addMsg');

  form.onsubmit = function(e) {
    e.preventDefault();
    const themes = getThemes();
    let theme = document.getElementById('themeSelect').value.trim();
    const newTheme = document.getElementById('newTheme').value.trim();
    const en = document.getElementById('enWord').value.trim();
    const fr = document.getElementById('frWord').value.trim();
    
    if (newTheme) theme = newTheme;
    
    if (!theme || !en || !fr) {
      showMessage('⚠️ Veuillez remplir tous les champs requis.', 'error');
      return;
    }
    
    if (!themes[theme]) themes[theme] = [];
    themes[theme].push({ en, fr });
    saveThemes(themes);
    updateThemeSelect();
    form.reset();
    
    showMessage(`✅ Carte "${en} → ${fr}" ajoutée au thème "${theme}" !`, 'success');
  };

  function showMessage(text, type) {
    const addMsg = document.getElementById('addMsg');
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
});
