'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <div>
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <p className="text-muted-foreground mt-2">
            An unexpected error occurred. Please try again.
          </p>
        </div>
        <Button onClick={() => reset()}>Try again</Button>
      </div>
    </div>
  );
}
