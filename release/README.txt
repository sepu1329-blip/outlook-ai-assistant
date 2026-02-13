HOW TO INSTALL ON ANOTHER PC
===========================

1. Copy this entire folder (`release`) to a permanent location on the target PC 
   (e.g., `C:\OutlookAddin`).
   *IMPORTANT*: Do not delete/move this folder after installation, or Outlook will lose the add-in.

2. Double-click `install_cmd.bat`.
   - If it fails, right-click and "Run as Administrator".

3. Restart Outlook.

4. You should see "Outlook AI Assistant" in the Ribbon or "Get Add-ins" -> "Custom" / "Shared".

NOTE: The add-in code runs from the web (GitHub Pages), so you don't need the full source code.
Only `manifest.xml` is needed locally to tell Outlook where to find the website.
