import React, { useState, useEffect } from "react";
import { ChatInput } from "./Chat/ChatInput";
import { ChatHistory } from "./Chat/ChatHistory";
import { VisualizationRenderer } from "./Visualization/VisualizationRenderer";
import { useAuth } from "../lib/hooks/useAuth";
import apiClient from "../lib/api/api-client";
import { useStorage } from "../lib/hooks/useStorage";
import { cn } from "@/lib/utils";

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

  useEffect(() => {
    const loadDatasets = async () => {
      if (isAuthenticated) {
        try {
          const availableDatasets = await apiClient.query.getDatasets();
          setDatasets(availableDatasets);
          // Set first dataset as default if we have datasets and none is selected
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

    setMessages([...messages, newMessage]);
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

    // Add user message to chat
    addMessage({
      type: "user",
      content: message,
    });

    try {
      // Send request to /generate-sql endpoint
      const response = await apiClient.query.generateSql({
        query: message,
        dataset_name: selectedDataset,
        execute: executeSQL,
        sql_results: persistentSqlResults || [], // Include previous results if available
      });

      // Add system response to chat
      addMessage({
        type: "system",
        content: response.summary || "Query processed successfully",
        metadata: {
          queryResponse: response,
        },
      });

      // If new SQL results are available, update the persistent results
      if (response.sql_results && response.sql_results.length > 0) {
        setPersistentSqlResults(response.sql_results);
      }

      // If visualization code is available, set it for rendering
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

  const handleDatasetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDataset(e.target.value);
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
      // Clear messages when logging out
      setMessages([]);
      // Clear visualization when logging out
      setCurrentVisualization(null);
      // Clear persisted SQL results when logging out
      setPersistentSqlResults([]);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="side-panel-container">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-pulse-gentle text-lg mb-2">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="side-panel-container">
        <div className="side-panel-header">
          <h2>SQL-Buddy</h2>
        </div>
        <div className="flex items-center justify-center flex-1 p-4">
          <div className="glass-card w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Sign In</h3>
            {loginError && (
              <div className="bg-destructive/10 text-destructive p-2 rounded mb-4 text-sm">
                {loginError}
              </div>
            )}
            <form onSubmit={handleLogin}>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2 rounded-md border border-input bg-background"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="password" className="text-sm font-medium">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-2 rounded-md border border-input bg-background"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                  disabled={loginLoading}
                >
                  {loginLoading ? "Signing in..." : "Sign In"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="side-panel-container">
      <div className="side-panel-header">
        <div className="flex items-center justify-between w-full">
          <h2 className="text-lg font-medium">SQL-Buddy</h2>
          
          {/* Dataset selector in the center */}
          {datasets.length > 0 && (
            <div className="flex-1 mx-4 max-w-[180px]">
              <select
                value={selectedDataset}
                onChange={handleDatasetChange}
                className={cn(
                  "w-full p-1 text-sm rounded-md border border-input",
                  "bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                )}
              >
                <option value="" disabled>Select dataset</option>
                {datasets.map((dataset) => (
                  <option key={dataset} value={dataset}>
                    {dataset}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <div className="flex items-center space-x-3">
            <div className="user-info text-xs text-muted-foreground hidden sm:block">
              {user && (user.name || user.email)}
            </div>
            <button
              onClick={handleLogout}
              className="text-xs px-2 py-1 text-gray-600 hover:text-gray-900 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="chat-container">
        <ChatHistory messages={messages} />
      </div>

      {currentVisualization && (
        <div className="visualization-container">
          <h3 className="text-sm font-medium mb-2">Visualization</h3>
          <VisualizationRenderer
            code={currentVisualization.code}
            data={currentVisualization.data}
          />
        </div>
      )}

      {/* Trust mode button */}
      <div className="px-4 pt-2 pb-0">
        <div 
          onClick={toggleExecuteSQL}
          className={`text-sm cursor-pointer select-none px-3 py-2 rounded border text-center ${
            executeSQL 
              ? "text-green-600 font-medium border-green-200 bg-green-50" 
              : "text-gray-500 border-gray-200 bg-gray-50"
          }`}
        >
          Trust Your SQL-Buddy
        </div>
      </div>

      <div className="input-container">
        <ChatInput
          onSendMessage={handleSendMessage}
          loading={loading}
          executeSQL={executeSQL}
        />
      </div>
    </div>
  );
};

export default SidePanel; 