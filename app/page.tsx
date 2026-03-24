import { FeatureCard } from "@/components/home/feature-card";
import { Folders, Sparkles, Wind } from "lucide-react";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-16 sm:px-10">
      <section className="max-w-2xl space-y-5">
        <p className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1 text-sm text-zinc-600">
          <Sparkles className="h-4 w-4" />
          Next.js Starter
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
          Ship your next idea with Tailwind and Lucide.
        </h1>
        <p className="text-base leading-7 text-zinc-600 sm:text-lg">
          This project is ready to build on with App Router, utility-first
          styling, and icon components out of the box.
        </p>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FeatureCard
          title="Organized Structure"
          description="Start with dedicated folders for app routes, reusable UI components, and shared utilities."
          icon={<Folders className="h-5 w-5" />}
        />
        <FeatureCard
          title="Tailwind CSS"
          description="Compose clean responsive layouts quickly with Tailwind utility classes."
          icon={<Wind className="h-5 w-5" />}
        />
        <FeatureCard
          title="Lucide React"
          description="Use lightweight SVG icons as React components with easy styling."
          icon={<Sparkles className="h-5 w-5" />}
        />
      </section>
    </main>
  );
}
