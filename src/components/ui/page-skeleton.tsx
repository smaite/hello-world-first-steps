import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

/** Skeleton for table-based pages (Customers, Staff, Credits) */
export const TableSkeleton = ({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) => (
  <>
    {Array.from({ length: rows }).map((_, i) => (
      <tr key={i} className="border-b">
        {Array.from({ length: cols }).map((_, j) => (
          <td key={j} className="p-4">
            <Skeleton className={`h-4 ${j === 0 ? 'w-32' : j === cols - 1 ? 'w-16' : 'w-24'}`} />
          </td>
        ))}
      </tr>
    ))}
  </>
);

/** Skeleton for card-list pages (Transactions, Expenses, Receivings) */
export const CardListSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="space-y-6">
    {/* Date group header skeleton */}
    <div className="flex items-center gap-3">
      <Skeleton className="h-4 w-36" />
      <div className="flex-1 h-px bg-border" />
      <Skeleton className="h-3 w-20" />
    </div>
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4 rounded-xl border">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      ))}
    </div>
  </div>
);

/** Skeleton for summary stat cards */
export const StatCardsSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className={`grid grid-cols-2 md:grid-cols-${count} gap-3`}>
    {Array.from({ length: count }).map((_, i) => (
      <Card key={i} className="border-l-4 border-l-muted">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-6 w-28" />
        </CardContent>
      </Card>
    ))}
  </div>
);

/** Skeleton for grid-card pages (BankAccounts) */
export const GridCardSkeleton = ({ count = 3 }: { count?: number }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <Card key={i}>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-6 w-28" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16 rounded" />
            <Skeleton className="h-8 w-16 rounded" />
          </div>
        </CardContent>
      </Card>
    ))}
  </>
);

/** Skeleton for full-page form loading (CashTracker, Settings) */
export const FormSkeleton = () => (
  <div className="max-w-4xl mx-auto space-y-6">
    <div className="space-y-2">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-4 w-56" />
    </div>
    <Card>
      <CardContent className="p-6 space-y-4">
        <Skeleton className="h-5 w-32" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-10 rounded" />
          <Skeleton className="h-10 rounded" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-10 rounded" />
          <Skeleton className="h-10 rounded" />
        </div>
        <Skeleton className="h-10 w-32 rounded" />
      </CardContent>
    </Card>
  </div>
);
