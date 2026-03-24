import { ReactNode } from "react";

type FeatureCardProps = {
  title: string;
  description: string;
  icon: ReactNode;
};

export function FeatureCard({ title, description, icon }: FeatureCardProps) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-3 inline-flex rounded-lg bg-zinc-100 p-2 text-zinc-700">
        {icon}
      </div>
      <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-600">{description}</p>
    </article>
  );
}
