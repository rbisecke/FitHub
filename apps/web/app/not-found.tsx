import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full font-mono">
        <div className="border border-border rounded-lg p-8 space-y-6">
          <div className="space-y-1 text-muted-foreground text-sm">
            <p>$ git checkout this-page</p>
            <p className="text-destructive">
              error: pathspec &apos;this-page&apos; did not match any file(s)
              known to git
            </p>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              404 — pathspec not found
            </h1>
            <p className="text-muted-foreground text-sm">
              This route doesn&apos;t exist in the working tree.
            </p>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Suggestions:</p>
            <ul className="list-none space-y-1 pl-2">
              <li>
                <span className="text-green-500">hint:</span> Check the URL for
                typos
              </li>
              <li>
                <span className="text-green-500">hint:</span> Return to a known
                branch
              </li>
            </ul>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            $ git checkout main
          </Link>
        </div>
      </div>
    </div>
  );
}
