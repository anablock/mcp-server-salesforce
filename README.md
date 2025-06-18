# Salesforce MCP Server

An MCP (Model Context Protocol) server implementation that integrates Claude with Salesforce, enabling natural language interactions with your Salesforce data and metadata. This server allows Claude to query, modify, and manage your Salesforce objects and records using everyday language.

<a href="https://glama.ai/mcp/servers/kqeniawbr6">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/kqeniawbr6/badge" alt="Salesforce Server MCP server" />
</a>

## Features

* **Object and Field Management**: Create and modify custom objects and fields using natural language
* **Smart Object Search**: Find Salesforce objects using partial name matches
* **Detailed Schema Information**: Get comprehensive field and relationship details for any object
* **Flexible Data Queries**: Query records with relationship support and complex filters
* **Data Manipulation**: Insert, update, delete, and upsert records with ease
* **Cross-Object Search**: Search across multiple objects using SOSL
* **Apex Code Management**: Read, create, and update Apex classes and triggers
* **Intuitive Error Handling**: Clear feedback with Salesforce-specific error details

## Installation

```bash
npm install -g @tsmztech/mcp-server-salesforce
```

## Tools

### salesforce_search_objects
Search for standard and custom objects:
* Search by partial name matches
* Finds both standard and custom objects
* Example: "Find objects related to Account" will find Account, AccountHistory, etc.

### salesforce_describe_object
Get detailed object schema information:
* Field definitions and properties
* Relationship details
* Picklist values
* Example: "Show me all fields in the Account object"

### salesforce_query_records
Query records with relationship support:
* Parent-to-child relationships
* Child-to-parent relationships
* Complex WHERE conditions
* Example: "Get all Accounts with their related Contacts"

### salesforce_dml_records
Perform data operations:
* Insert new records
* Update existing records
* Delete records
* Upsert using external IDs
* Example: "Update status of multiple accounts"

### salesforce_manage_object
Create and modify custom objects:
* Create new custom objects
* Update object properties
* Configure sharing settings
* Example: "Create a Customer Feedback object"

### salesforce_manage_field
Manage object fields:
* Add new custom fields
* Modify field properties
* Create relationships
* Example: "Add a Rating picklist field to Account"

### salesforce_search_all
Search across multiple objects:
* SOSL-based search
* Multiple object support
* Field snippets
* Example: "Search for 'cloud' across Accounts and Opportunities"

### salesforce_read_apex
Read Apex classes:
* Get full source code of specific classes
* List classes matching name patterns
* View class metadata (API version, status, etc.)
* Support for wildcards (* and ?) in name patterns
* Example: "Show me the AccountController class" or "Find all classes matching Account*Cont*"

### salesforce_write_apex
Create and update Apex classes:
* Create new Apex classes
* Update existing class implementations
* Specify API versions
* Example: "Create a new Apex class for handling account operations"

### salesforce_read_apex_trigger
Read Apex triggers:
* Get full source code of specific triggers
* List triggers matching name patterns
* View trigger metadata (API version, object, status, etc.)
* Support for wildcards (* and ?) in name patterns
* Example: "Show me the AccountTrigger" or "Find all triggers for Contact object"

### salesforce_write_apex_trigger
Create and update Apex triggers:
* Create new Apex triggers for specific objects
* Update existing trigger implementations
* Specify API versions and event operations
* Example: "Create a new trigger for the Account object" or "Update the Lead trigger"

### salesforce_execute_anonymous
Execute anonymous Apex code:
* Run Apex code without creating a permanent class
* View debug logs and execution results
* Useful for data operations not directly supported by other tools
* Example: "Execute Apex code to calculate account metrics" or "Run a script to update related records"

### salesforce_manage_debug_logs
Manage debug logs for Salesforce users:
* Enable debug logs for specific users
* Disable active debug log configurations
* Retrieve and view debug logs
* Configure log levels (NONE, ERROR, WARN, INFO, DEBUG, FINE, FINER, FINEST)
* Example: "Enable debug logs for user@example.com" or "Retrieve recent logs for an admin user"

## Setup

### Salesforce Authentication
You can connect to Salesforce using one of two authentication methods:

#### 1. Username/Password Authentication (Default)
1. Set up your Salesforce credentials
2. Get your security token (Reset from Salesforce Settings)

#### 2. OAuth 2.0 Client Credentials Flow
1. Create a Connected App in Salesforce
2. Enable OAuth settings and select "Client Credentials Flow"
3. Set appropriate scopes (typically "api" is sufficient)
4. Save the Client ID and Client Secret
5. **Important**: Note your instance URL (e.g., `https://your-domain.my.salesforce.com`) as it's required for authentication

