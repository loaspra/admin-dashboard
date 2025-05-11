'use client';

import { useState, useCallback, useMemo } from 'react';
import { useDropzone, Accept } from 'react-dropzone';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';

// Define product types based on schema
const productTypes = [
  'gorra',
  'polera',
  'polo',
  'termo',
  'sticker',
  'stickerSheet'
];

export function ImageUpload() {
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadMode, setUploadMode] = useState<'json' | 'image'>('json');
  const [productType, setProductType] = useState<string>('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
        const firstFileType = acceptedFiles[0].type;
        const currentModeIsJson = firstFileType === 'application/json';
        const newMode = currentModeIsJson ? 'json' : 'image';

        if (newMode !== uploadMode) {
             setFiles(acceptedFiles);
             setUploadMode(newMode);
             if (newMode === 'json') setProductType('');
        } else {
             setFiles(prev => [...prev, ...acceptedFiles]);
        }
    }

  }, [uploadMode]);

  const dropzoneConfig = useMemo((): Accept => {
    if (uploadMode === 'json') {
      return {
        'application/json': ['.json'] 
      };
    } else {
      return {
        'image/jpeg': ['.jpg', '.jpeg'], 
        'image/png': ['.png'] 
      };
    }
  }, [uploadMode]);

  const multipleFiles = useMemo(() => uploadMode === 'image', [uploadMode]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: dropzoneConfig,
    multiple: multipleFiles,
    onDropRejected: () => {
        toast.error(`Invalid file type. Please upload ${uploadMode === 'json' ? 'a JSON file' : 'image files (JPG, PNG)'}.`);
    },
    onFileDialogCancel: () => {
        // Handle cancellation if needed
    }
  });

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    if (uploadMode === 'image' && !productType) {
      toast.error('Please select a product type for image uploads');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('uploadMode', uploadMode);

    if (uploadMode === 'image') {
        formData.append('productType', productType);
        files.forEach(file => {
            formData.append('files', file);
        });
    } else {
        const file = files[0];
         const text = await file.text();
        let jsonData;
        try {
          jsonData = JSON.parse(text);
           formData.append('file', new Blob([JSON.stringify(jsonData)], { type: 'application/json' }), file.name);
        } catch (error) {
          toast.error('Invalid JSON file. Please check the format.');
          setUploading(false);
          return;
        }
    }

    try {
      const response = await fetch('/api/images', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Upload failed with status: ' + response.status }));
        throw new Error(errorData.message || 'Upload failed');
      }

      const data = await response.json();
      toast.success(`Successfully started processing ${files.length} ${uploadMode === 'image' ? 'image(s)' : 'JSON file'}.`);
      setFiles([]);
      setProductType('');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
        const updatedFiles = prev.filter((_, i) => i !== index);
        return updatedFiles;
    });
  };

  const handleModeChange = (value: 'json' | 'image') => {
    if (value !== uploadMode) {
        setUploadMode(value);
        setFiles([]);
        setProductType('');
    }
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <Label className="text-lg font-semibold">Upload Mode</Label>
           <RadioGroup
            defaultValue="json"
            value={uploadMode}
            onValueChange={handleModeChange}
            className="mt-2 grid grid-cols-2 gap-4"
          >
            <div>
              <RadioGroupItem value="json" id="json-mode" className="peer sr-only" />
              <Label
                htmlFor="json-mode"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
              >
                Upload JSON
              </Label>
            </div>
            <div>
              <RadioGroupItem value="image" id="image-mode" className="peer sr-only" />
              <Label
                htmlFor="image-mode"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"

              >
                Upload Images
              </Label>
            </div>
          </RadioGroup>
        </div>

         {uploadMode === 'image' && (
          <div>
            <Label htmlFor="product-type" className="text-lg font-semibold">Product Type</Label>
            <Select value={productType} onValueChange={setProductType}>
              <SelectTrigger id="product-type" className="w-full mt-2">
                <SelectValue placeholder="Select product type..." />
              </SelectTrigger>
              <SelectContent>
                {productTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300 hover:border-primary'}`}
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <p>Drop the {uploadMode === 'json' ? 'JSON file' : 'image files'} here ...</p>
          ) : (
            <p>Drag & drop {uploadMode === 'json' ? 'a JSON file' : 'image files'} here, or click to select</p>
          )}
          <p className="text-sm text-gray-500 mt-2">
            {uploadMode === 'json'
              ? 'Supported format: JSON'
              : 'Supported formats: JPG, PNG'}
          </p>
        </div>

        {files.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-medium">Selected {files.length > 1 ? 'Files' : 'File'}:</h3>
            <ul className="space-y-2 max-h-40 overflow-y-auto">
              {files.map((file, index) => (
                <li key={`${file.name}-${index}`} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                  <span className="truncate mr-2">{file.name}</span>
                  <Button
                    variant="destructive"
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
          disabled={uploading || files.length === 0 || (uploadMode === 'image' && !productType)}
          className="w-full"
        >
          {uploading ? 'Uploading...' : `Upload ${uploadMode === 'image' ? 'Images' : 'JSON'}`}
        </Button>
      </div>
    </Card>
  );
}
