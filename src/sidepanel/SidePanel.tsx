import React, { useState, useEffect } from "react";
import { ChatInput, ChatHistory } from "../ui/components";
import { useAuth } from "../lib/hooks/useAuth";
import apiClient from "../lib/api/api-client";
import { useStorage } from "../lib/hooks/useStorage";
import { Button } from "../ui/components/button";
import { Input } from "../ui/components/input";
import { Label } from "../ui/components/label";
import { Shield, ShieldOff } from "lucide-react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { ChartConfiguration } from "chart.js";

interface Message {
  id: string;
  type: "user" | "system";
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface Visualization {
  code: ChartConfiguration;
  data: Record<string, unknown>[];
}

const SidePanel: React.FC = () => {
  const { user, isAuthenticated, isLoading, login, logout, startOAuthAuth, refreshAuthState } = useAuth();
  const [messages, setMessages] = useStorage<Message[]>("chatHistory", []);
  const [datasets, setDatasets] = useState<string[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [currentVisualization, setCurrentVisualization] = useState<Visualization | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [executeSQL, setExecuteSQL] = useStorage<boolean>("executeSQLEnabled", true);
  const [persistentSqlResults, setPersistentSqlResults] = useState<Record<string, unknown>[]>([]);

  // Keep a local reference of the messages to ensure we're working with the latest state
  const messagesRef = React.useRef(messages);
  
  // Update the ref whenever messages change
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    setDatasets(user?.available_datasets || [])
    setSelectedDataset(user?.available_datasets[0] || "")
  }, [isAuthenticated, selectedDataset]);

  const addMessage = (
    message: Omit<Message, "id" | "timestamp">
  ): void => {
    const newMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };

