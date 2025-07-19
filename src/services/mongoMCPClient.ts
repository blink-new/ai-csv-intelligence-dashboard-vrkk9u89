import { blink } from '../blink/client';

export interface MCPConnection {
  id: string;
  name: string;
  connectionString: string;
  database: string;
  isConnected: boolean;
  lastConnected?: Date;
  collections?: MCPCollection[];
}

export interface MCPQuery {
  id: string;
  connectionId: string;
  query: string;
  result?: any[];
  error?: string;
  executedAt: Date;
  executionTime: number;
}

export interface MCPCollection {
  name: string;
  documentCount: number;
  indexes: string[];
  sampleDocument?: Record<string, any>;
  schema?: Record<string, any>;
}

export class MongoMCPClient {
  private static connections: Map<string, MCPConnection> = new Map();
  private static readonly TABLE_CONNECTIONS = 'mcp_connections';
  private static readonly TABLE_QUERIES = 'mcp_queries';

  // Initialize MCP tables
  static async initializeTables(): Promise<void> {
    try {
      await blink.db.sql(`
        CREATE TABLE IF NOT EXISTS ${this.TABLE_CONNECTIONS} (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          connection_string TEXT NOT NULL,
          database_name TEXT NOT NULL,
          is_connected INTEGER DEFAULT 0,
          last_connected DATETIME,
          collections_data TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          user_id TEXT NOT NULL
        )
      `);

      await blink.db.sql(`
        CREATE TABLE IF NOT EXISTS ${this.TABLE_QUERIES} (
          id TEXT PRIMARY KEY,
          connection_id TEXT NOT NULL,
          query_text TEXT NOT NULL,
          result_data TEXT,
          error_message TEXT,
          executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          execution_time INTEGER DEFAULT 0,
          user_id TEXT NOT NULL,
          FOREIGN KEY (connection_id) REFERENCES ${this.TABLE_CONNECTIONS}(id)
        )
      `);

      console.log('MCP tables initialized successfully');
    } catch (error) {
      console.error('Error initializing MCP tables:', error);
      throw error;
    }
  }

