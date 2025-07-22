import { Loader2 } from 'lucide-react';

export function ListFooterLoader() {
  return (
    <div className="flex justify-center items-center py-4">
    <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
    </div>
  );
}