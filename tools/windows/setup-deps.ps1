[CmdletBinding()]
param(
    [switch]$InstallBuildTools,
    [switch]$Elevate,
    [switch]$Reinvoked
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Test-IsAdministrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if ($Elevate -and -not (Test-IsAdministrator)) {
    if ($Reinvoked) {
        throw 'Elevation failed. Please rerun this script from an elevated PowerShell session.'
    }

    Write-Host 'Requesting elevation...' -ForegroundColor Cyan
    $arguments = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$PSCommandPath`"")
    if ($InstallBuildTools) {
        $arguments += '-InstallBuildTools'
    }
    $arguments += '-Reinvoked'
    Start-Process -FilePath 'powershell' -ArgumentList $arguments -Verb RunAs -Wait
    return
}

if ($InstallBuildTools -and -not (Test-IsAdministrator)) {
    Write-Warning 'Installing Visual Studio Build Tools usually requires administrative privileges. Rerun with -Elevate or from an elevated PowerShell session if the installation fails.'
}

function Assert-Winget {
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        throw 'winget is required for automatic installation. Install the Windows App Installer from the Microsoft Store and rerun the script.'
    }
}

function Invoke-WingetInstall {
    param(
        [Parameter(Mandatory = $true)][string]$Id,
        [string]$OverrideArguments
    )

    Assert-Winget
    $args = @('install', '--id', $Id, '--exact', '--accept-source-agreements', '--accept-package-agreements')
    if ($OverrideArguments) {
        $args += @('--override', $OverrideArguments)
    }
    Write-Host "Installing $Id via winget..." -ForegroundColor Cyan
    $process = Start-Process -FilePath 'winget' -ArgumentList $args -NoNewWindow -PassThru -Wait
    if ($process.ExitCode -ne 0) {
        throw "winget installation for $Id failed with exit code $($process.ExitCode)."
    }
}

function Get-FirstVersionFromString {
    param([Parameter(Mandatory = $true)][string]$Input)

    $match = [regex]::Match($Input, '(\d+(?:\.\d+){0,3})')
    if ($match.Success) {
        return [version]$match.Value
    }
    return $null
}

function Test-CommandVersion {
    param(
        [Parameter(Mandatory = $true)][string]$Command,
        [string[]]$Arguments,
        [version]$MinimumVersion
    )

    $executable = Get-Command $Command -ErrorAction SilentlyContinue
    if (-not $executable) {
        return @{ Present = $false; Version = $null; MeetsRequirement = $false }
    }

    $output = & $Command @Arguments 2>$null
    $version = if ($output) { Get-FirstVersionFromString ($output | Out-String) } else { $null }
    $meetsRequirement = $false
    if ($MinimumVersion -and $version) {
        $meetsRequirement = $version -ge $MinimumVersion
    } elseif (-not $MinimumVersion) {
        $meetsRequirement = $true
    }

    return @{ Present = $true; Version = $version; MeetsRequirement = $meetsRequirement }
}

$dependencies = @(
    @{ Name = 'Git'; Command = 'git'; Args = @('--version'); Minimum = [version]'2.44'; WingetId = 'Git.Git' },
    @{ Name = 'Node.js'; Command = 'node'; Args = @('--version'); Minimum = [version]'22.0'; WingetId = 'OpenJS.NodeJS' },
    @{ Name = 'pnpm'; Command = 'pnpm'; Args = @('--version'); Minimum = [version]'10.0'; WingetId = 'pnpm.pnpm' },
    @{ Name = 'Python'; Command = 'python'; Args = @('--version'); Minimum = [version]'3.11'; WingetId = 'Python.Python.3.11' },
    @{ Name = 'uv'; Command = 'uv'; Args = @('--version'); Minimum = [version]'0.4'; WingetId = 'Astral.UV' },
    @{ Name = 'rustc'; Command = 'rustc'; Args = @('--version'); Minimum = [version]'1.75'; WingetId = 'Rustlang.Rustup' }
)

foreach ($dependency in $dependencies) {
    Write-Host "Checking $($dependency.Name)..." -ForegroundColor Cyan
    $result = Test-CommandVersion -Command $dependency.Command -Arguments $dependency.Args -MinimumVersion $dependency.Minimum

    if (-not $result.Present -or -not $result.MeetsRequirement) {
        if ($result.Present -and $result.Version) {
            Write-Warning "$($dependency.Name) version $($result.Version) is below the required $($dependency.Minimum)."
        } elseif (-not $result.Present) {
            Write-Warning "$($dependency.Name) is not installed."
        }

        if ($dependency.WingetId) {
            Invoke-WingetInstall -Id $dependency.WingetId
            $result = Test-CommandVersion -Command $dependency.Command -Arguments $dependency.Args -MinimumVersion $dependency.Minimum
            if ($result.Present -and $result.MeetsRequirement) {
                Write-Host "  Installed version $($result.Version)." -ForegroundColor Green
            } else {
                Write-Warning "Unable to verify $($dependency.Name) after installation. Please check manually."
            }
        } else {
            Write-Warning "No automatic installation configured for $($dependency.Name). Please install it manually."
        }
    } else {
        Write-Host "  Found version $($result.Version)." -ForegroundColor Green
    }

}

if ($InstallBuildTools) {
    Write-Host 'Ensuring Visual Studio Build Tools (Desktop development with C++) are installed...' -ForegroundColor Cyan
    Invoke-WingetInstall -Id 'Microsoft.VisualStudio.2022.BuildTools' -OverrideArguments '--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --passive --wait --locale en-US'
    Write-Host 'Visual Studio Build Tools installation complete. A reboot may be required before building native dependencies.' -ForegroundColor Yellow
} else {
    Write-Host 'Visual Studio Build Tools are required for compiling native code. Run this script with -InstallBuildTools to install them automatically.' -ForegroundColor Yellow
}

Write-Host 'Dependency check completed.' -ForegroundColor Green

