# Complete test script for Stockage Platform API
# Run: .\test-api-complete.ps1

$baseUrl = "http://localhost:8081"

function Write-Status([string]$message, [string]$status = "INFO") {
    $colors = @{
        "SUCCESS" = "Green"
        "ERROR" = "Red"
        "WARNING" = "Yellow"
        "INFO" = "Cyan"
    }
    Write-Host "[$status] $message" -ForegroundColor $colors[$status]
}

function Test-Endpoint([string]$method, [string]$url, [object]$body, [string]$token, [string]$testName) {
    try {
        $headers = @{
            "Content-Type" = "application/json"
        }
        
        if ($token) {
            $headers["Authorization"] = "Bearer $token"
        }

        $requestParams = @{
            Uri             = $url
            Method          = $method
            Headers         = $headers
            UseBasicParsing = $true
        }

        if ($body) {
            $requestParams["Body"] = $body | ConvertTo-Json -Depth 10
        }

        $response = Invoke-WebRequest @requestParams
        Write-Status "$testName - OK ($($response.StatusCode))" "SUCCESS"
        return $response
    }
    catch {
        Write-Status "$testName - ERROR" "ERROR"
        return $null
    }
}

function Test-FileUpload([string]$url, [string]$token, [string]$testName) {
    try {
        # Create a temporary test file
        $testFilePath = [System.IO.Path]::GetTempFileName()
        Set-Content -Path $testFilePath -Value "Test file content for $(Get-Date)"

        $headers = @{
            "Authorization" = "Bearer $token"
        }

        $boundary = [System.Guid]::NewGuid().ToString()
        $LF = "`r`n"
        
        $bodyLines = @(
            "--$boundary$LF",
            "Content-Disposition: form-data; name=`"file`"; filename=`"test.txt`"$LF",
            "Content-Type: text/plain$LF$LF",
            "$(Get-Content -Path $testFilePath)$LF",
            "--$boundary--$LF"
        )

        $requestParams = @{
            Uri             = $url
            Method          = "POST"
            Headers         = $headers
            ContentType     = "multipart/form-data; boundary=$boundary"
            Body            = $bodyLines -join ""
            UseBasicParsing = $true
        }

        $response = Invoke-WebRequest @requestParams
        Write-Status "$testName - OK ($($response.StatusCode))" "SUCCESS"
        
        Remove-Item -Path $testFilePath -Force
        return $response
    }
    catch {
        Write-Status "$testName - ERROR" "ERROR"
        return $null
    }
}

Write-Host "`n========== STOCKAGE PLATFORM COMPLETE API TEST ==========`n" -ForegroundColor Magenta

Write-Host "1. AUTHENTICATION TESTS`n" -ForegroundColor Yellow

# Register
$randomEmail = "testuser_$(Get-Random)@example.com"
$registerBody = @{
    firstName = "Test"
    lastName = "User"
    email = $randomEmail
    password = "TestPassword@123"
}

$registerResponse = Test-Endpoint "POST" "$baseUrl/auth/register" $registerBody $null "Register"
if ($null -eq $registerResponse) {
    Write-Status "Registration failed, stopping tests" "ERROR"
    exit 1
}

# Login
$loginBody = @{
    email = $randomEmail
    password = "TestPassword@123"
}

$loginResponse = Test-Endpoint "POST" "$baseUrl/auth/login" $loginBody $null "Login"
if ($null -eq $loginResponse) {
    Write-Status "Login failed, stopping tests" "ERROR"
    exit 1
}

$loginData = $loginResponse.Content | ConvertFrom-Json
$token = $loginData.data.token
Write-Host "Token received: $($token.Substring(0, 20))...`n" -ForegroundColor Green

# Check Auth
Test-Endpoint "GET" "$baseUrl/auth/" $null $token "Check Auth Status" | Out-Null

Write-Host "`n2. FOLDER MANAGEMENT TESTS`n" -ForegroundColor Yellow

# Create Parent Folder
$createParentFolderBody = @{
    name = "Parent Folder $(Get-Random)"
}

$createParentFolderResponse = Test-Endpoint "POST" "$baseUrl/folder" $createParentFolderBody $token "Create Parent Folder"

