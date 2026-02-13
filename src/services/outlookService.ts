
// Store the latest email data received from VSTO
let vstoEmailData: { subject: string; body: string; sender: string; from: string } | null = null;

// Listen for messages from VSTO WebView2
window.addEventListener('message', (event) => {
    try {
        // Handle VSTO messages
        const data = event.data;
        if (data && data.type === 'VSTO_EMAIL_DATA') {
            console.log("OutlookService: Received data from VSTO", data.payload);
            vstoEmailData = {
                subject: data.payload.subject || "No Subject",
                body: data.payload.body || "",
                sender: data.payload.senderName || "Unknown",
                from: data.payload.senderEmail || "unknown@example.com"
            };
        }
    } catch (err) {
        console.error("Error processing VSTO message:", err);
    }
});

export const outlookService = {
    /**
     * Get current email details (Subject, Body, Sender)
     */
    async getCurrentEmail(): Promise<{ subject: string; body: string; sender: string; from: string }> {
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
                                from: item.from?.emailAddress || "unknown@example.com"
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

                // 3. If neither works, reject with specific error
                const diagnostics = Office?.context?.diagnostics || {};
                const debugInfo = `Host: ${diagnostics.host || 'N/A'}, Platform: ${diagnostics.platform || 'N/A'}`;
                reject(`No email selected. (Web Add-in: Mailbox missing. VSTO: No data received yet). Debug: ${debugInfo}`);

            } catch (e) {
                reject(e);
            }
        });
    },

    /**
     * Search emails using EWS (FindItem)
     * Limit: 20 items
     */
    async searchEmails(keyword: string): Promise<string[]> {
        return new Promise((resolve, reject) => {
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
            // EWS Request to find items
            // Note: This is a simplified XML construction. In production, use a proper builder.
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
                    <!-- Body Preview is lighter than full Body -->
                    <t:FieldURI FieldURI="item:Body" /> 
                  </t:AdditionalProperties>
                </m:ItemShape>
                <m:IndexedPageItemView BasePoint="Beginning" MaxEntriesReturned="20" Offset="0" />
                <m:Restriction>
                  <t:Contains Mode="Substring" ContainmentComparison="IgnoreCase">
                    <t:FieldURI FieldURI="item:Body" />
                    <t:Constant Value="${keyword}" />
                  </t:Contains>
                </m:Restriction>
                <m:ParentFolderIds>
                  <t:DistinguishedFolderId Id="inbox" />
                </m:ParentFolderIds>
              </m:FindItem>
            </soap:Body>
          </soap:Envelope>`;

            Office.context.mailbox.makeEwsRequestAsync(request, (result) => {
                if (result.status === Office.AsyncResultStatus.Succeeded) {
                    // Parse XML response
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(result.value, "text/xml");
                    const items = xmlDoc.getElementsByTagName("t:Message");
                    const emails: string[] = [];

                    for (let i = 0; i < items.length; i++) {
                        const subject = items[i].getElementsByTagName("t:Subject")[0]?.textContent || "";
                        // Note: EWS FindItem usually returns BodyPreview, getting full body requires GetItem. 
                        // For this MVP we use what's available or simulated context if deep body access is needed.
                        // Here we assume we get enough context. 
                        // To keep it simple and robust, we grab Subject and From.
                        emails.push(`Subject: ${subject}`);
                    }
                    resolve(emails);
                } else {
                    // Fallback for demo/dev if EWS fails (common in some web environments)
                    console.warn("EWS Search failed, returning mock for demonstration if local.");
                    reject(result.error.message);
                }
            });
        });
    },

    /**
     * Insert text into reply
     */
    insertText(text: string) {
        if (Office.context && Office.context.mailbox && Office.context.mailbox.item) {
            Office.context.mailbox.item.body.setSelectedDataAsync(text, { coercionType: Office.CoercionType.Html });
        }
    }
};
