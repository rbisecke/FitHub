import { notFound } from "next/navigation";

export default function TestErrorPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  throw new Error("Intentional test error — do not use in production");
}
