// noinspection JSUnresolvedReference,JSDeprecatedSymbols

let inputBox = null;
let input = null;
let apiKeySet = false;
let elements = null;

function createInputBox() {
    inputBox = document.createElement('div');
    inputBox.style.cssText = `
    display: none;
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 300px;
    z-index: 10000;
    background-color: white;
    border: 1px solid #ccc;
    border-radius: 5px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  `;

    input = document.createElement('input');
    input.style.cssText = `
    width: 100%;
    padding: 10px;
    border: none;
    border-radius: 5px;
    font-size: 14px;
    box-sizing: border-box;
  `;

    // Load the stored position when the page loads
    chrome.storage.sync.get(['chatPosition'], (result) => {
        if (result.chatPosition) {
            inputBox.style.position = 'fixed';
            inputBox.style.top = result.chatPosition.top + 'px';
            inputBox.style.left = result.chatPosition.left + 'px';
            inputBox.style.bottom = 'auto';
            inputBox.style.right = 'auto';
        }
    });

    chrome.storage.local.get(['CLAUDE_API_KEY'], (result) => {
        if (result.CLAUDE_API_KEY) {
            apiKeySet = true;
            input.placeholder = "Control the web page...";
        } else {
            input.placeholder = "Claude API key...";
        }
    });

    inputBox.appendChild(input);
    document.body.appendChild(inputBox);

    let isDragging = false;
    let dragStartX, dragStartY, startLeft, startTop;

    inputBox.addEventListener('mousedown', (e) => {
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        startLeft = inputBox.offsetLeft;
        startTop = inputBox.offsetTop;
    });

    // Store the position when the chat field is moved
    inputBox.addEventListener('mouseup', () => {
        const rect = inputBox.getBoundingClientRect();
        const position = {
            top: rect.top,
            left: rect.left
        };

        chrome.storage.sync.set({chatPosition: position});
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const deltaX = e.clientX - dragStartX;
            const deltaY = e.clientY - dragStartY;
            inputBox.style.left = `${startLeft + deltaX}px`;
            inputBox.style.top = `${startTop + deltaY}px`;
            inputBox.style.bottom = 'auto';
            inputBox.style.right = 'auto';
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const value = input.value.trim();
            if (!apiKeySet && value.startsWith('sk-')) {
                chrome.storage.local.set({CLAUDE_API_KEY: value}, () => {
                    apiKeySet = true;
                    input.value = '';
                    input.placeholder = "Control the web page...";
                });
            } else if (apiKeySet) {
                const interactiveElements = mapInteractiveElements();
                elements = interactiveElements;
                const promptElements = JSON.stringify(interactiveElements, null, 2);
                const prompt = `Page context, each key is the element id of the element, each value is the element description\nElements: ${promptElements}\nUser instruction: ${value}\nGiven the user instruction use the information about the page to write javascript code to perform the action using the code tool.`;
                chrome.storage.local.get(['CLAUDE_API_KEY'], (result) => {
                    input.placeholder = "Asking claude...";
                    input.disabled = true;
                    chrome.runtime.sendMessage({
                        action: "sendToClaudeAndExecute",
                        apiKey: result.CLAUDE_API_KEY,
                        prompt: prompt
                    });
                    input.value = '';
                });
            } else {
                alert('Please set your Claude API key first.');
            }
        }
    });

    // Add an event listener for keydown to detect Command-K (or Ctrl-K on non-Mac)
    document.addEventListener('keydown', (e) => {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

        // Check for Command-K on Mac or Ctrl-K on non-Mac systems
        if ((e.key === 'k' || e.key === 'K') && (isMac ? e.metaKey : e.ctrlKey)) {
            e.preventDefault(); // Prevent the default browser action for Command-K/Ctrl-K

            // Toggle visibility of chatField
            if (inputBox.style.display === 'none' || inputBox.style.display === '') {
                inputBox.style.display = 'block';  // Un-hide the chat field
                input.focus();                  // Focus on the input field when unhidden
            } else {
                inputBox.style.display = 'none';   // Hide the chat field
            }
        }
    });
}

