# Define variables
$namespace = "mtdrworkshop"
$secretName = "dbuser"
$base64Password = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("None00010001"))
$json = @"
{
  "apiVersion": "v1",
  "kind": "Secret",
  "metadata": {
    "name": "$secretName"
  },
  "data": {
    "dbpassword": "$base64Password"
  }
}
"@

# Función para verificar si el secreto ya fue creado
function Is-SecretCreated {
    kubectl get secret $secretName -n $namespace > $null 2>&1
    return $?
}

# Intentar crear el secreto hasta que se logre
while (-not (Is-SecretCreated)) {
    Write-Host "Intentando crear el secreto de DB..."
    try {
        $json | kubectl create -n $namespace -f -
        Write-Host "Secreto creado exitosamente."
        break
    } catch {
        Write-Host "Error al crear el secreto. Reintentando en 10 segundos..."
        Start-Sleep -Seconds 10
    }
}