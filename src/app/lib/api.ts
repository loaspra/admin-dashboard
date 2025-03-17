// Client-side API functions

export async function getTableNames() {
  const response = await fetch('/api/tables');
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch table names');
  }
  return await response.json();
}

export async function getTableData(tableName: string) {
  const response = await fetch(`/api/tables/${tableName}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Failed to fetch data from ${tableName}`);
  }
  return await response.json();
}

export async function createRow(tableName: string, data: any) {
  const response = await fetch(`/api/tables/${tableName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Failed to create record in ${tableName}`);
  }
  
  return await response.json();
}

export async function updateRow(tableName: string, id: string, data: any) {
  const response = await fetch(`/api/tables/${tableName}/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Failed to update record in ${tableName}`);
  }
  
  return await response.json();
}

export async function deleteRow(tableName: string, id: string) {
  const response = await fetch(`/api/tables/${tableName}/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Failed to delete record from ${tableName}`);
  }
  
  return true;
}