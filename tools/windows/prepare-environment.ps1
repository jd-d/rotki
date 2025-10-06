[CmdletBinding()]
param(
    [switch]$SkipFrontend,
    [switch]$SkipPython,
    [switch]$SkipRustCheck
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Invoke-Step {
    param(
        [Parameter(Mandatory = $true)][string]$Message,
        [Parameter(Mandatory = $true)][scriptblock]$Action
    )

    Write-Host "==> $Message" -ForegroundColor Cyan
    & $Action
    Write-Host "   Completed." -ForegroundColor Green
}

function Resolve-RepositoryRoot {
    $toolsDir = Split-Path -Path $PSScriptRoot -Parent
    return Split-Path -Path $toolsDir -Parent
}

$repoRoot = Resolve-RepositoryRoot
Set-Location $repoRoot

Write-Host "Working directory: $repoRoot" -ForegroundColor Cyan

if (-not $SkipFrontend) {
    Invoke-Step 'Installing JavaScript dependencies (pnpm install)' {
        pnpm install
    }
}

if (-not $SkipPython) {
    Invoke-Step 'Synchronising Python environment (uv sync)' {
        uv sync
    }
}

if (-not $SkipRustCheck) {
    if (Get-Command rustup -ErrorAction SilentlyContinue) {
        Invoke-Step 'Verifying active Rust toolchain' {
            $toolchain = rustup show active-toolchain
            if ($toolchain) {
                Write-Host "   $toolchain" -ForegroundColor DarkCyan
            } else {
                Write-Host '   Unable to determine the active toolchain.' -ForegroundColor Yellow
            }
        }
    } else {
        Write-Warning 'rustup not found. Run tools/windows/setup-deps.ps1 to install the Rust toolchain.'
    }
}

Write-Host 'Environment preparation completed. You can now run pnpm dev or uv run python -m rotkehlchen.' -ForegroundColor Yellow

