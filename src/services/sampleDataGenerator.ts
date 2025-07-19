import { CSVFile } from '../types/csv';

export class SampleDataGenerator {
  static generateSalesData(): CSVFile {
    const regions = ['North', 'South', 'East', 'West', 'Central'];
    const products = ['Product A', 'Product B', 'Product C', 'Product D', 'Product E'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const data: Record<string, any>[] = [];
    
    for (let i = 0; i < 200; i++) {
      const region = regions[Math.floor(Math.random() * regions.length)];
      const product = products[Math.floor(Math.random() * products.length)];
      const month = months[Math.floor(Math.random() * months.length)];
      const sales = Math.floor(Math.random() * 10000) + 1000;
      const units = Math.floor(Math.random() * 100) + 10;
      const profit = sales * (0.1 + Math.random() * 0.3);
      
      data.push({
        region,
        product,
        month,
        sales,
        units,
        profit: Math.round(profit),
        quarter: ['Jan', 'Feb', 'Mar'].includes(month) ? 'Q1' :
                ['Apr', 'May', 'Jun'].includes(month) ? 'Q2' :
                ['Jul', 'Aug', 'Sep'].includes(month) ? 'Q3' : 'Q4'
      });
    }
    
    return {
      name: 'Sample Sales Data',
      data,
      columns: ['region', 'product', 'month', 'sales', 'units', 'profit', 'quarter'],
      rowCount: data.length,
      size: data.length * 100, // Approximate size
      lastModified: new Date()
    };
  }
  
  static generateCustomerData(): CSVFile {
    const countries = ['USA', 'Canada', 'UK', 'Germany', 'France', 'Australia', 'Japan'];
    const segments = ['Enterprise', 'SMB', 'Startup', 'Individual'];
    const statuses = ['Active', 'Inactive', 'Trial', 'Churned'];
    
    const data: Record<string, any>[] = [];
    
    for (let i = 0; i < 150; i++) {
      const country = countries[Math.floor(Math.random() * countries.length)];
      const segment = segments[Math.floor(Math.random() * segments.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const revenue = Math.floor(Math.random() * 50000) + 1000;
      const employees = Math.floor(Math.random() * 1000) + 1;
      const satisfaction = Math.round((Math.random() * 4 + 1) * 10) / 10; // 1.0 to 5.0
      
      data.push({
        customer_id: `CUST_${String(i + 1).padStart(4, '0')}`,
        country,
        segment,
        status,
        annual_revenue: revenue,
        employees,
        satisfaction_score: satisfaction,
        signup_date: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0]
      });
    }
    
    return {
      name: 'Sample Customer Data',
      data,
      columns: ['customer_id', 'country', 'segment', 'status', 'annual_revenue', 'employees', 'satisfaction_score', 'signup_date'],
      rowCount: data.length,
      size: data.length * 120,
      lastModified: new Date()
    };
  }
  
  static generateWebAnalyticsData(): CSVFile {
    const pages = ['/home', '/products', '/about', '/contact', '/pricing', '/blog', '/support'];
    const sources = ['Google', 'Facebook', 'Twitter', 'Direct', 'Email', 'Referral'];
    const devices = ['Desktop', 'Mobile', 'Tablet'];
    
    const data: Record<string, any>[] = [];
    
    for (let i = 0; i < 300; i++) {
      const page = pages[Math.floor(Math.random() * pages.length)];
      const source = sources[Math.floor(Math.random() * sources.length)];
      const device = devices[Math.floor(Math.random() * devices.length)];
      const sessions = Math.floor(Math.random() * 1000) + 10;
      const pageviews = sessions * (1 + Math.random() * 3);
      const bounceRate = Math.round((Math.random() * 0.8 + 0.1) * 100) / 100; // 0.1 to 0.9
      const avgDuration = Math.floor(Math.random() * 300) + 30; // 30 to 330 seconds
      
      data.push({
        page,
        traffic_source: source,
        device_type: device,
        sessions,
        pageviews: Math.round(pageviews),
        bounce_rate: bounceRate,
        avg_session_duration: avgDuration,
        date: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0]
      });
    }
    
    return {
      name: 'Sample Web Analytics Data',
      data,
      columns: ['page', 'traffic_source', 'device_type', 'sessions', 'pageviews', 'bounce_rate', 'avg_session_duration', 'date'],
      rowCount: data.length,
      size: data.length * 140,
      lastModified: new Date()
    };
  }
  
  static generateFinancialData(): CSVFile {
    const categories = ['Revenue', 'Marketing', 'Sales', 'R&D', 'Operations', 'HR', 'Legal'];
    const departments = ['Engineering', 'Marketing', 'Sales', 'Finance', 'HR', 'Operations'];
    const months = ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06', '2024-07', '2024-08', '2024-09', '2024-10', '2024-11', '2024-12'];
    
    const data: Record<string, any>[] = [];
    
    for (let i = 0; i < 180; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const department = departments[Math.floor(Math.random() * departments.length)];
      const month = months[Math.floor(Math.random() * months.length)];
      const amount = category === 'Revenue' ? 
        Math.floor(Math.random() * 500000) + 100000 : 
        Math.floor(Math.random() * 100000) + 5000;
      const budget = amount * (0.8 + Math.random() * 0.4); // 80% to 120% of actual
      const variance = ((amount - budget) / budget) * 100;
      
      data.push({
        category,
        department,
        month,
        actual_amount: amount,
        budget_amount: Math.round(budget),
        variance_percent: Math.round(variance * 100) / 100,
        year: 2024,
        quarter: month <= '2024-03' ? 'Q1' : month <= '2024-06' ? 'Q2' : month <= '2024-09' ? 'Q3' : 'Q4'
      });
    }
    
    return {
      name: 'Sample Financial Data',
      data,
      columns: ['category', 'department', 'month', 'actual_amount', 'budget_amount', 'variance_percent', 'year', 'quarter'],
      rowCount: data.length,
      size: data.length * 130,
      lastModified: new Date()
    };
  }
  
  static getAllSampleDatasets(): CSVFile[] {
    return [
      this.generateSalesData(),
      this.generateCustomerData(),
      this.generateWebAnalyticsData(),
      this.generateFinancialData()
    ];
  }
  
  static generateRandomDataset(type: 'sales' | 'customers' | 'analytics' | 'financial'): CSVFile {
    switch (type) {
      case 'sales':
        return this.generateSalesData();
      case 'customers':
        return this.generateCustomerData();
      case 'analytics':
        return this.generateWebAnalyticsData();
      case 'financial':
        return this.generateFinancialData();
      default:
        return this.generateSalesData();
    }
  }
}