

// Récupère toutes les cartes de tous les thèmes (localStorage ou défaut)
function getAllCards() {
  const local = localStorage.getItem('themes');
  let all = [];
  if (local) {
    const obj = JSON.parse(local);
    Object.values(obj).forEach(arr => all = all.concat(arr));
    return all;
  }
  // défaut
  return [
    { en: "cat", fr: "chat" },
    { en: "dog", fr: "chien" },
    { en: "bird", fr: "oiseau" },
    { en: "apple", fr: "pomme" },
    { en: "bread", fr: "pain" },
    { en: "cheese", fr: "fromage" }
  ];
}
let allCards = getAllCards();


// =============================
// 2. Fonction utilitaire pour mélanger un tableau (algorithme de Fisher-Yates)
// =============================
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}


// =============================
// 3. Initialisation des variables d'état
// =============================
let cards = [...allCards]; // Copie mélangée des cartes
shuffle(cards);            // Mélange initial
let currentIndex = 0;      // Index de la carte courante
let score = 0;             // Score de l'utilisateur



// =============================
// 4. Récupération des éléments du DOM
// =============================
const flashcard = document.getElementById('flashcard'); // Élément principal de la carte
const cardFront = document.getElementById('cardFront'); // Face avant (mot anglais)
const answersDiv = document.getElementById('answers');  // Conteneur des réponses
const feedbackDiv = document.getElementById('feedback');// Message de feedback
const nextBtn = document.getElementById('nextBtn');     // Bouton "carte suivante"


// =============================
// 5. Affiche la carte courante et génère les réponses aléatoires
// =============================
function showCard() {
  // Recharge les cartes à chaque question pour inclure les ajouts
  allCards = getAllCards();
  cards = cards.length === allCards.length ? cards : [...allCards];
  // Affiche le mot anglais sur la "carte"
  const card = cards[currentIndex];
  cardFront.textContent = card.en;
  // Génère 3 mauvaises réponses + la bonne, puis mélange
  let wrongAnswers = allCards.filter(c => c.fr !== card.fr);
  shuffle(wrongAnswers);
  let options = wrongAnswers.slice(0, 3).map(c => c.fr);
  options.push(card.fr);
  shuffle(options);
  // Affiche les boutons de réponse
  answersDiv.innerHTML = '';
  options.forEach(option => {
    const btn = document.createElement('button');
    btn.textContent = option;
    btn.className = 'answer-btn';
    btn.onclick = () => selectAnswer(option, card.fr, btn);
    answersDiv.appendChild(btn);
  });
  feedbackDiv.textContent = '';
  nextBtn.style.display = 'none';
}




// =============================
// 6. Gestion de la sélection d'une réponse
// =============================
function selectAnswer(selected, correct, btn) {
  // Désactive tous les boutons
  Array.from(answersDiv.children).forEach(b => b.disabled = true);
  if (selected === correct) {
    btn.style.background = '#4caf50'; // vert
    feedbackDiv.textContent = 'Bonne réponse !';
    score++;
  } else {
    btn.style.background = '#e74c3c'; // rouge
    feedbackDiv.textContent = `Mauvaise réponse. La bonne réponse était : ${correct}`;
    // Met en surbrillance la bonne réponse
    Array.from(answersDiv.children).forEach(b => {
      if (b.textContent === correct) b.style.background = '#4caf50';
    });
  }
  nextBtn.style.display = '';
}


// =============================
// 7. Gestion du bouton "carte suivante" (manuel)
// =============================
nextBtn.onclick = function() {
  currentIndex++;
  if (currentIndex >= cards.length) {
    shuffle(cards);
    currentIndex = 0;
  }
  showCard();
};


// =============================
// 8. Affichage initial de la première carte
// =============================
showCard();
