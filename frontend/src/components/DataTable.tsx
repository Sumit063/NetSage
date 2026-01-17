import { ReactNode } from 'react'
import { Table, Tbody, Td, Th, Thead, Tr } from './ui/table'
import { cn } from '../lib/utils'

export type DataTableColumn<T> = {
  key: string
  header: ReactNode
  cell: (row: T, index: number) => ReactNode
  headerClassName?: string
  cellClassName?: string
}

type DataTableProps<T> = {
  data: T[]
  columns: DataTableColumn<T>[]
  emptyLabel?: string
  rowKey?: (row: T, index: number) => string | number
  onRowClick?: (row: T, index: number) => void
  rowClassName?: (row: T, index: number) => string
  tableClassName?: string
  containerClassName?: string
}

export function DataTable<T>({
  data,
  columns,
  emptyLabel = 'No data available.',
  rowKey,
  onRowClick,
  rowClassName,
  tableClassName,
  containerClassName
}: DataTableProps<T>) {
  return (
    <Table className={tableClassName} containerClassName={containerClassName}>
      <Thead>
        <Tr>
          {columns.map((column) => (
            <Th key={column.key} className={column.headerClassName}>
              {column.header}
            </Th>
          ))}
        </Tr>
      </Thead>
      <Tbody>
        {data.length ? (
          data.map((row, index) => (
            <Tr
              key={rowKey ? rowKey(row, index) : index}
              onClick={onRowClick ? () => onRowClick(row, index) : undefined}
              className={cn(onRowClick && 'cursor-pointer', rowClassName?.(row, index))}
            >
              {columns.map((column) => (
                <Td key={column.key} className={column.cellClassName}>
                  {column.cell(row, index)}
                </Td>
              ))}
            </Tr>
          ))
        ) : (
          <Tr>
            <Td colSpan={columns.length} className="px-3 py-6 text-center text-xs text-muted-foreground">
              {emptyLabel}
            </Td>
          </Tr>
        )}
      </Tbody>
    </Table>
  )
}
