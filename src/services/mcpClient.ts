import { blink } from '../blink/client';

export interface MCPServerConfig {
  id: string;
  name: string;
  url: string;
  type: 'sql' | 'mongodb' | 'api' | 'custom';
  authentication?: {
    type: 'bearer' | 'basic' | 'api_key' | 'none';
    credentials?: Record<string, string>;
  };
  isConnected: boolean;
  lastConnected?: Date;
  capabilities?: string[];
  metadata?: Record<string, any>;
}

export interface MCPMessage {
  id: string;
  serverId: string;
  type: 'request' | 'response' | 'notification';
  method?: string;
  params?: any;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  timestamp: Date;
}

export interface MCPChatMessage {
  id: string;
  serverId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    query?: string;
    results?: any[];
    error?: string;
    executionTime?: number;
  };
}

export class MCPClient {
  private static servers: Map<string, MCPServerConfig> = new Map();
  private static readonly TABLE_SERVERS = 'mcp_servers';
  private static readonly TABLE_MESSAGES = 'mcp_messages';
  private static readonly TABLE_CHAT = 'mcp_chat_history';

  // Initialize MCP tables
  static async initializeTables(): Promise<void> {
    try {
      await blink.db.sql(`
        CREATE TABLE IF NOT EXISTS ${this.TABLE_SERVERS} (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          url TEXT NOT NULL,
          type TEXT NOT NULL,
          authentication_type TEXT,
          authentication_data TEXT,
          is_connected INTEGER DEFAULT 0,
          last_connected DATETIME,
          capabilities TEXT,
          metadata TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          user_id TEXT NOT NULL
        )
      `);

      await blink.db.sql(`
        CREATE TABLE IF NOT EXISTS ${this.TABLE_MESSAGES} (
          id TEXT PRIMARY KEY,
          server_id TEXT NOT NULL,
          message_type TEXT NOT NULL,
          method TEXT,
          params TEXT,
          result TEXT,
          error_code INTEGER,
          error_message TEXT,
          error_data TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          user_id TEXT NOT NULL,
          FOREIGN KEY (server_id) REFERENCES ${this.TABLE_SERVERS}(id)
        )
      `);

      await blink.db.sql(`
        CREATE TABLE IF NOT EXISTS ${this.TABLE_CHAT} (
          id TEXT PRIMARY KEY,
          server_id TEXT NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          query_text TEXT,
          results_data TEXT,
          error_message TEXT,
          execution_time INTEGER,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          user_id TEXT NOT NULL,
          FOREIGN KEY (server_id) REFERENCES ${this.TABLE_SERVERS}(id)
        )
      `);

      console.log('MCP tables initialized successfully');
    } catch (error) {
      console.error('Error initializing MCP tables:', error);
      throw error;
    }
  }

