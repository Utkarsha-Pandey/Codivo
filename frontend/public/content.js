chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "READ_PAGE") {
        try {
            // 1. Grab the Title (LeetCode almost always puts this in an <h1>)
            const titleEl = document.querySelector('h1');
            const title = titleEl ? titleEl.innerText : "Unknown Problem";

            // 2. Grab the main text area (ignoring sidebars and footers)
            // We look for the common container, or fallback to the whole body
            const mainContent = document.querySelector('[data-track-load="description_content"]') 
                                || document.body;
            const rawText = mainContent.innerText;

            // 3. Parse the structured data using LeetCode's standard formatting
            let description = rawText;
            let examples = "None found.";
            let constraints = "None found.";

            if (rawText.includes("Example 1:")) {
                const parts = rawText.split("Example 1:");
                // Everything before Example 1 is the description
                description = parts[0].replace(title, "").trim(); 
                
                const remainingText = parts[1];
                if (remainingText.includes("Constraints:")) {
                    const subParts = remainingText.split("Constraints:");
                    // Everything between Example 1 and Constraints
                    examples = "Example 1:" + subParts[0].trim();
                    // Everything after Constraints
                    constraints = subParts[1].trim();
                } else {
                    examples = "Example 1:" + remainingText.trim();
                }
            }

            // 4. Package it into a clean JSON object
            const structuredData = {
                title: title,
                description: description.substring(0, 1000), // Safety limit
                examples: examples.substring(0, 1000),
                constraints: constraints.substring(0, 500)
            };

            // Send the JSON back to React
            sendResponse({ data: structuredData });
        } catch (error) {
            console.error("Scraping failed:", error);
            sendResponse({ error: "Failed to parse page." });
        }
    }
    return true; 
});