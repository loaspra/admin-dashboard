"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { Checkbox } from "@/app/components/ui/checkbox"
import { Trash2, Pencil, Save, X, Search, Filter } from "lucide-react"
import { toast } from "sonner"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface DataTableProps {
  readonly tableName: string
  readonly data: readonly any[]
  readonly onDataChange: () => void
  readonly pagination?: {
    page: number
    pageSize: number
    total: number
    pageCount: number
  }
  readonly onPageChange?: (page: number) => void
  readonly onPageSizeChange?: (pageSize: number) => void
}

const JsonObjectEditor = ({ data, onChange }: { data: any; onChange: (data: any) => void }) => {
  // Don't use useEffect with onChange to avoid infinite loops

  if (!data || typeof data !== "object") {
    return <Input value={String(data || "")} onChange={(e) => onChange(e.target.value)} className="w-full" />
  }

  // Handle array case
  if (Array.isArray(data)) {
    return (
      <div className="space-y-2 p-2 border rounded-md">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="flex-grow">
              {typeof item === "object" && item !== null ? (
                <JsonObjectEditor
                  data={item}
                  onChange={(updatedItem) => {
                    const newArray = [...data]
                    newArray[index] = updatedItem
                    onChange(newArray)
                  }}
                />
              ) : (
                <Input
                  value={String(item || "")}
                  onChange={(e) => {
                    const newArray = [...data]
                    newArray[index] = e.target.value
                    onChange(newArray)
                  }}
                  className="w-full"
                />
              )}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                const newArray = [...data]
                newArray.splice(index, 1)
                onChange(newArray)
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => onChange([...data, ""])}>
          Add Item
        </Button>
      </div>
    )
  }

  // Handle object case
  return (
    <div className="space-y-2 p-2 border rounded-md">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="grid grid-cols-[1fr,2fr] gap-2">
          <Input
            value={key}
            onChange={(e) => {
              const newKey = e.target.value
              if (newKey === key) return

              const { [key]: oldValue, ...rest } = data
              onChange({
                ...rest,
                [newKey]: oldValue,
              })
            }}
            className="w-full"
          />
          {typeof value === "object" && value !== null ? (
            <JsonObjectEditor
              data={value}
              onChange={(updatedValue) => {
                onChange({
                  ...data,
                  [key]: updatedValue,
                })
              }}
            />
          ) : (
            <Input
              value={String(value || "")}
              onChange={(e) => {
                onChange({
                  ...data,
                  [key]: e.target.value,
                })
              }}
              className="w-full"
            />
          )}
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          onChange({
            ...data,
            "": "",
          })
        }
      >
        Add Property
      </Button>
    </div>
  )
}

