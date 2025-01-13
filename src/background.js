// Create context menu item
chrome.runtime.onInstalled.addListener(() => {
   chrome.contextMenus.create({
      id: "analyzeJobDescription",
      title: "Analyze Job Description",
      contexts: ["selection"],
   });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
   if (info.menuItemId === "analyzeJobDescription") {
      const selectedText = info.selectionText;
      // Send the selected text to the popup for analysis
      chrome.storage.local.set({ selectedJobDescription: selectedText }, () => {
         // Open the popup with the selected text
         chrome.action.openPopup();
      });
   }
});
