import { Skeleton } from "@/components/ui/skeleton";

export function SpotCardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl overflow-hidden shadow-sm bg-white dark:bg-[#1e2a32] border border-gray-200 dark:border-gray-800">
      <Skeleton className="aspect-[4/3] w-full" />
      <div className="p-4">
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}
