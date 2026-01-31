import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface FormSkeletonProps {
  title?: string
  fields?: number
  showTabs?: boolean
  tabCount?: number
}

export function FormSkeleton({ 
  title = "Form",
  fields = 6,
  showTabs = false,
  tabCount = 4
}: FormSkeletonProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      <Card className="border">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          {/* Tabs */}
          {showTabs && (
            <div className="space-y-4">
              <div className="flex space-x-1">
                {Array.from({ length: tabCount }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-16" />
                ))}
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {Array.from({ length: fields }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>

          {/* Large Text Area */}
          <div className="space-y-2 mt-6">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-24 w-full" />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 mt-6">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-24" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}