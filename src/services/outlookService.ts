
// Store the latest email data received from VSTO
let vstoEmailData: { subject: string; body: string; sender: string; from: string; images: string[] } | null = null;

// Reply result callback
let replyResultCallback: ((status: string, message: string) => void) | null = null;

export interface SearchEmailResult {
    entryId: string;
    subject: string;
    sender: string;
    receivedTime: string;
    preview: string;
}

// Listen for messages from VSTO WebView2
window.addEventListener('message', (event) => {
    try {
        const data = event.data;
        if (data && data.type === 'VSTO_EMAIL_DATA') {
            console.log("OutlookService: Received data from VSTO", data.payload);
            vstoEmailData = {
                subject: data.payload.subject || "No Subject",
                body: data.payload.body || "",
                sender: data.payload.senderName || "Unknown",
                from: data.payload.senderEmail || "unknown@example.com",
                images: Array.isArray(data.payload.images) ? data.payload.images : []
            };
        } else if (data && data.type === 'VSTO_REPLY_RESULT') {
            if (replyResultCallback) {
                replyResultCallback(data.payload?.status, data.payload?.message);
                replyResultCallback = null;
            }
        }
    } catch (err) {
        console.error("Error processing VSTO message:", err);
    }
});

export const outlookService = {
    /**
     * Get current email details (Subject, Body, Sender)
     */
    async getCurrentEmail(): Promise<{ subject: string; body: string; sender: string; from: string; images: string[] }> {
        return new Promise((resolve, reject) => {
            try {
                // 1. Try standard Office.js API (Web Add-in)
                if (Office && Office.context && Office.context.mailbox && Office.context.mailbox.item) {
                    const item = Office.context.mailbox.item;
                    item.body.getAsync(Office.CoercionType.Text, (result) => {
                        if (result.status === Office.AsyncResultStatus.Succeeded) {
                            resolve({
                                subject: item.subject || "No Subject",
                                body: result.value,
                                sender: item.from?.displayName || "Unknown",
                                from: item.from?.emailAddress || "unknown@example.com",
                                images: []
                            });
                        } else {
                            reject(result.error.message);
                        }
                    });
                    return;
                }

                // 2. Fallback: Check if VSTO sent us data
                if (vstoEmailData) {
                    console.log("OutlookService: Using VSTO data fallback");
                    resolve(vstoEmailData);
                    return;
                }

                // 3. Request from VSTO (WebView2) and wait with timeout
                if ((window as any).chrome?.webview) {
                    const timer = setTimeout(() => {
                        window.removeEventListener('message', responseHandler);
                        reject('Timeout waiting for response from C# backend');
                    }, 5000);

                    const responseHandler = (event: MessageEvent) => {
                        const data = event.data;
                        if (data && data.type === 'VSTO_EMAIL_DATA') {
                            clearTimeout(timer);
                            window.removeEventListener('message', responseHandler);
                            const p = data.payload || {};
                            const result = {
                                subject: p.subject || "No Subject",
                                body: p.body || "",
                                sender: p.senderName || "Unknown",
                                from: p.senderEmail || "unknown@example.com",
                                images: Array.isArray(p.images) ? p.images as string[] : []
                            };
                            vstoEmailData = result;
                            resolve(result);
                        }
                    };
                    window.addEventListener('message', responseHandler);
                    (window as any).chrome.webview.postMessage(JSON.stringify({ type: 'getEmailContext' }));
                } else {
                    const diagnostics = Office?.context?.diagnostics || {};
                    const debugInfo = `Host: ${diagnostics.host || 'N/A'}, Platform: ${diagnostics.platform || 'N/A'}`;
                    reject(`No email selected. Debug: ${debugInfo}`);
                }

            } catch (e) {
                reject(e);
            }
        });
    },

    /**
     * Search emails using EWS (FindItem)
     * Limit: 20 items
     */
    async searchEmails(sender: string, keyword: string): Promise<SearchEmailResult[]> {
        return new Promise((resolve, reject) => {
            // 1. VSTO fallback (WebView2 mode) – preferred in the desktop add-in
            if ((window as any).chrome?.webview) {
                const timer = setTimeout(() => {
                    window.removeEventListener('message', responseHandler);
                    reject('Timeout waiting for search results from C# backend');
                }, 10000);

                const responseHandler = (event: MessageEvent) => {
                    const data = event.data;
                    if (data && data.type === 'VSTO_SEARCH_RESULTS' && data.payload?.keyword === keyword) {
                        clearTimeout(timer);
                        window.removeEventListener('message', responseHandler);
                        if (data.payload.error) {
                            reject(data.payload.error);
                        } else {
                            const items: SearchEmailResult[] = (data.payload.items || []).map((item: any) => ({
                                entryId: item.entryId || '',
                                subject: item.subject || '',
                                sender: item.senderName || item.senderEmail || '',
                                receivedTime: item.receivedTime || '',
                                preview: item.body || item.preview || '',
                            }));
                            resolve(items);
                        }
                    }
                };
                window.addEventListener('message', responseHandler);
                (window as any).chrome.webview.postMessage(JSON.stringify({ type: 'VSTO_SEARCH_REQUEST', payload: { keyword, sender } }));
                return;
            }

            // 2. Office.js EWS (Web Add-in mode)
            if (!Office) {
                reject("Office API not loaded.");
                return;
            }
            if (!Office.context || !Office.context.mailbox) {
                const diagnostics = Office.context?.diagnostics || {};
                const debugInfo = `Host: ${diagnostics.host || 'N/A'}, Platform: ${diagnostics.platform || 'N/A'}`;
                reject(`Office Mailbox API not available. Debug info: ${debugInfo}`);
                return;
            }
            if (!Office.context.mailbox.makeEwsRequestAsync) {
                reject("EWS Request not supported in this Outlook version/mode.");
                return;
            }
            const request =
                `<?xml version="1.0" encoding="utf-8"?>
          <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                         xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages" 
                         xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types" 
                         xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
            <soap:Header>
              <t:RequestServerVersion Version="Exchange2013" />
            </soap:Header>
            <soap:Body>
              <m:FindItem Traversal="Shallow">
                <m:ItemShape>
                  <t:BaseShape>IdOnly</t:BaseShape>
                  <t:AdditionalProperties>
                    <t:FieldURI FieldURI="item:Subject" />
                    <t:FieldURI FieldURI="message:From" />
                    <t:FieldURI FieldURI="item:Body" /> 
                  </t:AdditionalProperties>
                </m:ItemShape>
                <m:IndexedPageItemView BasePoint="Beginning" MaxEntriesReturned="20" Offset="0" />
                <m:Restriction>
                  <t:And>
                    ${sender ? `
                    <t:Contains Mode="Substring" ContainmentComparison="IgnoreCase">
                      <t:FieldURI FieldURI="message:From" />
                      <t:Constant Value="${sender}" />
                    </t:Contains>
                    ` : ""}
                    ${keyword ? `
                    <t:Or>
                      <t:Contains Mode="Substring" ContainmentComparison="IgnoreCase">
                        <t:FieldURI FieldURI="item:Subject" />
                        <t:Constant Value="${keyword}" />
                      </t:Contains>
                      <t:Contains Mode="Substring" ContainmentComparison="IgnoreCase">
                        <t:FieldURI FieldURI="item:Body" />
                        <t:Constant Value="${keyword}" />
                      </t:Contains>
                    </t:Or>
                    ` : sender ? "" : `
                    <t:Contains Mode="Substring" ContainmentComparison="IgnoreCase">
                      <t:FieldURI FieldURI="item:Subject" />
                      <t:Constant Value="" />
                    </t:Contains>
                    `}
                  </t:And>
                </m:Restriction>
                <m:ParentFolderIds>
                  <t:DistinguishedFolderId Id="inbox" />
                </m:ParentFolderIds>
              </m:FindItem>
            </soap:Body>
          </soap:Envelope>`;

            Office.context.mailbox.makeEwsRequestAsync(request, (result) => {
                if (result.status === Office.AsyncResultStatus.Succeeded) {
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(result.value, "text/xml");
                    const items = xmlDoc.getElementsByTagName("t:Message");
                    const emails: SearchEmailResult[] = [];
                    for (let i = 0; i < items.length; i++) {
                        const subject = items[i].getElementsByTagName("t:Subject")[0]?.textContent || "";
                        const sender = items[i].getElementsByTagName("t:Name")[0]?.textContent || "";
                        emails.push({ entryId: '', subject, sender, receivedTime: '', preview: '' });
                    }
                    resolve(emails);
                } else {
                    reject(result.error.message);
                }
            });
        });
    },

    /**
     * Insert text into reply
     */
    openEmail(entryId: string) {
        if (!entryId) return;
        if ((window as any).chrome?.webview) {
            (window as any).chrome.webview.postMessage(JSON.stringify({ type: 'openEmail', entryId }));
        }
    },

    insertText(text: string) {
        if (Office.context && Office.context.mailbox && Office.context.mailbox.item) {
            Office.context.mailbox.item.body.setSelectedDataAsync(text, { coercionType: Office.CoercionType.Html });
        }
    },

    /**
     * Create a reply draft (Hybrid Mode)
     */
    createReplyDraft(text: string): Promise<void> {
        return new Promise((resolve, reject) => {
            // 1. Try VSTO first (Hybrid Mode Preferred)
            try {
                if ((window as any).chrome?.webview) {
                    const timer = setTimeout(() => {
                        replyResultCallback = null;
                        reject(new Error("답장 생성 시간 초과"));
                    }, 10000);

                    replyResultCallback = (status: string, message: string) => {
                        clearTimeout(timer);
                        if (status === '성공') resolve();
                        else reject(new Error(message));
                    };

                    (window as any).chrome.webview.postMessage(JSON.stringify({
                        type: "VSTO_CREATE_REPLY",
                        payload: { body: text }
                    }));
                    return;
                }
            } catch (e) {
                console.warn("VSTO postMessage failed:", e);
            }

            // 2. Try Standard Web Add-in API
            if (Office.context && Office.context.mailbox && Office.context.mailbox.item) {
                Office.context.mailbox.item.displayReplyForm({ 'htmlBody': text });
                resolve();
            } else {
                reject(new Error("Outlook에 연결되지 않았습니다."));
            }
        });
    }
};