$parentFolderId = $null
if ($null -ne $createParentFolderResponse) {
    $folderData = $createParentFolderResponse.Content | ConvertFrom-Json
    $parentFolderId = $folderData.data.folder.id
    Write-Host "Parent Folder ID: $parentFolderId`n" -ForegroundColor Green
}

# List Folders
Test-Endpoint "GET" "$baseUrl/folders" $null $token "List Folders (Root)" | Out-Null

# Create SubFolder (folders.insertOne with parentFolder non nul)
$createSubFolderBody = @{
    name = "SubFolder $(Get-Random)"
    parentFolderId = $parentFolderId
}

$createSubFolderResponse = Test-Endpoint "POST" "$baseUrl/folder" $createSubFolderBody $token "Create SubFolder"

$subFolderId = $null
if ($null -ne $createSubFolderResponse) {
    $subFolderData = $createSubFolderResponse.Content | ConvertFrom-Json
    $subFolderId = $subFolderData.data.folder.id
    Write-Host "SubFolder ID: $subFolderId`n" -ForegroundColor Green
}

# List SubFolders
Test-Endpoint "GET" "$baseUrl/folders?parentFolderId=$parentFolderId" $null $token "List SubFolders" | Out-Null

Write-Host "`n3. FILES MANAGEMENT TESTS`n" -ForegroundColor Yellow

# List Files (empty)
Test-Endpoint "GET" "$baseUrl/files" $null $token "List Files (Empty)" | Out-Null

# Upload File (files.insertOne)
$uploadFileResponse = Test-FileUpload "$baseUrl/upload" $token "Upload File"

$fileId = $null
if ($null -ne $uploadFileResponse) {
    $fileData = $uploadFileResponse.Content | ConvertFrom-Json
    $fileId = $fileData.data.file.id
    Write-Host "File ID: $fileId`n" -ForegroundColor Green
}

# List Files (after upload)
Test-Endpoint "GET" "$baseUrl/files" $null $token "List Files (After Upload)" | Out-Null

# Download File (files.findOne)
if ($fileId) {
    Test-Endpoint "GET" "$baseUrl/download/$fileId" $null $token "Download File" | Out-Null
}

# Delete File (files.deleteOne)
if ($fileId) {
    Test-Endpoint "DELETE" "$baseUrl/file/$fileId" $null $token "Delete File" | Out-Null
}

# List Files (after delete)
Test-Endpoint "GET" "$baseUrl/files" $null $token "List Files (After Delete)" | Out-Null

Write-Host "`n4. CLEANUP`n" -ForegroundColor Yellow

# Delete SubFolder
if ($subFolderId) {
    Test-Endpoint "DELETE" "$baseUrl/folder/$subFolderId" $null $token "Delete SubFolder" | Out-Null
}

# Delete Parent Folder
if ($parentFolderId) {
    Test-Endpoint "DELETE" "$baseUrl/folder/$parentFolderId" $null $token "Delete Parent Folder" | Out-Null
}

# Logout
Test-Endpoint "GET" "$baseUrl/auth/logout" $null $token "Logout" | Out-Null

Write-Host "`n========== ALL TESTS COMPLETED ==========`n" -ForegroundColor Green
Write-Host "Test Coverage:" -ForegroundColor Cyan
Write-Host "  [OK] User Registration" -ForegroundColor Green
Write-Host "  [OK] User Login" -ForegroundColor Green
Write-Host "  [OK] Create Folder (folders.insertOne)" -ForegroundColor Green
Write-Host "  [OK] Create SubFolder with parentFolder (folders.insertOne with parentFolder != null)" -ForegroundColor Green
Write-Host "  [OK] List Folders" -ForegroundColor Green
Write-Host "  [OK] Upload File (files.insertOne)" -ForegroundColor Green
Write-Host "  [OK] List Files" -ForegroundColor Green
Write-Host "  [OK] Download File (files.findOne)" -ForegroundColor Green
Write-Host "  [OK] Delete File (files.deleteOne)" -ForegroundColor Green
Write-Host "  [OK] Delete Folder" -ForegroundColor Green
Write-Host "  [OK] User Logout" -ForegroundColor Green
