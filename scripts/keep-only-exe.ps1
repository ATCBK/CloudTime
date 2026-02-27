param()

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$releaseDir = Join-Path $projectRoot "release"

if (-not (Test-Path $releaseDir)) {
  throw "Release directory not found: $releaseDir"
}

Get-ChildItem -Path $releaseDir -File |
  Where-Object { $_.Extension -ne ".exe" } |
  Remove-Item -Force

Get-ChildItem -Path $releaseDir -Directory |
  Remove-Item -Recurse -Force

Write-Host "Kept only .exe files in: $releaseDir"
