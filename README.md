# Azure OTDR Trace Viewer - Backend Integration Guide

This document provides instructions for connecting the OTDR Trace Viewer frontend to an Azure backend for retrieving and analyzing .sor files stored in Azure Blob Storage.

## Architecture Overview

The application consists of:

1. **Frontend**: React application with TypeScript and Recharts for visualization
2. **Backend API**: Azure Functions or Azure App Service
3. **Storage**: Azure Blob Storage containing .sor files
4. **Optional**: Azure Cosmos DB for metadata and analysis results

## Backend Implementation Steps

### 1. Set Up Azure Blob Storage

1. Create a Blob Storage account with a container for .sor files
   ```bash
   az storage account create --name otdrfilestorage --resource-group otdr-resource-group --location eastus --sku Standard_LRS
   az storage container create --name sorfiles --account-name otdrfilestorage
   ```

2. Organize .sor files in a logical structure:
   ```
   /sorfiles
     /fiber001
       /2023-01-15_trace.sor
       /2023-02-20_trace.sor
     /fiber002
       /2023-01-10_trace.sor
   ```

### 2. Create Azure Function API

1. Create a new Azure Function App:
   ```bash
   az functionapp create --name otdr-api --resource-group otdr-resource-group --consumption-plan-location eastus --storage-account otdrfilestorage
   ```

2. Implement the following API endpoints:

#### a. List Available Traces
```typescript
// listTraces.ts
import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { BlobServiceClient } from "@azure/storage-blob";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const connectionString = process.env.AzureBlobStorageConnectionString;
    const containerName = "sorfiles";
    
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    const traces = [];
    for await (const blob of containerClient.listBlobsFlat()) {
        // Extract metadata from path: fiberId from directory name, timestamp from filename
        const pathParts = blob.name.split('/');
        const fiberId = pathParts.length > 1 ? pathParts[0] : 'unknown';
        const fileName = pathParts[pathParts.length - 1];
        
        traces.push({
            id: blob.name,
            fileName: fileName,
            fiberId: fiberId,
            timestamp: blob.properties.createdOn,
            url: `${req.url.split('/api')[0]}/api/getTrace?path=${encodeURIComponent(blob.name)}`
        });
    }
    
    context.res = {
        status: 200,
        body: traces
    };
};

export default httpTrigger;
```

#### b. Get OTDR Trace Data
```typescript
// getTrace.ts
import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { BlobServiceClient } from "@azure/storage-blob";
import { parseSorFile } from "../utils/sorParser"; // You'll need to create this

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const path = req.query.path;
    
    if (!path) {
        context.res = {
            status: 400,
            body: "Please provide a path parameter"
        };
        return;
    }
    
    const connectionString = process.env.AzureBlobStorageConnectionString;
    const containerName = "sorfiles";
    
    try {
        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blobClient = containerClient.getBlobClient(path);
        
        // Download the file
        const downloadResponse = await blobClient.download();
        const sorBuffer = await streamToBuffer(downloadResponse.readableStreamBody);
        
        // Parse the .sor file
        const parsedData = parseSorFile(sorBuffer);
        
        // Extract metadata from path
        const pathParts = path.split('/');
        const fiberId = pathParts.length > 1 ? pathParts[0] : 'unknown';
        const fileName = pathParts[pathParts.length - 1];
        
        // Format response to match frontend expectations
        const traceData = {
            id: path,
            fileName: fileName,
            fiberId: fiberId,
            timestamp: downloadResponse.properties.createdOn.toISOString(),
            distance: parsedData.distance,
            power: parsedData.power,
            events: parsedData.events
        };
        
        context.res = {
            status: 200,
            body: traceData
        };
    } catch (error) {
        context.log.error("Error retrieving trace:", error);
        context.res = {
            status: 500,
            body: "Error retrieving or parsing OTDR trace file"
        };
    }
};

// Helper function to convert stream to buffer
async function streamToBuffer(readableStream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        readableStream.on("data", (data) => {
            chunks.push(data instanceof Buffer ? data : Buffer.from(data));
        });
        readableStream.on("end", () => {
            resolve(Buffer.concat(chunks));
        });
        readableStream.on("error", reject);
    });
}

export default httpTrigger;
```

### 3. Implement .SOR File Parser

Create a utility to parse .sor files. There are several approaches:

1. Use an existing library if available
2. Implement a custom parser based on the Telcordia SR-4731 standard
3. Use a third-party service that can parse .sor files

Example skeleton for a parser:

```typescript
// sorParser.ts
export function parseSorFile(fileBuffer: Buffer) {
    // This is a simplified example. Actual .sor parsing is more complex
    // and should follow the Telcordia SR-4731 standard
    
    // 1. Parse file header
    // 2. Extract measurement parameters
    // 3. Extract trace data points
    // 4. Identify and extract events
    
    // For demonstration, return mock data
    return {
        distance: Array.from({ length: 500 }, (_, i) => i * 0.05),
        power: Array.from({ length: 500 }, (_, i) => {
            let value = -0.25 * i;
            value -= (Math.random() * 0.03);
            value -= 2 * Math.log(i + 1) / Math.log(10);
            return value;
        }),
        events: [
            {
                id: '1',
                type: 'reflection',
                distance: 2.5,
                loss: 0.3,
                reflection: -35,
                description: 'Connector'
            },
            // Add more detected events here
        ]
    };
}
```

