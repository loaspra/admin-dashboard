'use client';

import { useState, useEffect } from 'react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/app/components/ui/dropdown-menu';
import { Button } from '@/app/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { getTableNames } from '@/app/lib/api';import { toast } from 'sonner';

interface TableSelectorProps {
  onSelectTable: (tableName: string) => void;
}

export function TableSelector({ onSelectTable }: Readonly<TableSelectorProps>) {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');

  useEffect(() => {
    const fetchTables = async () => {
      try {
        const tableNames = await getTableNames();
        // Use the exact table name from the API
        setTables(tableNames.map((table: { table_name: string }) => table.table_name));
      } catch (error) {
        toast.error("Failed to load tables", {
          description: "There was an error loading the database tables.",
        });
        console.error(error);
      }
    };

    fetchTables();
  }, []);

  const handleSelectTable = (tableName: string) => {
    setSelectedTable(tableName);
    onSelectTable(tableName);
  };

  return (
    <div className="flex items-center space-x-4 mb-4">
      <span className="font-medium text-gray-700">Select Table:</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="min-w-[180px] justify-between">
            {selectedTable || 'Select a table'}
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {tables.map((table) => (
            <DropdownMenuItem 
              key={table} 
              onClick={() => handleSelectTable(table)}
            >
              {table}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}