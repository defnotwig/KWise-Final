$ErrorActionPreference = 'Stop'

function Invoke-JsonPost($url, $obj) {
	$json = $obj | ConvertTo-Json
	return Invoke-RestMethod -Uri $url -Method Post -ContentType 'application/json' -Body $json
}

Write-Host 'Starting end-to-end test (forgot -> reset -> login)...'

$forgotResp = Invoke-JsonPost 'http://localhost:5000/api/auth/forgot-password' @{ email = 'ludwig.rivera26@gmail.com' }
$code = $forgotResp.resetCode
Write-Host ("Received reset code: {0}" -f $code)

$resetResp = Invoke-JsonPost 'http://localhost:5000/api/auth/reset-password' @{
	resetToken = $code
	newPassword = 'humbleludwig13!'
	confirmPassword = 'humbleludwig13!'
}

$loginResp = Invoke-JsonPost 'http://localhost:5000/api/auth/login' @{ email = 'ludwigrivera13@gmail.com'; password = 'humbleludwig13!' }

$result = [pscustomobject]@{
	ForgotStatus = $forgotResp.status
	ResetCode = $code
	ResetStatus = $resetResp.status
	ResetMessage = $resetResp.message
	LoginStatus = $loginResp.status
	HasToken = [bool]$loginResp.token
}

# Write JSON result to file
$resultPath = Join-Path $PSScriptRoot 'test-e2e-result.json'
$result | ConvertTo-Json -Depth 5 | Out-File -Encoding utf8 $resultPath

# Also output to console
Get-Content $resultPath