    // Use the ref to get the latest messages
    const currentMessages = messagesRef.current;
    // Create new array with the current messages plus the new message
    const updatedMessages = [...currentMessages, newMessage];
    setMessages(updatedMessages);
  };

  const handleSendMessage = async (message: string) => {
    if (!selectedDataset) {
      addMessage({
        type: "system",
        content: "Please select a dataset first.",
      });
      return;
    }
    
    // Check authentication before sending message
    if (!isAuthenticated) {
      addMessage({
        type: "system",
        content: "You need to be logged in to send messages.",
      });
      return;
    }

    // Ensure token is loaded from storage and refresh auth state
    try {
      // Use the refreshAuthState function from auth context instead of direct API call
      await refreshAuthState();
    } catch (error) {
      console.error("Failed to refresh authentication state:", error);
      addMessage({
        type: "system",
        content: "Authentication error. Please try logging in again.",
      });
      return;
    }
    
    setLoading(true);

    addMessage({
      type: "user",
      content: message,
    });

    try {
      const response = await apiClient.query.generateSql({
        query: message,
        dataset_name: selectedDataset,
        execute: executeSQL,
        sql_results: persistentSqlResults || [],
      });

      // Check if response contains an API error message
      if (response.message && (response.limit_type || response.tier)) {
        addMessage({
          type: "system",
          content: response.message || "An API error occurred",
        });
        setLoading(false);
        return;
      }

      if (response.sql_results && response.sql_results.length > 0) {
        // Update persistentSqlResults before adding the message
        setPersistentSqlResults(response.sql_results);
      }

      // Check if response contains an error detail
      if (response.detail && response.detail.answer) {
        // Display the error message from detail.answer
        addMessage({
          type: "system",
          content: response.detail.answer || "An error occurred",
          // Include SQL results and visualization if available
          metadata: {
            ...(response.sql_results && response.sql_results.length > 0 ? {
              sqlResults: response.sql_results
            } : {}),
            ...(response.visualization_code && response.sql_results ? {
              visualization: {
                code: response.visualization_code,
                data: response.sql_results
              }
            } : {})
          }
        });
      } 
      else if (response.query_type === "visualization" && response.visualization_code) {
          // Update message state with visualization code
          const visualizationMessage = {
            type: "system" as const,
            content: "Here's a visualization of your data:",
            metadata: {
              visualization: {
                code: response.visualization_code,
                data: persistentSqlResults || []
              },
              query_type: "visualization"
            }
          };
          addMessage(visualizationMessage);
      }
      else {
        // Normal response handling
        addMessage({
          type: "system",
          content: response.summary || "Query processed successfully",
          // Include SQL results and visualization if available
          metadata: {
            ...(response.sql_results && response.sql_results.length > 0 ? {
              sqlResults: response.sql_results,
              queryResponse: response
            } : {}),
            ...(response.visualization_code && response.sql_results ? {
              visualization: {
                code: response.visualization_code,
                data: response.sql_results
              }
            } : {})
          }
        });
      }

      // Visualization is now included in the message metadata, no need to set it separately
      // Keep this for backward compatibility with existing functionality
      if (response.visualization_code && response.sql_results) {
        setCurrentVisualization({
          code: response.visualization_code,
          data: response.sql_results,
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      
      // If error is from API and has response data with message
      if (error instanceof Error && 'response' in error) {
        // Enhanced error handling for API errors
        const apiError = error as Error & { 
          response?: { 
            status: number; 
            data: any 
          }; 
        };
        
        const errorData = apiError.response?.data;
        
        // Check for the nested detail structure first (as shown in the network tab)
        if (errorData?.detail) {
          if (typeof errorData.detail === 'object') {
            // Handle detail object with message property
            const detailMessage = errorData.detail.message || "API limit reached";
            const limitType = errorData.detail.limit_type || "";
            const tier = errorData.detail.tier || "";
            
            // Format a more useful error message for rate limits
            if (limitType === "api_request") {
              addMessage({
                type: "system",
                content: `${detailMessage} You are on the ${tier} tier. Please try again later or upgrade your plan.`
              });
            } else {
              addMessage({
                type: "system",
                content: detailMessage
              });
            }
          } else {
            // Handle string detail
            addMessage({
              type: "system",
              content: errorData.detail
            });
          }
        } else {
          // Fall back to previous error message extraction logic
          const errorMessage = errorData?.message || 
                              apiError.message || 
                              "An unexpected error occurred";
          
          addMessage({
            type: "system",
            content: `Error (${apiError.response?.status || 'unknown'}): ${errorMessage}`
          });
        }
      } else {
        // Generic error handling
        addMessage({
          type: "system",
          content: `Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDatasetChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDataset(event.target.value);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");

    try {
      await login(email, password);
    } catch (error) {
      console.error("Login error:", error);
      setLoginError(error instanceof Error ? error.message : "Login failed");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    try {
      startOAuthAuth("google");
    } catch (error) {
      console.error("Google login error:", error);
      setLoginError(error instanceof Error ? error.message : "Google sign-in failed");
    }
  };

  const toggleExecuteSQL = () => {
    setExecuteSQL(!executeSQL);
  };

  const handleLogout = async () => {
    try {
      await logout();
      setMessages([]);
      setCurrentVisualization(null);
      setPersistentSqlResults([]);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Loading...
        </Typography>
      </Box>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="p-8">
        <div className="max-w-sm mx-auto space-y-4">
          <h2 className="text-lg font-semibold text-center mb-4">Sign In</h2>
          
          {loginError && (
            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
              {loginError}
            </div>
          )}
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={loginLoading}
            >
              {loginLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={handleGoogleLogin}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col h-screen">
      <header className="sticky top-0 z-10 bg-background border-b p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">SQL-Buddy</h1>
          
          {datasets.length > 0 && (
            <div className="flex-1 mx-4">
              <Label htmlFor="dataset-select" className="sr-only">Dataset</Label>
              <select
                id="dataset-select"
                value={selectedDataset}
                onChange={handleDatasetChange}
                className="w-full max-w-[200px] h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="" disabled>Select dataset</option>
                {datasets.map((dataset) => (
                  <option key={dataset} value={dataset}>{dataset}</option>
                ))}
              </select>
            </div>
          )}
          
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {user?.name || user?.email}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          ) : null}
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="flex-1 overflow-y-auto p-4">
            <ChatHistory messages={messages} />
          </div>

          <div className="border-t bg-background p-4">
            <div className="flex items-center justify-end gap-2 mb-4">
              <Button
                variant={executeSQL ? "default" : "outline"}
                size="sm"
                onClick={toggleExecuteSQL}
                className="gap-2"
              >
                {executeSQL ? <Shield className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
                Trust Your SQL-Buddy
              </Button>
            </div>
            
            <ChatInput
              onSendMessage={handleSendMessage}
              loading={loading}
              executeSQL={executeSQL}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default SidePanel;
