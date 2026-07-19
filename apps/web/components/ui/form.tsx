"use client";

import * as React from "react";
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

/**
 * Form-wrapper convention (0.21, 09 §6) — React Hook Form + Zod v4.
 *
 * Mirrors shadcn/ui's `Form` API (Form / FormField / FormItem / FormLabel /
 * FormControl / FormDescription / FormMessage + `useFormField`) so domain forms
 * resolve to one vocabulary. Adapted to this repo's base-ui stack: `FormControl`
 * injects the id/aria wiring via `cloneElement` onto its single control child rather
 * than pulling in `@radix-ui/react-slot`.
 */

const Form = FormProvider;

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = { name: TName };

const FormFieldContext = React.createContext<FormFieldContextValue | null>(
  null,
);

function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(props: ControllerProps<TFieldValues, TName>) {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
}

type FormItemContextValue = {
  id: string;
  hasDescription: boolean;
  setHasDescription: (value: boolean) => void;
};
const FormItemContext = React.createContext<FormItemContextValue | null>(null);

export function useFormField() {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);

  // Guard the contexts before touching form state, so a misuse yields a clear
  // message rather than a "cannot destructure null" from useFormContext().
  if (!fieldContext) {
    throw new Error("useFormField must be used within a <FormField>");
  }
  if (!itemContext) {
    throw new Error("useFormField must be used within a <FormItem>");
  }

  const { getFieldState, formState } = useFormContext();
  const fieldState = getFieldState(fieldContext.name, formState);
  const { id, hasDescription, setHasDescription } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    hasDescription,
    setHasDescription,
    ...fieldState,
  };
}

function FormItem({ className, ...props }: React.ComponentProps<"div">) {
  const id = React.useId();
  // Tracks whether a <FormDescription> is actually rendered, so FormControl only
  // wires aria-describedby to the description id when the element exists (otherwise
  // axe flags a dangling reference). Order-independent: the description registers on
  // mount and FormControl re-wires on the resulting re-render.
  const [hasDescription, setHasDescription] = React.useState(false);
  return (
    <FormItemContext.Provider value={{ id, hasDescription, setHasDescription }}>
      <div
        data-slot="form-item"
        className={cn("flex flex-col gap-2", className)}
        {...props}
      />
    </FormItemContext.Provider>
  );
}

function FormLabel({
  className,
  ...props
}: React.ComponentProps<typeof Label>) {
  const { error, formItemId } = useFormField();
  return (
    <Label
      data-slot="form-label"
      data-error={!!error}
      className={cn("data-[error=true]:text-[var(--red)]", className)}
      htmlFor={formItemId}
      {...props}
    />
  );
}

/**
 * Wires the field id + aria attributes onto its single control child via cloneElement.
 * Must wrap exactly one DOM-forwarding element (an Input, Select, etc.) — a fragment,
 * array, string, or null child will throw, matching the controlled convention.
 */
function FormControl({ children }: { children: React.ReactElement }) {
  const {
    error,
    formItemId,
    formDescriptionId,
    formMessageId,
    hasDescription,
  } = useFormField();

  const describedBy =
    [hasDescription ? formDescriptionId : null, error ? formMessageId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return React.cloneElement(children, {
    id: formItemId,
    "aria-describedby": describedBy,
    "aria-invalid": !!error,
  } as React.HTMLAttributes<HTMLElement>);
}

function FormDescription({ className, ...props }: React.ComponentProps<"p">) {
  const { formDescriptionId, setHasDescription } = useFormField();

  React.useEffect(() => {
    setHasDescription(true);
    return () => setHasDescription(false);
  }, [setHasDescription]);

  return (
    <p
      data-slot="form-description"
      id={formDescriptionId}
      className={cn("type-caption", className)}
      {...props}
    />
  );
}

function FormMessage({
  className,
  children,
  ...props
}: React.ComponentProps<"p">) {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error?.message ?? "") : children;

  if (!body) return null;

  return (
    <p
      data-slot="form-message"
      id={formMessageId}
      className={cn("type-caption text-[var(--red)]", className)}
      {...props}
    >
      {body}
    </p>
  );
}

export {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
};
