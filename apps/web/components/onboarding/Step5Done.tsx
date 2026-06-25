"use client";

import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";

interface Props {
  onFinish: () => void;
}

export function Step5Done({ onFinish }: Props) {
  const reduced = useReducedMotion();
  const dur = reduced ? 0 : 0.3;

  return (
    <div className="flex min-h-[calc(100dvh-48px)] flex-col px-6 py-8 md:min-h-0">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: dur }}
        className="font-mono text-xs text-[#3fb950]"
      >
        ✓ main branch initialized
      </motion.p>

      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: dur, delay: reduced ? 0 : 0.1 }}
        className="mt-6 text-xl font-semibold text-[#e6edf3]"
      >
        You&apos;re all set.
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: dur, delay: reduced ? 0 : 0.2 }}
        className="mt-4 text-sm leading-relaxed text-[#8b949e]"
      >
        Your fitness repo is initialized. Head to the dashboard to log workouts,
        track your streak, and build your history.
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: dur, delay: reduced ? 0 : 0.3 }}
        className="mt-8 rounded-md border border-[#30363d] bg-[#161b22] p-4 font-mono text-xs text-[#8b949e]"
      >
        <p>
          <span className="text-[#3fb950]">✓</span> Frequency set
        </p>
        <p className="mt-1">
          <span className="text-[#3fb950]">✓</span> Units configured
        </p>
        <p className="mt-1">
          <span className="text-[#3fb950]">✓</span> Ready to push
        </p>
      </motion.div>

      <div className="flex-1" />

      <div className="pb-8 md:pb-0">
        <Button
          onClick={onFinish}
          className="min-h-[48px] w-full bg-[#3fb950] font-medium text-[#0d1117] hover:bg-[#56d364]"
        >
          Open dashboard
        </Button>
      </div>
    </div>
  );
}
