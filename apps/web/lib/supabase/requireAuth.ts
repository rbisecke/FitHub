import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AuthContext {
  user: {
    id: string;
    email: string | undefined;
  };
  token: string;
}

export async function requireAuth(): Promise<AuthContext> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) redirect("/login");

  // getSession() here is safe — used only to retrieve the token string;
  // identity is already validated by getUser() above.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/login");

  return {
    user: {
      id: user.id,
      email: user.email,
    },
    token: session.access_token,
  };
}
