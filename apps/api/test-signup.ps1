$payload = @{
  dealer = @{
    name = "Test Corp"
    slug = "test-corp-$(Get-Random)"
    email = "contact@testcorp.com"
    phone = "+1234567890"
    country = "US"
    timezone = "UTC"
  }
  owner = @{
    email = "john@testcorp.com"
    password = "TestPass123!"
    firstName = "John"
    lastName = "Doe"
    phone = "+1234567890"
  }
} | ConvertTo-Json

try {
  $response = Invoke-WebRequest -Uri "http://localhost:4000/api/v1/dealers/signup" -Method POST -Body $payload -ContentType "application/json" -ErrorAction Stop
  Write-Host "Status: $($response.StatusCode)"
  Write-Host "Content:"
  Write-Host $response.Content
} catch {
  $response = $_.Exception.Response
  Write-Host "Status: $($response.StatusCode.Value)"
  Write-Host "Error response:"
  try {
    $stream = $response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    Write-Host $reader.ReadToEnd()
    $reader.Close()
  } catch {
    Write-Host $_.Exception.Message
  }
}
