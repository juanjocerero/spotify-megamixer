import { cn } from '@/lib/utils';

export function PlaylistItemSkeleton() {
  return (
    <div
    className={cn(
      'flex w-full items-center border-b border-gray-800 px-4 py-2 h-[76px] animate-pulse'
    )}
    >
    {/* Avatar Skeleton */}
    <div className="py-2 w-[60px] sm:w-[80px] flex-shrink-0 pr-4">
    <div className="h-12 w-12 rounded-full bg-gray-700"></div>
    </div>
    
    {/* Name & Owner Skeleton */}
    <div className="font-medium py-2 flex-grow min-w-0 px-4 space-y-2">
    <div className="h-4 bg-gray-700 rounded w-3/4"></div>
    <div className="h-3 bg-gray-700 rounded w-1/2 sm:hidden"></div>
    </div>
    
    {/* Owner Skeleton (Desktop) */}
    <div className="hidden sm:flex items-center px-4 py-2 w-[120px] flex-shrink-0">
    <div className="h-4 bg-gray-700 rounded w-full"></div>
    </div>
    
    {/* Track Count Skeleton */}
    <div className="px-4 py-2 w-[80px] sm:w-[100px] flex-shrink-0 flex justify-end">
    <div className="h-4 bg-gray-700 rounded w-1/2"></div>
    </div>
    
    {/* Menu Skeleton */}
    <div className="px-4 py-2 w-[50px] flex-shrink-0">
    <div className="h-8 w-8 rounded-md bg-gray-700"></div>
    </div>
    </div>
  );
}