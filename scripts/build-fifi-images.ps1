param([string]$SourceDirectory)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
public static class FifiPixels {
 public static int[] Inspect(Bitmap b) {
  int l=b.Width,t=b.Height,r=-1,d=-1,transparent=0,partial=0;
  for(int y=0;y<b.Height;y++)for(int x=0;x<b.Width;x++) {
   int a=b.GetPixel(x,y).A;
   if(a==0)transparent++; else {l=Math.Min(l,x);t=Math.Min(t,y);r=Math.Max(r,x);d=Math.Max(d,y);if(a<255)partial++;}
  }
  return new int[]{l,t,r-l+1,d-t+1,transparent,partial};
 }
}
'@
$root = Split-Path $PSScriptRoot -Parent
$audit = @()
$files = Get-ChildItem -LiteralPath $SourceDirectory -Filter *.png
foreach($file in $files) {
 $hash = (Get-FileHash -LiteralPath $file.FullName).Hash
 $original = [System.Drawing.Bitmap]::FromFile($file.FullName)
 try {
  $pixels = [FifiPixels]::Inspect($original)
  $entry = [ordered]@{source=$file.Name;sourceWidth=$original.Width;sourceHeight=$original.Height;sourceBytes=$file.Length;sourceSha256=$hash;alphaBounds=@($pixels[0],$pixels[1],$pixels[2],$pixels[3]);transparentPixels=$pixels[4];partialAlphaPixels=$pixels[5]}
  # Source identities are explicit Unicode names; the layout preview is inspected only.
  $isPet = $file.BaseName -eq ([string][char]0x8428+[char]0x6469+[char]0x8036)
  $isBackground = $file.BaseName -eq ([string][char]0x80cc+[char]0x666f+[char]0x56fe)
  if($isPet -or $isBackground) {
   $crop = if($isPet){[System.Drawing.Rectangle]::new([Math]::Max(0,$pixels[0]-8),[Math]::Max(0,$pixels[1]-8),$pixels[2]+16,$pixels[3]+16)}else{[System.Drawing.Rectangle]::new(0,0,$original.Width,$original.Height)}
   $width = if($isPet){500}else{750}
   $height = [int][Math]::Round($width * $crop.Height / $crop.Width)
   $bitmap = New-Object System.Drawing.Bitmap($width,$height,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
   $g = [System.Drawing.Graphics]::FromImage($bitmap)
   try {
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($original,[System.Drawing.Rectangle]::new(0,0,$width,$height),$crop,[System.Drawing.GraphicsUnit]::Pixel)
    $name = if($isPet){'samoyed.png'}else{'fifi-background.jpg'}
    $output = Join-Path $root "assets/fifi/$name"
    if($isPet){$bitmap.Save($output,[System.Drawing.Imaging.ImageFormat]::Png)}else{
     $encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
     $parameters = New-Object System.Drawing.Imaging.EncoderParameters(1)
     $parameters.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality,[long]62)
     try {$bitmap.Save($output,$encoder,$parameters)}finally{$parameters.Dispose()}
    }
    $entry.file=$name;$entry.width=$width;$entry.height=$height;$entry.bytes=(Get-Item -LiteralPath $output).Length
    $entry.outputAlpha=[FifiPixels]::Inspect($bitmap)
    if($entry.bytes -ge 200000){throw "Image exceeds 200KB: $name"}
    if($isPet -and $entry.outputAlpha[4] -eq 0){throw 'Pet lost transparency'}
   }finally{$g.Dispose();$bitmap.Dispose()}
  }
  $audit += [pscustomobject]$entry
 }finally{$original.Dispose()}
 if((Get-FileHash -LiteralPath $file.FullName).Hash -ne $hash){throw 'Original changed'}
}
$audit | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 (Join-Path $root 'docs/fifi-image-audit.json')
$audit | Format-List
