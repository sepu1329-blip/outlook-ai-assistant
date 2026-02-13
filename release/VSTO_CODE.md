# VSTO C# Code (ThisAddIn.cs + TaskPaneControl.cs)

**Update v1.1.0: Reply Support Added**

Replace your existing code with this updated version to support "Reply with Draft" from the chat window.

## 1. Prerequisites
- **Important**: Your WebView2 must handle `WebMessageReceived`.
- In Visual Studio Designer for `TaskPaneControl`:
  - Select the `webView` control.
  - Go to **Events** (Lightning bolt icon).
  - Double click `WebMessageReceived` to generate the event handler.
  - OR use the code below which does it programmatically in `InitializeWebView`.

## 2. Updated `TaskPaneControl.cs`

```csharp
using System;
using System.Windows.Forms;
using Microsoft.Web.WebView2.WinForms;
using Microsoft.Web.WebView2.Core;
using Outlook = Microsoft.Office.Interop.Outlook;
using Newtonsoft.Json; 
using Newtonsoft.Json.Linq; // Requires Newtonsoft.Json package

namespace OutlookAI_VSTO
{
    public partial class TaskPaneControl : UserControl
    {
        private WebView2 webView;
        private Outlook.Application outlookApp; // Reference to Outlook

        public TaskPaneControl()
        {
            InitializeComponent();
            InitializeWebView();
            outlookApp = Globals.ThisAddIn.Application;
        }

        private async void InitializeWebView()
        {
            webView = new WebView2();
            webView.Dock = DockStyle.Fill;
            this.Controls.Add(webView);

            await webView.EnsureCoreWebView2Async(null);
            
            // Listen for messages FROM React
            webView.WebMessageReceived += WebView_WebMessageReceived;

            // Load React App
            webView.Source = new Uri("https://sepu1329-blip.github.io/outlook-ai-assistant/index.html");
        }

        // Handle messages from React (e.g., "VSTO_CREATE_REPLY")
        private void WebView_WebMessageReceived(object sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            try
            {
                string json = e.TryGetWebMessageAsString();
                JObject data = JObject.Parse(json);
                string type = data["type"]?.ToString();

                if (type == "VSTO_CREATE_REPLY")
                {
                    string body = data["payload"]?["body"]?.ToString();
                    CreateReply(body);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error processing message: " + ex.Message);
            }
        }

        // Logic to create a reply in Outlook
        private void CreateReply(string draftBody)
        {
            try
            {
                Outlook.Explorer explorer = outlookApp.ActiveExplorer();
                if (explorer != null && explorer.Selection.Count > 0)
                {
                    object selObject = explorer.Selection[1];
                    if (selObject is Outlook.MailItem mail)
                    {
                        Outlook.MailItem replyItem = mail.Reply();
                        
                        // Preserve signature if possible, or just append properly
                        replyItem.HTMLBody = draftBody + replyItem.HTMLBody;
                        
                        replyItem.Display(); // Open the reply window
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Failed to create reply: " + ex.Message);
            }
        }

        // Send data TO React
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
                        body = mail.Body,
                        senderName = mail.SenderName,
                        senderEmail = mail.SenderEmailAddress
                    }
                };

                string json = JsonConvert.SerializeObject(payload);
                webView.CoreWebView2.PostWebMessageAsJson(json);
            }
            catch { }
        }
    }
}
```

## 3. `ThisAddIn.cs` (No Major Changes Needed)
Keep your `ThisAddIn.cs` as it was, calling `myControl.SendEmailData(mail)` on selection change.
