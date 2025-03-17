'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { TableSelector } from './table-selector';
import { DataTable } from './data-table';
import { CreationCards } from './creation-cards';
import { Button } from '@/app/components/ui/button';
import { toast } from 'sonner'
import { getTableData } from '@/app/lib/supabase';
import { LogOut } from 'lucide-react';

export default function Dashboard() {
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableData, setTableData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user, logout } = useAuth();

  const fetchTableData = async () => {
    if (!selectedTable) return;
    
    setIsLoading(true);
    try {
      const data = await getTableData(selectedTable);
      setTableData(data);
    } catch (error) {
      toast.error("Failed to load data", {
        description: `Could not load data for table: ${selectedTable}`,
      });

      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTableData();
  }, [selectedTable]);

  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName);
  };

  const handleDataChange = () => {
    fetchTableData();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              Logged in as: {user?.email}
            </span>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <TableSelector onSelectTable={handleTableSelect} />
          
          {selectedTable && (
            <div className="mt-4 space-y-8">
              <div>
                <h2 className="text-xl font-semibold mb-4">Data Table: {selectedTable}</h2>
                {isLoading ? (
                  <div className="text-center py-8">Loading data...</div>
                ) : (
                  <DataTable 
                    tableName={selectedTable} 
                    data={tableData}
                    onDataChange={handleDataChange}
                  />
                )}
              </div>
              
              <CreationCards 
                tableName={selectedTable}
                onItemCreated={handleDataChange}
              />
            </div>
          )}
          
          {!selectedTable && (
            <div className="text-center py-12">
              <h2 className="text-xl font-medium text-gray-600">
                Select a table to get started
              </h2>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}