function mapInteractiveElements() {
    const elementMap = new Map();
    const names = new Map();

    if (elements) {
        // Remove all generated ids
        for (let element of Object.values(elements)) {
            if (element.id && element.id.startsWith('webtroller-id-')) {
                element.removeAttribute('id');
            }
        }
    }

    function getAccessibleName(element) {
        const nameParts = [];

        // Check for aria-label
        const ariaLabel = element.getAttribute('aria-label');
        if (ariaLabel) {
            nameParts.push(ariaLabel);
        }

        // Check for aria-labelledby
        const ariaLabelledBy = element.getAttribute('aria-labelledby');
        if (ariaLabelledBy) {
            const labelledByElement = document.getElementById(ariaLabelledBy);
            if (labelledByElement) {
                nameParts.push(labelledByElement.textContent.trim());
            }
        }

        // Check for associated label
        if (element.id) {
            const associatedLabel = document.querySelector(`label[for="${element.id}"]`);
            if (associatedLabel) {
                nameParts.push(associatedLabel.textContent.trim());
            }
        }

        // Check for placeholder
        if (element.placeholder) {
            nameParts.push(element.placeholder);
        }

        // Existing checks
        nameParts.push(
            element.getAttribute('alt'),
            element.getAttribute('title'),
            element.value
        );

        if (element.offsetParent !== null) {
            const textContent = Array.from(element.childNodes)
                .filter(node => node.nodeType === Node.TEXT_NODE || (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() !== 'script'))
                .map(node => node.textContent.trim())
                .join(' ');
            nameParts.push(textContent);
        }

        // Check for labels (for inputs within label elements)
        if (element.labels && element.labels.length > 0) {
            nameParts.push(element.labels[0].textContent.trim());
        }

        return nameParts.filter(part => part && part.trim() !== '').join(' ').trim();
    }

    function getRole(element) {
        return element.getAttribute('role') || element.tagName.toLowerCase();
    }

    function hasEventListeners(element) {
        return element.onclick !== null ||
            element.onkeydown !== null ||
            element.onkeyup !== null ||
            element.onkeypress !== null ||
            element.onmousedown !== null ||
            element.onmouseup !== null ||
            element.onmouseover !== null ||
            element.onmouseout !== null ||
            element.onfocus !== null ||
            element.onblur !== null ||
            element.onchange !== null ||
            element.oninput !== null;
    }

    function getEventHandlers(element) {
        const handlers = [];
        if (element.onclick) handlers.push('click');
        if (element.onkeydown) handlers.push('keydown');
        if (element.onkeyup) handlers.push('keyup');
        if (element.onkeypress) handlers.push('keypress');
        if (element.onmousedown) handlers.push('mousedown');
        if (element.onmouseup) handlers.push('mouseup');
        if (element.onmouseover) handlers.push('mouseover');
        if (element.onmouseout) handlers.push('mouseout');
        if (element.onfocus) handlers.push('focus');
        if (element.onblur) handlers.push('blur');
        if (element.onchange) handlers.push('change');
        if (element.oninput) handlers.push('input');
        return handlers;
    }

    function isInteractiveElement(element) {
        const interactiveTags = ['a', 'button', 'input', 'select', 'textarea'];
        return interactiveTags.includes(element.tagName.toLowerCase()) ||
            element.hasAttribute('tabindex') ||
            hasEventListeners(element);
    }

    function getElementDetails(element) {
        const details = {
            type: element.type || undefined,
            value: element.value || undefined,
            checked: element.checked !== undefined ? element.checked : undefined,
            disabled: element.disabled || undefined,
            required: element.required || undefined,
            typeable: isTypableElement(element)
        };
        return Object.fromEntries(Object.entries(details).filter(([_, v]) => v !== undefined));
    }

    function isTypableElement(element) {
        const typableTypes = ['text', 'password', 'email', 'number', 'search', 'tel', 'url'];
        return (
            (element.tagName.toLowerCase() === 'input' && typableTypes.includes(element.type.toLowerCase())) ||
            element.tagName.toLowerCase() === 'textarea' ||
            element.isContentEditable
        );
    }

    function describeElement(element) {
        const role = getRole(element);
        const name = getAccessibleName(element);
        const state = element.getAttribute('aria-expanded') ||
            (element.disabled ? 'disabled' : '') ||
            (element.checked ? 'checked' : '');
        const handlers = getEventHandlers(element);
        const details = getElementDetails(element);

        return {
            role,
            name: name || undefined,
            state: state || undefined,
            handlers: handlers.length > 0 ? handlers : undefined,
            details: Object.keys(details).length > 0 ? details : undefined
        };
    }

    function generateUniqueId(element, description) {
        if (element.id) {
            return element.id;
        }
        const hash = Array.from(JSON.stringify(description))
            .reduce((hash, char) => ((hash << 5) - hash) + char.charCodeAt(0), 0)
            .toString(16)
            .slice(-8)
            .padStart(8, '0');
        const newId = `webtroller-id-${hash}`;
        element.id = newId;
        return newId;
    }

    function processElement(element) {
        if (inputBox && (element === inputBox || element === input)) return;
        const children = Array.from(element.children).flatMap(processElement);
        if (children.length > 0) return [];
        const added = [];
        if (isInteractiveElement(element)) {
            const description = describeElement(element);
            let name = description.name;
            if (name !== '' && !names.has(name)) {
                names.set(name, element);
                const id = generateUniqueId(element, description);
                elementMap.set(id, description);
                added.push(id);
            }
        }
        return added;
    }

    processElement(document.body);
    return Object.fromEntries(elementMap);
}

chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "executeCode") {
        // noinspection JSIgnoredPromiseFromCall
        executeOperations(request.input);
    } else if (request.action === "executeError") {
        console.error('Error from Claude:', request.error);
    }
});

async function executeOperations(toolInput) {
    console.log("Executing code:", JSON.stringify(toolInput, null, 2));
    for (let operation of toolInput.operations) {
        let element = document.getElementById(operation.elementId);
        let elementDetails = elements[operation.elementId];
        console.log(JSON.stringify(elementDetails, null, 2));

        if (!element) {
            // If it wasn't found assume that the page has changed and dropped our ids, regenerate them
            // Since they are content addressable we will find them if they are still there
            elements = mapInteractiveElements();
            element = document.getElementById(operation.elementId);
            elementDetails = elements[operation.elementId];
            if (!element) {
                console.warn(`Element not found for ID: ${operation.elementId}`);
                continue;
            }
        }

        switch (operation.action) {
            case 'focus':
                element.focus();
                break;

            case 'click':
                element.click();
                break;

            case 'type':
                if (elementDetails.details && elementDetails.details.typeable) {
                    element.focus(); // Ensure the element is focused before typing
                    element.value = ''; // Clear the element's value before typing
                    await typeText(element, operation.text);
                } else {
                    console.warn(`Cannot type into element with ID: ${operation.elementId}. It's not a typeable element.`);
                }
                break;
            case 'error':
                input.placeholder = "${operation.error}";
                break;
            default:
                console.warn(`Unknown action: ${operation.action}`);
        }
    }
    input.disabled = false;
    input.placeholder = "Control the web page...";
    inputBox.style.display = 'none';
}

// Helper function to simulate typing text
function typeText(element, text) {
    return new Promise((resolve) => {
        let index = 0;

        function typeCharacter() {
            if (index < text.length) {
                const event = new Event('input', {bubbles: true});
                element.value += text[index++];
                element.dispatchEvent(event);
                setTimeout(typeCharacter, 100); // Simulate typing delay
            } else {
                resolve();
            }
        }

        typeCharacter();
    });
}

createInputBox();
