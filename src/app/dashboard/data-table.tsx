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
import { Trash2, Pencil, Save, X } from "lucide-react"
import { toast } from "sonner"

interface DataTableProps {
  readonly tableName: string
  readonly data: readonly any[]
  readonly onDataChange: () => void
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
    return <div>No nested data available</div>
  }

  // Handle single object case (not in an array)
  if (!Array.isArray(data)) {
    const nestedData = [data] // Convert to array for consistent handling
    const columns = Object.keys(nestedData[0])

    return (
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column}>{column}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            {columns.map((column) => (
              <TableCell key={column}>
                {typeof nestedData[0][column] === "object" && nestedData[0][column] !== null ? (
                  <NestedTable data={nestedData[0][column]} />
                ) : (
                  String(nestedData[0][column] ?? "")
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
    )
  }

  // Handle array case
  if (data.length === 0 || (data.length === 1 && data[0] === null)) {
    return <div>No nested data available</div>
  }

  // Get columns from the first non-null item
  const firstValidItem = data.find((item) => item !== null && typeof item === "object")
  if (!firstValidItem) {
    return <div>{data.map((item) => String(item)).join(", ")}</div>
  }

  const columns = Object.keys(firstValidItem)

  return (
    <div className="max-h-[300px] overflow-auto border rounded-md">
      <Table>
        <TableHeader className="sticky top-0 bg-white dark:bg-gray-950">
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column}>{column}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row: any, index: number) =>
            row && typeof row === "object" ? (
              <TableRow key={index}>
                {columns.map((column) => (
                  <TableCell key={column}>
                    {typeof row[column] === "object" && row[column] !== null ? (
                      <NestedTable data={row[column]} />
                    ) : (
                      String(row[column] ?? "")
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ) : (
              <TableRow key={index}>
                <TableCell colSpan={columns.length}>{String(row)}</TableCell>
              </TableRow>
            ),
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export function DataTable({ tableName, data, onDataChange }: DataTableProps) {
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [editingRow, setEditingRow] = useState<string | null>(null)
  const [editData, setEditData] = useState<any>({})
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | string[]>("")

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
      // Create a deep copy of the edit data to avoid reference issues
      const editDataCopy = JSON.parse(JSON.stringify(editData))

      // Extract detail data
      const detailData =
        editDataCopy.DetalleGorra || editDataCopy.DetallePolera || editDataCopy.DetallePolo || editDataCopy.DetalleTermo

      // After extracting detailData, remove it from the editData object
      delete editDataCopy.DetalleGorra
      delete editDataCopy.DetallePolera
      delete editDataCopy.DetallePolo
      delete editDataCopy.DetalleTermo

      const response = await fetch(`/api/products`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: editDataCopy.id,
          productData: editDataCopy,
          detailData: detailData,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update product")
      }

      setEditingRow(null)
      onDataChange()
      toast.success("Row updated", {
        description: "The row has been successfully updated.",
      })
    } catch (error) {
      toast.error("Update failed", {
        description: "There was an error updating the row.",
      })

      console.error(error)
    }
  }

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

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox checked={selectedRows.length === data.length} onCheckedChange={handleSelectAllRows} />
              </TableHead>
              {columns.map((column) => (
                <TableHead key={column}>{column}</TableHead>
              ))}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.id} className={selectedRows.includes(row.id) ? "bg-gray-100" : ""}>
                <TableCell>
                  <Checkbox checked={selectedRows.includes(row.id)} onCheckedChange={() => handleSelectRow(row.id)} />
                </TableCell>
                {columns.map((column) => (
                  <TableCell key={column}>
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
                        return <NestedTable data={row[column]} />
                      }

                      return String(row[column] ?? "")
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

