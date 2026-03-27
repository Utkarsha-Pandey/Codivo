chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "READ_PAGE") {
        
        // 1. Extract the problem slug from the LeetCode URL
        // Example URL: https://leetcode.com/problems/two-sum/description/
        const urlParts = window.location.pathname.split('/');
        const problemIndex = urlParts.indexOf('problems');
        
        if (problemIndex === -1 || !urlParts[problemIndex + 1]) {
            sendResponse({ error: "Not a valid LeetCode problem page." });
            return true;
        }

        const titleSlug = urlParts[problemIndex + 1]; // e.g., "two-sum"

        // 2. Define the exact GraphQL query LeetCode uses to fetch problem details
        const query = `
            query questionData($titleSlug: String!) {
              question(titleSlug: $titleSlug) {
                title
                content
              }
            }
        `;

        // 3. Make the fetch request directly to LeetCode's GraphQL endpoint
        fetch('https://leetcode.com/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                operationName: "questionData",
                variables: { titleSlug: titleSlug },
                query: query
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data && data.data && data.data.question) {
                const question = data.data.question;
                
                // LeetCode returns the content as a single block of raw HTML string.
                // We can strip the HTML tags to send clean text to your AI.
                const tempDiv = document.createElement("div");
                tempDiv.innerHTML = question.content;
                const cleanText = tempDiv.innerText || tempDiv.textContent || "";

                // Send the perfectly formatted data back to App.jsx
                sendResponse({
                    data: {
                        title: question.title,
                        description: cleanText.substring(0, 1000), // AI context limit safety
                        examples: "Included in description.", // LeetCode bundles examples in the content
                        constraints: "Included in description." // LeetCode bundles constraints in the content
                    }
                });
            } else {
                throw new Error("Invalid GraphQL response");
            }
        })
        .catch(error => {
            console.error("GraphQL Fetch failed:", error);
            sendResponse({ error: "Failed to fetch problem data from API." });
        });

        // Return true to indicate we will send the response asynchronously
        return true; 
    }
});