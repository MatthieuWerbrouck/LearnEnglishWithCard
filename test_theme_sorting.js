// Test du tri des thèmes par note dans l'évaluation
console.log('🧪 [TEST] Test du tri des thèmes par note');

// Simulation de la fonction getScoreForTheme
function mockGetScoreForTheme(lang, theme) {
  const scores = {
    'anglais:Animaux': 3,      // Faible score - doit être en premier
    'anglais:Nourriture': 8,   // Excellent score - doit être en dernier
    'anglais:Maison': 6,       // Bon score - doit être au milieu
    'anglais:Transport': null, // Nouveau - doit être tout en premier
    'anglais:Couleurs': 4      // En progression - doit être après les nouveaux
  };
  
  const key = `${lang}:${theme}`;
  return scores[key] !== undefined ? scores[key] : null;
}

// Simulation des thèmes bruts (non triés)
const rawThemes = ['Nourriture', 'Animaux', 'Maison', 'Transport', 'Couleurs'];
const selectedLang = 'anglais';

console.log('📝 [TEST] Thèmes avant tri:', rawThemes);
console.log('📊 [TEST] Scores simulés:');
rawThemes.forEach(theme => {
  const score = mockGetScoreForTheme(selectedLang, theme);
  console.log(`  - ${theme}: ${score !== null ? score + '/10' : 'nouveau'}`);
});

// Algorithme de tri (copié du code evaluation.js)
const themes = rawThemes.sort((themeA, themeB) => {
  const scoreA = mockGetScoreForTheme(selectedLang, themeA);
  const scoreB = mockGetScoreForTheme(selectedLang, themeB);
  
  // Les thèmes sans score (null) sont placés en premier (priorité max)
  if (scoreA === null && scoreB === null) return themeA.localeCompare(themeB);
  if (scoreA === null) return -1; // themeA avant themeB
  if (scoreB === null) return 1;  // themeB avant themeA
  
  // Tri par score croissant (plus faibles en premier)
  return scoreA - scoreB;
});

console.log('\n🎯 [TEST] Thèmes après tri par note croissante:');
themes.forEach((theme, index) => {
  const score = mockGetScoreForTheme(selectedLang, theme);
  const emoji = score === null ? '🆕' : 
                score >= 8 ? '🏆' : 
                score >= 6 ? '⭐' : 
                score >= 4 ? '📈' : '💪';
  console.log(`  ${index + 1}. ${emoji} ${theme} (${score !== null ? score + '/10' : 'nouveau'})`);
});

// Test du tooltip
console.log('\n📋 [TEST] Simulation des tooltips:');
themes.forEach(theme => {
  const score = mockGetScoreForTheme(selectedLang, theme);
  const wordCount = Math.floor(Math.random() * 20) + 5; // Simule 5-24 mots
  
  let tooltipText = `${wordCount} mot${wordCount > 1 ? 's' : ''} dans ce thème`;
  if (score !== null) {
    let scoreEmoji = '📖';
    if (score >= 8) scoreEmoji = '🏆';
    else if (score >= 6) scoreEmoji = '⭐';
    else if (score >= 4) scoreEmoji = '📈';
    else scoreEmoji = '💪';
    
    tooltipText += `\n${scoreEmoji} Note: ${score}/10`;
  } else {
    tooltipText += '\n🆕 Nouveau thème (pas encore évalué)';
  }
  
  console.log(`  📝 ${theme}: "${tooltipText.replace('\n', ' | ')}"`);
});

// Validation du tri
console.log('\n✅ [VALIDATION]');
const expectedOrder = ['Transport', 'Animaux', 'Couleurs', 'Maison', 'Nourriture'];
const isCorrectOrder = JSON.stringify(themes) === JSON.stringify(expectedOrder);

console.log(`📊 Ordre attendu: ${expectedOrder.join(' → ')}`);
console.log(`📊 Ordre obtenu:  ${themes.join(' → ')}`);
console.log(`🎯 Tri correct: ${isCorrectOrder ? '✅ RÉUSSI' : '❌ ÉCHOUÉ'}`);

if (isCorrectOrder) {
  console.log('\n🎉 Le tri par note fonctionne parfaitement !');
  console.log('📋 Priorité des thèmes:');
  console.log('  1️⃣ Nouveaux thèmes (pas encore étudiés)');
  console.log('  2️⃣ Scores faibles (besoin de travail)');
  console.log('  3️⃣ Scores moyens (en progression)');
  console.log('  4️⃣ Bons scores (bien maîtrisés)');
  console.log('  5️⃣ Excellents scores (acquis)');
} else {
  console.log('\n❌ Le tri ne fonctionne pas correctement');
}

console.log('\n🔧 [TEST] Fin du test');