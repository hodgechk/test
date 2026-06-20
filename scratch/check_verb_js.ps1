$tempFile = "c:\Users\USER\Downloads\test-main\test-main\scratch\test_verb_js.js"
$content = [System.IO.File]::ReadAllText("c:\Users\USER\Downloads\test-main\test-main\quwstions\verb.js", [System.Text.Encoding]::UTF8)

# Prefix with window declaration
$jsCode = "var window = {};" + [Environment]::NewLine + $content
[System.IO.File]::WriteAllText($tempFile, $jsCode, [System.Text.Encoding]::UTF8)

# Execute using cscript /E:jscript
$output = cscript //NoLogo //E:jscript $tempFile 2>&1
Write-Host "CSCRIPT OUTPUT:"
$output | Out-String | Write-Host
