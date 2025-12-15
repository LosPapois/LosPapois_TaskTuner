$namespace = "mtdrworkshop"

# Verificar si el namespace existe
$nsExists = kubectl get namespace $namespace -o json 2>$null
if (-not $nsExists) {
    Write-Host "Namespace '$namespace' no existe. Creando..." -ForegroundColor Yellow

    $nsYaml = @"
apiVersion: v1
kind: Namespace
metadata:
  name: $namespace
"@

    $nsYaml | kubectl apply -f -
} else {
    Write-Host "Namespace '$namespace' ya existe." -ForegroundColor Green
}