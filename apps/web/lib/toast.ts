import { toast } from "sonner";

export const toasts = {
  prCelebration: (movement: string, value: string, delta: string) =>
    toast.success(`New PR — ${movement}: ${value}`, {
      description: `+${delta} from your previous best`,
      duration: 6000,
    }),

  workoutLogged: (name?: string) =>
    toast.success(name ? `"${name}" committed` : "Workout committed", {
      description: "Added to your git log",
    }),

  workoutDeleted: () =>
    toast("Workout removed", {
      description: "Deleted from your history",
    }),

  planActivated: (name: string) =>
    toast.success(`Plan "${name}" activated`, {
      description: "Now showing in your dashboard",
    }),

  copied: () => toast("Copied to clipboard"),

  error: (message: string) =>
    toast.error("Something went wrong", {
      description: message,
    }),
};
