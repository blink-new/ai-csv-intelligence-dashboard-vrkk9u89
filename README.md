# AI-Powered CSV Intelligence Dashboard

An intelligent CSV parser and data visualization dashboard that automatically finds relationships between multiple CSV files, provides AI-powered insights through chat interface, and creates interactive visualizations for non-technical users.

## 🚀 Features

### Core Functionality
- **Multi-CSV Upload**: Drag & drop multiple CSV files with automatic parsing
- **Relationship Detection**: Automatically detects foreign key relationships between CSV files
- **Intelligent Data Joining**: Combines related datasets based on detected relationships
- **AI-Powered Chat**: Natural language interface for data exploration and insights
- **Interactive Visualizations**: Dynamic charts (bar, line, pie, scatter) with real-time updates
- **Advanced Analytics**: Pattern detection, anomaly identification, and statistical insights

### AI & Machine Learning
- **LangChain Integration**: Advanced text processing with chunking for large datasets
- **Dual AI Models**: OpenAI GPT-4 and Google Gemini for comprehensive analysis
- **Vector Search**: Semantic search through your data using embeddings
- **Smart Insights**: Automatic generation of data quality, patterns, and business insights
- **Natural Language Queries**: Ask questions about your data in plain English

### Data Processing
- **Schema Inference**: Automatic detection of data types, IDs, and foreign keys
- **Relationship Mapping**: Visual representation of data relationships
- **Data Quality Analysis**: Identifies missing values, duplicates, and inconsistencies
- **Chunking Support**: Handles large datasets efficiently with LangChain text splitters
- **Export Capabilities**: Download processed data and visualizations

## 🛠️ Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + ShadCN UI Components
- **Charts**: Recharts for interactive data visualizations
- **AI/ML**: LangChain + OpenAI + Google Gemini
- **Data Processing**: PapaParse for CSV handling
- **File Upload**: React Dropzone for drag & drop functionality

## 📋 Prerequisites

- Node.js 18+ and npm
- OpenAI API key (for GPT-4 analysis)
- Google Gemini API key (for pattern analysis)

## 🚀 Quick Start

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd ai-csv-intelligence-dashboard
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your API keys:
   ```env
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Get API Keys**
   - **OpenAI**: Visit [OpenAI Platform](https://platform.openai.com/api-keys)
   - **Gemini**: Visit [Google AI Studio](https://makersuite.google.com/app/apikey)

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Open Browser**
   Navigate to `http://localhost:5173`

## 📖 Usage Guide

### 1. Upload CSV Files
- Drag & drop multiple CSV files or click to select
- System automatically parses and analyzes file structure
- Detects data types, IDs, and potential relationships

### 2. Explore Relationships
- View automatically detected relationships between files
- See confidence scores and matching row counts
- Join datasets based on detected relationships

### 3. Chat with Your Data
- Ask natural language questions about your data
- Get AI-powered insights and recommendations
- Receive suggested visualizations based on queries

### 4. Create Visualizations
- Choose from multiple chart types (bar, line, pie, scatter)
- Select data sources and columns dynamically
- Export charts and data for presentations

### 5. Analyze Data Quality
- Review automatically generated insights
- Identify data quality issues and patterns
- Get recommendations for data improvements

## 🔧 Advanced Features

### Relationship Detection Algorithm
The system uses sophisticated algorithms to detect relationships:
- **ID Pattern Recognition**: Identifies primary and foreign keys
- **Value Matching**: Analyzes overlapping values between columns
- **Confidence Scoring**: Provides reliability metrics for each relationship
- **Relationship Types**: Detects one-to-one, one-to-many, and many-to-many relationships

### AI Analysis Pipeline
1. **Data Chunking**: Large datasets are split into manageable chunks
2. **Vector Embeddings**: Creates searchable representations of your data
3. **Semantic Search**: Enables natural language queries
4. **Multi-Model Analysis**: Combines OpenAI and Gemini for comprehensive insights
5. **Context-Aware Responses**: Maintains conversation context for follow-up questions

### Data Processing Features
- **Smart Type Detection**: Automatically identifies numbers, dates, booleans, and IDs
- **Missing Value Handling**: Identifies and reports data quality issues
- **Duplicate Detection**: Finds and highlights duplicate records
- **Statistical Analysis**: Provides summary statistics for numeric columns

## 🎯 Use Cases

### Business Intelligence
- Analyze sales data across multiple regions/products
- Identify customer behavior patterns
- Track performance metrics over time

### Data Integration
- Combine data from different systems (CRM, ERP, etc.)
- Merge customer data with transaction history
- Integrate product catalogs with sales data

### Research & Analytics
- Explore survey responses with demographic data
- Analyze experimental results across conditions
- Study correlations between different datasets

### Data Quality Assessment
- Identify inconsistencies across data sources
- Find missing relationships between datasets
- Validate data integrity before analysis

## 🔒 Security & Privacy

- **Client-Side Processing**: CSV parsing happens in your browser
- **API Key Security**: Keys are stored locally and never transmitted
- **No Data Storage**: Your data never leaves your device
- **Secure AI Calls**: All AI requests use encrypted HTTPS connections

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Netlify/Vercel
1. Connect your repository to your hosting platform
2. Set environment variables in the hosting dashboard
3. Deploy with automatic builds on push

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Report bugs and request features via GitHub Issues
- **API Keys**: Ensure your OpenAI and Gemini API keys are valid and have sufficient credits

## 🔮 Roadmap

- [ ] Real-time collaboration features
- [ ] Advanced statistical analysis
- [ ] Machine learning model training
- [ ] Database connectivity (PostgreSQL, MySQL)
- [ ] API endpoint for programmatic access
- [ ] Mobile-responsive improvements
- [ ] Advanced export formats (PDF, Excel)

---

Built with ❤️ using React, TypeScript, and AI