// noinspection JSDeprecatedSymbols,JSUnresolvedReference,JSCheckFunctionSignatures
// noinspection JSUnresolvedReference

const POST = "POST";

chrome.runtime.onMessage.addListener((request, sender) => {
    if (request.action === "sendToClaudeAndExecute") {
        // noinspection JSIgnoredPromiseFromCall,JSUnresolvedReference
        sendToClaudeAndExecute(request.apiKey, request.prompt, sender.tab.id);
    }
    return true;  // Indicates we will respond asynchronously
});

async function sendToClaudeAndExecute(apiKey, prompt, tabId) {
    return fetch("https://claude.gpt.vc:8443/v1/messages", {
        method: POST,
        headers: {
            "content-type": "application/json",
            "x-api-key": apiKey,
            "x-anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
            model: "claude-3-5-sonnet-20240620",
            messages: [
                {
                    "content": [
                        {
                            "text": prompt,
                            "type": "text"
                        }
                    ],
                    "role": "user"
                }
            ],
            "tool_choice": {
                "type": "any"
            }, "tools": [
                {
                    "description": "This tool will automate web page interactions by performing a series of operations such as focusing, clicking, or typing into elements identified by their specific element IDs.\n\nExample:\nGiven a web page, apply the following operations:\n1. Focus: {\"action\": \"focus\", \"elementId\": \"username\"}\n2. Type: {\"action\": \"type\", \"elementId\": \"username\", \"text\": \"john_doe\"}\n3. Click: {\"action\": \"click\", \"elementId\": \"submit-button\"}\n\nAfter applying these operations, the page will have focused on the username field, typed 'john_doe', and clicked the submit button.",
                    "input_schema": {
                        "properties": {
                            "plan": {
                                "description": "what is the plan for the series of operations",
                                "type": "string"
                            },
                            "operations": {
                                "description": "List of operations to perform",
                                "items": {
                                    "properties": {
                                        "action": {
                                            "description": "The type of operation to perform: 'focus', 'click', or 'type'. Only use 'type' on elements where the 'typeable' property is true.",
                                            "type": "string"
                                        },
                                        "elementId": {
                                            "description": "The ID of the element on the page to target for the operation.",
                                            "type": "string"
                                        },
                                        "text": {
                                            "description": "The text to type into the element (used only for 'type' actions).",
                                            "type": "string"
                                        },
                                        "error": {
                                            "description": "If you can't find an element for the instruction use this to describe what you were looking for",
                                            "type": "string"
                                        }
                                    },
                                    "required": [
                                        "action",
                                        "elementId"
                                    ],
                                    "type": "object"
                                },
                                "type": "array"
                            }
                        },
                        "required": [
                            "operations"
                        ],
                        "type": "object"
                    },
                    "name": "web_automation"
                }
            ],
            max_tokens: 8192
        })
    })
        .then(response => response.json())
        .then(data => {
            const content = data.content[0];
            if (content.type === "tool_use") {
                const input = content.input;
                console.log("Executing code:", JSON.stringify(input));
                chrome.tabs.sendMessage(tabId, {action: "executeCode", input: input});
            }
        })
        .catch(error => console.error('Error:', error));
}