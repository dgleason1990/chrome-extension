import React, { useState, useEffect } from "react";
import { ChatInput, ChatHistory, VisualizationRenderer } from "../ui/components";
import { useAuth } from "../lib/hooks/useAuth";
import apiClient from "../lib/api/api-client";
import { useStorage } from "../lib/hooks/useStorage";
import { Button } from "../ui/components/button";
import { Input } from "../ui/components/input";
import { Label } from "../ui/components/label";
import { Shield, ShieldOff } from "lucide-react";
import { Box, CircularProgress, Typography } from "@mui/material";

interface Message {
  id: string;
  type: "user" | "system";
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface Visualization {
  code: string;
  data: Record<string, unknown>[];
}

const SidePanel: React.FC = () => {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
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
    const loadDatasets = async () => {
      if (isAuthenticated) {
        try {
          const availableDatasets = await apiClient.query.getDatasets();
          setDatasets(availableDatasets);
          if (availableDatasets.length > 0 && !selectedDataset) {
            setSelectedDataset(availableDatasets[0]);
          }
        } catch (error) {
          console.error("Failed to load datasets:", error);
        }
      }
    };

    loadDatasets();
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
      addMessage({
        type: "system",
        content: `Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`,
      });
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
        </div>
      </div>
    );
  }
  console.log("messages:", messages)
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
            <div className="flex items-center gap-2 mb-4">
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
