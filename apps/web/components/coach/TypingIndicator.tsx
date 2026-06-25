"use client";

export function TypingIndicator() {
  return (
    <div
      className="self-start flex items-center gap-1 px-4 py-3 rounded-r-lg rounded-bl-lg bg-[#161b22] border-l-2 border-[#58a6ff]"
      role="status"
      aria-label="Coach is typing"
    >
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-1.5 w-1.5 rounded-full bg-[#8b949e] animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}
