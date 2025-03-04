# Azure OTDR Trace Viewer

This application provides a frontend for visualizing and analyzing OTDR (Optical Time Domain Reflectometer) trace files (.sor format). It now includes Python-based parser and analysis tools.

## Architecture Overview

The application consists of:

1. **Frontend**: React application with TypeScript and Recharts for visualization
2. **Python Backend**: Flask API for SOR file parsing and analysis
3. **Python Modules**: 
   - `otdr_parser.py`: Parses SOR file format
   - `otdr_algorithm.py`: Analyzes traces for events and issues
4. **Storage**: Local files with future Azure Blob Storage integration

## New Python Backend Integration

The application now includes a local Python-based API for processing OTDR files directly. This allows for:

1. Parsing SOR files using `otdr_parser.py`
2. Analyzing trace data to detect events using `otdr_algorithm.py`
3. Visualizing the results in the frontend

### Running the Application

1. **Start the Python Backend**:
   ```bash
   # Install dependencies
   pip install flask flask-cors numpy matplotlib scipy

   # Start the Flask server
   python api.py
   ```
   This will start the backend API on http://localhost:5000

2. **Start the Frontend**:
   ```bash
   # Install dependencies
   npm install

   # Start the React development server
   npm start
   ```
   This will start the frontend on http://localhost:3000

### Using the Application

1. Open the application in your browser
2. Use the file uploader to select an OTDR SOR file
3. Toggle between client-side processing (mock data) and API processing (real data)
4. View the trace visualization and detected events

### API Documentation

The backend API has the following endpoint:

#### POST /api/upload

Uploads and processes an OTDR file.

**Request:**
- Form data with a file field named 'file' containing the SOR file

**Response:**
```json
{
  "success": true,
  "fileName": "example.sor",
  "fiberId": "FIBER-123",
  "timestamp": 1646092800,
  "distance": [0, 0.1, 0.2, ...],
  "power": [-10.2, -10.3, -10.4, ...],
  "events": [
    {
      "id": "br-0",
      "type": "reflection",
      "distance": 1.25,
      "loss": 0.3,
      "reflection": -30,
      "description": "Back Reflection at 1.25km"
    },
    ...
  ],
  "plotImage": "base64-encoded-image",
  "info": {
    "logs": "Successfully analyzed sor file with back reflection at [[100, 120]] and fiber issues at [[200, 220], [300, 320]]"
  }
}
```

## Future Azure Integration

The system has been designed with future Azure integration in mind:

### 1. Azure Blob Storage Integration

The `otdr_algorithm.py` file includes functions for:
- Downloading SOR files from Azure Blob Storage
- Uploading analysis results back to Azure Blob Storage

### 2. Azure Function Integration

This local implementation can be migrated to Azure Functions by:
1. Creating an Azure Function with Python runtime
2. Moving the Flask endpoint logic to an HTTP trigger
3. Connecting to Azure Blob Storage for file storage

### 3. Advanced Features for Future Implementation

- **Automated Analysis**: Set up Azure Functions triggered by Blob storage events
- **Results Database**: Store analysis results in Cosmos DB
- **Authentication**: Add Azure AD B2C or Azure Active Directory
- **Visualization Enhancements**: Add time-series analysis and predictive maintenance

## Technical Details

### Python Components

1. **otdr_parser.py**:
   - Parses SOR file binary format according to industry standards
   - Extracts metadata, traces, and events

2. **otdr_algorithm.py**:
   - Analyzes trace data for signal anomalies
   - Detects fiber issues, reflections, and other events
   - Generates visualizations

### Frontend Components

1. **FileUploader.tsx**:
   - Handles SOR file uploads
   - Toggles between client-side and API processing

2. **OTDRGraph.tsx**:
   - Visualizes trace data with distance and power measurements
   - Displays detected events with colors based on event type

3. **otdrStore.ts**:
   - Manages application state
   - Processes uploaded files
   - Connects to the Python API when enabled

## Running the Frontend

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### `npm run build`

Builds the app for production to the `build` folder.