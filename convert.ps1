Add-Type -AssemblyName System.Drawing
$src = "C:\Users\WELCOME\.gemini\antigravity\brain\c0a285f6-9162-40d2-b094-b2ad26167d72\velura_logo_fixed_png_1775585016464.png"
$dest = "d:\VELURA\velura\assets\icon.png"
$img = [System.Drawing.Image]::FromFile($src)
$img.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
$img.Dispose()
