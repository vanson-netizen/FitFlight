param([string]$SourceDirectory = 'C:\FitFlight\社区图片')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$workspace = Split-Path $PSScriptRoot -Parent
$manifest = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'community-image-manifest.json') -Encoding UTF8 -Raw | ConvertFrom-Json
$destination = Join-Path $workspace 'assets\community'
New-Item -ItemType Directory -Path $destination -Force | Out-Null
$encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
$report = @()
foreach ($entry in $manifest) {
  $sourcePath = Join-Path $SourceDirectory $entry.source
  $hashBefore = (Get-FileHash -LiteralPath $sourcePath -Algorithm SHA256).Hash
  $original = [System.Drawing.Image]::FromFile($sourcePath)
  try {
    $cw = [double]$original.Width
    $ch = $cw * 9 / 16
    if ($ch -gt $original.Height) { $ch = [double]$original.Height; $cw = $ch * 16 / 9 }
    $cx = ($original.Width - $cw) * $entry.focus[0]
    $cy = ($original.Height - $ch) * $entry.focus[1]
    if ($entry.crop) {
      $cx = $original.Width * $entry.crop[0]; $cy = $original.Height * $entry.crop[1]
      $cw = $original.Width * $entry.crop[2]; $ch = $cw * 9 / 16
    }
    if ($cx -lt 0 -or $cy -lt 0 -or $cx + $cw -gt $original.Width + 1 -or $cy + $ch -gt $original.Height + 1) { throw "Invalid crop: $($entry.source)" }
    $outputWidth = if ($entry.home) { 768 } else { 640 }
    $outputHeight = $outputWidth * 9 / 16
    $bitmap = New-Object System.Drawing.Bitmap($outputWidth,$outputHeight)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $graphics.DrawImage($original, [System.Drawing.Rectangle]::new(0,0,$outputWidth,$outputHeight), [single]$cx,[single]$cy,[single]$cw,[single]$ch,[System.Drawing.GraphicsUnit]::Pixel)
      $outputPath = Join-Path $destination $entry.file
      # Preserve source crop and dimensions; use a lighter encoder for larger covers.
      $quality = if ($entry.file -in @('merchant-xueyuan-road-manwei-light-meal.jpg','venue-xueyuan-ball-sports-284873dc9d.jpg')) { 76 } else { 64 }
      do {
        $parameters = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $parameters.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$quality)
        $stream = New-Object System.IO.MemoryStream
        try { $bitmap.Save($stream,$encoder,$parameters); $bytes = $stream.ToArray() } finally { $stream.Dispose(); $parameters.Dispose() }
        if ($bytes.Length -le 75000 -or $quality -le 72) { break }
        $quality -= 2
      } while ($true)
      [System.IO.File]::WriteAllBytes($outputPath,$bytes)
      $verified = [System.Drawing.Image]::FromFile($outputPath)
      try {
        if ($verified.Width -ne $outputWidth -or $verified.Height -ne $outputHeight -or $verified.RawFormat.Guid -ne [System.Drawing.Imaging.ImageFormat]::Jpeg.Guid) { throw 'Invalid output image' }
      } finally { $verified.Dispose() }
      $report += [pscustomobject][ordered]@{ source=$entry.source; file=$entry.file; ids=$entry.ids; width=$outputWidth; height=$outputHeight; ratio='16:9'; format='JPEG'; bytes=$bytes.Length; quality=$quality; sourceWidth=$original.Width; sourceHeight=$original.Height; sourceSha256=$hashBefore; cropPixels=@($cx,$cy,$cw,$ch); focus=$entry.focus; note=$entry.note }
    } finally { $graphics.Dispose(); $bitmap.Dispose() }
  } finally { $original.Dispose() }
  if ((Get-FileHash -LiteralPath $sourcePath -Algorithm SHA256).Hash -ne $hashBefore) { throw 'Original changed' }
}
$report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $workspace 'docs\community-image-audit.json') -Encoding UTF8
$report | Select-Object file,width,height,bytes,quality | Format-Table -AutoSize
Write-Output "Total JPEG bytes: $(($report | Measure-Object bytes -Sum).Sum)"
