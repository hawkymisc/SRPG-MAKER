# jq を .claude/tools に配置する(Claude Code フック用)
$ErrorActionPreference = "Stop"
$toolsDir = Join-Path $PSScriptRoot "..\.claude\tools"
$jqPath = Join-Path $toolsDir "jq.exe"

if (Test-Path $jqPath) {
  Write-Host "jq already present: $jqPath"
  & $jqPath --version
  exit 0
}

New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null
$url = "https://github.com/jqlang/jq/releases/download/jq-1.8.1/jq-windows-amd64.exe"
Write-Host "Downloading jq from $url ..."
Invoke-WebRequest -Uri $url -OutFile $jqPath
& $jqPath --version
Write-Host "Installed: $jqPath"
