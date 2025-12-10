# API Endpoint Comprehensive Test Script
# Tests all critical K-Wise backend endpoints

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "  K-WISE API ENDPOINT TESTING" -ForegroundColor Cyan
Write-Host "=========================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:5000"
$testResults = @()

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [hashtable]$Body = $null
    )
    
    Write-Host "Testing: $Name..." -ForegroundColor Yellow -NoNewline
    
    try {
        $params = @{
            Uri = "$baseUrl$Url"
            Method = $Method
            TimeoutSec = 10
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json)
            $params.ContentType = "application/json"
        }
        
        $response = Invoke-RestMethod @params
        
        if ($response.success -or $response.status -eq "success") {
            Write-Host " OK" -ForegroundColor Green
            $script:testResults += [PSCustomObject]@{
                Endpoint = $Name
                Status = "PASS"
                Response = "Success"
            }
            return $response
        } else {
            Write-Host " FAIL" -ForegroundColor Red
            Write-Host "  Response: $($response.message)" -ForegroundColor Gray
            $script:testResults += [PSCustomObject]@{
                Endpoint = $Name
                Status = "FAIL"
                Response = $response.message
            }
            return $null
        }
    } catch {
        $errorMsg = $_.Exception.Message
        if ($errorMsg -match '"message":"([^"]+)"') {
            $errorMsg = $matches[1]
        }
        Write-Host " ERROR" -ForegroundColor Red
        Write-Host "  Error: $errorMsg" -ForegroundColor Gray
        $script:testResults += [PSCustomObject]@{
            Endpoint = $Name
            Status = "ERROR"
            Response = $errorMsg
        }
        return $null
    }
}

Write-Host "CORE ENDPOINTS" -ForegroundColor Cyan
Write-Host "---------------`n" -ForegroundColor Cyan

$health = Test-Endpoint -Name "Health Check" -Url "/api/health"
if ($health) {
    Write-Host "  Database: $($health.database)" -ForegroundColor Gray
    Write-Host "  AI Model: $($health.ai.model)" -ForegroundColor Gray
    Write-Host "  AI Status: $($health.ai.status)" -ForegroundColor Gray
}

Write-Host "`nKIOSK ENDPOINTS" -ForegroundColor Cyan
Write-Host "----------------`n" -ForegroundColor Cyan

$categories = Test-Endpoint -Name "Categories" -Url "/api/kiosk/categories"
if ($categories) {
    Write-Host "  Total Categories: $($categories.data.Count)" -ForegroundColor Gray
}

$cpuProducts = Test-Endpoint -Name "CPU Products" -Url "/api/kiosk/categories/CPU/products?limit=10"
if ($cpuProducts) {
    Write-Host "  CPU Products Found: $($cpuProducts.data.items.Count)" -ForegroundColor Gray
}

$gpuProducts = Test-Endpoint -Name "GPU Products" -Url "/api/kiosk/categories/GPU/products?limit=10"
if ($gpuProducts) {
    Write-Host "  GPU Products Found: $($gpuProducts.data.items.Count)" -ForegroundColor Gray
}

$ramProducts = Test-Endpoint -Name "RAM Products" -Url "/api/kiosk/categories/RAM/products?limit=10"
if ($ramProducts) {
    Write-Host "  RAM Products Found: $($ramProducts.data.items.Count)" -ForegroundColor Gray
}

$featured = Test-Endpoint -Name "Featured Products" -Url "/api/kiosk/featured?limit=6"
if ($featured) {
    Write-Host "  Featured Products: $($featured.data.Count)" -ForegroundColor Gray
}

$buildComponents = Test-Endpoint -Name "Build Components" -Url "/api/kiosk/build-components"
if ($buildComponents) {
    $componentCount = ($buildComponents.data | Get-Member -MemberType NoteProperty).Count
    Write-Host "  Component Categories: $componentCount" -ForegroundColor Gray
}

$search = Test-Endpoint -Name "Product Search" -Url "/api/kiosk/search?q=intel"
if ($search) {
    Write-Host "  Search Results: $($search.data.Count)" -ForegroundColor Gray
}

$onSale = Test-Endpoint -Name "On Sale Products" -Url "/api/kiosk/on-sale"
if ($onSale) {
    Write-Host "  On Sale Products: $($onSale.data.Count)" -ForegroundColor Gray
}

Write-Host "`nCOMPATIBILITY ENDPOINTS" -ForegroundColor Cyan
Write-Host "------------------------`n" -ForegroundColor Cyan

Test-Endpoint -Name "Compatibility Cache" -Url "/api/compatibility/cache"

Write-Host "`nOTHER ENDPOINTS" -ForegroundColor Cyan
Write-Host "----------------`n" -ForegroundColor Cyan

Test-Endpoint -Name "Queue Status" -Url "/api/queue/status"
Test-Endpoint -Name "Services List" -Url "/api/services"
Test-Endpoint -Name "Global Search" -Url "/api/search?q=cpu&type=products"

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "  TEST SUMMARY" -ForegroundColor Cyan
Write-Host "=========================================`n" -ForegroundColor Cyan

$passed = ($testResults | Where-Object { $_.Status -eq "PASS" }).Count
$failed = ($testResults | Where-Object { $_.Status -eq "FAIL" }).Count
$errors = ($testResults | Where-Object { $_.Status -eq "ERROR" }).Count
$total = $testResults.Count

Write-Host "Total Tests: $total" -ForegroundColor White
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { "Yellow" } else { "White" })
Write-Host "Errors: $errors" -ForegroundColor $(if ($errors -gt 0) { "Red" } else { "White" })

$successRate = [math]::Round(($passed / $total) * 100, 2)
Write-Host "`nSuccess Rate: $successRate%" -ForegroundColor $(if ($successRate -ge 80) { "Green" } elseif ($successRate -ge 60) { "Yellow" } else { "Red" })

Write-Host "`nDetailed Results:" -ForegroundColor Cyan
$testResults | Format-Table -AutoSize

Write-Host "`nBackend API Status: " -NoNewline
if ($successRate -ge 80) {
    Write-Host "HEALTHY" -ForegroundColor Green
} elseif ($successRate -ge 60) {
    Write-Host "DEGRADED" -ForegroundColor Yellow  
} else {
    Write-Host "CRITICAL" -ForegroundColor Red
}
Write-Host ""
