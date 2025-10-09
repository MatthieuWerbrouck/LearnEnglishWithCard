// Test de déduplication des mots dans les évaluations
// Vérifie qu'un même mot n'apparaît pas plusieurs fois dans une évaluation

console.log('🧪 [TEST] Démarrage du test de déduplication des mots');

// Simulation de données avec doublons
const testData = [
  { langue: 'anglais', theme: 'Animaux', fr: 'chat', en: 'cat' },
  { langue: 'anglais', theme: 'Animaux', fr: 'chat', en: 'cat' }, // Doublon exact
  { langue: 'anglais', theme: 'Animaux', fr: 'chien', en: 'dog' },
  { langue: 'anglais', theme: 'Animaux', fr: 'oiseau', en: 'bird' },
  { langue: 'anglais', theme: 'Animaux', fr: 'chien', en: 'dog' }, // Doublon exact
  { langue: 'anglais', theme: 'Nourriture', fr: 'pomme', en: 'apple' },
  { langue: 'anglais', theme: 'Nourriture', fr: 'pain', en: 'bread' },
  { langue: 'anglais', theme: 'Nourriture', fr: 'pomme', en: 'apple' }, // Doublon exact
];

// Simulation des variables globales
const testGlobal = {
  selectedLang: 'anglais',
  selectedThemes: ['Animaux', 'Nourriture'],
  selectedEvalMode: 'qcm_fr_lang', // Mode français vers anglais
  selectedQuestionCount: 10
};

console.log('📊 [TEST] Données de test:', testData.length, 'cartes');
console.log('🎯 [TEST] Doublons attendus: chat/cat (2x), chien/dog (2x), pomme/apple (2x)');

// Algorithme de déduplication (copié du code corrigé)
function testDeduplication(cards, selectedLang, selectedThemes, selectedEvalMode) {
  // Filtre les cartes selon les thèmes sélectionnés et la langue
  const filteredCards = cards.filter(card => {
    const langueOk = card.langue && card.langue.trim() === selectedLang;
    const themeOk = card.theme && selectedThemes.includes(card.theme.trim());
    const francaisOk = card.fr && card.fr.trim();
    const traductionOk = card.en && card.en.trim();
    
    return langueOk && themeOk && francaisOk && traductionOk;
  });
  
  console.log('📝 [TEST] Cartes filtrées:', filteredCards.length);
  
  // Éliminer les doublons basés sur le contenu des mots
  const uniqueCards = [];
  const seenWords = new Set();
  
  // Détermine la clé principale selon le mode d'évaluation
  const langKey = 'en';
  const primaryKey = selectedEvalMode === 'qcm_lang_fr' || selectedEvalMode === 'libre' ? 
    langKey : 'fr';
  
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
      console.log(`✅ [TEST] Ajouté: ${primaryWord} ↔ ${secondaryWord}`);
    } else {
      console.log(`❌ [TEST] Doublon éliminé: ${primaryWord} ↔ ${secondaryWord}`);
    }
  });
  
  return {
    original: filteredCards.length,
    unique: uniqueCards.length,
    eliminated: filteredCards.length - uniqueCards.length,
    cards: uniqueCards
  };
}

// Test 1: Mode français vers anglais
console.log('\n=== TEST 1: Mode QCM français → anglais ===');
const result1 = testDeduplication(testData, testGlobal.selectedLang, testGlobal.selectedThemes, 'qcm_fr_lang');

console.log(`📊 [TEST] Résultats:`);
console.log(`  - Cartes originales: ${result1.original}`);
console.log(`  - Cartes uniques: ${result1.unique}`);
console.log(`  - Doublons éliminés: ${result1.eliminated}`);

// Vérification des mots uniques
const uniqueWords = result1.cards.map(card => `${card.fr}↔${card.en}`);
console.log(`🔍 [TEST] Mots uniques finaux:`, uniqueWords);

// Test 2: Mode anglais vers français
console.log('\n=== TEST 2: Mode QCM anglais → français ===');
const result2 = testDeduplication(testData, testGlobal.selectedLang, testGlobal.selectedThemes, 'qcm_lang_fr');

console.log(`📊 [TEST] Résultats:`);
console.log(`  - Cartes originales: ${result2.original}`);
console.log(`  - Cartes uniques: ${result2.unique}`);
console.log(`  - Doublons éliminés: ${result2.eliminated}`);

// Validation
const expectedUnique = 5; // chat, chien, oiseau, pomme, pain (5 mots uniques)
const test1Valid = result1.unique === expectedUnique;
const test2Valid = result2.unique === expectedUnique;

console.log('\n🎯 [RÉSULTATS FINAUX]');
console.log(`✅ TEST 1 (FR→EN): ${test1Valid ? 'RÉUSSI' : 'ÉCHOUÉ'} (${result1.unique}/${expectedUnique})`);
console.log(`✅ TEST 2 (EN→FR): ${test2Valid ? 'RÉUSSI' : 'ÉCHOUÉ'} (${result2.unique}/${expectedUnique})`);
console.log(`🎉 DÉDUPLICATION: ${test1Valid && test2Valid ? 'FONCTIONNELLE' : 'À CORRIGER'}`);

// Test 3: Vérification qu'aucun mot n'apparaît deux fois dans la liste finale
console.log('\n=== TEST 3: Vérification absence de doublons dans résultat final ===');
const finalWords = result1.cards.map(card => card.fr.toLowerCase());
const hasDuplicates = finalWords.length !== new Set(finalWords).size;

console.log(`🔍 [TEST] Mots français finaux:`, finalWords);
console.log(`✅ TEST 3 (Pas de doublons): ${!hasDuplicates ? 'RÉUSSI' : 'ÉCHOUÉ'}`);

if (test1Valid && test2Valid && !hasDuplicates) {
  console.log('\n🎉 TOUS LES TESTS RÉUSSIS - La déduplication fonctionne correctement !');
} else {
  console.log('\n❌ ÉCHEC - Il reste des problèmes à corriger');
}