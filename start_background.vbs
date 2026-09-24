Set WshShell = CreateObject("WScript.Shell")
Set WshEnv = WshShell.Environment("PROCESS")
WshEnv("NO_BROWSER") = "1"
WshShell.CurrentDirectory = "C:\Users\zin\Downloads\Ai_WebCodes\Selfhosted_Me\Tipitaka_app"
WshShell.Run "pythonw.exe app.py", 0, False
