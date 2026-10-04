<#
.SYNOPSIS
  Installs (or updates) FleetOps natively on Windows Server - no Docker required.

.DESCRIPTION
  Run from the extracted release bundle, in an *Administrator* PowerShell:

    Set-ExecutionPolicy -Scope Process Bypass -Force
    .\install-fleetops.ps1 -Domain 'fleetops.example.duckdns.org' -AcmeEmail 'you@example.com'

  Optional e-mail (sign-in details for new users), e.g. Gmail with an App Password:
    .\install-fleetops.ps1 -Domain '...' -AcmeEmail '...' -SmtpUser 'you@gmail.com' -SmtpPassword 'abcd efgh ijkl mnop'

  What it does (safe to re-run; a re-run with a newer bundle performs an update):
    1. Installs Chocolatey, then Java 21 (Temurin), PostgreSQL 16, Caddy and NSSM.
    2. Generates strong secrets once and keeps them in C:\fleetops\secrets.json (Administrators only).
    3. Creates the 'fleetops' PostgreSQL database and user.
    4. Copies the backend jar and website files to C:\fleetops.
    5. Registers two auto-starting Windows services:
         FleetOpsBackend  - Spring Boot API on 127.0.0.1:8080 (not reachable from outside)
         FleetOpsCaddy    - HTTPS on 80/443 with a free Let's Encrypt certificate; serves the website, proxies /api
    6. Opens TCP 80/443 in Windows Firewall and waits until the site answers.

  Prerequisites: the domain's DNS points at this server, and the OCI Security List allows TCP 80 and 443.
  Redis is not used on Windows: refresh tokens are kept in memory (users sign in again after a restart).
#>
#Requires -RunAsAdministrator
# Named parameters only: a value pasted without its -Name must fail, not slide into another setting
[CmdletBinding(PositionalBinding = $false)]
param(
    [Parameter(Mandatory = $true)] [string] $Domain,
    [Parameter(Mandatory = $true)] [string] $AcmeEmail,
    [string] $TimeZoneId = 'Africa/Johannesburg',
    # Optional e-mail (SMTP) so new users receive their sign-in details. Values are kept in secrets.json,
    # so later runs (updates) can omit them. Gmail: smtp.gmail.com / 587 / your address / a Google App Password.
    [string] $SmtpHost = 'smtp.gmail.com',
    [int] $SmtpPort = 587,
    [string] $SmtpUser,
    [string] $SmtpPassword,
    [string] $MailFrom
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$Bundle = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = 'C:\fleetops'
$BackendSvc = 'FleetOpsBackend'
$CaddySvc = 'FleetOpsCaddy'

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Ok($msg) { Write-Host "    $msg" -ForegroundColor Green }

function New-Secret([int] $Length = 32) {
    $bytes = New-Object byte[] $Length
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
    -join ($bytes | ForEach-Object { $alphabet[$_ % $alphabet.Length] })
}

function Invoke-Choco([string[]] $Arguments) {
    & choco @Arguments -y --no-progress | Out-Host
    if ($LASTEXITCODE -notin 0, 1641, 3010) { throw "choco $($Arguments -join ' ') failed (exit $LASTEXITCODE)" }
}

function Find-Exe([string] $Folder, [string] $Name, [string] $Like = '*') {
    Get-ChildItem $Folder -Recurse -Filter $Name -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -like $Like } | Select-Object -First 1 -ExpandProperty FullName
}

# ------------------------------------------------------------------ checks
if ($Domain -notmatch '^[a-z0-9-]+(\.[a-z0-9-]+)+$') {
    throw "Domain '$Domain' is not a full host name (e.g. fleetops-za.duckdns.org). Put it in quotes: -Domain 'name.duckdns.org'"
}
Step 'Checking the release bundle'
foreach ($p in "$Bundle\app\fleetops-backend.jar", "$Bundle\www\index.html") {
    if (-not (Test-Path $p)) { throw "Missing $p - run this script from the extracted release folder." }
}
Ok "Bundle found in $Bundle"
New-Item -ItemType Directory -Force "$Root\app", "$Root\www", "$Root\logs", "$Root\uploads" | Out-Null

