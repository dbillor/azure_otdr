import React, { useRef, useState } from 'react';
import useOTDRStore from '../../store/otdrStore';
import { OTDRTrace, OTDREvent, EventType } from '../../types/otdr';

const API_URL = 'http://localhost:8000/api/upload';

const FileUploader: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const { uploadTrace, loading, error } = useOTDRStore();
  const [useLocalProcessing, setUseLocalProcessing] = useState(true);

  const processFileWithAPI = async (file: File) => {
    try {
      setProcessingError(null);
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`API response error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Convert API response to OTDRTrace format
      const events: OTDREvent[] = data.events.map((event: any) => ({
        id: event.id,
        type: event.type as EventType,
        distance: event.distance,
        loss: event.loss,
        reflection: event.reflection,
        description: event.description
      }));
      
      const trace: OTDRTrace = {
        id: `${Date.now()}`,
        fileName: data.fileName,
        fiberId: data.fiberId,
        timestamp: new Date(data.timestamp * 1000).toISOString(),
        distance: data.distance,
        power: data.power,
        events: events
      };
      
      return trace;
    } catch (err) {
      setProcessingError(err instanceof Error ? err.message : 'Failed to process OTDR file');
      throw err;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      try {
        if (!useLocalProcessing) {
          // Use the API for processing
          const trace = await processFileWithAPI(files[0]);
          await uploadTrace(files[0], trace);
        } else {
          // Use the local processing in the store
          await uploadTrace(files[0]);
        }
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (err) {
        console.error('Error processing file:', err);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      try {
        if (!useLocalProcessing) {
          // Use the API for processing
          const trace = await processFileWithAPI(files[0]);
          await uploadTrace(files[0], trace);
        } else {
          // Use the local processing in the store
          await uploadTrace(files[0]);
        }
      } catch (err) {
        console.error('Error processing file:', err);
      }
    }
  };

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const toggleProcessingMode = () => {
    setUseLocalProcessing(!useLocalProcessing);
  };

  return (
    <div>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
        }`}
        onClick={handleButtonClick}
      >
        {loading ? (
          <div className="flex justify-center items-center space-x-2">
            <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Uploading and Processing...</span>
          </div>
        ) : (
          <>
            <svg className="w-8 h-8 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="mt-2 text-sm text-gray-600">
              Drag and drop an OTDR file (.sor) or click to upload
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Only .sor files are supported
            </p>
          </>
        )}
      </div>
      
      {(error || processingError) && (
        <div className="mt-2 text-sm text-red-600">
          Error: {error || processingError}
        </div>
      )}
      
      <div className="mt-2 flex items-center">
        <label className="inline-flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            checked={useLocalProcessing}
            onChange={toggleProcessingMode}
            className="sr-only peer" 
          />
          <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          <span className="ms-3 text-sm font-medium text-gray-500">
            {useLocalProcessing ? 'Using Client-Side Processing' : 'Using API Processing'}
          </span>
        </label>
        <div className="ml-2 text-xs text-gray-400">
          {useLocalProcessing 
            ? '(Python API not used)' 
            : '(Requires API running on port 8000)'}
        </div>
      </div>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".sor"
        className="hidden"
      />
    </div>
  );
};

export default FileUploader;