### Usage with Claude Desktop

Add to your `claude_desktop_config.json`:

#### For Username/Password Authentication:
```json
{
  "mcpServers": {
    "salesforce": {
      "command": "npx",
      "args": ["-y", "@tsmztech/mcp-server-salesforce"],
      "env": {
        "SALESFORCE_CONNECTION_TYPE": "User_Password",
        "SALESFORCE_USERNAME": "your_username",
        "SALESFORCE_PASSWORD": "your_password",
        "SALESFORCE_TOKEN": "your_security_token",
        "SALESFORCE_INSTANCE_URL": "org_url"        // Optional. Default value: https://login.salesforce.com
      }
    }
  }
}
```

#### For OAuth 2.0 Client Credentials Flow:
```json
{
  "mcpServers": {
    "salesforce": {
      "command": "npx",
      "args": ["-y", "@tsmztech/mcp-server-salesforce"],
      "env": {
        "SALESFORCE_CONNECTION_TYPE": "OAuth_2.0_Client_Credentials",
        "SALESFORCE_CLIENT_ID": "your_client_id",
        "SALESFORCE_CLIENT_SECRET": "your_client_secret",
        "SALESFORCE_INSTANCE_URL": "https://your-domain.my.salesforce.com"  // REQUIRED: Must be your exact Salesforce instance URL
      }
    }
  }
}
```

> **Note**: For OAuth 2.0 Client Credentials Flow, the `SALESFORCE_INSTANCE_URL` must be your exact Salesforce instance URL (e.g., `https://your-domain.my.salesforce.com`). The token endpoint will be constructed as `<instance_url>/services/oauth2/token`.

## Example Usage

### Searching Objects
```
"Find all objects related to Accounts"
"Show me objects that handle customer service"
"What objects are available for order management?"
```

### Getting Schema Information
```
"What fields are available in the Account object?"
"Show me the picklist values for Case Status"
"Describe the relationship fields in Opportunity"
```

### Querying Records
```
"Get all Accounts created this month"
"Show me high-priority Cases with their related Contacts"
"Find all Opportunities over $100k"
```

### Managing Custom Objects
```
"Create a Customer Feedback object"
"Add a Rating field to the Feedback object"
"Update sharing settings for the Service Request object"
```

### Searching Across Objects
```
"Search for 'cloud' in Accounts and Opportunities"
"Find mentions of 'network issue' in Cases and Knowledge Articles"
"Search for customer name across all relevant objects"
```

### Managing Apex Code
```
"Show me all Apex classes with 'Controller' in the name"
"Get the full code for the AccountService class"
"Create a new Apex utility class for handling date operations"
"Update the LeadConverter class to add a new method"
```

### Managing Apex Triggers
```
"List all triggers for the Account object"
"Show me the code for the ContactTrigger"
"Create a new trigger for the Opportunity object"
"Update the Case trigger to handle after delete events"
```

### Executing Anonymous Apex Code
```
"Execute Apex code to calculate account metrics"
"Run a script to update related records"
"Execute a batch job to process large datasets"
```

### Managing Debug Logs
```
"Enable debug logs for user@example.com"
"Retrieve recent logs for an admin user"
"Disable debug logs for a specific user"
"Configure log level to DEBUG for a user"
```

## Development

### Building from source
```bash
# Clone the repository
git clone https://github.com/tsmztech/mcp-server-salesforce.git

# Navigate to directory
cd mcp-server-salesforce

# Install dependencies
npm install

# Build the project
npm run build
```

