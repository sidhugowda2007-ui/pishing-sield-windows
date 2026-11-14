; Registers PhishGuard as a browser option in Windows "Default apps" (per-user, no admin needed),
; so links clicked in other apps can be handed to PhishGuard. Windows still requires the USER to pick it as default.
!macro customInstall
  WriteRegStr HKCU "Software\Classes\PhishGuardURL" "" "PhishGuard URL"
  WriteRegStr HKCU "Software\Classes\PhishGuardURL" "URL Protocol" ""
  WriteRegStr HKCU "Software\Classes\PhishGuardURL\DefaultIcon" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME},0"
  WriteRegStr HKCU "Software\Classes\PhishGuardURL\shell\open\command" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "%1"'

  WriteRegStr HKCU "Software\Clients\StartMenuInternet\PhishGuard" "" "PhishGuard"
  WriteRegStr HKCU "Software\Clients\StartMenuInternet\PhishGuard\Capabilities" "ApplicationName" "PhishGuard"
  WriteRegStr HKCU "Software\Clients\StartMenuInternet\PhishGuard\Capabilities" "ApplicationDescription" "Checks links for phishing signs before they open in your browser."
  WriteRegStr HKCU "Software\Clients\StartMenuInternet\PhishGuard\Capabilities\URLAssociations" "http" "PhishGuardURL"
  WriteRegStr HKCU "Software\Clients\StartMenuInternet\PhishGuard\Capabilities\URLAssociations" "https" "PhishGuardURL"
  WriteRegStr HKCU "Software\Clients\StartMenuInternet\PhishGuard\DefaultIcon" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME},0"
  WriteRegStr HKCU "Software\Clients\StartMenuInternet\PhishGuard\shell\open\command" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}"'
  WriteRegStr HKCU "Software\RegisteredApplications" "PhishGuard" "Software\Clients\StartMenuInternet\PhishGuard\Capabilities"
!macroend

!macro customUnInstall
  DeleteRegKey HKCU "Software\Classes\PhishGuardURL"
  DeleteRegKey HKCU "Software\Clients\StartMenuInternet\PhishGuard"
  DeleteRegValue HKCU "Software\RegisteredApplications" "PhishGuard"
!macroend
