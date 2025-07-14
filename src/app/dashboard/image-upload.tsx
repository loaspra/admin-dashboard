'use client';

// TypeScript declarations for custom HTML attributes
declare module 'react' {
  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    // Custom attributes for file inputs
    webkitdirectory?: string;
    directory?: string;
  }
}

import { useState, useCallback, useMemo, useEffect } from 'react';
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

interface Category {
  id: string;
  name: string;
}

interface Collection {
  id: string;
  name: string;
  categoryId: string;
}

interface ImageUploadProps {
  showConfirmation?: (title: string, message: string, action: () => void) => void;
  onSuccess?: () => void;
  onProductsForReview?: (products: any[]) => void;
}

export function ImageUpload({ showConfirmation, onSuccess, onProductsForReview }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadMode, setUploadMode] = useState<'json' | 'image' | 'folder'>('json');
  const [productType, setProductType] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [collection, setCollection] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [filteredCollections, setFilteredCollections] = useState<Collection[]>([]);
  const [customCategory, setCustomCategory] = useState('');
  const [customCollection, setCustomCollection] = useState('');
  const [enableReviewMode, setEnableReviewMode] = useState(true);

  // Fetch categories and collections on component mount
  useEffect(() => {
    const fetchCategoriesAndCollections = async () => {
      try {
        const categoriesResponse = await fetch('/api/categories');
        console.log("Categories response:", categoriesResponse);
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json();
          console.log("Fetched categories:", categoriesData);
          setCategories(categoriesData);
        }

        const collectionsResponse = await fetch('/api/collections');
        if (collectionsResponse.ok) {
          const collectionsData = await collectionsResponse.json();
          setCollections(collectionsData);
        }
      } catch (error) {
        console.error('Error fetching categories and collections:', error);
        toast.error('Failed to load categories and collections');
      }
    };

    fetchCategoriesAndCollections();
  }, []);

  // Filter collections when category changes
  useEffect(() => {
    if (category) {
      const filtered = collections.filter(col => col.categoryId === category);
      setFilteredCollections(filtered);
    } else {
      setFilteredCollections([]);
    }
  }, [category, collections]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
        if (uploadMode === 'folder') {
          // For folder uploads, accept all files
          setFiles(acceptedFiles);
          return;
        }
        
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
    } else if (uploadMode === 'folder') {
      return {
        'image/jpeg': ['.jpg', '.jpeg'], 
        'image/png': ['.png']
      };
    } else {
      return {
        'image/jpeg': ['.jpg', '.jpeg'], 
        'image/png': ['.png'] 
      };
    }
  }, [uploadMode]);

  const multipleFiles = useMemo(() => uploadMode === 'image' || uploadMode === 'folder', [uploadMode]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: dropzoneConfig,
    multiple: multipleFiles,
    noClick: uploadMode === 'folder', // Disable click for folder mode (will use input directly)
    noKeyboard: uploadMode === 'folder',
    noDrag: uploadMode === 'folder',
    onDropRejected: () => {
        toast.error(`Invalid file type. Please upload ${uploadMode === 'json' ? 'a JSON file' : 'image files (JPG, PNG)'}.`);
    },
    onFileDialogCancel: () => {
        // Handle cancellation if needed
    }
  });

  const handleCategoryChange = (value: string) => {
    if (value === 'custom') {
      // Show input for custom category
      setCategory('custom');
    } else {
      setCategory(value);
      setCustomCategory('');
    }
    // Reset collection when category changes
    setCollection('');
    setCustomCollection('');
  };

  const handleCollectionChange = (value: string) => {
    if (value === 'custom') {
      // Show input for custom collection
      setCollection('custom');
    } else {
      setCollection(value);
      setCustomCollection('');
    }
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileArray = Array.from(e.target.files);
      setFiles(fileArray);
      toast.success(`Selected ${fileArray.length} files from folder`);
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    if ((uploadMode === 'image' || uploadMode === 'folder') && !productType) {
      toast.error('Please select a product type for image uploads');
      return;
    }

    // Check if category and collection are empty
    if (!category && !customCategory && !collection && !customCollection) {
      console.log("No category/collection selected, should show AI confirmation");
      if (showConfirmation) {
        console.log("Showing AI confirmation dialog");
        showConfirmation(
          'Use AI for Categorization',
          'No category or collection was selected. The system will use AI to infer categories and collections from existing ones. Continue?',
          () => processUpload(true)
        );
        return;
      }
    }

    // Check if custom category or collection was entered
    if ((customCategory || customCollection) && showConfirmation) {
      console.log("Custom category/collection entered:", { customCategory, customCollection });
      showConfirmation(
        'Create New Category/Collection',
        `You've entered ${customCategory ? `a new category "${customCategory}"` : ''}${customCategory && customCollection ? ' and ' : ''}${customCollection ? `a new collection "${customCollection}"` : ''}. Do you want to create ${customCategory && customCollection ? 'them' : 'it'}?`,
        () => processUpload(false)
      );
      return;
    }

    processUpload(false);
  };

  const processUpload = async (useAiInference: boolean) => {
    setUploading(true);
    const formData = new FormData();

    if (uploadMode === 'image' || uploadMode === 'folder') {
      formData.append('productType', productType);
      
      // For folder uploads, we want to preserve relative paths
      if (uploadMode === 'folder') {
        formData.append('isFolder', 'true');
      }
      
      files.forEach(file => {
        // For folder uploads, include the relative path
        if (uploadMode === 'folder' && file.webkitRelativePath) {
          formData.append('filePaths', file.webkitRelativePath);
        }
        formData.append('files', file);
      });

      // Add category and collection information
      if (!useAiInference) {
        if (customCategory) {
          formData.append('customCategory', customCategory.toLowerCase());
        } else if (category) {
          formData.append('categoryId', category);
        }

        if (customCollection) {
          formData.append('customCollection', customCollection.toLowerCase());
        } else if (collection) {
          formData.append('collectionId', collection);
        }
      }

      formData.append('useAiInference', String(useAiInference));

      // Choose endpoint based on review mode
      const endpoint = enableReviewMode && (uploadMode === 'image' || uploadMode === 'folder') 
        ? '/api/images/process-for-review' 
        : '/api/images';

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Upload failed with status: ' + response.status }));
          throw new Error(errorData.message || 'Upload failed');
        }

        const data = await response.json();

        if (enableReviewMode && onProductsForReview) {
          // Handle both single product (backward compatibility) and multiple products
          const productsToReview = data.productsData || (data.productData ? [data.productData] : []);
          
          if (productsToReview.length > 0) {
            onProductsForReview(productsToReview);
            toast.success(`${productsToReview.length} image(s) processed! Please review the product data.`);
          } else {
            toast.error('No products were processed for review.');
          }
        } else {
          // Normal flow - direct save
          toast.success(`Successfully processed ${files.length} image(s).`);
          if (onSuccess) {
            onSuccess();
          }
        }

        // Reset form
        setFiles([]);
        setProductType('');
        setCategory('');
        setCollection('');
        setCustomCategory('');
        setCustomCollection('');

      } catch (error: any) {
        console.error('Upload error:', error);
        toast.error(`Upload failed: ${error.message}`);
      }
    } else {
      // JSON upload logic remains the same
      formData.append('uploadMode', uploadMode);
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
        toast.success(`Successfully started processing ${files.length} JSON file.`);
        setFiles([]);
        
        if (onSuccess) {
          onSuccess();
        }
      } catch (error: any) {
        console.error('Upload error:', error);
        toast.error(`Upload failed: ${error.message}`);
      }
    }
    
    setUploading(false);
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
        const updatedFiles = prev.filter((_, i) => i !== index);
        return updatedFiles;
    });
  };

  const handleModeChange = (value: 'json' | 'image' | 'folder') => {
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
            className="mt-2 grid grid-cols-3 gap-4"
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
            <div>
              <RadioGroupItem value="folder" id="folder-mode" className="peer sr-only" />
              <Label
                htmlFor="folder-mode"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
              >
                Upload Folder
              </Label>
            </div>
          </RadioGroup>
        </div>

        {(uploadMode === 'image' || uploadMode === 'folder') && (
          <>
            {/* Review Mode Toggle */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="reviewMode"
                  checked={enableReviewMode}
                  onChange={(e) => setEnableReviewMode(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="reviewMode" className="text-white">
                  Enable review mode (preview before saving)
                </Label>
              </div>
            </div>

            <div>
              <Label htmlFor="product-type" className="text-lg font-semibold">Product Type</Label>
              <Select value={productType} onValueChange={setProductType}>
                <SelectTrigger id="product-type" className="w-full mt-2 bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Select product type..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 text-white border-white/20">
                  {productTypes.map((type) => (
                    <SelectItem key={type} value={type} className="hover:bg-white/10 focus:bg-white/20">
                      {type === 'cap' ? 'Gorra' :
                       type === 'sweatshirt' ? 'Polera' :
                       type === 'poloShirt' ? 'Polo' :
                       type === 'thermos' ? 'Termo' :
                       type === 'sticker' ? 'Sticker' :
                       type === 'stickerSheet' ? 'Plancha de Stickers' :
                       type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="category" className="text-lg font-semibold">Category</Label>
              <Select value={category} onValueChange={handleCategoryChange}>
                <SelectTrigger id="category" className="w-full mt-2 bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 text-white border-white/20">
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id} className="hover:bg-white/10 focus:bg-white/20">
                      {cat.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom" className="hover:bg-white/10 focus:bg-white/20">+ Add New Category</SelectItem>
                </SelectContent>
              </Select>
              
              {category === 'custom' && (
                <div className="mt-2">
                  <Label htmlFor="custom-category">New Category Name</Label>
                  <input
                    id="custom-category"
                    className="flex h-10 w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-white"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Enter new category name"
                  />
                </div>
              )}
            </div>

            {(category || customCategory) && (
              <div>
                <Label htmlFor="collection" className="text-lg font-semibold">Collection</Label>
                <Select value={collection} onValueChange={handleCollectionChange}>
                  <SelectTrigger id="collection" className="w-full mt-2 bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Select collection..." />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 text-white border-white/20">
                    {filteredCollections.map((col) => (
                      <SelectItem key={col.id} value={col.id} className="hover:bg-white/10 focus:bg-white/20">
                        {col.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom" className="hover:bg-white/10 focus:bg-white/20">+ Add New Collection</SelectItem>
                  </SelectContent>
                </Select>
                
                {collection === 'custom' && (
                  <div className="mt-2">
                    <Label htmlFor="custom-collection">New Collection Name</Label>
                    <input
                      id="custom-collection"
                      className="flex h-10 w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-white"
                      value={customCollection}
                      onChange={(e) => setCustomCollection(e.target.value)}
                      placeholder="Enter new collection name"
                    />
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {uploadMode === 'folder' ? (
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <input
              type="file"
              webkitdirectory="true"
              directory=""
              onChange={handleFolderSelect}
              className="hidden"
              id="folder-input"
            />
            <Label 
              htmlFor="folder-input"
              className="cursor-pointer block py-4 px-6 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Select Folder
            </Label>
            <p className="text-sm text-gray-500 mt-2">
              Click the button to select a folder containing images
            </p>
          </div>
        ) : (
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
        )}

        {files.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-medium">Selected {files.length > 1 ? 'Files' : 'File'}:</h3>
            <ul className="space-y-2 max-h-40 overflow-y-auto">
              {files.map((file, index) => (
                <li key={`${file.name}-${index}`} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                  <span className="truncate mr-2">
                    {uploadMode === 'folder' && file.webkitRelativePath
                      ? file.webkitRelativePath
                      : file.name}
                  </span>
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
          disabled={uploading || files.length === 0 || ((uploadMode === 'image' || uploadMode === 'folder') && !productType)}
          className="w-full"
        >
          {uploading ? 'Uploading...' : `Upload ${uploadMode === 'image' ? 'Images' : uploadMode === 'folder' ? 'Folder' : 'JSON'}`}
        </Button>
      </div>
    </Card>
  );
}
