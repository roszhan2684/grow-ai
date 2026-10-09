import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="font-mono text-[12px] text-muted">404 · no node with that id</p>
      <h1 className="font-display text-3xl font-semibold">This path doesn&apos;t exist in the graph.</h1>
      <Link href="/" className="text-[14px] font-medium text-accent hover:underline">
        Back to GROW AI →
      </Link>
    </div>
  );
}
