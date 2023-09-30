$json = Get-Content -Raw -Path 'package.json' | ConvertFrom-Json
$currentVersion = $json.version
$newVersion = $currentVersion.Split('.') | ForEach-Object { [int]$_ }
$newVersion[2]++
$newVersionString = $newVersion -join '.'
$json.version = $newVersionString
$json | ConvertTo-Json | Set-Content -Path 'package.json'
Write-Host "Version incremented to $newVersionString"

$yarnAddCommand = "yarn add D:\Projets\three-cad-viewer\three-cad-viewer-v$newVersionString.tgz"

# Edit index.js and set DEBUG to false
$indexJsPath = ".\src\index.js"
$indexContent = Get-Content -Path $indexJsPath
$indexContent = $indexContent -replace 'export const DEBUG = true;', 'export const DEBUG = false;'
$indexContent | Set-Content -Path $indexJsPath


yarn install
yarn add --dev rollup-plugin-string
yarn run build
yarn pack
Set-Location D:\Projets\vscode-ocp-cad-viewer
yarn remove three-cad-viewer
yarn cache clean thre-cad-viewer
Invoke-Expression $yarnAddCommand
Set-Location D:\Projets\three-cad-viewer