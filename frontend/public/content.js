
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "READ_PAGE") {
        const pageText = document.body.innerText;
        
        sendResponse({ text: pageText });
    }
    return true; 
});