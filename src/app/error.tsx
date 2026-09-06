"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">Something went wrong</CardTitle>
          <CardDescription>
            The page couldn&apos;t be loaded. Trying again often works.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* The digest is what ties this to the entry in the server logs.
              The message itself stays out of the page: in production it can
              carry internals the visitor has no business seeing. */}
          {error.digest && (
            <p className="rounded-md bg-muted p-3 font-mono text-xs text-muted-foreground">
              Reference: {error.digest}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={reset} className="flex-1">
              Try again
            </Button>
            <Link
              href="/"
              className={cn(buttonVariants({ variant: "outline" }), "flex-1")}
            >
              Back to home
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
