# Ruta del archivo YAML
$yamlFile = "win-todolistapp-springboot.yaml"

# Verificar si Minikube está corriendo
Write-Host "Verificando estado de Minikube..." -ForegroundColor Cyan
$minikubeStatus = minikube status | Select-String "Running"

if (-not $minikubeStatus) {
    Write-Host "Minikube no está corriendo. Iniciando Minikube..." -ForegroundColor Yellow
    minikube start
} else {
    Write-Host "Minikube ya está activo." -ForegroundColor Green
}

# Validar existencia del archivo YAML
if (-Not (Test-Path $yamlFile)) {
    Write-Host "Archivo YAML no encontrado: $yamlFile" -ForegroundColor Red
    exit 1
}

# Aplicar el YAML
Write-Host "Aplicando configuración desde $yamlFile..." -ForegroundColor Cyan
kubectl apply -f $yamlFile --namespace mtdrworkshop

# Mostrar recursos creados
Write-Host "`nRecursos desplegados:" -ForegroundColor Green
kubectl get all | Select-String "todolistapp"

# Mostrar servicios expuestos
Write-Host "`nServicios disponibles:" -ForegroundColor Green
kubectl get svc | Select-String "todolistapp"

# Acceder al servicio en navegador si se usa NodePort
minikube service todolistapp-springboot-service -n mtdrworkshop

Write-Host "`nAccede a tu app en: $serviceURL" -ForegroundColor Cyan
Start-Process $serviceURL
