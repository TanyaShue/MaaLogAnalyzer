Option Explicit

Dim fso, shellApp, targetPath, route, lower, base64Path, uri, uriScheme
Set fso = CreateObject("Scripting.FileSystemObject")
Set shellApp = CreateObject("Shell.Application")

targetPath = ""
uriScheme = "vscode"
If WScript.Arguments.Count > 0 Then
  targetPath = Trim(WScript.Arguments(0))
End If
If WScript.Arguments.Count > 1 Then
  uriScheme = Trim(WScript.Arguments(1))
End If

If Len(targetPath) = 0 Then
  WScript.Quit 1
End If
If Not IsValidUriScheme(uriScheme) Then
  WScript.Quit 1
End If

If Left(targetPath, 1) = Chr(34) And Right(targetPath, 1) = Chr(34) Then
  targetPath = Mid(targetPath, 2, Len(targetPath) - 2)
End If

On Error Resume Next
If fso.FolderExists(targetPath) Then
  route = "analyze-folder"
ElseIf fso.FileExists(targetPath) Then
  lower = LCase(targetPath)
  If EndsWith(lower, ".log") Or EndsWith(lower, ".jsonl") Or EndsWith(lower, ".txt") Or EndsWith(lower, ".zip") Then
    route = "analyze-file"
  Else
    WScript.Quit 1
  End If
Else
  WScript.Quit 1
End If
On Error GoTo 0

base64Path = Base64EncodeUtf8(targetPath)
uri = uriScheme & "://windsland52.maa-log-analyzer/open/" & route & "/" & base64Path

shellApp.ShellExecute uri, "", "", "open", 0

Function EndsWith(ByVal text, ByVal suffix)
  If Len(text) < Len(suffix) Then
    EndsWith = False
  Else
    EndsWith = (Right(text, Len(suffix)) = suffix)
  End If
End Function

Function IsValidUriScheme(ByVal value)
  Dim expression
  Set expression = New RegExp
  expression.Pattern = "^[A-Za-z][A-Za-z0-9+.-]{0,63}$"
  IsValidUriScheme = expression.Test(value)
End Function

Function Base64EncodeUtf8(ByVal text)
  Dim stream, bytes, xmlDoc, xmlNode
  Set stream = CreateObject("ADODB.Stream")
  stream.Type = 2
  stream.Charset = "utf-8"
  stream.Open
  stream.WriteText text
  stream.Position = 0
  stream.Type = 1
  bytes = stream.Read
  stream.Close

  Set xmlDoc = CreateObject("MSXML2.DOMDocument.6.0")
  Set xmlNode = xmlDoc.createElement("b64")
  xmlNode.DataType = "bin.base64"
  xmlNode.nodeTypedValue = bytes

  Base64EncodeUtf8 = Replace(Replace(xmlNode.Text, vbCr, ""), vbLf, "")
End Function