# ------------------------------------------------------------------ secrets (created once, reused on updates)
Step 'Preparing secrets'
$secretsFile = "$Root\secrets.json"
if (Test-Path $secretsFile) {
    $secrets = Get-Content $secretsFile -Raw | ConvertFrom-Json
    Ok 'Reusing existing secrets'
} else {
    $secrets = [pscustomobject]@{
        PostgresSuperPassword = New-Secret 32
        DbPassword            = New-Secret 32
        JwtSecret             = New-Secret 64
    }
    $secrets | ConvertTo-Json | Set-Content -Encoding UTF8 $secretsFile
    icacls $secretsFile /inheritance:r /grant:r 'Administrators:F' 'SYSTEM:F' | Out-Null
    Ok "Generated new secrets in $secretsFile (Administrators only)"
}

# E-mail settings: new values win; otherwise keep what an earlier run saved
foreach ($p in 'SmtpHost', 'SmtpPort', 'SmtpUser', 'SmtpPassword', 'MailFrom') {
    if (-not ($secrets.PSObject.Properties.Name -contains $p)) { $secrets | Add-Member -NotePropertyName $p -NotePropertyValue $null }
}
if ($SmtpUser) {
    $secrets.SmtpHost = $SmtpHost; $secrets.SmtpPort = $SmtpPort; $secrets.SmtpUser = $SmtpUser
    if ($SmtpPassword) { $secrets.SmtpPassword = $SmtpPassword }
    $secrets.MailFrom = $(if ($MailFrom) { $MailFrom } else { "FleetOps <$SmtpUser>" })
    $secrets | ConvertTo-Json | Set-Content -Encoding UTF8 $secretsFile
}
$hostPattern = '^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$'
if ($secrets.SmtpHost -and $secrets.SmtpHost -notmatch $hostPattern) {
    throw "SMTP host '$($secrets.SmtpHost)' is not a server name (expected e.g. smtp.gmail.com). Re-run with -SmtpHost 'smtp.gmail.com'."
}
if ($secrets.SmtpUser -and -not $secrets.SmtpPassword) {
    Write-Host "    E-mail user $($secrets.SmtpUser) is set but the password is missing - re-run with -SmtpPassword '...'" -ForegroundColor Yellow
}
if ($secrets.SmtpUser -and $secrets.SmtpPassword) {
    Ok "E-mail: sending as $($secrets.SmtpUser) via $($secrets.SmtpHost):$($secrets.SmtpPort)"
} else {
    Write-Host '    E-mail not configured: new users'' temporary passwords will be shown to the admin instead.' -ForegroundColor Yellow
}