  // Create connection
  static async createConnection(
    name: string,
    connectionString: string,
    database: string
  ): Promise<string> {
    try {
      const user = await blink.auth.me();
      const connectionId = `mcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const connection: MCPConnection = {
        id: connectionId,
        name,
        connectionString,
        database,
        isConnected: false
      };

      // Save to database
      await blink.db.sql(`
        INSERT INTO ${this.TABLE_CONNECTIONS} (
          id, name, connection_string, database_name, is_connected, created_at, user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        connectionId,
        name,
        connectionString,
        database,
        0,
        new Date().toISOString(),
        user.id
      ]);

      // Store in memory
      this.connections.set(connectionId, connection);

      return connectionId;
    } catch (error) {
      console.error('Error creating MCP connection:', error);
      throw error;
    }
  }

  // Test connection using Blink Edge Function
  static async testConnection(connectionId: string): Promise<boolean> {
    try {
      const connection = await this.getConnection(connectionId);
      if (!connection) throw new Error('Connection not found');

      // Use Blink Edge Function to test MongoDB connection
      const response = await blink.data.fetch({
        url: 'https://api.mongodb.com/api/atlas/v2.0/groups/{{mongodb_project_id}}/clusters',
        method: 'GET',
        headers: {
          'Authorization': 'Bearer {{mongodb_api_key}}',
          'Content-Type': 'application/json'
        }
      });

      const isConnected = response.status === 200;
      
      // Update connection status
      await this.updateConnectionStatus(connectionId, isConnected);
      
      return isConnected;
    } catch (error) {
      console.error('Error testing MCP connection:', error);
      await this.updateConnectionStatus(connectionId, false);
      return false;
    }
  }

  // Execute MongoDB query using AI-powered natural language processing
  static async executeQuery(connectionId: string, naturalLanguageQuery: string): Promise<MCPQuery> {
    const startTime = Date.now();
    const queryId = `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const user = await blink.auth.me();
      const connection = await this.getConnection(connectionId);
      
      if (!connection) throw new Error('Connection not found');
      if (!connection.isConnected) {
        const connected = await this.testConnection(connectionId);
        if (!connected) throw new Error('Connection failed');
      }

      // Convert natural language to MongoDB query using AI
      const mongoQuery = await this.generateMongoQueryFromNaturalLanguage(
        naturalLanguageQuery,
        connection.collections || []
      );

      // Execute query through Blink Edge Function
      const response = await blink.data.fetch({
        url: 'https://api.mongodb.com/api/atlas/v2.0/groups/{{mongodb_project_id}}/clusters/{{cluster_name}}/fts/indexes',
        method: 'POST',
        headers: {
          'Authorization': 'Bearer {{mongodb_api_key}}',
          'Content-Type': 'application/json'
        },
        body: {
          database: connection.database,
          query: mongoQuery,
          limit: 1000
        }
      });

      const executionTime = Date.now() - startTime;
      const result = response.status === 200 ? response.body : null;
      const error = response.status !== 200 ? response.body?.error || 'Query failed' : undefined;

      const mcpQuery: MCPQuery = {
        id: queryId,
        connectionId,
        query: naturalLanguageQuery,
        result: result?.documents || [],
        error,
        executedAt: new Date(),
        executionTime
      };

      // Save query to database
      await blink.db.sql(`
        INSERT INTO ${this.TABLE_QUERIES} (
          id, connection_id, query_text, result_data, error_message, 
          executed_at, execution_time, user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        queryId,
        connectionId,
        naturalLanguageQuery,
        result ? JSON.stringify(result.documents) : null,
        error || null,
        new Date().toISOString(),
        executionTime,
        user.id
      ]);

      return mcpQuery;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      const mcpQuery: MCPQuery = {
        id: queryId,
        connectionId,
        query: naturalLanguageQuery,
        error: errorMessage,
        executedAt: new Date(),
        executionTime
      };

      // Save failed query
      try {
        const user = await blink.auth.me();
        await blink.db.sql(`
          INSERT INTO ${this.TABLE_QUERIES} (
            id, connection_id, query_text, error_message, 
            executed_at, execution_time, user_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          queryId,
          connectionId,
          naturalLanguageQuery,
          errorMessage,
          new Date().toISOString(),
          executionTime,
          user.id
        ]);
      } catch (saveError) {
        console.error('Error saving failed query:', saveError);
      }

      return mcpQuery;
    }
  }

  // Get collections using AI to analyze database structure
  static async getCollections(connectionId: string): Promise<MCPCollection[]> {
    try {
      const connection = await this.getConnection(connectionId);
      if (!connection) throw new Error('Connection not found');

      // Use Blink Edge Function to get collections
      const response = await blink.data.fetch({
        url: 'https://api.mongodb.com/api/atlas/v2.0/groups/{{mongodb_project_id}}/clusters/{{cluster_name}}/databases/{{database_name}}/collections',
        method: 'GET',
        headers: {
          'Authorization': 'Bearer {{mongodb_api_key}}',
          'Content-Type': 'application/json'
        }
      });

      if (response.status !== 200) {
        throw new Error('Failed to fetch collections');
      }

      const collections: MCPCollection[] = response.body.collections.map((col: any) => ({
        name: col.name,
        documentCount: col.documentCount || 0,
        indexes: col.indexes || [],
        sampleDocument: col.sampleDocument,
        schema: col.schema
      }));

      // Update connection with collections data
      await this.updateConnectionCollections(connectionId, collections);

      return collections;
    } catch (error) {
      console.error('Error getting collections:', error);
      return [];
    }
  }

  // List connections
  static async listConnections(): Promise<MCPConnection[]> {
    try {
      const user = await blink.auth.me();
      
      const result = await blink.db.sql(`
        SELECT * FROM ${this.TABLE_CONNECTIONS} 
        WHERE user_id = ? 
        ORDER BY created_at DESC
      `, [user.id]);

      return result.map(row => ({
        id: row.id,
        name: row.name,
        connectionString: row.connection_string,
        database: row.database_name,
        isConnected: row.is_connected === 1,
        lastConnected: row.last_connected ? new Date(row.last_connected) : undefined,
        collections: row.collections_data ? JSON.parse(row.collections_data) : undefined
      }));
    } catch (error) {
      console.error('Error listing connections:', error);
      return [];
    }
  }

  // Get query history
  static async getQueryHistory(connectionId?: string): Promise<MCPQuery[]> {
    try {
      const user = await blink.auth.me();
      
      let query = `
        SELECT * FROM ${this.TABLE_QUERIES} 
        WHERE user_id = ?
      `;
      const params = [user.id];

      if (connectionId) {
        query += ' AND connection_id = ?';
        params.push(connectionId);
      }

      query += ' ORDER BY executed_at DESC LIMIT 50';

      const result = await blink.db.sql(query, params);

      return result.map(row => ({
        id: row.id,
        connectionId: row.connection_id,
        query: row.query_text,
        result: row.result_data ? JSON.parse(row.result_data) : undefined,
        error: row.error_message || undefined,
        executedAt: new Date(row.executed_at),
        executionTime: row.execution_time
      }));
    } catch (error) {
      console.error('Error getting query history:', error);
      return [];
    }
  }

  // AI-powered query generation from natural language
  static async generateMongoQueryFromNaturalLanguage(
    naturalLanguageQuery: string,
    collections: MCPCollection[]
  ): Promise<string> {
    try {
      const collectionsInfo = collections.map(col => ({
        name: col.name,
        documentCount: col.documentCount,
        sampleDocument: col.sampleDocument,
        schema: col.schema
      }));

      const prompt = `You are a MongoDB query expert. Convert this natural language query to MongoDB aggregation pipeline or find query.

Natural Language Query: "${naturalLanguageQuery}"

Available Collections:
${JSON.stringify(collectionsInfo, null, 2)}

Rules:
1. Return only valid MongoDB query syntax
2. Use aggregation pipeline for complex queries
3. Use find() for simple queries
4. Include proper field names from the schema
5. Handle data types correctly
6. Limit results to 1000 documents

Examples:
- "Find all users" → db.users.find({})
- "Count orders from last month" → db.orders.aggregate([{$match: {createdAt: {$gte: new Date('2024-01-01')}}}, {$count: "total"}])
- "Get top 10 products by price" → db.products.find({}).sort({price: -1}).limit(10)
- "Average sales by category" → db.sales.aggregate([{$group: {_id: "$category", avgSales: {$avg: "$amount"}}}])

MongoDB Query:`;

      const { text } = await blink.ai.generateText({
        prompt,
        maxTokens: 300,
        model: 'gpt-4o-mini'
      });

      // Clean up the response to extract just the query
      const cleanQuery = text.trim()
        .replace(/^```\w*\n?/, '')
        .replace(/\n?```$/, '')
        .replace(/^MongoDB Query:\s*/, '')
        .trim();
      
      return cleanQuery;
    } catch (error) {
      console.error('Error generating MongoDB query from natural language:', error);
      throw error;
    }
  }

  // Generate chart configuration from query results
  static async generateChartFromQueryResults(
    queryResults: any[],
    naturalLanguageRequest: string
  ): Promise<{ chartType: string; config: any; data: any[] }> {
    try {
      if (!queryResults || queryResults.length === 0) {
        throw new Error('No data to visualize');
      }

      const sampleData = queryResults.slice(0, 5);
      const dataStructure = Object.keys(sampleData[0] || {});

      const prompt = `You are a data visualization expert. Based on the query results and user request, suggest the best chart configuration.

User Request: "${naturalLanguageRequest}"

Sample Data Structure:
${JSON.stringify(sampleData, null, 2)}

Available Fields: ${dataStructure.join(', ')}
Total Records: ${queryResults.length}

Suggest:
1. Best chart type (bar, line, pie, scatter, area, histogram)
2. X-axis field
3. Y-axis field (if applicable)
4. Aggregation method if needed
5. Chart title and description

Return as JSON:
{
  "chartType": "bar|line|pie|scatter|area|histogram",
  "xAxis": "field_name",
  "yAxis": "field_name",
  "aggregation": "sum|avg|count|min|max",
  "title": "Chart Title",
  "description": "Chart Description"
}`;

      const { object } = await blink.ai.generateObject({
        prompt,
        schema: {
          type: 'object',
          properties: {
            chartType: { type: 'string' },
            xAxis: { type: 'string' },
            yAxis: { type: 'string' },
            aggregation: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' }
          },
          required: ['chartType', 'xAxis', 'title']
        }
      });

      // Process data according to the suggested configuration
      let processedData = queryResults;

      if (object.aggregation && object.xAxis && object.yAxis) {
        const grouped = new Map<string, number[]>();
        
        queryResults.forEach(row => {
          const key = String(row[object.xAxis]);
          const value = Number(row[object.yAxis]) || 0;
          
          if (!grouped.has(key)) {
            grouped.set(key, []);
          }
          grouped.get(key)!.push(value);
        });

        processedData = Array.from(grouped.entries()).map(([key, values]) => {
          let aggregatedValue: number;
          switch (object.aggregation) {
            case 'sum':
              aggregatedValue = values.reduce((sum, val) => sum + val, 0);
              break;
            case 'avg':
              aggregatedValue = values.reduce((sum, val) => sum + val, 0) / values.length;
              break;
            case 'count':
              aggregatedValue = values.length;
              break;
            case 'min':
              aggregatedValue = Math.min(...values);
              break;
            case 'max':
              aggregatedValue = Math.max(...values);
              break;
            default:
              aggregatedValue = values[0];
          }

          return {
            [object.xAxis]: key,
            [object.yAxis]: aggregatedValue
          };
        });
      }

      return {
        chartType: object.chartType,
        config: {
          xAxis: object.xAxis,
          yAxis: object.yAxis,
          title: object.title,
          description: object.description,
          aggregation: object.aggregation
        },
        data: processedData.slice(0, 100) // Limit for performance
      };
    } catch (error) {
      console.error('Error generating chart from query results:', error);
      throw error;
    }
  }

  // Private helper methods
  private static async getConnection(connectionId: string): Promise<MCPConnection | null> {
    if (this.connections.has(connectionId)) {
      return this.connections.get(connectionId)!;
    }

    try {
      const user = await blink.auth.me();
      const result = await blink.db.sql(`
        SELECT * FROM ${this.TABLE_CONNECTIONS} 
        WHERE id = ? AND user_id = ?
      `, [connectionId, user.id]);

      if (result.length === 0) return null;

      const row = result[0];
      const connection: MCPConnection = {
        id: row.id,
        name: row.name,
        connectionString: row.connection_string,
        database: row.database_name,
        isConnected: row.is_connected === 1,
        lastConnected: row.last_connected ? new Date(row.last_connected) : undefined,
        collections: row.collections_data ? JSON.parse(row.collections_data) : undefined
      };

      this.connections.set(connectionId, connection);
      return connection;
    } catch (error) {
      console.error('Error getting connection:', error);
      return null;
    }
  }

  private static async updateConnectionStatus(connectionId: string, isConnected: boolean): Promise<void> {
    try {
      const user = await blink.auth.me();
      await blink.db.sql(`
        UPDATE ${this.TABLE_CONNECTIONS} 
        SET is_connected = ?, last_connected = ? 
        WHERE id = ? AND user_id = ?
      `, [
        isConnected ? 1 : 0,
        isConnected ? new Date().toISOString() : null,
        connectionId,
        user.id
      ]);

      // Update in-memory connection
      const connection = this.connections.get(connectionId);
      if (connection) {
        connection.isConnected = isConnected;
        if (isConnected) {
          connection.lastConnected = new Date();
        }
      }
    } catch (error) {
      console.error('Error updating connection status:', error);
    }
  }

  private static async updateConnectionCollections(connectionId: string, collections: MCPCollection[]): Promise<void> {
    try {
      const user = await blink.auth.me();
      await blink.db.sql(`
        UPDATE ${this.TABLE_CONNECTIONS} 
        SET collections_data = ? 
        WHERE id = ? AND user_id = ?
      `, [
        JSON.stringify(collections),
        connectionId,
        user.id
      ]);

      // Update in-memory connection
      const connection = this.connections.get(connectionId);
      if (connection) {
        connection.collections = collections;
      }
    } catch (error) {
      console.error('Error updating connection collections:', error);
    }
  }
}