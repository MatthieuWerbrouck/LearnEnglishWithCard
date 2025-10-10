# Script de démonstration des écarts de précision
Write-Host "🎯 Démonstration des Écarts de Précision" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Simulation de différents cas de scores
$testCases = @(
    @{Name="Animaux"; Correct=17; Total=23},
    @{Name="Transport"; Correct=13; Total=18},
    @{Name="Couleurs"; Correct=7; Total=9},
    @{Name="Nourriture"; Correct=5; Total=8}
)

foreach ($case in $testCases) {
    $realRate = $case.Correct / $case.Total
    
    # Ancien système (arrondi brutal)
    $oldScore = [Math]::Round($realRate * 10)
    $oldPercent = [Math]::Round(($oldScore / 10) * 100)
    
    # Nouveau système (précis)
    $newScore = [Math]::Round($realRate * 10 * 1000) / 1000
    $newPercent = [Math]::Round(($newScore / 10) * 100 * 100) / 100
    
    # Vrai pourcentage pour référence
    $truePercent = [Math]::Round($realRate * 100 * 100) / 100
    
    Write-Host "📚 Thème: $($case.Name) ($($case.Correct)/$($case.Total) bonnes réponses)" -ForegroundColor Yellow
    Write-Host "   Pourcentage réel: $truePercent%" -ForegroundColor White
    Write-Host "   Ancien système:   $oldPercent% (écart: $([Math]::Round($truePercent - $oldPercent, 2)) points)" -ForegroundColor Red
    Write-Host "   Nouveau système:  $newPercent% (écart: $([Math]::Round($truePercent - $newPercent, 2)) points)" -ForegroundColor Green
    Write-Host "   Amélioration:     $([Math]::Round($newPercent - $oldPercent, 2)) points de précision gagné" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host "✅ Résultat: Le nouveau système élimine les écarts de précision !" -ForegroundColor Green
