param()

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$sourcePng = Join-Path $projectRoot "etc\云朵待办.png"
$targetIco = Join-Path $projectRoot "build\icon.ico"

if (-not (Test-Path $sourcePng)) {
  throw "Icon source not found: $sourcePng"
}

Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class NativeMethods {
  [DllImport("user32.dll", SetLastError = true)]
  public static extern bool DestroyIcon(IntPtr hIcon);
}
"@

$bitmap = $null
$icon = $null
$fileStream = $null
$hIcon = [IntPtr]::Zero

try {
  $bitmap = [System.Drawing.Bitmap]::FromFile($sourcePng)
  $hIcon = $bitmap.GetHicon()
  $icon = [System.Drawing.Icon]::FromHandle($hIcon)
  $fileStream = New-Object System.IO.FileStream($targetIco, [System.IO.FileMode]::Create)
  $icon.Save($fileStream)
}
finally {
  if ($fileStream) { $fileStream.Dispose() }
  if ($icon) { $icon.Dispose() }
  if ($bitmap) { $bitmap.Dispose() }
  if ($hIcon -ne [IntPtr]::Zero) { [NativeMethods]::DestroyIcon($hIcon) | Out-Null }
}

Write-Host "Prepared icon: $targetIco"
