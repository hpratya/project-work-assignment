import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <>
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <span className="text-lg font-semibold">Project Work Assignment</span>
          <nav>
            <Link href="/health" className="text-sm text-muted-foreground hover:text-foreground">
              Health check
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 py-16 text-center sm:px-6 sm:py-24">
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
            Next.js + Supabase Starter
          </h1>
          <p className="max-w-2xl text-balance text-muted-foreground sm:text-lg">
            A minimal, mobile-first starter built with Next.js App Router,
            TypeScript, Tailwind CSS, shadcn/ui, and Supabase.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/health" className={cn(buttonVariants())}>
              Check Supabase connection
            </Link>
            <a
              href="https://supabase.com/docs"
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Read the docs
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-5xl px-4 py-6 text-center text-sm text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} Project Work Assignment. All rights reserved.
        </div>
      </footer>
    </>
  );
}
