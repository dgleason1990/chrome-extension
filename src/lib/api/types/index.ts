/**
 * Authentication related type definitions
 */

/**
 * Interface representing a user token
 */
export interface Token {
  access_token: string;
  token_type: string;
  refresh_token?: string;
  expires_in?: number;
}

/**
 * Interface representing a user in the database
 */
export interface UserInDB {
  id: number;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  name: string;
  organization_id: number;
  username?: string;
  full_name?: string;
  roles?: string[];
  created_at?: string;
  updated_at?: string;
  organization_name?: string;
  organization?: {
    id: number;
    name: string;
  };
  available_datasets?: string[];
}

/**
 * Interface for API tokens
 */
export interface ApiToken {
  id: string;
  name: string;
  created_at: string;
  token?: string;
  last_used?: string;
  expires_at?: string;
  scopes?: string[];
}

/**
 * Interface for creating API tokens
 */
export interface ApiTokenCreate {
  name: string;
  scopes?: string[];
  expires_at?: string;
}

/**
 * Interface for registration data
 */
export interface RegisterData {
  email: string;
  password: string;
  name?: string;
  username?: string;
  full_name?: string;
  organization_id?: number;
  organization_name?: string;
}

/**
 * Interface for OAuth options
 */
export interface OAuthOptions {
  organizationName?: string;
  redirectUri?: string;
  catchErrors?: boolean;
  provider?: 'google' | 'github' | string;
}

/**
 * Interface representing a natural language query request
 */
export interface NLQueryRequest {
  query: string;
  dataset_name: string;
  execute?: boolean;
  sql_results?: Record<string, unknown>[];
}

/**
 * Interface representing the response from a query
 */
export interface QueryResponse {
  original_query: string;
  query_type: string;
  organization_id?: number;
  rag_results?: Record<string, unknown>[];
  selected_tables?: string[];
  sql_query?: string;
  sql_results?: Record<string, unknown>[];
  summary?: string;
  full_reasoning?: string;
  visualization_code?: string;
  detail?: {
    answer?: string;
    reasoning?: string;
  };
}

/**
 * Interface representing SQL query results
 */
export interface SQLQueryResult {
  columns: string[];
  data: Record<string, unknown>[][];
}

/**
 * Interface for structured dataset information
 */
export interface ApiDataset {
  name: string;
  tables: string[];
  description?: string;
} 