chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "READ_PAGE") {
        
        const urlParts = window.location.pathname.split('/');
        const problemIndex = urlParts.indexOf('problems');
        
        if (problemIndex === -1 || !urlParts[problemIndex + 1]) {
            sendResponse({ error: "Not a valid LeetCode problem page." });
            return true;
        }

        const titleSlug = urlParts[problemIndex + 1];

        const query = `
            query questionData($titleSlug: String!) {
              question(titleSlug: $titleSlug) {
                title
                content
              }
            }
        `;

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
                
                const tempDiv = document.createElement("div");
                tempDiv.innerHTML = question.content;
                const cleanText = tempDiv.innerText || tempDiv.textContent || "";

                // --- NEW PARSING LOGIC ---
                let descriptionText = cleanText;
                let examplesText = "None found.";
                let constraintsText = "None found.";

                // Find indices of standard LeetCode headers
                const exampleIndex = cleanText.indexOf("Example 1:");
                const constraintsIndex = cleanText.indexOf("Constraints:");

                if (exampleIndex !== -1) {
                    descriptionText = cleanText.substring(0, exampleIndex).trim();
                    if (constraintsIndex !== -1) {
                        examplesText = cleanText.substring(exampleIndex, constraintsIndex).trim();
                        constraintsText = cleanText.substring(constraintsIndex).trim();
                    } else {
                        examplesText = cleanText.substring(exampleIndex).trim();
                    }
                } else if (constraintsIndex !== -1) {
                    descriptionText = cleanText.substring(0, constraintsIndex).trim();
                    constraintsText = cleanText.substring(constraintsIndex).trim();
                }
                // -------------------------

                sendResponse({
                    data: {
                        title: question.title,
                        description: descriptionText.substring(0, 1500), 
                        examples: examplesText.substring(0, 1500), 
                        constraints: constraintsText.substring(0, 500) 
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

        return true; 
    }
});