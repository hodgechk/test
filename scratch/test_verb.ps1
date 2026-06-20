$file = "c:\Users\USER\Downloads\test-main\test-main\quwstions\verb.js"
$content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
$json = $content -replace '(?s)window\.QUESTIONS\s*=\s*', ''
$json = $json.Trim()
if ($json.EndsWith(";")) {
    $json = $json.Substring(0, $json.Length - 1).Trim()
}

try {
    $parsed = ConvertFrom-Json $json -ErrorAction Stop
    Write-Host "verb.js is VALID JSON"
} catch {
    Write-Host "verb.js is INVALID JSON"
    Write-Host "Error message: $_"
    # Print the exception details
    Write-Host $_.Exception.Message
}