const NestedTable = ({ data }: { data: any }) => {
  if (!data || typeof data !== "object") {
    return <div className="text-gray-500 italic">No data</div>
  }

  // For arrays of primitives (strings, numbers, etc.) just show comma-separated list
  if (Array.isArray(data) && data.length > 0 && typeof data[0] !== "object") {
    return <div className="text-sm">{data.join(", ")}</div>
  }

  // Handle single object case (not in an array)
  if (!Array.isArray(data)) {
    // Check if it's a simple object with few properties
    const entries = Object.entries(data)
    if (entries.length <= 3) {
      return (
        <div className="text-sm space-y-1">
          {entries.map(([key, value]) => (
            <div key={key} className="flex">
              <span className="font-medium mr-1">{key}:</span>
              <span className="truncate">
                {typeof value === "object" && value !== null 
                  ? JSON.stringify(value).substring(0, 20) + "..." 
                  : String(value)}
              </span>
            </div>
          ))}
        </div>
      )
    }
    
    const nestedData = [data] // Convert to array for consistent handling
    const columns = Object.keys(nestedData[0]).slice(0, 3) // Only show first 3 columns

    return (
      <div className="border rounded-md p-1 text-xs">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column} className="p-1 text-xs">{column}</TableHead>
              ))}
              {Object.keys(nestedData[0]).length > 3 && (
                <TableHead className="p-1 text-xs">...</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              {columns.map((column) => (
                <TableCell key={column} className="p-1">
                  {typeof nestedData[0][column] === "object" && nestedData[0][column] !== null 
                    ? "..." 
                    : String(nestedData[0][column] ?? "")}
                </TableCell>
              ))}
              {Object.keys(nestedData[0]).length > 3 && (
                <TableCell className="p-1 text-xs">...</TableCell>
              )}
            </TableRow>
          </TableBody>
        </Table>
      </div>
    )
  }

  // Handle array case
  if (data.length === 0 || (data.length === 1 && data[0] === null)) {
    return <div className="text-gray-500 italic">Empty</div>
  }

  // Get columns from the first non-null item
  const firstValidItem = data.find((item) => item !== null && typeof item === "object")
  if (!firstValidItem) {
    return <div className="text-sm">{data.map((item) => String(item)).join(", ")}</div>
  }

  // Only display first 3 columns and limit to 2 rows for compact display
  const columns = Object.keys(firstValidItem).slice(0, 3)
  const displayData = data.slice(0, 2)

  return (
    <div className="border rounded-md p-1 text-xs">
      <Table>
        <TableHeader className="bg-gray-50">
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column} className="p-1 text-xs">{column}</TableHead>
            ))}
            {Object.keys(firstValidItem).length > 3 && (
              <TableHead className="p-1 text-xs">...</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayData.map((row: any, index: number) =>
            row && typeof row === "object" ? (
              <TableRow key={index}>
                {columns.map((column) => (
                  <TableCell key={column} className="p-1">
                    {typeof row[column] === "object" && row[column] !== null
                      ? "..." 
                      : String(row[column] ?? "")}
                  </TableCell>
                ))}
                {Object.keys(firstValidItem).length > 3 && (
                  <TableCell className="p-1">...</TableCell>
                )}
              </TableRow>
            ) : (
              <TableRow key={index}>
                <TableCell colSpan={columns.length} className="p-1">{String(row)}</TableCell>
              </TableRow>
            ),
          )}
          {data.length > 2 && (
            <TableRow>
              <TableCell colSpan={columns.length + (Object.keys(firstValidItem).length > 3 ? 1 : 0)} className="p-1 text-center text-gray-500">
                +{data.length - 2} more items
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export function DataTable({ 
  tableName, 
  data, 
  onDataChange, 
  pagination, 
  onPageChange, 
  onPageSizeChange 
}: DataTableProps) {
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [editingRow, setEditingRow] = useState<string | null>(null)
  const [editData, setEditData] = useState<any>({})
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | string[]>("")
  // Use client-side pagination only if server-side pagination is not provided
  const [currentPage, setCurrentPage] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  // Filtering state
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [searchTerm, setSearchTerm] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  // Column formatting and display names
  const columnDisplayNames: Record<string, string> = {
    name: "Name",
    description: "Description",
    price: "Price ($)",
    stock: "Stock",
    images: "Images",
    tags: "Tags",
    productType: "Product Type",
    createdAt: "Created Date",
    updatedAt: "Updated Date",
    featured: "Featured",
    isCustomizable: "Customizable",
    categoryId: "Category ID",
    collectionId: "Collection",
    designerId: "Designer",
    SweatshirtDetails: "Sweatshirt Details",
    PoloShirtDetails: "Polo Details",
    CapDetails: "Cap Details",
    ThermosDetails: "Thermos Details",
    StickerDetails: "Sticker Details",
    StickerSheetDetails: "Sticker Sheet Details"
  };

  // Format cell values for display
  const formatCellValue = (column: string, value: any): string => {
    if (value === null || value === undefined) return "";
    
    if (column === "price") {
      return `$${Number(value).toFixed(2)}`;
    }
    
    if (column === "createdAt" || column === "updatedAt") {
      return new Date(value).toLocaleDateString();
    }
    
    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }
    
    return String(value);
  };

  if (!data) {
    return (
      <div className="text-center py-4">
        <div>No data available</div>
        <Button onClick={() => setEditingRow("new")}>Add New Item</Button>
      </div>
    )
  }

  if (data.length === 0) {
    return <div className="text-center py-4">No data available</div>
  }

  const columns = Object.keys(data[0]).filter((col) => col !== "id") // Exclude 'id' column
  
  // Use either server-side or client-side pagination
  const useServerPagination = !!pagination && !!onPageChange
  
  // Apply filters for client-side filtering
  const filteredData = data.filter(row => {
    // First check if the row matches all active filters
    const matchesFilters = Object.entries(filters).every(([field, value]) => {
      if (!value) return true; // Skip empty filters
      
      const fieldValue = String(row[field] || '').toLowerCase();
      return fieldValue.includes(value.toLowerCase());
    });
    
    // Then check if the row matches the search term (across all fields)
    if (!searchTerm) return matchesFilters;
    
    // Search across all visible columns
    return matchesFilters && columns.some(column => {
      const cellValue = String(row[column] || '').toLowerCase();
      return cellValue.includes(searchTerm.toLowerCase());
    });
  });
  
  // For client-side pagination only
  const pageCount = useServerPagination 
    ? pagination!.pageCount 
    : Math.ceil(filteredData.length / itemsPerPage)
    
  const paginatedData = useServerPagination 
    ? data // Server handles pagination, we just use the data as is
    : filteredData.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)

  const handleSelectRow = (id: string) => {
    setSelectedRows((prev) => (prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]))
  }

  const handleSelectAllRows = () => {
    if (selectedRows.length === data.length) {
      setSelectedRows([])
    } else {
      setSelectedRows(data.map((row) => row.id))
    }
  }

  const handleEditClick = (row: any) => {
    setEditingRow(row.id)
    setEditData({ ...row })
  }

  const handleSaveEdit = async () => {
    try {
      console.log('edit data: ', JSON.stringify(editData));
      // Create a deep copy of the edit data to avoid reference issues
      const editDataCopy = JSON.parse(JSON.stringify(editData));

      // Extract detail data - find the first non-null details object
      const detailTypes = [
        'CapDetails', 
        'SweatshirtDetails', 
        'PoloShirtDetails', 
        'ThermosDetails', 
        'StickerDetails', 
        'StickerSheetDetails'
      ];
      
      let detailData = null;
      for (const detailType of detailTypes) {
        if (editDataCopy[detailType]) {
          detailData = editDataCopy[detailType];
          break;
        }
      }

      // Remove all detail objects from the editData copy
      detailTypes.forEach(detailType => {
        delete editDataCopy[detailType];
      });

      // Extract the id and remove it from the object
      const id = editDataCopy.id;
      delete editDataCopy.id;

      console.log('Product data:', editDataCopy);
      console.log('Detail data:', detailData);

      const response = await fetch(`/api/products`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: id,
          productData: editDataCopy,
          detailData: detailData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update product");
      }

      setEditingRow(null);
      onDataChange();
      toast.success("Product updated", {
        description: "The product has been successfully updated.",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error("Update failed", {
        description: errorMessage,
      });

      console.error(error);
    }
  };

  const handleCancelEdit = () => {
    setEditingRow(null)
    setEditData({})
  }

  const handleDeleteClick = (id: string) => {
    setDeleteTarget(id)
    setIsDeleteDialogOpen(true)
  }

  const handleBulkDeleteClick = () => {
    if (selectedRows.length === 0) return
    setDeleteTarget(selectedRows)
    setIsDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    try {
      if (Array.isArray(deleteTarget)) {
        // Bulk delete
        await Promise.all(
          deleteTarget.map((id) =>
            fetch(`/api/products`, {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ productId: id }),
            }),
          ),
        )
        setSelectedRows([])
      } else {
        // Single delete
        await fetch(`/api/products`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ productId: deleteTarget }),
        })
      }

      setIsDeleteDialogOpen(false)
      onDataChange()

      toast.success(`Successfully deleted ${Array.isArray(deleteTarget) ? deleteTarget.length + " rows" : "1 row"}`, {
        description: "The data has been permanently removed.",
      })
    } catch (error) {
      toast.error("Delete failed", {
        description: "There was an error deleting the data.",
      })

      console.log(error)
    }
  }

  const handleEditField = (field: string, value: any) => {
    // If the field contains a dot notation, it's a nested property
    if (field.includes(".")) {
      const [parentField, childField] = field.split(".")
      setEditData((prev: any) => ({
        ...prev,
        [parentField]: {
          ...prev[parentField],
          [childField]: value,
        },
      }))
    } else {
      setEditData((prev: any) => ({
        ...prev,
        [field]: value,
      }))
    }
  }

  const handlePageChange = (page: number) => {
    if (useServerPagination && onPageChange) {
      onPageChange(page)
    } else {
      setCurrentPage(page)
    }
  }
  
  const handlePageSizeChange = (size: number) => {
    if (useServerPagination && onPageSizeChange) {
      onPageSizeChange(size)
    } else {
      setItemsPerPage(size)
      setCurrentPage(0) // Reset to first page when changing items per page
    }
  }

  // Handle filter changes
  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Reset pagination when filter changes
    if (!useServerPagination) {
      setCurrentPage(0);
    }
    
    // For server-side filtering, we would call the API here
    // This is a placeholder for future implementation
    if (useServerPagination && onPageChange) {
      // Ideally, pass filters to the server
      // onFilterChange(filters);
      // For now, just reset to first page
      onPageChange(0);
    }
  };
  
  const clearFilters = () => {
    setFilters({});
    setSearchTerm("");
    if (!useServerPagination) {
      setCurrentPage(0);
    } else if (onPageChange) {
      onPageChange(0);
    }
  };

  return (
    <>
      {/* Search and Filter */}
      <div className="mb-4 space-y-2">
        <div className="flex justify-between items-center">
          <div className="flex-1 relative">
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (!useServerPagination) {
                  setCurrentPage(0);
                }
              }}
              className="pl-8"
            />
            <Search className="absolute left-2 top-2 h-4 w-4 text-gray-400" />
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-2" 
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-1" />
            Filters
          </Button>
          {Object.keys(filters).length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="ml-2" 
              onClick={clearFilters}
            >
              Clear
            </Button>
          )}
        </div>
        
        {/* Active filters */}
        {Object.keys(filters).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {Object.entries(filters).map(([field, value]) => 
              value && (
                <Badge key={field} variant="outline" className="flex items-center">
                  {field}: {value}
                  <X 
                    className="h-3 w-3 ml-1 cursor-pointer" 
                    onClick={() => handleFilterChange(field, "")}
                  />
                </Badge>
              )
            )}
          </div>
        )}
        
        {/* Filter selectors */}
        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 p-2 border rounded-md">
            {columns.map(column => (
              <div key={column} className="space-y-1">
                <label className="text-xs font-medium">{columnDisplayNames[column] || column}</label>
                <Input
                  placeholder={`Filter ${columnDisplayNames[column] || column}...`}
                  value={filters[column] || ""}
                  onChange={(e) => handleFilterChange(column, e.target.value)}
                  className="w-full h-8 text-sm"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-gray-50">
            <TableRow>
              <TableHead className="w-12">
                <Checkbox checked={selectedRows.length === data.length} onCheckedChange={handleSelectAllRows} />
              </TableHead>
              {columns.map((column) => (
                <TableHead key={column}>{columnDisplayNames[column] || column}</TableHead>
              ))}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((row) => (
              <TableRow key={row.id} className={selectedRows.includes(row.id) ? "bg-gray-100" : ""}>
                <TableCell>
                  <Checkbox checked={selectedRows.includes(row.id)} onCheckedChange={() => handleSelectRow(row.id)} />
                </TableCell>
                {columns.map((column) => (
                  <TableCell key={column} className="max-w-[200px] truncate">
                    {(() => {
                      if (editingRow === row.id) {
                        if (typeof row[column] === "object" && row[column] !== null) {
                          return (
                            <JsonObjectEditor
                              data={editData[column] || {}}
                              onChange={(updatedData) => handleEditField(column, updatedData)}
                            />
                          )
                        }
                        return (
                          <Input
                            value={editData[column] || ""}
                            onChange={(e) => handleEditField(column, e.target.value)}
                            className="w-full"
                          />
                        )
                      }

                      if (typeof row[column] === "object" && row[column] !== null) {
                        return <div className="max-h-[150px] overflow-auto"><NestedTable data={row[column]} /></div>
                      }

                      return formatCellValue(column, row[column]);
                    })()}
                  </TableCell>
                ))}
                <TableCell className="text-right">
                  {editingRow === row.id ? (
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" size="icon" onClick={handleSaveEdit}>
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={handleCancelEdit}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" size="icon" onClick={() => handleEditClick(row)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => handleDeleteClick(row.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex items-center space-x-2">
          <select
            value={useServerPagination ? pagination!.pageSize : itemsPerPage}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="border p-1 rounded"
          >
            {[5, 10, 25, 50].map(size => (
              <option key={size} value={size}>
                {size} per page
              </option>
            ))}
          </select>
          <span>
            Page {useServerPagination ? pagination!.page + 1 : currentPage + 1} of {pageCount || 1}
          </span>
          {useServerPagination && (
            <span className="text-sm text-gray-500">
              (Total: {pagination!.total} items)
            </span>
          )}
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(0)}
            disabled={useServerPagination ? pagination!.page === 0 : currentPage === 0}
          >
            First
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(useServerPagination ? pagination!.page - 1 : currentPage - 1)}
            disabled={useServerPagination ? pagination!.page === 0 : currentPage === 0}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(useServerPagination ? pagination!.page + 1 : currentPage + 1)}
            disabled={useServerPagination 
              ? pagination!.page === pagination!.pageCount - 1 || pagination!.pageCount === 0 
              : currentPage === pageCount - 1 || pageCount === 0}
          >
            Next
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pageCount - 1)}
            disabled={useServerPagination 
              ? pagination!.page === pagination!.pageCount - 1 || pagination!.pageCount === 0 
              : currentPage === pageCount - 1 || pageCount === 0}
          >
            Last
          </Button>
        </div>
      </div>

      {selectedRows.length > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {selectedRows.length} {selectedRows.length === 1 ? "item" : "items"} selected
          </div>
          <Button variant="destructive" size="sm" onClick={handleBulkDeleteClick}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Selected
          </Button>
        </div>
      )}

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {Array.isArray(deleteTarget) ? deleteTarget.length : "1"}{" "}
              {Array.isArray(deleteTarget) && deleteTarget.length > 1 ? "items" : "item"}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

