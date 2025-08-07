
// Récupère les thèmes depuis le localStorage ou valeurs par défaut
function getThemes() {
  const local = localStorage.getItem('themes');
  if (local) return JSON.parse(local);
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
let themes = getThemes();

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

function showThemes() {
  themes = getThemes();
  themeList.innerHTML = '';
  Object.keys(themes).forEach(theme => {
    const btn = document.createElement('button');
    btn.textContent = theme;
    btn.onclick = () => startRevision(theme);
    themeList.appendChild(btn);
  });
}

function startRevision(theme) {
  currentTheme = theme;
  currentIndex = 0;
  flipped = false;
  themeList.style.display = 'none';
  flashcardSection.style.display = '';
  showCard();
}

function showCard() {
  const card = themes[currentTheme][currentIndex];
  cardFront.textContent = card.en;
  cardBack.textContent = '';
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
