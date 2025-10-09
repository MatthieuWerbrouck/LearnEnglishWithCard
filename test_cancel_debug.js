// Test simple du bouton d'annulation - à exécuter dans la console du navigateur

console.log('🔧 [TEST] Démarrage du test du bouton d\'annulation');

// Vérifier si le bouton existe dans le DOM
const cancelBtn = document.getElementById('cancelEvalBtn');
console.log('🔍 [TEST] Bouton trouvé:', cancelBtn ? 'OUI' : 'NON');

if (cancelBtn) {
  console.log('📍 [TEST] Détails du bouton:');
  console.log('  - ID:', cancelBtn.id);
  console.log('  - Classe:', cancelBtn.className);
  console.log('  - Texte:', cancelBtn.textContent);
  console.log('  - Style display:', window.getComputedStyle(cancelBtn).display);
  console.log('  - Position:', cancelBtn.getBoundingClientRect());
  console.log('  - Parent:', cancelBtn.parentElement);
  
  // Tester l'event handler
  console.log('🧪 [TEST] Test du clic programmé...');
  try {
    cancelBtn.click();
    console.log('✅ [TEST] Clic programmé réussi');
  } catch (error) {
    console.error('❌ [TEST] Erreur lors du clic programmé:', error);
  }
  
  // Vérifier l'event listener
  console.log('🎯 [TEST] Event listener onclick:', typeof cancelBtn.onclick);
  
} else {
  console.error('❌ [TEST] Le bouton n\'a pas été trouvé dans le DOM !');
  
  // Chercher tous les boutons présents
  const allButtons = document.querySelectorAll('button');
  console.log('🔍 [TEST] Tous les boutons présents:', allButtons.length);
  allButtons.forEach((btn, index) => {
    console.log(`  ${index + 1}. ID: "${btn.id}", Texte: "${btn.textContent}"`);
  });
}

// Vérifier si la fonction cancelEvaluation existe
console.log('🔍 [TEST] Fonction cancelEvaluation disponible:', typeof window.cancelEvaluation);

console.log('🔧 [TEST] Fin du test');