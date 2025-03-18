'use client';

import { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle 
} from '@/app/components/ui/dialog';
import { PlusCircle } from 'lucide-react';
import { createRow, getTableData } from '@/app/lib/api';
import { toast } from 'sonner';

interface CreationCardsProps {
  readonly tableName: string;
  readonly onItemCreated: () => void;
}

export function CreationCards({ tableName, onItemCreated }: CreationCardsProps) {
  const [newItem, setNewItem] = useState<Record<string, any>>({});
  const [fields, setFields] = useState<string[]>([]);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);

  // Discover table fields from a sample row
  useEffect(() => {
    const fetchTableStructure = async () => {
      try {
        const data = await getTableData(tableName);
        if (data && data.length > 0) {
          const sampleRow = data[0];
          setFields(Object.keys(sampleRow).filter(k => k !== 'id'));
          
          // Initialize form with empty values
          const initialForm = Object.keys(sampleRow)
            .filter(key => key !== 'id')
            .reduce((obj, key) => {
              obj[key] = '';
              return obj;
            }, {} as Record<string, any>);
          
          setNewItem(initialForm);
        } else {
          // If no data exists, we can't infer structure
          toast.warning(
                        "No data available",
            {description: "Cannot determine table structure from empty table.",
          });
        }
      } catch (error) {
        toast.error("Error", {
          description: "Failed to fetch table structure.",
        });
      }
    };

    if (tableName) {
      fetchTableStructure();
    }
  }, [tableName, toast]);

  const handleFieldChange = (field: string, value: any) => {
    setNewItem(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCreateItem = async () => {
    try {
      await createRow(tableName, newItem);
      setIsSubmitDialogOpen(false);
      
      // Reset form
      const resetForm = fields.reduce((obj, key) => {
        obj[key] = '';
        return obj;
      }, {} as Record<string, any>);
      
      setNewItem(resetForm);
      onItemCreated();
      
      toast.success("Item created", {
        description: "New item has been successfully created.",
      });
    } catch (error) {
      toast.error("Creation failed",{
        description: "There was an error creating the new item.",
      });
    }
  };

  if (!tableName || fields.length === 0) {
    return null;
  }

  return (
    <>
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Create New Item</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>New {tableName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map(field => (
                <div key={field} className="space-y-2">
                  <Label htmlFor={field}>{field}</Label>
                  <Input
                    id={field}
                    value={newItem[field] || ''}
                    onChange={(e) => handleFieldChange(field, e.target.value)}
                    placeholder={`Enter ${field}`}
                  />
                </div>
              ))}
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={() => setIsSubmitDialogOpen(true)}
              >
                Create
              </Button>
            </CardFooter>
          </Card>
          
          {/* Add New Card */}
          <Card className="w-full h-full border-dashed flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
            <Button 
              variant="ghost" 
              className="w-full h-full flex flex-col items-center justify-center"
              onClick={() => setIsSubmitDialogOpen(true)}
            >
              <PlusCircle className="h-10 w-10 mb-2" />
              <span>Add Another</span>
            </Button>
          </Card>
        </div>
      </div>

      <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Creation</DialogTitle>
            <DialogDescription>
              Are you sure you want to create this new item?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {fields.map(field => (
              <div key={field} className="flex justify-between py-1">
                <span className="font-medium">{field}:</span>
                <span>{newItem[field]}</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubmitDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateItem}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}