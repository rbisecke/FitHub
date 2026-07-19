"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  exampleFormSchema,
  exampleFormDefaults,
  type ExampleFormValues,
} from "@/lib/forms/example-schema";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * Scaffold route — worked example of the RHF + Zod v4 form convention (0.21).
 * Delete once real domain forms establish the pattern in later Efforts.
 */
export default function FormExamplePage() {
  const form = useForm<ExampleFormValues>({
    resolver: zodResolver(exampleFormSchema),
    defaultValues: exampleFormDefaults,
    mode: "onBlur",
  });

  function onSubmit(values: ExampleFormValues) {
    toast.success(`Saved ${values.displayName} (${values.unit})`);
  }

  return (
    <main
      className="min-h-screen p-6"
      style={{ background: "var(--bg)", color: "var(--text)" }}
    >
      <div className="mx-auto max-w-md">
        <h1 className="type-h1 mb-6">Form convention</h1>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-5"
          >
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display name</FormLabel>
                  <FormControl>
                    <Input placeholder="Dana" {...field} />
                  </FormControl>
                  <FormDescription>Shown on your profile.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Save</Button>
          </form>
        </Form>
      </div>
    </main>
  );
}
