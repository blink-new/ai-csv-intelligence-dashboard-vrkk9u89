export interface DatabaseConnection {
  type: 'postgresql' | 'mysql' | 'mongodb' | 'sqlite';
  name: string;
  connectionString: string;
}

export interface DatabaseQuery {
  id: string;
  query: string;
  executedAt: Date;
  results?: Record<string, any>[];
  error?: string;
  connectionName: string;
}

export class DatabaseService {
  private storageKey = 'blink_database_connections';
  private historyKey = 'blink_query_history';

  getConnections(): DatabaseConnection[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading database connections:', error);
      return [];
    }
  }

  async addConnection(connection: DatabaseConnection): Promise<void> {
    // In a real implementation, this would test the connection
    // For now, we'll just store it locally
    const connections = this.getConnections();
    
    // Check if connection with same name already exists
    const existingIndex = connections.findIndex(c => c.name === connection.name);
    if (existingIndex >= 0) {
      connections[existingIndex] = connection;
    } else {
      connections.push(connection);
    }
    
    localStorage.setItem(this.storageKey, JSON.stringify(connections));
  }

  removeConnection(name: string): void {
    const connections = this.getConnections();
    const filtered = connections.filter(c => c.name !== name);
    localStorage.setItem(this.storageKey, JSON.stringify(filtered));
  }

  async testConnection(connection: DatabaseConnection): Promise<boolean> {
    // In a real implementation, this would actually test the database connection
    // For demo purposes, we'll simulate a connection test
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate success for demo
        resolve(true);
      }, 1000);
    });
  }

  async getTableSchema(connectionName: string): Promise<Record<string, string[]>> {
    // In a real implementation, this would query the database for schema information
    // For demo purposes, we'll return mock schema data
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockSchemas: Record<string, Record<string, string[]>> = {
          'Demo Database': {
            users: ['id', 'name', 'email', 'created_at', 'updated_at'],
            orders: ['id', 'user_id', 'total', 'status', 'created_at'],
            products: ['id', 'name', 'price', 'category', 'stock'],
            categories: ['id', 'name', 'description']
          },
          'Analytics DB': {
            events: ['id', 'user_id', 'event_type', 'properties', 'timestamp'],
            sessions: ['id', 'user_id', 'start_time', 'end_time', 'page_views'],
            users: ['id', 'email', 'first_seen', 'last_seen', 'total_sessions']
          }
        };

        resolve(mockSchemas[connectionName] || {
          sample_table: ['id', 'name', 'value', 'created_at']
        });
      }, 500);
    });
  }

  async executeQuery(connectionName: string, query: string): Promise<Record<string, any>[]> {
    // In a real implementation, this would execute the query against the actual database
    // For demo purposes, we'll return mock data based on the query
    
    const queryRecord: DatabaseQuery = {
      id: `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      query,
      executedAt: new Date(),
      connectionName
    };

    try {
      const results = await this.generateMockQueryResults(query);
      queryRecord.results = results;
      this.addToHistory(queryRecord);
      return results;
    } catch (error) {
      queryRecord.error = String(error);
      this.addToHistory(queryRecord);
      throw error;
    }
  }

  private async generateMockQueryResults(query: string): Promise<Record<string, any>[]> {
    // Simulate query execution delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const lowerQuery = query.toLowerCase();
    
    // Generate different mock data based on query patterns
    if (lowerQuery.includes('users')) {
      return Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
        created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        status: Math.random() > 0.5 ? 'active' : 'inactive'
      }));
    }
    
    if (lowerQuery.includes('orders')) {
      return Array.from({ length: 15 }, (_, i) => ({
        id: i + 1,
        user_id: Math.floor(Math.random() * 10) + 1,
        total: Math.round(Math.random() * 500 + 20),
        status: ['pending', 'completed', 'cancelled'][Math.floor(Math.random() * 3)],
        created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      }));
    }
    
    if (lowerQuery.includes('products')) {
      const categories = ['Electronics', 'Clothing', 'Books', 'Home', 'Sports'];
      return Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        name: `Product ${i + 1}`,
        price: Math.round(Math.random() * 200 + 10),
        category: categories[Math.floor(Math.random() * categories.length)],
        stock: Math.floor(Math.random() * 100),
        created_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString()
      }));
    }
    
    if (lowerQuery.includes('events')) {
      const eventTypes = ['page_view', 'click', 'purchase', 'signup', 'logout'];
      return Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        user_id: Math.floor(Math.random() * 100) + 1,
        event_type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
        properties: JSON.stringify({ page: '/home', source: 'organic' }),
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
      }));
    }
    
    // Default generic results
    return Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      name: `Item ${i + 1}`,
      value: Math.round(Math.random() * 1000),
      category: ['A', 'B', 'C'][Math.floor(Math.random() * 3)],
      created_at: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString()
    }));
  }

  async generateMockData(tableName: string, count: number = 100): Promise<Record<string, any>[]> {
    // Generate mock data for a specific table
    await new Promise(resolve => setTimeout(resolve, 300));

    switch (tableName.toLowerCase()) {
      case 'users':
        return Array.from({ length: count }, (_, i) => ({
          id: i + 1,
          name: `User ${i + 1}`,
          email: `user${i + 1}@example.com`,
          age: Math.floor(Math.random() * 50) + 18,
          city: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'][Math.floor(Math.random() * 5)],
          created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
        }));

      case 'orders':
        return Array.from({ length: count }, (_, i) => ({
          id: i + 1,
          user_id: Math.floor(Math.random() * 50) + 1,
          total: Math.round((Math.random() * 500 + 20) * 100) / 100,
          status: ['pending', 'completed', 'cancelled', 'shipped'][Math.floor(Math.random() * 4)],
          created_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString()
        }));

      case 'products': {
        const categories = ['Electronics', 'Clothing', 'Books', 'Home & Garden', 'Sports', 'Toys'];
        return Array.from({ length: count }, (_, i) => ({
          id: i + 1,
          name: `Product ${i + 1}`,
          price: Math.round((Math.random() * 300 + 5) * 100) / 100,
          category: categories[Math.floor(Math.random() * categories.length)],
          stock: Math.floor(Math.random() * 200),
          rating: Math.round((Math.random() * 4 + 1) * 10) / 10,
          created_at: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString()
        }));
      }

      case 'events': {
        const eventTypes = ['page_view', 'click', 'purchase', 'signup', 'logout', 'search'];
        return Array.from({ length: count }, (_, i) => ({
          id: i + 1,
          user_id: Math.floor(Math.random() * 100) + 1,
          event_type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
          page: ['/', '/products', '/about', '/contact', '/checkout'][Math.floor(Math.random() * 5)],
          timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
        }));
      }

      default:
        return Array.from({ length: count }, (_, i) => ({
          id: i + 1,
          name: `${tableName} ${i + 1}`,
          value: Math.round(Math.random() * 1000),
          status: Math.random() > 0.5 ? 'active' : 'inactive',
          created_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString()
        }));
    }
  }

  getQueryHistory(): DatabaseQuery[] {
    try {
      const stored = localStorage.getItem(this.historyKey);
      if (!stored) return [];

      return JSON.parse(stored).map((query: any) => ({
        ...query,
        executedAt: new Date(query.executedAt)
      }));
    } catch (error) {
      console.error('Error loading query history:', error);
      return [];
    }
  }

  private addToHistory(query: DatabaseQuery): void {
    const history = this.getQueryHistory();
    history.unshift(query); // Add to beginning
    
    // Keep only last 50 queries
    const trimmed = history.slice(0, 50);
    
    localStorage.setItem(this.historyKey, JSON.stringify(trimmed));
  }

  clearQueryHistory(): void {
    localStorage.removeItem(this.historyKey);
  }

  // Utility method to format SQL queries
  formatQuery(query: string): string {
    return query
      .replace(/\s+/g, ' ')
      .replace(/\s*,\s*/g, ', ')
      .replace(/\s*\(\s*/g, ' (')
      .replace(/\s*\)\s*/g, ') ')
      .trim();
  }

  // Validate SQL query (basic validation)
  validateQuery(query: string): { isValid: boolean; error?: string } {
    const trimmed = query.trim().toLowerCase();
    
    if (!trimmed) {
      return { isValid: false, error: 'Query cannot be empty' };
    }
    
    // Check for dangerous operations (basic security)
    const dangerousKeywords = ['drop', 'delete', 'truncate', 'alter', 'create', 'insert', 'update'];
    const hasWriteOperation = dangerousKeywords.some(keyword => 
      trimmed.includes(keyword + ' ')
    );
    
    if (hasWriteOperation) {
      return { isValid: false, error: 'Write operations are not allowed in demo mode' };
    }
    
    // Basic SELECT query validation
    if (!trimmed.startsWith('select')) {
      return { isValid: false, error: 'Only SELECT queries are supported in demo mode' };
    }
    
    return { isValid: true };
  }
}