import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AuthContext {
  user: {
    id: string;
    email: string | undefined;
  };
  token: string;
}

/**
 * Call at the top of any Server Component that requires authentication.
 * Uses a single getSession() call — avoids the double round trip from
 * calling getUser() + getSession() separately.
 * Redirects to /login if the session is missing or expired.
 */
export async function requireAuth(): Promise<AuthContext> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/login");

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
    },
    token: session.access_token,
  };
}
