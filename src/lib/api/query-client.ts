import { BaseApiClient } from './base-client';
import { NLQueryRequest, QueryResponse, ApiDataset } from './types';

/**
 * API client for query-related functionality
 */
export class QueryClient extends BaseApiClient {
  /**
   * Generate SQL from natural language query
   */
  async generateSql(request: NLQueryRequest): Promise<QueryResponse> {
    return this.request<QueryResponse>('/query/generate-sql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });
  }

  /**
   * Execute raw SQL query
   */
  async executeSql(sqlQuery: string): Promise<Record<string, unknown>[]> {
    const response = await this.request<Record<string, unknown>>('/query/execute-sql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql_query: sqlQuery })
    });
    
    // Ensure the response is always treated as an array
    if (response && !Array.isArray(response)) {
      if (Object.keys(response).length === 0) {
        return [];
      }
      return [response];
    }
    
    return response as unknown as Record<string, unknown>[];
  }

  /**
   * Get available datasets for querying
   */
  async getDatasets(): Promise<string[]> {
    return this.request<string[]>('/settings/datasets');
  }

  /**
   * Get dataset details with additional information
   */
  async getDatasetDetails(): Promise<ApiDataset[]> {
    return this.request<ApiDataset[]>('/settings/dataset-details');
  }

  /**
   * Process a natural language query
   */
  async processNaturalLanguageQuery(request: NLQueryRequest): Promise<QueryResponse> {
    return this.request<QueryResponse>('/query/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });
  }
} 