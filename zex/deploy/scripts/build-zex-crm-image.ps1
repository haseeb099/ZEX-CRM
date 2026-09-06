# Build immutable ZEX-CRM production image (Windows PowerShell).
# Equivalent to build-zex-crm-image.sh
#
# Usage (repo root):
#   powershell -File zex/deploy/scripts/build-zex-crm-image.ps1
#   $env:ZEX_CRM_IMAGE_REPO='ghcr.io/example/zex-crm'; powershell -File zex/deploy/scripts/build-zex-crm-image.ps1

$ErrorActionPreference = 'Stop'
$Root = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
Set-Location $Root

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'git is required' }
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'docker is required' }

$FullSha = (git rev-parse HEAD).Trim()
$ShortSha = (git rev-parse --short=12 HEAD).Trim()
$Repo = if ($env:ZEX_CRM_IMAGE_REPO) { $env:ZEX_CRM_IMAGE_REPO } else { 'zex-crm' }
$FullTag = "${Repo}:${FullSha}"
$ShortTag = "${Repo}:${ShortSha}"
# Twenty config validates APP_VERSION as semver; keep git SHA in the image tag
# and bake the commit into build metadata (0.0.0+<sha>).
$AppSemver = "0.0.0+$FullSha"

if ($FullTag -match ':latest$' -or $ShortTag -match ':latest$') {
  throw 'refusing to tag :latest'
}

Write-Host "Building ZEX-CRM image from $FullSha"
Write-Host "  tags: $FullTag $ShortTag"
Write-Host "  APP_VERSION (semver): $AppSemver"

docker build `
  -f packages/twenty-docker/twenty/Dockerfile `
  --target twenty `
  --build-arg "APP_VERSION=$AppSemver" `
  -t $FullTag `
  -t $ShortTag `
  .
if ($LASTEXITCODE -ne 0) {
  throw "docker build failed with exit code $LASTEXITCODE"
}

Write-Host ""
Write-Host "Built immutable ZEX-CRM image:"
Write-Host "  $FullTag"
Write-Host "  $ShortTag"
Write-Host "Export for compose:"
Write-Host "  `$env:ZEX_CRM_IMAGE='$FullTag'"
Write-Host "  `$env:APP_VERSION='$AppSemver'"
