import { z } from "zod";

/**
 * Worked-example schema for the RHF + Zod v4 form convention (0.21). Real domain
 * schemas live with their domain in later Efforts; this one exercises v4 syntax
 * (`z.email()`, `z.enum`, chained refinements) so the convention has a testable reference.
 */
export const exampleFormSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(40, "Name must be 40 characters or fewer"),
  email: z.email("Enter a valid email"),
  unit: z.enum(["kg", "lb"]),
});

export type ExampleFormValues = z.infer<typeof exampleFormSchema>;

export const exampleFormDefaults: ExampleFormValues = {
  displayName: "",
  email: "",
  unit: "kg",
};
