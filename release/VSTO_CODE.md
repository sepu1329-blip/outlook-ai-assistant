# VSTO C# Code (ThisAddIn.cs)

Since your company blocks Web Add-ins, use this C# code in your Visual Studio VSTO project (Outlook Add-in).
This code creates a TaskPane with a WebView2 that loads your AI Assistant and sends email data to it.

## 1. Prerequisites
- In Visual Studio, Manage NuGet Packages -> Install `Microsoft.Web.WebView2`.

## 2. Add a User Control (TaskPaneControl.cs)
Create a new **User Control (Windows Forms)** named `TaskPaneControl`.
- Drag a `Panel` or `WebView2` control onto it.
- If using `WebView2` from Toolbox isn't working, you can create it programmatically (code below assumes programmatic).

## 3. Code for `TaskPaneControl.cs`
Replace the code with this:

```csharp
using System;
using System.Windows.Forms;
using Microsoft.Web.WebView2.WinForms;
using Microsoft.Web.WebView2.Core;
using Outlook = Microsoft.Office.Interop.Outlook;
using Newtonsoft.Json; // Install Newtonsoft.Json if needed, or use manual string building

namespace OutlookAI_VSTO
{
    public partial class TaskPaneControl : UserControl
    {
        private WebView2 webView;

        public TaskPaneControl()
        {
            InitializeComponent();
            InitializeWebView();
        }

        private async void InitializeWebView()
        {
            webView = new WebView2();
            webView.Dock = DockStyle.Fill;
            this.Controls.Add(webView);

            await webView.EnsureCoreWebView2Async(null);
            
            // LOAD YOUR GITHUB PAGES URL HERE
            webView.Source = new Uri("https://sepu1329-blip.github.io/outlook-ai-assistant/index.html");
        }

        public void SendEmailData(Outlook.MailItem mail)
        {
            if (webView == null || webView.CoreWebView2 == null) return;

            try
            {
                var payload = new
                {
                    type = "VSTO_EMAIL_DATA",
                    payload = new
                    {
                        subject = mail.Subject,
                        body = mail.Body, // Or mail.HTMLBody
                        senderName = mail.SenderName,
                        senderEmail = mail.SenderEmailAddress
                    }
                };

                string json = JsonConvert.SerializeObject(payload);
                webView.CoreWebView2.PostWebMessageAsJson(json);
            }
            catch (Exception ex)
            {
                // Handle error
            }
        }
    }
}
```

## 4. Code for `ThisAddIn.cs`
Modify `ThisAddIn.cs` to handle selection changes and update the pane.

```csharp
using System;
using Microsoft.Office.Tools;
using Outlook = Microsoft.Office.Interop.Outlook;

namespace OutlookAI_VSTO
{
    public partial class ThisAddIn
    {
        private Microsoft.Office.Tools.CustomTaskPane myCustomTaskPane;
        private TaskPaneControl myControl;
        private Outlook.Explorer currentExplorer;

        private void ThisAddIn_Startup(object sender, System.EventArgs e)
        {
            myControl = new TaskPaneControl();
            myCustomTaskPane = this.CustomTaskPanes.Add(myControl, "Outlook AI Assistant");
            myCustomTaskPane.Width = 350;
            myCustomTaskPane.Visible = true;

            currentExplorer = this.Application.ActiveExplorer();
            currentExplorer.SelectionChange += CurrentExplorer_SelectionChange;
        }

        private void CurrentExplorer_SelectionChange()
        {
            try
            {
                if (currentExplorer.Selection.Count > 0)
                {
                    object selObject = currentExplorer.Selection[1];
                    if (selObject is Outlook.MailItem mail)
                    {
                        myControl.SendEmailData(mail);
                    }
                }
            }
            catch { }
        }

        private void ThisAddIn_Shutdown(object sender, System.EventArgs e)
        {
        }

        #region VSTO generated code
        private void InternalStartup()
        {
            this.Startup += new System.EventHandler(ThisAddIn_Startup);
            this.Shutdown += new System.EventHandler(ThisAddIn_Shutdown);
        }
        #endregion
    }
}
```
