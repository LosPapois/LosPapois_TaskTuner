# Ruta relativa a la carpeta wallet
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$walletPath = Join-Path $ScriptDir "/../wallet"
$namespace = "mtdrworkshop"
$secretName = "db-wallet-secret"

# Función para codificar archivos en base64
function Encode-File($filePath) {
    [Convert]::ToBase64String([IO.File]::ReadAllBytes($filePath))
}

# Diccionario de archivos a incluir
$files = @{
    "README"           = "README"
    "cwallet.sso"      = "cwallet.sso"
    "ewallet.p12"      = "ewallet.p12"
    "keystore.jks"     = "keystore.jks"
    "ojdbc.properties" = "ojdbc.properties"
    "sqlnet.ora"       = "sqlnet.ora"
    "tnsnames.ora"     = "tnsnames.ora"
    "truststore.jks"   = "truststore.jks"
}

# Crear sqlnet.ora si no existe
$sqlnetPath = Join-Path $walletPath "sqlnet.ora"
if (-not (Test-Path $sqlnetPath)) {
    @"
WALLET_LOCATION = (SOURCE = (METHOD = file) (METHOD_DATA = (DIRECTORY="/mtdrworkshop/creds")))
SSL_SERVER_DN_MATCH=yes
"@ | Set-Content $sqlnetPath
}
Write-Host "YAML build"
# Construir YAML del Secret
$yaml = @"
apiVersion: v1
kind: Secret
metadata:
  name: $secretName
  namespace: $namespace
type: Opaque
data:

"@

foreach ($key in $files.Keys) {
    $filePath = Join-Path $walletPath $files[$key]
    if (Test-Path $filePath) {
        $encoded = Encode-File $filePath
        $yaml += "  ${key}: $encoded`n"
    } else {
        Write-Host "Archivo no encontrado: $filePath"
    }
}

Write-Host $yaml -ForegroundColor Cyan

# Crear el Secret en Kubernetes
$yaml | kubectl apply -f -
