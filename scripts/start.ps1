$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$sceneUrl = 'http://127.0.0.1:8787/'
Set-Location -LiteralPath $projectDirectory

try {
    $existing = Invoke-WebRequest -Uri $sceneUrl -UseBasicParsing -TimeoutSec 2
    if ($existing.Content -match 'A Forest in the Sun') {
        Start-Process $sceneUrl
        exit 0
    }
    throw 'Port 8787 is occupied by another project.'
} catch {
    if ($_.Exception.Message -match 'occupied') { throw }
}

if (-not (Test-Path -LiteralPath (Join-Path $projectDirectory 'node_modules\vite\bin\vite.js'))) {
    & npm.cmd ci --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
}
$nodeExecutable = (Get-Command node.exe).Source
$viteEntry = Join-Path $projectDirectory 'node_modules\vite\bin\vite.js'
$serverProcess = Start-Process -FilePath $nodeExecutable -ArgumentList @("`"$viteEntry`"", '--host', '127.0.0.1', '--port', '8787', '--strictPort') -WorkingDirectory $projectDirectory -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $projectDirectory 'server.log') -RedirectStandardError (Join-Path $projectDirectory 'server-error.log')
for ($attempt = 0; $attempt -lt 30; $attempt++) {
    Start-Sleep -Milliseconds 300
    if ($serverProcess.HasExited) { throw 'Server exited; inspect server-error.log.' }
    try {
        $response = Invoke-WebRequest -Uri $sceneUrl -UseBasicParsing -TimeoutSec 1
        if ($response.StatusCode -eq 200) {
            Set-Content -LiteralPath (Join-Path $projectDirectory '.server-pid') -Value $serverProcess.Id
            Start-Process $sceneUrl
            Write-Host "Meiji Jingu is running at $sceneUrl"
            exit 0
        }
    } catch { }
}
throw 'Server did not become ready; inspect server.log and server-error.log.'
