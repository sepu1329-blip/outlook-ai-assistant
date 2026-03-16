# VSTO C# Code (ThisAddIn.cs + TaskPaneControl.cs)

**Update v1.2.0: Search Mode Support Added**

## 메시지 프로토콜 (JS ↔ VSTO)

| 방향 | type | payload |
|------|------|---------|
| VSTO → JS | `VSTO_EMAIL_DATA` | `{ subject, body, senderName, senderEmail }` |
| JS → VSTO | `VSTO_SEARCH_REQUEST` | `{ keyword: string }` |
| VSTO → JS | `VSTO_SEARCH_RESULTS` | `{ keyword, items: [{ subject, senderName, senderEmail, body, receivedTime }] }` |
| JS → VSTO | `VSTO_CREATE_REPLY` | `{ body: string }` |

## 1. Updated `TaskPaneControl.cs`

```csharp
using System;
using System.Collections.Generic;
using System.Windows.Forms;
using Microsoft.Web.WebView2.WinForms;
using Microsoft.Web.WebView2.Core;
using Outlook = Microsoft.Office.Interop.Outlook;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace OutlookAI_VSTO
{
    public partial class TaskPaneControl : UserControl
    {
        private WebView2 webView;
        private Outlook.Application outlookApp;

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

            webView.WebMessageReceived += WebView_WebMessageReceived;
            webView.Source = new Uri("https://sepu1329-blip.github.io/outlook-ai-assistant/index.html");
        }

        private void Log(string message)
        {
            System.Diagnostics.Debug.WriteLine($"{DateTime.Now} - {message}");
        }

        // Handle messages from React
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
                else if (type == "VSTO_SEARCH_REQUEST")
                {
                    string keyword = data["payload"]?["keyword"]?.ToString();
                    if (!string.IsNullOrEmpty(keyword))
                        SearchEmails(keyword);
                }
            }
            catch (Exception ex)
            {
                Log($"WebMessageReceived Error: {ex.Message}");
            }
        }

        // Search emails in the current folder (or inbox) matching keyword
        private void SearchEmails(string keyword)
        {
            try
            {
                Outlook.MAPIFolder folder = outlookApp.ActiveExplorer()?.CurrentFolder
                    ?? outlookApp.Session.GetDefaultFolder(Outlook.OlDefaultFolders.olFolderInbox);

                Log($"SearchEmails: folder={folder.Name} keyword={keyword}");

                // Try AdvancedSearch first; fall back to Restrict
                try
                {
                    SearchEmailsWithAdvanced(folder, keyword);
                }
                catch (Exception ex)
                {
                    Log($"SearchEmails: AdvancedSearch 미지원 ({ex.Message}), Restrict 폴백");
                    SearchEmailsWithRestrict(folder, keyword);
                }
            }
            catch (Exception ex)
            {
                Log($"SearchEmails Error: {ex.Message}");
                SendSearchResults(keyword, new List<object>());
            }
        }

        private void SearchEmailsWithAdvanced(Outlook.MAPIFolder folder, string keyword)
        {
            // Scope is the folder EntryID
            string scope = $"'{folder.FolderPath}'";
            string filter = $"\"urn:schemas:httpmail:subject\" LIKE '%{keyword}%' OR \"urn:schemas:httpmail:textdescription\" LIKE '%{keyword}%'";
            Outlook.Search search = outlookApp.AdvancedSearch(scope, filter, false, "SearchTag");

            // AdvancedSearch is async — use synchronous Restrict instead if this throws
            throw new NotSupportedException("Using Restrict instead");
        }

        private void SearchEmailsWithRestrict(Outlook.MAPIFolder folder, string keyword)
        {
            Log($"SearchEmailsWithRestrict: folder={folder.Name}");

            Outlook.Items items = folder.Items;
            string filter = $"@SQL=\"urn:schemas:httpmail:subject\" LIKE '%{keyword}%' OR \"urn:schemas:httpmail:textdescription\" LIKE '%{keyword}%'";
            Outlook.Items filtered = items.Restrict(filter);

            var results = new List<object>();
            int count = Math.Min(filtered.Count, 20);

            for (int i = 1; i <= count; i++)
            {
                try
                {
                    if (filtered[i] is Outlook.MailItem mail)
                    {
                        string body = mail.Body ?? "";
                        if (body.Length > 500) body = body.Substring(0, 500);

                        results.Add(new
                        {
                            subject = mail.Subject ?? "",
                            senderName = mail.SenderName ?? "",
                            senderEmail = mail.SenderEmailAddress ?? "",
                            body = body,
                            receivedTime = mail.ReceivedTime.ToString("yyyy-MM-dd HH:mm")
                        });
                    }
                }
                catch { }
            }

            Log($"SearchEmailsWithRestrict: sending {results.Count} items to JS");
            SendSearchResults(keyword, results);
        }

        // Send VSTO_SEARCH_RESULTS to JS
        private void SendSearchResults(string keyword, List<object> items)
        {
            if (webView?.CoreWebView2 == null) return;
            try
            {
                var payload = new
                {
                    type = "VSTO_SEARCH_RESULTS",
                    payload = new { keyword, items }
                };
                string json = JsonConvert.SerializeObject(payload);
                webView.Invoke((Action)(() => webView.CoreWebView2.PostWebMessageAsJson(json)));
            }
            catch (Exception ex)
            {
                Log($"SendSearchResults Error: {ex.Message}");
            }
        }

        // Create a reply draft
        private void CreateReply(string draftBody)
        {
            try
            {
                Outlook.Explorer explorer = outlookApp.ActiveExplorer();
                if (explorer != null && explorer.Selection.Count > 0)
                {
                    if (explorer.Selection[1] is Outlook.MailItem mail)
                    {
                        Outlook.MailItem replyItem = mail.Reply();
                        replyItem.HTMLBody = draftBody + replyItem.HTMLBody;
                        replyItem.Display();
                    }
                }
            }
            catch (Exception ex)
            {
                Log($"CreateReply Error: {ex.Message}");
            }
        }

        // Send current email data to React
        public void SendEmailData(Outlook.MailItem mail)
        {
            if (webView?.CoreWebView2 == null) return;
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

## 2. `ThisAddIn.cs` (No Changes Needed)
Keep your `ThisAddIn.cs` as it was, calling `myControl.SendEmailData(mail)` on selection change.