For a production implementation, consider:
1. Using a specialized optical measurement library
2. Implementing a full parser according to the Telcordia SR-4731 standard
3. Using existing tools like [PyOTDR](https://github.com/sid5432/pyOTDR) and creating a wrapper

### 4. Frontend Integration

Update the frontend store to connect to the backend API:

```typescript
// src/store/otdrStore.ts

// Add API client functions
const api = {
  async getTraces(): Promise<OTDRTraceInfo[]> {
    const response = await fetch('/api/listTraces');
    if (!response.ok) throw new Error('Failed to fetch traces');
    return response.json();
  },
  
  async getTraceData(traceId: string): Promise<OTDRTrace> {
    const response = await fetch(`/api/getTrace?path=${encodeURIComponent(traceId)}`);
    if (!response.ok) throw new Error('Failed to fetch trace data');
    return response.json();
  }
};

// Update the store actions
const useOTDRStore = create<OTDRState>((set, get) => ({
  // Initial state...
  
  // Updated actions
  fetchTraces: async () => {
    set({ loading: true, error: null });
    
    try {
      const traces = await api.getTraces();
      set({ traces, loading: false });
    } catch (err) {
      set({ 
        loading: false, 
        error: err instanceof Error ? err.message : 'Failed to fetch traces' 
      });
    }
  },
  
  selectTrace: async (traceId: string) => {
    set({ loading: true, error: null });
    
    try {
      const trace = await api.getTraceData(traceId);
      set({ selectedTrace: trace, loading: false });
    } catch (err) {
      set({ 
        loading: false, 
        error: err instanceof Error ? err.message : 'Failed to fetch trace data' 
      });
    }
  },
  
  // Other actions...
}));
```

### 5. Deployment

1. **Backend Deployment**:
   ```bash
   # Deploy Azure Function App
   cd backend
   func azure functionapp publish otdr-api
   ```

2. **Frontend Deployment**:
   ```bash
   # Build React app
   cd frontend
   npm run build
   
   # Deploy to Azure Static Web Apps or another hosting service
   az staticwebapp create --name otdr-webapp --resource-group otdr-resource-group --source . --location "Central US" --api-location api
   ```

3. **Configure CORS** in Azure Function App settings to allow requests from the frontend domain.

## Advanced Features

### 1. SOR File Upload

Implement an upload endpoint to allow network engineers to upload new .sor files:

```typescript
// uploadTrace.ts
import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { BlobServiceClient } from "@azure/storage-blob";
import { v4 as uuidv4 } from "uuid";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    // Extract parameters from request
    const fiberId = req.query.fiberId || req.body?.fiberId;
    const fileContent = req.body?.fileContent; // Base64 encoded content
    const fileName = req.body?.fileName || `trace_${new Date().toISOString()}.sor`;
    
    if (!fiberId || !fileContent) {
        context.res = {
            status: 400,
            body: "Please provide fiberId and fileContent"
        };
        return;
    }
    
    try {
        // Decode Base64 file content
        const fileBuffer = Buffer.from(fileContent, 'base64');
        
        // Upload to blob storage
        const connectionString = process.env.AzureBlobStorageConnectionString;
        const containerName = "sorfiles";
        const blobPath = `${fiberId}/${fileName}`;
        
        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(blobPath);
        
        await blockBlobClient.upload(fileBuffer, fileBuffer.length);
        
        context.res = {
            status: 200,
            body: {
                id: blobPath,
                fileName: fileName,
                fiberId: fiberId,
                timestamp: new Date().toISOString(),
                url: `${req.url.split('/api')[0]}/api/getTrace?path=${encodeURIComponent(blobPath)}`
            }
        };
    } catch (error) {
        context.log.error("Error uploading trace:", error);
        context.res = {
            status: 500,
            body: "Error uploading OTDR trace file"
        };
    }
};

export default httpTrigger;
```

### 2. Automated Analysis

For advanced analysis of OTDR traces:

1. Create an Azure Function triggered by Blob storage events when new .sor files are uploaded
2. Perform automated analysis (detecting degradation, comparing with baseline readings)
3. Store analysis results in Cosmos DB
4. Expose API endpoints to retrieve analysis results

### 3. Authentication and Authorization

Implement Azure AD B2C or Azure Active Directory authentication:

1. Configure Azure AD application registration
2. Implement authentication in the Azure Function App
3. Add authentication to the frontend using MSAL.js
4. Implement role-based access control for different user types

## Conclusion

This integration guide provides the foundation for connecting the OTDR Trace Viewer frontend to Azure backend services. The implementation can be extended with additional features such as:

- Time-series analysis of fiber performance
- Machine learning for predictive maintenance
- Integration with Azure Digital Twins for network topology visualization
- Alerting mechanisms for critical events
- Mobile app integration for field engineers

## Running the Frontend

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### `npm run build`

Builds the app for production to the `build` folder.