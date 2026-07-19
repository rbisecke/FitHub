import { redirect } from "next/navigation";

/**
 * Bare movement route redirects to the About tab (01 §9 — path-segment tabs).
 */
export default async function MovementRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/movements/${slug}/about`);
}
