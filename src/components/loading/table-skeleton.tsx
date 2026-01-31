import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface TableSkeletonProps {
  title?: string
  showFilters?: boolean
  showActions?: boolean
  rows?: number
  columns?: number
}

export function TableSkeleton({ 
  title = "Data Table",
  showFilters = true,
  showActions = true,
  rows = 5,
  columns = 6
}: TableSkeletonProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        {showActions && (
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="border">
          <CardHeader>
            <Skeleton className="h-6 w-24" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-24" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className="border">
        <CardContent className="p-0">
          <div className="space-y-4 p-6">
            {/* Table Header */}
            <div className="flex space-x-4">
              {Array.from({ length: columns }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-24 flex-1" />
              ))}
            </div>
            
            {/* Table Rows */}
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="flex space-x-4">
                {Array.from({ length: columns }).map((_, j) => (
                  <Skeleton key={j} className="h-4 w-20 flex-1" />
                ))}
              </div>
            ))}
          </div>
          
          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <Skeleton className="h-4 w-32" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}