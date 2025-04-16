/// <reference types="chrome" />

// This file ensures TypeScript can find the Chrome types
// from the @types/chrome package installed in node_modules 

// Type definitions for Chrome extension API
interface Chrome {
  storage: {
    local: {
      get: (keys: string[], callback: (items: { [key: string]: any }) => void) => void;
      set: (items: { [key: string]: any }, callback?: () => void) => void;
      remove: (keys: string[], callback?: () => void) => void;
    };
    sync?: {
      get: (keys: string[], callback: (items: { [key: string]: any }) => void) => void;
      set: (items: { [key: string]: any }, callback?: () => void) => void;
      remove: (keys: string[], callback?: () => void) => void;
    };
  };
  runtime: {
    lastError?: {
      message: string;
    };
    sendMessage: (message: any, callback?: (response: any) => void) => void;
    onMessage: {
      addListener: (callback: (message: any, sender: any, sendResponse: (response?: any) => void) => void) => void;
      removeListener: (callback: (message: any, sender: any, sendResponse: (response?: any) => void) => void) => void;
    };
  };
  tabs?: {
    query: (queryInfo: { active: boolean; currentWindow: boolean }, callback: (tabs: { id: number }[]) => void) => void;
    sendMessage: (tabId: number, message: any, callback?: (response: any) => void) => void;
  };
}

// Declare chrome in the global namespace
declare global {
  var chrome: Chrome;
}

// This is necessary for the declaration file to be treated as a module
export {}; 