## Contributing
Contributions are welcome! Feel free to submit a Pull Request.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Issues and Support
If you encounter any issues or need support, please file an issue on the [GitHub repository](https://github.com/tsmztech/mcp-server-salesforce/issues).

Calendly Activity Report:
  Type: Tabular Report
  Primary Object: CalendlyAction__c
  Fields:
    - Event Type Name
    - Invitee Email
    - Event Start Time
    - Created Date
    - Owner
  Filters:
    - Created Date: Last 30 Days
    - Event Start Time: Future Dates

Conversion Tracking Report:
  Type: Summary Report
  Primary Object: Lead
  Secondary Object: CalendlyAction__c
  Grouping: Lead Source, Event Type
  Summary Fields:
    - Count of Leads
    - Conversion Rate
    - Average Days to Convert

## Reports

### Calendly Activity Report

### Conversion Tracking Report


https://claude.ai/artifacts/3d6a7795-7e85-43be-929b-fee19ea6071f

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lead Source & Timeline Analysis Report</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .report-container {
            max-width: 1200px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }

        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            font-weight: 700;
        }

        .header p {
            font-size: 1.1rem;
            opacity: 0.9;
        }

        .executive-summary {
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
            color: white;
            padding: 30px;
            margin: 0;
        }

        .executive-summary h2 {
            font-size: 1.8rem;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
        }

        .executive-summary h2::before {
            content: "⚡";
            margin-right: 10px;
            font-size: 2rem;
        }

        .key-metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }

        .metric-card {
            background: rgba(255, 255, 255, 0.15);
            padding: 20px;
            border-radius: 15px;
            text-align: center;
            backdrop-filter: blur(10px);
        }

        .metric-number {
            font-size: 2.5rem;
            font-weight: bold;
            display: block;
        }

        .metric-label {
            font-size: 0.9rem;
            opacity: 0.9;
            margin-top: 5px;
        }

        .content {
            padding: 40px;
        }

        .section {
            margin-bottom: 40px;
        }

        .section h2 {
            color: #1e3c72;
            font-size: 1.8rem;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 3px solid #667eea;
            display: flex;
            align-items: center;
        }

        .section h2::before {
            margin-right: 10px;
            font-size: 1.5rem;
        }

        .charts-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 30px;
            margin-bottom: 40px;
        }

        .chart-wrapper {
            background: white;
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
            border: 1px solid rgba(102, 126, 234, 0.1);
        }

        .chart-title {
            font-size: 1.2rem;
            font-weight: 600;
            color: #1e3c72;
            margin-bottom: 15px;
            text-align: center;
        }

        .insights-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 25px;
        }

        .insight-card {
            background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
            color: white;
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }

        .insight-card h3 {
            font-size: 1.3rem;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
        }

        .insight-card h3::before {
            margin-right: 10px;
            font-size: 1.5rem;
        }

        .insight-list {
            list-style: none;
        }

        .insight-list li {
            margin-bottom: 8px;
            padding-left: 20px;
            position: relative;
        }

        .insight-list li::before {
            content: "▶";
            position: absolute;
            left: 0;
            color: rgba(255, 255, 255, 0.8);
        }

        .recommendations {
            background: linear-gradient(135deg, #00b894 0%, #00a085 100%);
            color: white;
            padding: 30px;
            border-radius: 15px;
            margin-top: 30px;
        }

        .recommendations h2 {
            color: white;
            border-bottom-color: rgba(255, 255, 255, 0.3);
            margin-bottom: 25px;
        }

        .rec-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
        }

        .rec-item {
            background: rgba(255, 255, 255, 0.15);
            padding: 20px;
            border-radius: 10px;
            backdrop-filter: blur(10px);
        }

        .rec-item h4 {
            margin-bottom: 10px;
            font-size: 1.1rem;
        }

        .rec-item p {
            font-size: 0.9rem;
            opacity: 0.9;
            line-height: 1.4;
        }

        .priority-high { border-left: 4px solid #ff4757; }
        .priority-medium { border-left: 4px solid #ffa502; }
        .priority-low { border-left: 4px solid #7bed9f; }

        .footer {
            background: #1e3c72;
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 0.9rem;
        }

        @media (max-width: 768px) {
            .charts-container {
                grid-template-columns: 1fr;
            }
            .header h1 {
                font-size: 2rem;
            }
            .content {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="report-container">
        <div class="header">
            <h1>📊 Lead Source & Timeline Analysis</h1>
            <p>Comprehensive Marketing Intelligence Report | Generated June 2025</p>
        </div>

        <div class="executive-summary">
            <h2>Executive Summary</h2>
            <p>Analysis of 500+ leads reveals critical gaps in source tracking and significant opportunities for optimization. Immediate action required to improve lead attribution and conversion processes.</p>
            
            <div class="key-metrics">
                <div class="metric-card">
                    <span class="metric-number">500+</span>
                    <span class="metric-label">Total Leads Analyzed</span>
                </div>
                <div class="metric-card">
                    <span class="metric-number">75%</span>
                    <span class="metric-label">Untracked Sources</span>
                </div>
                <div class="metric-card">
                    <span class="metric-number">85%</span>
                    <span class="metric-label">Require Immediate Contact</span>
                </div>
                <div class="metric-card">
                    <span class="metric-number">25%</span>
                    <span class="metric-label">Properly Attributed</span>
                </div>
            </div>
        </div>

        <div class="content">
            <div class="section">
                <h2 style="--icon: '📈';">📈 Lead Source Distribution</h2>
                <div class="charts-container">
                    <div class="chart-wrapper">
                        <div class="chart-title">Lead Sources Breakdown</div>
                        <canvas id="sourceChart"></canvas>
                    </div>
                    <div class="chart-wrapper">
                        <div class="chart-title">Lead Status Distribution</div>
                        <canvas id="statusChart"></canvas>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>📊 Timeline Analysis</h2>
                <div class="chart-wrapper">
                    <div class="chart-title">Lead Generation Timeline (Recent Period)</div>
                    <canvas id="timelineChart"></canvas>
                </div>
            </div>

            <div class="section">
                <h2>💡 Key Insights</h2>
                <div class="insights-grid">
                    <div class="insight-card">
                        <h3>🚨 Critical Issues</h3>
                        <ul class="insight-list">
                            <li>75% of leads lack source attribution</li>
                            <li>Major blind spots in marketing ROI</li>
                            <li>Inability to optimize high-performing channels</li>
                            <li>Revenue attribution challenges</li>
                        </ul>
                    </div>
                    
                    <div class="insight-card">
                        <h3>🎯 Opportunities</h3>
                        <ul class="insight-list">
                            <li>Calendly shows strong performance</li>
                            <li>High immediate action rate (85%)</li>
                            <li>Consistent daily lead generation</li>
                            <li>Silver State Contact Form potential</li>
                        </ul>
                    </div>
                    
                    <div class="insight-card">
                        <h3>📊 Quality Indicators</h3>
                        <ul class="insight-list">
                            <li>Scheduled leads show higher intent</li>
                            <li>Form submissions need qualification</li>
                            <li>Contact urgency varies by source</li>
                            <li>Status categorization working well</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div class="recommendations">
                <h2>🎯 Strategic Recommendations</h2>
                <div class="rec-grid">
                    <div class="rec-item priority-high">
                        <h4>🔥 URGENT: Implement Source Tracking</h4>
                        <p>Deploy UTM parameters, hidden form fields, and integrated analytics to capture lead origins. This is critical for measuring marketing ROI.</p>
                    </div>
                    
                    <div class="rec-item priority-high">
                        <h4>📅 Expand Calendly Integration</h4>
                        <p>Scale the Calendly solution across all marketing channels. These leads show higher quality and conversion intent.</p>
                    </div>
                    
                    <div class="rec-item priority-medium">
                        <h4>🔍 Optimize Silver State Contact Form</h4>
                        <p>Analyze performance metrics and A/B test form variations to improve conversion rates and lead quality.</p>
                    </div>
                    
                    <div class="rec-item priority-medium">
                        <h4>⭐ Develop Lead Scoring System</h4>
                        <p>Create scoring based on source quality, urgency status, and historical conversion data to prioritize sales efforts.</p>
                    </div>
                    
                    <div class="rec-item priority-low">
                        <h4>📊 Enhanced Reporting Dashboard</h4>
                        <p>Build real-time dashboards for lead source performance, conversion funnels, and ROI tracking by channel.</p>
                    </div>
                    
                    <div class="rec-item priority-low">
                        <h4>🔄 Process Optimization</h4>
                        <p>Standardize lead handoff processes and create automated nurture sequences based on source and status.</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>Report generated from Salesforce data analysis | Next review scheduled for monthly cadence</p>
        </div>
    </div>

    <script>
        // Lead Source Chart
        const sourceCtx = document.getElementById('sourceChart').getContext('2d');
        new Chart(sourceCtx, {
            type: 'doughnut',
            data: {
                labels: ['Unknown/Not Specified', 'Calendly', 'Silver State Contact Form'],
                datasets: [{
                    data: [75, 15, 10],
                    backgroundColor: [
                        '#ff6b6b',
                        '#4ecdc4',
                        '#45b7d1'
                    ],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });

        // Status Chart
        const statusCtx = document.getElementById('statusChart').getContext('2d');
        new Chart(statusCtx, {
            type: 'bar',
            data: {
                labels: ['Contact Now', 'Open - Not Contacted'],
                datasets: [{
                    data: [85, 15],
                    backgroundColor: [
                        '#667eea',
                        '#764ba2'
                    ],
                    borderRadius: 8,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });

        // Timeline Chart
        const timelineCtx = document.getElementById('timelineChart').getContext('2d');
        new Chart(timelineCtx, {
            type: 'line',
            data: {
                labels: ['Week 1 May', 'Week 2 May', 'Week 3 May', 'Week 4 May', 'Week 1 June', 'Week 2 June'],
                datasets: [{
                    label: 'Leads Generated',
                    data: [85, 92, 78, 95, 65, 45],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#667eea',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 6
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    </script>
</body>
</html>