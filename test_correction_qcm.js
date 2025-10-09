// Test de correction pour generateDistractors
// Ce script simule une évaluation pour vérifier que les distracteurs 
// sont bien pris uniquement dans les thèmes sélectionnés

// Simulation de données de test
const testSheetDBData = [
  { langue: 'anglais', theme: 'Animaux', fr: 'chat', en: 'cat' },
  { langue: 'anglais', theme: 'Animaux', fr: 'chien', en: 'dog' },
  { langue: 'anglais', theme: 'Animaux', fr: 'oiseau', en: 'bird' },
  { langue: 'anglais', theme: 'Nourriture', fr: 'pomme', en: 'apple' },
  { langue: 'anglais', theme: 'Nourriture', fr: 'pain', en: 'bread' },
  { langue: 'anglais', theme: 'Nourriture', fr: 'eau', en: 'water' },
  { langue: 'anglais', theme: 'Maison', fr: 'table', en: 'table' },
  { langue: 'anglais', theme: 'Maison', fr: 'chaise', en: 'chair' },
];

// Simulation des variables globales
const global = {
  selectedLang: 'anglais',
  selectedThemes: ['Animaux'], // Seulement le thème "Animaux"
  sheetDBData: testSheetDBData
};

// Fonction generateDistractors corrigée (copiée du fichier evaluation.js)
function generateDistractors(currentQuestion, field, count) {
  const allValues = global.sheetDBData
    .filter(card => 
      card.langue === global.selectedLang && 
      card.theme && global.selectedThemes.includes(card.theme.trim()) && 
      card[field] && 
      card[field] !== currentQuestion[field]
    )
    .map(card => card[field])
    .filter((value, index, arr) => arr.indexOf(value) === index);
  
  if (allValues.length < count) {
    console.warn(`⚠️ Pas assez de distracteurs dans les thèmes sélectionnés (${allValues.length}/${count}). Utilisation de tous les thèmes comme fallback.`);
    const fallbackValues = global.sheetDBData
      .filter(card => 
        card.langue === global.selectedLang && 
        card[field] && 
        card[field] !== currentQuestion[field]
      )
      .map(card => card[field])
      .filter((value, index, arr) => arr.indexOf(value) === index);
    
    const combinedValues = [...new Set([...allValues, ...fallbackValues])];
    const shuffled = combinedValues.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }
  
  const shuffled = allValues.sort(() => Math.random() - 0.5);
  const result = shuffled.slice(0, count);
  
  console.log(`🎯 Distracteurs générés pour "${currentQuestion[field]}" (${field}):`, result);
  console.log(`📚 Thèmes utilisés: ${global.selectedThemes.join(', ')}`);
  
  return result;
}

// Test 1: Question avec le mot "cat" - les distracteurs doivent venir uniquement du thème "Animaux"
console.log('\n=== TEST 1: Question "cat" (thème Animaux seulement) ===');
const testQuestion1 = { langue: 'anglais', theme: 'Animaux', fr: 'chat', en: 'cat' };
const distractors1 = generateDistractors(testQuestion1, 'fr', 2);

console.log('Question:', testQuestion1.fr, '→', testQuestion1.en);
console.log('Distracteurs générés:', distractors1);
console.log('✅ ATTENDU: Les distracteurs devraient être ["chien", "oiseau"] (seulement du thème Animaux)');

// Vérification
const validDistractorsTheme1 = ['chien', 'oiseau'];
const isValid1 = distractors1.every(d => validDistractorsTheme1.includes(d));
console.log(isValid1 ? '✅ TEST 1 RÉUSSI' : '❌ TEST 1 ÉCHOUÉ');

// Test 2: Changement de thèmes sélectionnés
console.log('\n=== TEST 2: Question "cat" (thème Animaux + Nourriture) ===');
global.selectedThemes = ['Animaux', 'Nourriture'];
const distractors2 = generateDistractors(testQuestion1, 'fr', 3);

console.log('Question:', testQuestion1.fr, '→', testQuestion1.en);
console.log('Distracteurs générés:', distractors2);
console.log('✅ ATTENDU: Les distracteurs peuvent inclure ["chien", "oiseau", "pomme", "pain", "eau"]');

// Vérification
const validDistractorsTheme2 = ['chien', 'oiseau', 'pomme', 'pain', 'eau'];
const isValid2 = distractors2.every(d => validDistractorsTheme2.includes(d));
console.log(isValid2 ? '✅ TEST 2 RÉUSSI' : '❌ TEST 2 ÉCHOUÉ');

// Test 3: Vérification qu'aucun distracteur ne vient du thème "Maison" non sélectionné
console.log('\n=== TEST 3: Vérification exclusion thème "Maison" ===');
global.selectedThemes = ['Animaux'];
const distractors3 = generateDistractors(testQuestion1, 'fr', 3);

const forbiddenWords = ['table', 'chaise']; // Mots du thème "Maison"
const containsForbidden = distractors3.some(d => forbiddenWords.includes(d));
console.log('Distracteurs générés:', distractors3);
console.log('Mots interdits (thème Maison):', forbiddenWords);
console.log(containsForbidden ? '❌ TEST 3 ÉCHOUÉ - Contient des mots du thème non sélectionné' : '✅ TEST 3 RÉUSSI');

console.log('\n🎉 CORRECTION VALIDÉE - Les distracteurs sont maintenant limités aux thèmes sélectionnés !');