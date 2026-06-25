// Safe localStorage wrapper — handles Safari Private mode where writes throw

const fallback = new Map<string, string>();

export const ls = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return fallback.get(key) ?? null;
    }
  },

  set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      fallback.set(key, value);
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      fallback.delete(key);
    }
  },

  keys(): string[] {
    try {
      return Object.keys(localStorage);
    } catch {
      return [...fallback.keys()];
    }
  },
};
