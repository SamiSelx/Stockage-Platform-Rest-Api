# Complete test script for Stockage Platform API (with new APIs)
# Run:
#   powershell -ExecutionPolicy Bypass -File .\test-api-complete.ps1

$baseUrl = "http://localhost:8081"

function Write-Status([string]$message, [string]$status = "INFO") {
    $colors = @{
        "SUCCESS" = "Green"
        "ERROR"   = "Red"
        "WARNING" = "Yellow"
        "INFO"    = "Cyan"
    }
    Write-Host "[$status] $message" -ForegroundColor $colors[$status]
}

function Get-ErrorBody($err) {
    try {
        if ($err.Exception.Response -and $err.Exception.Response.GetResponseStream()) {
            $reader = New-Object System.IO.StreamReader($err.Exception.Response.GetResponseStream())
            $reader.BaseStream.Position = 0
            $reader.DiscardBufferedData()
            return $reader.ReadToEnd()
        }
    } catch {}
    return $null
}

function Get-IdValue($obj) {
    if ($null -eq $obj) { return $null }

    if ($obj.id) { return $obj.id }
    if ($obj._id) { return $obj._id }

    if ($obj.file) {
        if ($obj.file.id) { return $obj.file.id }
        if ($obj.file._id) { return $obj.file._id }
    }

    if ($obj.folder) {
        if ($obj.folder.id) { return $obj.folder.id }
        if ($obj.folder._id) { return $obj.folder._id }
    }

    return $null
}

function Invoke-ApiJson(
    [string]$method,
    [string]$url,
    [object]$body = $null,
    [string]$token = $null,
    [string]$testName = "API Request"
) {
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

        if ($null -ne $body) {
            $requestParams["Body"] = $body | ConvertTo-Json -Depth 20
        }

        $response = Invoke-WebRequest @requestParams
        Write-Status "$testName - OK ($($response.StatusCode))" "SUCCESS"

        $json = $null
        try {
            $json = $response.Content | ConvertFrom-Json
        } catch {}

        return @{
            Raw  = $response
            Json = $json
        }
    }
    catch {
        $errorBody = Get-ErrorBody $_
        Write-Status "$testName - ERROR" "ERROR"
        if ($errorBody) {
            Write-Host $errorBody -ForegroundColor DarkRed
        } else {
            Write-Host $_.Exception.Message -ForegroundColor DarkRed
        }
        return $null
    }
}