# ------------------------------------------------------------------ software
Step 'Installing software (Chocolatey, Java 21, PostgreSQL 16, Caddy, NSSM)'
if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
    [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor 3072
    Set-ExecutionPolicy Bypass -Scope Process -Force
    Invoke-Expression ((New-Object Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    $env:Path += ";$env:ProgramData\chocolatey\bin"
}
try { Invoke-Choco @('install', 'temurin21jre') } catch { Write-Host '    JRE package unavailable, installing the JDK instead'; Invoke-Choco @('install', 'temurin21') }
Invoke-Choco @('install', 'postgresql16', '--params', "/Password:$($secrets.PostgresSuperPassword)")
Invoke-Choco @('install', 'caddy', 'nssm')

$java = Find-Exe 'C:\Program Files\Eclipse Adoptium' 'java.exe' '*\bin\java.exe'
$psql = Find-Exe 'C:\Program Files\PostgreSQL' 'psql.exe'
$caddy = Find-Exe "$env:ProgramData\chocolatey\lib\caddy" 'caddy.exe'
$nssm = Find-Exe "$env:ProgramData\chocolatey\lib\nssm" 'nssm.exe' '*win64*'
if (-not $nssm) { $nssm = Find-Exe "$env:ProgramData\chocolatey\lib\nssm" 'nssm.exe' }
foreach ($pair in @(@('Java', $java), @('psql', $psql), @('Caddy', $caddy), @('NSSM', $nssm))) {
    if (-not $pair[1]) { throw "$($pair[0]) not found after installation." }
    Ok "$($pair[0]): $($pair[1])"
}
$pgService = Get-Service 'postgresql*' | Select-Object -First 1
if (-not $pgService) { throw 'PostgreSQL service not found.' }
if ($pgService.Status -ne 'Running') { Start-Service $pgService.Name }
Ok "PostgreSQL service: $($pgService.Name)"

# ------------------------------------------------------------------ database
Step 'Creating the database and user'
$env:PGPASSWORD = $secrets.PostgresSuperPassword
function Psql([string] $Sql) {
    $result = & $psql -U postgres -h 127.0.0.1 -d postgres -v ON_ERROR_STOP=1 -tAc $Sql
    if ($LASTEXITCODE -ne 0) { throw "PostgreSQL command failed: $($Sql -replace 'PASSWORD ''[^'']*''', 'PASSWORD ***')" }
    $result
}
if (-not (Psql "SELECT 1 FROM pg_roles WHERE rolname = 'fleetops'")) {
    Psql "CREATE ROLE fleetops LOGIN PASSWORD '$($secrets.DbPassword)'" | Out-Null
    Ok 'Created role fleetops'
} else {
    Psql "ALTER ROLE fleetops WITH LOGIN PASSWORD '$($secrets.DbPassword)'" | Out-Null
    Ok 'Role fleetops exists (password re-applied)'
}
if (-not (Psql "SELECT 1 FROM pg_database WHERE datname = 'fleetops'")) {
    Psql 'CREATE DATABASE fleetops OWNER fleetops' | Out-Null
    Ok 'Created database fleetops'
} else {
    Ok 'Database fleetops exists (kept - your data is safe)'
}
Remove-Item Env:\PGPASSWORD

# ------------------------------------------------------------------ files
Step 'Copying FleetOps files'
foreach ($svc in $CaddySvc, $BackendSvc) {
    if (Get-Service $svc -ErrorAction SilentlyContinue) { & $nssm stop $svc | Out-Null }
}
Copy-Item "$Bundle\app\fleetops-backend.jar" "$Root\app\fleetops-backend.jar" -Force
robocopy "$Bundle\www" "$Root\www" /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "Copying website files failed (robocopy exit $LASTEXITCODE)" }
Ok "Backend: $Root\app\fleetops-backend.jar"
Ok "Website: $Root\www"

# ------------------------------------------------------------------ Caddy configuration
@"
{
	email $AcmeEmail
}

$Domain {
	encode zstd gzip

	header {
		Strict-Transport-Security "max-age=31536000; includeSubDomains"
		X-Content-Type-Options "nosniff"
		Referrer-Policy "strict-origin-when-cross-origin"
		-Server
	}

	handle /api/* {
		reverse_proxy 127.0.0.1:8080
	}

	handle {
		root * C:/fleetops/www
		try_files {path} /index.html
		file_server
	}
}
"@ | Set-Content -Encoding ASCII "$Root\Caddyfile"
# Caddy logs to stderr; in Windows PowerShell 5.1 that would trip 'Stop', so validate with errors relaxed
$ErrorActionPreference = 'Continue'
& $caddy validate --config "$Root\Caddyfile" --adapter caddyfile *> $null
$validateExit = $LASTEXITCODE
$ErrorActionPreference = 'Stop'
if ($validateExit -ne 0) { throw "Caddyfile is invalid - run: `"$caddy`" validate --config $Root\Caddyfile" }
Ok "Caddy config: $Root\Caddyfile"

# ------------------------------------------------------------------ services
function Set-Service-Config([string] $Name, [string] $Exe, [string] $Arguments, [string[]] $Environment, [string] $Log) {
    if (-not (Get-Service $Name -ErrorAction SilentlyContinue)) { & $nssm install $Name $Exe | Out-Null }
    & $nssm set $Name Application $Exe | Out-Null
    & $nssm set $Name AppParameters $Arguments | Out-Null
    & $nssm set $Name AppDirectory $Root | Out-Null
    & $nssm set $Name AppEnvironmentExtra @Environment | Out-Null
    & $nssm set $Name AppStdout $Log | Out-Null
    & $nssm set $Name AppStderr $Log | Out-Null
    & $nssm set $Name AppRotateFiles 1 | Out-Null
    & $nssm set $Name AppRotateBytes 10485760 | Out-Null
    & $nssm set $Name AppExit Default Restart | Out-Null
    & $nssm set $Name Start SERVICE_AUTO_START | Out-Null
}

Step 'Registering Windows services'
$redisOff = 'org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration,' +
            'org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration'
Set-Service-Config $BackendSvc $java "-XX:MaxRAMPercentage=40 -jar `"$Root\app\fleetops-backend.jar`"" @(
    'SPRING_PROFILES_ACTIVE=prod',
    'SERVER_ADDRESS=127.0.0.1',
    'DB_HOST=127.0.0.1', 'DB_PORT=5432', 'DB_NAME=fleetops', 'DB_USERNAME=fleetops',
    "DB_PASSWORD=$($secrets.DbPassword)",
    "JWT_SECRET=$($secrets.JwtSecret)",
    "CORS_ORIGINS=https://$Domain",
    "FLEETOPS_TIMEZONE=$TimeZoneId",
    "UPLOAD_PATH=$Root\uploads",
    'SPRINGDOC_API_DOCS_ENABLED=false', 'SPRINGDOC_SWAGGER_UI_ENABLED=false',
    "SPRING_AUTOCONFIGURE_EXCLUDE=$redisOff",
    "APP_URL=https://$Domain",
    "MAIL_HOST=$(if ($secrets.SmtpHost) { $secrets.SmtpHost } else { 'smtp.gmail.com' })",
    "MAIL_PORT=$(if ($secrets.SmtpPort) { $secrets.SmtpPort } else { 587 })",
    "MAIL_USERNAME=$($secrets.SmtpUser)",
    "MAIL_PASSWORD=$($secrets.SmtpPassword)",
    "MAIL_FROM=$($secrets.MailFrom)"
) "$Root\logs\backend.log"
& $nssm set $BackendSvc DependOnService $pgService.Name | Out-Null
Ok "$BackendSvc registered"

Set-Service-Config $CaddySvc $caddy "run --config `"$Root\Caddyfile`" --adapter caddyfile" @(
    "XDG_DATA_HOME=$Root\caddy-data", "XDG_CONFIG_HOME=$Root\caddy-config"
) "$Root\logs\caddy.log"
Ok "$CaddySvc registered"

# ------------------------------------------------------------------ firewall
Step 'Opening Windows Firewall for HTTP/HTTPS'
foreach ($r in @(@{ Name = 'FleetOps HTTP'; Port = 80; Proto = 'TCP' },
                 @{ Name = 'FleetOps HTTPS'; Port = 443; Proto = 'TCP' },
                 @{ Name = 'FleetOps HTTP3'; Port = 443; Proto = 'UDP' })) {
    if (-not (Get-NetFirewallRule -DisplayName $r.Name -ErrorAction SilentlyContinue)) {
        New-NetFirewallRule -DisplayName $r.Name -Direction Inbound -Protocol $r.Proto -LocalPort $r.Port -Action Allow | Out-Null
    }
    Ok "$($r.Name) ($($r.Proto) $($r.Port))"
}

# ------------------------------------------------------------------ start & verify
Step 'Starting the backend (first start runs the database migrations - about 1 minute)'
& $nssm start $BackendSvc | Out-Null
$healthy = $false
for ($i = 0; $i -lt 60; $i++) {
    try {
        $h = Invoke-RestMethod 'http://127.0.0.1:8080/api/actuator/health' -TimeoutSec 5
        if ($h.status -eq 'UP') { $healthy = $true; break }
    } catch { }
    Start-Sleep -Seconds 5
}
if (-not $healthy) {
    Write-Host "    Backend did not report UP. Last log lines:" -ForegroundColor Red
    Get-Content "$Root\logs\backend.log" -Tail 40
    throw 'Backend failed to start.'
}
Ok 'Backend is UP'

Step 'Starting Caddy (obtains the HTTPS certificate on first start)'
& $nssm start $CaddySvc | Out-Null
$live = $false
for ($i = 0; $i -lt 24; $i++) {
    try {
        $r = Invoke-WebRequest "https://$Domain/api/actuator/health" -UseBasicParsing -TimeoutSec 10
        if ($r.StatusCode -eq 200) { $live = $true; break }
    } catch { }
    Start-Sleep -Seconds 5
}

Write-Host ''
if ($live) {
    Write-Host "FleetOps is LIVE:  https://$Domain" -ForegroundColor Green
} else {
    Write-Host "Services are running, but https://$Domain did not answer yet." -ForegroundColor Yellow
    Write-Host '  Check: DNS points to this server, OCI Security List allows TCP 80/443, then see the Caddy log:'
    Get-Content "$Root\logs\caddy.log" -Tail 25
}
Write-Host ''
Write-Host 'Next: sign in as admin / Admin@123 and change the password immediately (user menu > Change password).'
Write-Host "Logs:     $Root\logs\backend.log, $Root\logs\caddy.log"
Write-Host "Services: Get-Service $BackendSvc, $CaddySvc   (restart: Restart-Service $BackendSvc)"
Write-Host 'Update:   extract a newer bundle and run this script again with the same parameters.'
