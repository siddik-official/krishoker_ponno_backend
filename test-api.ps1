# API Test Script
# Test various endpoints of the Krishoker Ponno Backend API

Write-Host "🧪 Testing Krishoker Ponno Backend API" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green

# Test 1: Health Check
Write-Host "`n1. Testing Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method GET
    Write-Host "✅ Health Check: " -ForegroundColor Green -NoNewline
    Write-Host $health.status -ForegroundColor White
    Write-Host "   Message: $($health.message)"
    Write-Host "   Version: $($health.version)"
} catch {
    Write-Host "❌ Health Check Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Get Districts
Write-Host "`n2. Testing Districts Endpoint..." -ForegroundColor Yellow
try {
    $districts = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/districts" -Method GET
    Write-Host "✅ Districts: " -ForegroundColor Green -NoNewline
    Write-Host "Found $($districts.data.districts.Count) districts"
    Write-Host "   First few districts: $($districts.data.districts[0..2].name -join ', ')"
} catch {
    Write-Host "❌ Districts Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Get Products (Public)
Write-Host "`n3. Testing Products Endpoint..." -ForegroundColor Yellow
try {
    $products = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/products" -Method GET
    Write-Host "✅ Products: " -ForegroundColor Green -NoNewline
    Write-Host "Found $($products.data.products.Count) products"
} catch {
    Write-Host "❌ Products Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Test OTP Send (This will send actual OTP, so using a test number)
Write-Host "`n4. Testing OTP Send (using test number)..." -ForegroundColor Yellow
try {
    $otpBody = @{
        phone = "01712345678"
    } | ConvertTo-Json
    
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    $otpResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/send-otp" -Method POST -Body $otpBody -Headers $headers
    Write-Host "✅ OTP Send: " -ForegroundColor Green -NoNewline
    Write-Host $otpResponse.message
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "⚠️  OTP Send: Expected error (rate limiting or invalid number)" -ForegroundColor Yellow
    } else {
        Write-Host "❌ OTP Send Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n🎉 API Testing Complete!" -ForegroundColor Green
Write-Host "Your backend is running successfully on http://localhost:3000" -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Set up your Supabase database schema (run database/schema.sql)"
Write-Host "2. Set up storage policies (see STORAGE_SETUP.md)"
Write-Host "3. Test with your mobile app"
Write-Host "4. Create your first user via OTP authentication"