  // Add MCP server
  static async addServer(config: Omit<MCPServerConfig, 'id' | 'isConnected' | 'lastConnected'>): Promise<string> {
    try {
      const user = await blink.auth.me();
      const serverId = `mcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const serverConfig: MCPServerConfig = {
        ...config,
        id: serverId,
        isConnected: false
      };

      // Save to database
      await blink.db.sql(`
        INSERT INTO ${this.TABLE_SERVERS} (
          id, name, url, type, authentication_type, authentication_data,
          is_connected, capabilities, metadata, created_at, user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        serverId,
        config.name,
        config.url,
        config.type,
        config.authentication?.type || null,
        config.authentication?.credentials ? JSON.stringify(config.authentication.credentials) : null,
        0,
        config.capabilities ? JSON.stringify(config.capabilities) : null,
        config.metadata ? JSON.stringify(config.metadata) : null,
        new Date().toISOString(),
        user.id
      ]);

      // Store in memory
      this.servers.set(serverId, serverConfig);

      return serverId;
    } catch (error) {
      console.error('Error adding MCP server:', error);
      throw error;
    }
  }

  // Test server connection
  static async testConnection(serverId: string): Promise<boolean> {
    try {
      const server = await this.getServer(serverId);
      if (!server) throw new Error('Server not found');

      // Send a test request to the MCP server
      const testMessage = await this.sendRequest(serverId, 'ping', {});
      
      const isConnected = !testMessage.error;
      await this.updateServerStatus(serverId, isConnected);
      
      return isConnected;
    } catch (error) {
      console.error('Error testing MCP server connection:', error);
      await this.updateServerStatus(serverId, false);
      return false;
    }
  }

  // Send request to MCP server
  static async sendRequest(serverId: string, method: string, params: any = {}): Promise<MCPMessage> {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      const user = await blink.auth.me();
      const server = await this.getServer(serverId);
      
      if (!server) throw new Error('Server not found');

      // Prepare authentication headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      if (server.authentication) {
        switch (server.authentication.type) {
          case 'bearer':
            headers['Authorization'] = `Bearer ${server.authentication.credentials?.token}`;
            break;
          case 'basic': {
            const basicAuth = btoa(`${server.authentication.credentials?.username}:${server.authentication.credentials?.password}`);
            headers['Authorization'] = `Basic ${basicAuth}`;
            break;
          }
          case 'api_key':
            headers['X-API-Key'] = server.authentication.credentials?.apiKey || '';
            break;
        }
      }

      // Send request using Blink's secure fetch
      const response = await blink.data.fetch({
        url: server.url,
        method: 'POST',
        headers,
        body: {
          jsonrpc: '2.0',
          id: messageId,
          method,
          params
        }
      });

      const executionTime = Date.now() - startTime;
      let mcpMessage: MCPMessage;

      if (response.status === 200 && response.body) {
        mcpMessage = {
          id: messageId,
          serverId,
          type: 'response',
          method,
          params,
          result: response.body.result,
          error: response.body.error,
          timestamp: new Date()
        };
      } else {
        mcpMessage = {
          id: messageId,
          serverId,
          type: 'response',
          method,
          params,
          error: {
            code: response.status,
            message: response.body?.message || 'Request failed',
            data: response.body
          },
          timestamp: new Date()
        };
      }

      // Save message to database
      await blink.db.sql(`
        INSERT INTO ${this.TABLE_MESSAGES} (
          id, server_id, message_type, method, params, result,
          error_code, error_message, error_data, timestamp, user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        messageId,
        serverId,
        'response',
        method,
        JSON.stringify(params),
        mcpMessage.result ? JSON.stringify(mcpMessage.result) : null,
        mcpMessage.error?.code || null,
        mcpMessage.error?.message || null,
        mcpMessage.error?.data ? JSON.stringify(mcpMessage.error.data) : null,
        new Date().toISOString(),
        user.id
      ]);

      return mcpMessage;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      const mcpMessage: MCPMessage = {
        id: messageId,
        serverId,
        type: 'response',
        method,
        params,
        error: {
          code: -1,
          message: errorMessage
        },
        timestamp: new Date()
      };

      // Save failed message
      try {
        const user = await blink.auth.me();
        await blink.db.sql(`
          INSERT INTO ${this.TABLE_MESSAGES} (
            id, server_id, message_type, method, params,
            error_code, error_message, timestamp, user_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          messageId,
          serverId,
          'response',
          method,
          JSON.stringify(params),
          -1,
          errorMessage,
          new Date().toISOString(),
          user.id
        ]);
      } catch (saveError) {
        console.error('Error saving failed message:', saveError);
      }

      return mcpMessage;
    }
  }

  // Chat with database using natural language
  static async chatWithDatabase(serverId: string, userMessage: string): Promise<MCPChatMessage> {
    const chatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      const user = await blink.auth.me();
      const server = await this.getServer(serverId);
      
      if (!server) throw new Error('Server not found');

      // Save user message
      await this.saveChatMessage({
        id: `${chatId}_user`,
        serverId,
        role: 'user',
        content: userMessage,
        timestamp: new Date()
      });

      // Get database schema/context if available
      const schemaResponse = await this.sendRequest(serverId, 'get_schema', {});
      const schema = schemaResponse.result || {};

      // Generate SQL query using AI
      const sqlQuery = await this.generateSQLFromNaturalLanguage(userMessage, schema);

      // Execute the query
      const queryResponse = await this.sendRequest(serverId, 'execute_query', {
        query: sqlQuery,
        limit: 1000
      });

      const executionTime = Date.now() - startTime;
      let assistantMessage: MCPChatMessage;

      if (queryResponse.error) {
        assistantMessage = {
          id: `${chatId}_assistant`,
          serverId,
          role: 'assistant',
          content: `I encountered an error while executing your query: ${queryResponse.error.message}`,
          timestamp: new Date(),
          metadata: {
            query: sqlQuery,
            error: queryResponse.error.message,
            executionTime
          }
        };
      } else {
        const results = queryResponse.result?.data || [];
        const summary = await this.generateResultSummary(userMessage, results);
        
        assistantMessage = {
          id: `${chatId}_assistant`,
          serverId,
          role: 'assistant',
          content: summary,
          timestamp: new Date(),
          metadata: {
            query: sqlQuery,
            results,
            executionTime
          }
        };
      }

      // Save assistant message
      await this.saveChatMessage(assistantMessage);

      return assistantMessage;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      const assistantMessage: MCPChatMessage = {
        id: `${chatId}_assistant`,
        serverId,
        role: 'assistant',
        content: `I'm sorry, I encountered an error: ${errorMessage}`,
        timestamp: new Date(),
        metadata: {
          error: errorMessage,
          executionTime
        }
      };

      await this.saveChatMessage(assistantMessage);
      return assistantMessage;
    }
  }

  // Generate SQL from natural language
  static async generateSQLFromNaturalLanguage(naturalLanguage: string, schema: any): Promise<string> {
    try {
      const schemaInfo = typeof schema === 'object' ? JSON.stringify(schema, null, 2) : String(schema);
      
      const prompt = `You are a SQL expert. Convert this natural language query to SQL.

Natural Language: "${naturalLanguage}"

Database Schema:
${schemaInfo}

Rules:
1. Return only valid SQL syntax
2. Use proper table and column names from the schema
3. Handle data types correctly
4. Limit results to 1000 rows for performance
5. Use appropriate JOINs when needed
6. Handle aggregations properly

Examples:
- "Show all users" → SELECT * FROM users LIMIT 1000;
- "Count orders by status" → SELECT status, COUNT(*) as count FROM orders GROUP BY status;
- "Top 10 products by price" → SELECT * FROM products ORDER BY price DESC LIMIT 10;
- "Users who made orders last month" → SELECT DISTINCT u.* FROM users u JOIN orders o ON u.id = o.user_id WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH);

SQL Query:`;

      const { text } = await blink.ai.generateText({
        prompt,
        maxTokens: 300,
        model: 'gpt-4o-mini'
      });

      // Clean up the response
      const cleanQuery = text.trim()
        .replace(/^```sql\n?/, '')
        .replace(/^```\n?/, '')
        .replace(/\n?```$/, '')
        .replace(/^SQL Query:\s*/, '')
        .trim();
      
      return cleanQuery;
    } catch (error) {
      console.error('Error generating SQL from natural language:', error);
      throw error;
    }
  }

  // Generate result summary
  static async generateResultSummary(originalQuestion: string, results: any[]): Promise<string> {
    try {
      if (!results || results.length === 0) {
        return "No results found for your query.";
      }

      const sampleData = results.slice(0, 5);
      const totalCount = results.length;
      
      const prompt = `You are a data analyst. Provide a clear, concise summary of these query results.

Original Question: "${originalQuestion}"
Total Results: ${totalCount}
Sample Data:
${JSON.stringify(sampleData, null, 2)}

Provide a natural language summary that:
1. Answers the original question
2. Highlights key insights
3. Mentions the total count
4. Is easy to understand for non-technical users
5. Keep it concise (2-3 sentences max)

Summary:`;

      const { text } = await blink.ai.generateText({
        prompt,
        maxTokens: 200,
        model: 'gpt-4o-mini'
      });

      return text.trim();
    } catch (error) {
      console.error('Error generating result summary:', error);
      return `Found ${results.length} results for your query.`;
    }
  }

  // List servers
  static async listServers(): Promise<MCPServerConfig[]> {
    try {
      const user = await blink.auth.me();
      
      const result = await blink.db.sql(`
        SELECT * FROM ${this.TABLE_SERVERS} 
        WHERE user_id = ? 
        ORDER BY created_at DESC
      `, [user.id]);

      return result.map(row => ({
        id: row.id,
        name: row.name,
        url: row.url,
        type: row.type as any,
        authentication: row.authentication_type ? {
          type: row.authentication_type as any,
          credentials: row.authentication_data ? JSON.parse(row.authentication_data) : undefined
        } : undefined,
        isConnected: row.is_connected === 1,
        lastConnected: row.last_connected ? new Date(row.last_connected) : undefined,
        capabilities: row.capabilities ? JSON.parse(row.capabilities) : undefined,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined
      }));
    } catch (error) {
      console.error('Error listing servers:', error);
      return [];
    }
  }

  // Get chat history
  static async getChatHistory(serverId?: string): Promise<MCPChatMessage[]> {
    try {
      const user = await blink.auth.me();
      
      let query = `
        SELECT * FROM ${this.TABLE_CHAT} 
        WHERE user_id = ?
      `;
      const params = [user.id];

      if (serverId) {
        query += ' AND server_id = ?';
        params.push(serverId);
      }

      query += ' ORDER BY timestamp DESC LIMIT 100';

      const result = await blink.db.sql(query, params);

      return result.map(row => ({
        id: row.id,
        serverId: row.server_id,
        role: row.role as any,
        content: row.content,
        timestamp: new Date(row.timestamp),
        metadata: {
          query: row.query_text || undefined,
          results: row.results_data ? JSON.parse(row.results_data) : undefined,
          error: row.error_message || undefined,
          executionTime: row.execution_time || undefined
        }
      }));
    } catch (error) {
      console.error('Error getting chat history:', error);
      return [];
    }
  }

  // Remove server
  static async removeServer(serverId: string): Promise<void> {
    try {
      const user = await blink.auth.me();
      
      await blink.db.sql(`
        DELETE FROM ${this.TABLE_SERVERS} 
        WHERE id = ? AND user_id = ?
      `, [serverId, user.id]);

      // Also remove related messages and chat history
      await blink.db.sql(`
        DELETE FROM ${this.TABLE_MESSAGES} 
        WHERE server_id = ? AND user_id = ?
      `, [serverId, user.id]);

      await blink.db.sql(`
        DELETE FROM ${this.TABLE_CHAT} 
        WHERE server_id = ? AND user_id = ?
      `, [serverId, user.id]);

      this.servers.delete(serverId);
    } catch (error) {
      console.error('Error removing server:', error);
      throw error;
    }
  }

  // Private helper methods
  private static async getServer(serverId: string): Promise<MCPServerConfig | null> {
    if (this.servers.has(serverId)) {
      return this.servers.get(serverId)!;
    }

    try {
      const user = await blink.auth.me();
      const result = await blink.db.sql(`
        SELECT * FROM ${this.TABLE_SERVERS} 
        WHERE id = ? AND user_id = ?
      `, [serverId, user.id]);

      if (result.length === 0) return null;

      const row = result[0];
      const server: MCPServerConfig = {
        id: row.id,
        name: row.name,
        url: row.url,
        type: row.type as any,
        authentication: row.authentication_type ? {
          type: row.authentication_type as any,
          credentials: row.authentication_data ? JSON.parse(row.authentication_data) : undefined
        } : undefined,
        isConnected: row.is_connected === 1,
        lastConnected: row.last_connected ? new Date(row.last_connected) : undefined,
        capabilities: row.capabilities ? JSON.parse(row.capabilities) : undefined,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined
      };

      this.servers.set(serverId, server);
      return server;
    } catch (error) {
      console.error('Error getting server:', error);
      return null;
    }
  }

  private static async updateServerStatus(serverId: string, isConnected: boolean): Promise<void> {
    try {
      const user = await blink.auth.me();
      await blink.db.sql(`
        UPDATE ${this.TABLE_SERVERS} 
        SET is_connected = ?, last_connected = ? 
        WHERE id = ? AND user_id = ?
      `, [
        isConnected ? 1 : 0,
        isConnected ? new Date().toISOString() : null,
        serverId,
        user.id
      ]);

      // Update in-memory server
      const server = this.servers.get(serverId);
      if (server) {
        server.isConnected = isConnected;
        if (isConnected) {
          server.lastConnected = new Date();
        }
      }
    } catch (error) {
      console.error('Error updating server status:', error);
    }
  }

  private static async saveChatMessage(message: MCPChatMessage): Promise<void> {
    try {
      const user = await blink.auth.me();
      await blink.db.sql(`
        INSERT INTO ${this.TABLE_CHAT} (
          id, server_id, role, content, query_text, results_data,
          error_message, execution_time, timestamp, user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        message.id,
        message.serverId,
        message.role,
        message.content,
        message.metadata?.query || null,
        message.metadata?.results ? JSON.stringify(message.metadata.results) : null,
        message.metadata?.error || null,
        message.metadata?.executionTime || null,
        message.timestamp.toISOString(),
        user.id
      ]);
    } catch (error) {
      console.error('Error saving chat message:', error);
    }
  }
}