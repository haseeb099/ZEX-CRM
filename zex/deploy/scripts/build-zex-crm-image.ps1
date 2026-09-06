# Build immutable ZEX-CRM production image (Windows PowerShell).
# Equivalent to build-zex-crm-image.sh
#
# Usage (repo root):
#   powershell -File zex/deploy/scripts/build-zex-crm-image.ps1
#   $env:ZEX_CRM_IMAGE_REPO='ghcr.io/example/zex-crm'; powershell -File zex/deploy/scripts/build-zex-crm-image.ps1
#
# Refuses to build when git status --porcelain is non-empty (fail-closed).

$ErrorActionPreference = 'Stop'
$Root = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')
Set-Location $Root

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'git is required' }
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'docker is required' }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'node is required' }

# Fail closed: dirty tree must never produce a SHA-tagged production image.
$ProvenanceRaw = node zex/deploy/scripts/build-provenance.cjs assert-clean
if ($LASTEXITCODE -ne 0) {
  throw 'refusing production image build: working tree is dirty (or provenance check failed)'
}
$Provenance = $ProvenanceRaw | ConvertFrom-Json
$FullSha = [string]$Provenance.headSha
$FullTag = [string]$Provenance.fullTag
$ShortTag = [string]$Provenance.shortTag
$AppSemver = [string]$Provenance.appVersion

if ($FullTag -match ':latest$' -or $ShortTag -match ':latest$') {
  throw 'refusing to tag :latest'
}

Write-Host "Building ZEX-CRM image from clean tree $FullSha"
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
