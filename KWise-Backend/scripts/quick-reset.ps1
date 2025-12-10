$ErrorActionPreference = 'Stop'

function Invoke-JsonPost($url, $obj) {
    $json = $obj | ConvertTo-Json
    return Invoke-RestMethod -Uri $url -Method Post -ContentType 'application/json' -Body $json
}

$refEmail = 'ludwig.rivera26@gmail.com'
$newPass = 'Test1234!'

Write-Host 'Requesting reset code for reference email:' $refEmail
$forgot = Invoke-JsonPost 'http://localhost:5000/api/auth/forgot-password' @{ email = $refEmail }
$code = $forgot.resetCode
Write-Host 'Received code:' $code

Write-Host 'Submitting reset with code...'
$reset = Invoke-JsonPost 'http://localhost:5000/api/auth/reset-password' @{
    resetToken = $code
    newPassword = $newPass
    confirmPassword = $newPass
    email = $refEmail
}

$reset | ConvertTo-Json -Depth 5