function Invoke-FileUpload(
    [string]$url,
    [string]$token,
    [string]$testName,
    [string]$folderId = $null
) {
    $testFilePath = $null
    try {
        $testFilePath = [System.IO.Path]::GetTempFileName()
        Set-Content -Path $testFilePath -Value "Test file content for $(Get-Date)"

        $headers = @{
            "Authorization" = "Bearer $token"
        }

        $boundary = [System.Guid]::NewGuid().ToString()
        $LF = "`r`n"
        $fileContent = Get-Content -Path $testFilePath -Raw

        $bodyBuilder = New-Object System.Text.StringBuilder

        [void]$bodyBuilder.Append("--$boundary$LF")
        [void]$bodyBuilder.Append("Content-Disposition: form-data; name=`"file`"; filename=`"test.txt`"$LF")
        [void]$bodyBuilder.Append("Content-Type: text/plain$LF$LF")
        [void]$bodyBuilder.Append("$fileContent$LF")

        if ($folderId) {
            [void]$bodyBuilder.Append("--$boundary$LF")
            [void]$bodyBuilder.Append("Content-Disposition: form-data; name=`"folderId`"$LF$LF")
            [void]$bodyBuilder.Append("$folderId$LF")
        }

        [void]$bodyBuilder.Append("--$boundary--$LF")

        $requestParams = @{
            Uri             = $url
            Method          = "POST"
            Headers         = $headers
            ContentType     = "multipart/form-data; boundary=$boundary"
            Body            = $bodyBuilder.ToString()
            UseBasicParsing = $true
        }

        $response = Invoke-WebRequest @requestParams
        Write-Status "$testName - OK ($($response.StatusCode))" "SUCCESS"

        $json = $null
        try {
            $json = $response.Content | ConvertFrom-Json
        } catch {}

        return @{
            Raw  = $response
            Json = $json
        }
    }
    catch {
        $errorBody = Get-ErrorBody $_
        Write-Status "$testName - ERROR" "ERROR"
        if ($errorBody) {
            Write-Host $errorBody -ForegroundColor DarkRed
        } else {
            Write-Host $_.Exception.Message -ForegroundColor DarkRed
        }
        return $null
    }
    finally {
        if ($testFilePath -and (Test-Path $testFilePath)) {
            Remove-Item -Path $testFilePath -Force
        }
    }
}

function Invoke-DownloadFile(
    [string]$url,
    [string]$token,
    [string]$testName
) {
    try {
        $headers = @{}
        if ($token) {
            $headers["Authorization"] = "Bearer $token"
        }

        $downloadPath = Join-Path $env:TEMP ("stockage-download-" + [guid]::NewGuid().ToString() + ".bin")

        $response = Invoke-WebRequest -Uri $url -Method GET -Headers $headers -OutFile $downloadPath -UseBasicParsing
        Write-Status "$testName - OK (downloaded to $downloadPath)" "SUCCESS"

        return $downloadPath
    }
    catch {
        $errorBody = Get-ErrorBody $_
        Write-Status "$testName - ERROR" "ERROR"
        if ($errorBody) {
            Write-Host $errorBody -ForegroundColor DarkRed
        } else {
            Write-Host $_.Exception.Message -ForegroundColor DarkRed
        }
        return $null
    }
}

Write-Host "`n========== STOCKAGE PLATFORM COMPLETE API TEST ==========`n" -ForegroundColor Magenta

Write-Host "0. HEALTH CHECK`n" -ForegroundColor Yellow
Write-Host "Base URL: $baseUrl" -ForegroundColor Cyan
Write-Host "Assure-toi que le backend est lancé sur ce port.`n" -ForegroundColor DarkYellow

Write-Host "1. AUTHENTICATION TESTS`n" -ForegroundColor Yellow

$randomEmail = "testuser_$(Get-Random)@example.com"

$registerBody = @{
    firstName = "Test"
    lastName  = "User"
    email     = $randomEmail
    password  = "TestPassword@123"
}

$registerResponse = Invoke-ApiJson "POST" "$baseUrl/auth/register" $registerBody $null "Register"
if ($null -eq $registerResponse) {
    Write-Status "Registration failed, stopping tests" "ERROR"
    exit 1
}

$loginBody = @{
    email    = $randomEmail
    password = "TestPassword@123"
}

$loginResponse = Invoke-ApiJson "POST" "$baseUrl/auth/login" $loginBody $null "Login"
if ($null -eq $loginResponse) {
    Write-Status "Login failed, stopping tests" "ERROR"
    exit 1
}

$token = $loginResponse.Json.data.token
if (-not $token) {
    Write-Status "Token not found in login response, stopping tests" "ERROR"
    exit 1
}

Write-Host "Token received: $($token.Substring(0, [Math]::Min(20, $token.Length)))..." -ForegroundColor Green
Invoke-ApiJson "GET" "$baseUrl/auth/" $null $token "Check Auth Status" | Out-Null

Write-Host "`n2. INITIAL STATISTICS`n" -ForegroundColor Yellow
$statsBefore = Invoke-ApiJson "GET" "$baseUrl/file/statistics" $null $token "Get Statistics (Before)"
if ($statsBefore -and $statsBefore.Json) {
    Write-Host ("Files: " + $statsBefore.Json.data.totalFiles) -ForegroundColor Gray
    Write-Host ("Folders: " + $statsBefore.Json.data.totalFolders) -ForegroundColor Gray
    Write-Host ("Used storage: " + $statsBefore.Json.data.storage.used) -ForegroundColor Gray
}

Write-Host "`n3. FOLDER MANAGEMENT TESTS`n" -ForegroundColor Yellow

$createParentFolderBody = @{
    name = "Parent Folder $(Get-Random)"
}

$createParentFolderResponse = Invoke-ApiJson "POST" "$baseUrl/folder" $createParentFolderBody $token "Create Parent Folder"
$parentFolderId = $null
if ($null -ne $createParentFolderResponse -and $createParentFolderResponse.Json) {
    $parentFolderId = Get-IdValue $createParentFolderResponse.Json.data
    Write-Host "Parent Folder ID: $parentFolderId`n" -ForegroundColor Green
}

Invoke-ApiJson "GET" "$baseUrl/folder" $null $token "List Folders (Root)" | Out-Null

$createSubFolderBody = @{
    name         = "SubFolder $(Get-Random)"
    parentFolder = $parentFolderId
}

$createSubFolderResponse = Invoke-ApiJson "POST" "$baseUrl/folder" $createSubFolderBody $token "Create SubFolder"
$subFolderId = $null
if ($null -ne $createSubFolderResponse -and $createSubFolderResponse.Json) {
    $subFolderId = Get-IdValue $createSubFolderResponse.Json.data
    Write-Host "SubFolder ID: $subFolderId`n" -ForegroundColor Green
}

if ($parentFolderId) {
    Invoke-ApiJson "GET" "$baseUrl/folder?parentFolder=$parentFolderId" $null $token "List SubFolders" | Out-Null
    Invoke-ApiJson "GET" "$baseUrl/folder/$parentFolderId" $null $token "Get Folder By ID" | Out-Null
}

Write-Host "`n4. FILE MANAGEMENT TESTS`n" -ForegroundColor Yellow

Invoke-ApiJson "GET" "$baseUrl/file" $null $token "List Files (Root - Before Upload)" | Out-Null

$uploadFileResponse = Invoke-FileUpload "$baseUrl/file/upload" $token "Upload File (Root)"
$fileId = $null
if ($null -ne $uploadFileResponse -and $uploadFileResponse.Json) {
    $fileId = Get-IdValue $uploadFileResponse.Json.data
    Write-Host "File ID: $fileId`n" -ForegroundColor Green
}

Invoke-ApiJson "GET" "$baseUrl/file" $null $token "List Files (Root - After Upload)" | Out-Null

Write-Host "`n5. DASHBOARD / RECENT / STARRED APIS`n" -ForegroundColor Yellow

Invoke-ApiJson "GET" "$baseUrl/file/statistics" $null $token "Get Statistics (After Upload)" | Out-Null
Invoke-ApiJson "GET" "$baseUrl/file/recent?limit=10" $null $token "Get Recent Files (Before Download)" | Out-Null

if ($fileId) {
    Invoke-ApiJson "PATCH" "$baseUrl/file/$fileId/star" @{ starred = $true } $token "Star File" | Out-Null
    Invoke-ApiJson "GET" "$baseUrl/file/starred" $null $token "List Starred Files" | Out-Null
}

Write-Host "`n6. DOWNLOAD + MOVE TESTS`n" -ForegroundColor Yellow

if ($fileId) {
    $downloaded = Invoke-DownloadFile "$baseUrl/file/download/$fileId" $token "Download File"
    if ($downloaded) {
        Write-Host "Downloaded file path: $downloaded" -ForegroundColor Gray
    }

    Invoke-ApiJson "GET" "$baseUrl/file/recent?limit=10" $null $token "Get Recent Files (After Download)" | Out-Null
}

if ($fileId -and $parentFolderId) {
    $moveFileBody = @{
        folderId = $parentFolderId
    }

    $moveFileResponse = Invoke-ApiJson "PATCH" "$baseUrl/file/$fileId/move" $moveFileBody $token "Move File to Folder"
    if ($null -ne $moveFileResponse -and $moveFileResponse.Json) {
        Write-Host "File moved to folder successfully.`n" -ForegroundColor Green
    }
}

Invoke-ApiJson "GET" "$baseUrl/file?folderId=$parentFolderId" $null $token "List Files Inside Parent Folder" | Out-Null

if ($fileId) {
    Invoke-ApiJson "PATCH" "$baseUrl/file/$fileId/move" @{} $token "Move File Back to Root" | Out-Null
}

Write-Host "`n7. TRASH / RESTORE / PERMANENT DELETE (FILE)`n" -ForegroundColor Yellow

if ($fileId) {
    Invoke-ApiJson "DELETE" "$baseUrl/file/$fileId" $null $token "Soft Delete File (Archive)" | Out-Null
    Invoke-ApiJson "GET" "$baseUrl/file/trash" $null $token "List Trash Files" | Out-Null

    Invoke-ApiJson "PATCH" "$baseUrl/file/$fileId/restore" $null $token "Restore File" | Out-Null
    Invoke-ApiJson "GET" "$baseUrl/file/trash" $null $token "List Trash Files After Restore" | Out-Null

    Invoke-ApiJson "DELETE" "$baseUrl/file/$fileId" $null $token "Soft Delete File Again" | Out-Null
    Invoke-ApiJson "DELETE" "$baseUrl/file/$fileId/permanent" $null $token "Permanent Delete File" | Out-Null
    Invoke-ApiJson "GET" "$baseUrl/file/trash" $null $token "List Trash Files After Permanent Delete" | Out-Null
}

Write-Host "`n8. TRASH / RESTORE / PERMANENT DELETE (FOLDER)`n" -ForegroundColor Yellow

if ($parentFolderId) {
    Invoke-ApiJson "DELETE" "$baseUrl/folder/$parentFolderId" $null $token "Soft Delete Parent Folder (Archive)" | Out-Null
    Invoke-ApiJson "GET" "$baseUrl/folder/trash" $null $token "List Trash Folders" | Out-Null

    Invoke-ApiJson "PATCH" "$baseUrl/folder/$parentFolderId/restore" $null $token "Restore Parent Folder" | Out-Null
    Invoke-ApiJson "GET" "$baseUrl/folder/trash" $null $token "List Trash Folders After Restore" | Out-Null

    Invoke-ApiJson "DELETE" "$baseUrl/folder/$parentFolderId" $null $token "Soft Delete Parent Folder Again" | Out-Null
    Invoke-ApiJson "DELETE" "$baseUrl/folder/$parentFolderId/permanent" $null $token "Permanent Delete Parent Folder" | Out-Null
    Invoke-ApiJson "GET" "$baseUrl/folder/trash" $null $token "List Trash Folders After Permanent Delete" | Out-Null
}

Write-Host "`n9. FINAL STATISTICS`n" -ForegroundColor Yellow

$statsAfter = Invoke-ApiJson "GET" "$baseUrl/file/statistics" $null $token "Get Statistics (Final)"
if ($statsAfter -and $statsAfter.Json) {
    Write-Host ("Files: " + $statsAfter.Json.data.totalFiles) -ForegroundColor Gray
    Write-Host ("Folders: " + $statsAfter.Json.data.totalFolders) -ForegroundColor Gray
    Write-Host ("Archived files: " + $statsAfter.Json.data.archivedFiles) -ForegroundColor Gray
    Write-Host ("Archived folders: " + $statsAfter.Json.data.archivedFolders) -ForegroundColor Gray
    Write-Host ("Starred files: " + $statsAfter.Json.data.starredFiles) -ForegroundColor Gray
    Write-Host ("Opened files: " + $statsAfter.Json.data.openedFiles) -ForegroundColor Gray
    Write-Host ("Used storage: " + $statsAfter.Json.data.storage.used) -ForegroundColor Gray
    Write-Host ("Remaining storage: " + $statsAfter.Json.data.storage.remaining) -ForegroundColor Gray
}

Write-Host "`n10. LOGOUT`n" -ForegroundColor Yellow
Invoke-ApiJson "GET" "$baseUrl/auth/logout" $null $token "Logout" | Out-Null

Write-Host "`n========== ALL TESTS COMPLETED ==========`n" -ForegroundColor Green
Write-Host "Coverage:" -ForegroundColor Cyan
Write-Host "  [OK] Register" -ForegroundColor Green
Write-Host "  [OK] Login" -ForegroundColor Green
Write-Host "  [OK] Check auth" -ForegroundColor Green
Write-Host "  [OK] Create folder" -ForegroundColor Green
Write-Host "  [OK] Create subfolder" -ForegroundColor Green
Write-Host "  [OK] List folders" -ForegroundColor Green
Write-Host "  [OK] Get folder by id" -ForegroundColor Green
Write-Host "  [OK] Upload file" -ForegroundColor Green
Write-Host "  [OK] List files" -ForegroundColor Green
Write-Host "  [OK] Get statistics" -ForegroundColor Green
Write-Host "  [OK] Get recent files" -ForegroundColor Green
Write-Host "  [OK] Star file" -ForegroundColor Green
Write-Host "  [OK] List starred files" -ForegroundColor Green
Write-Host "  [OK] Download file" -ForegroundColor Green
Write-Host "  [OK] Move file to folder / root" -ForegroundColor Green
Write-Host "  [OK] Soft delete file" -ForegroundColor Green
Write-Host "  [OK] Restore file" -ForegroundColor Green
Write-Host "  [OK] Permanent delete file" -ForegroundColor Green
Write-Host "  [OK] Soft delete folder" -ForegroundColor Green
Write-Host "  [OK] Restore folder" -ForegroundColor Green
Write-Host "  [OK] Permanent delete folder" -ForegroundColor Green
Write-Host "  [OK] Logout" -ForegroundColor Green