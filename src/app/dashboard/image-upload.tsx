'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { toast } from 'sonner';

export function ImageUpload() {
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'application/json': ['.json'],
    }
  });

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    setUploading(true);
    const formData = new FormData();

    for (const file of files) {
      if (file.type === 'application/json') {
        // Read the JSON file and parse it
        const text = await file.text();
        let jsonData;
        try {
          jsonData = JSON.parse(text);
        } catch (error) {
          toast.error('Invalid JSON file. Please check the format.');
          setUploading(false);
          return;
        }
        jsonData.forEach((image: any) => {
          formData.append('files', new Blob([JSON.stringify(image)], { type: 'application/json' }));
        });
      } else {
        formData.append('files', file);
      }
    }

    try {
      const response = await fetch('/api/images', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      toast.success(`Successfully uploaded ${files.length} images`);
      setFiles([]);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300 hover:border-primary'}`}
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <p>Drop the files here ...</p>
          ) : (
            <p>Drag & drop image files or JSON here, or click to select files</p>
          )}
          <p className="text-sm text-gray-500 mt-2">
            Supported formats: JPG, PNG, JSON
          </p>
        </div>

        {files.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-medium">Selected Files:</h3>
            <ul className="space-y-2">
              {files.map((file, index) => (
                <li key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                  <span className="truncate">{file.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Button
          onClick={handleUpload}
          disabled={uploading || files.length === 0}
          className="w-full"
        >
          {uploading ? 'Uploading...' : 'Upload Images'}
        </Button>
      </div>
    </Card>
  );
}
