/// <reference types="chrome"/>

/**
 * Background service worker for SQL-Buddy Extension
 * This file handles the Chrome extension background processes
 */

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('SQL-Buddy Extension installed');
  
  // Configure side panel behavior to open when extension icon is clicked
  if (chrome.sidePanel) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  }
});

// Listen for extension icon click in Chrome toolbar
chrome.action.onClicked.addListener(() => {
  // This is handled by the side panel configuration in onInstalled,
  // but we could add additional functionality here if needed
});

// Message types
interface GetAuthTokenMessage {
  type: 'GET_AUTH_TOKEN';
  interactive: boolean;
}

interface LogMessage {
  type: 'LOG_MESSAGE';
  content: string;
}

type Message = GetAuthTokenMessage | LogMessage;

// Expose a message handler for communication between side panel and background script
chrome.runtime.onMessage.addListener((
  message: Message, 
  sender: chrome.runtime.MessageSender, 
  sendResponse: (response: any) => void
) => {
  if (message.type === 'GET_AUTH_TOKEN' && chrome.identity) {
    // Get the auth token from chrome.identity if needed
    chrome.identity.getAuthToken({ interactive: (message as GetAuthTokenMessage).interactive }, (token: string | undefined) => {
      sendResponse({ token });
    });
    
    // Return true to indicate we will send a response asynchronously
    return true;
  }
  
  if (message.type === 'LOG_MESSAGE') {
    sendResponse({ success: true });
  }
}); 