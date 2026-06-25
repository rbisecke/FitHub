"use client";

import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";

interface Props {
  onStart: () => void;
  onSkipAll: () => void;
}

export function Step1Welcome({ onStart, onSkipAll }: Props) {
  const reduced = useReducedMotion();
  const dur = reduced ? 0 : 0.3;

  return (
    <div className="flex min-h-[100dvh] flex-col px-6 py-10 md:min-h-0 md:py-8">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: dur, delay: 0 }}
        className="font-mono text-xs text-[#8b949e]"
      >
        $ git init fithub
      </motion.p>

      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: dur, delay: reduced ? 0 : 0.1 }}
        className="mt-6 text-2xl font-semibold text-[#e6edf3]"
      >
        Welcome to your fitness repo.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: dur, delay: reduced ? 0 : 0.2 }}
        className="mt-4 text-sm leading-relaxed text-[#8b949e]"
      >
        FitHub tracks your CrossFit training like git tracks code — every
        workout is a commit, every PR is a tagged release.
        <br />
        <br />
        Let&apos;s set up your repo.
      </motion.p>

      <div className="flex-1" />

      <div className="space-y-3 pb-8 md:pb-0">
        <Button
          onClick={onStart}
          className="min-h-[48px] w-full bg-[#58a6ff] font-medium text-[#0d1117] hover:bg-[#79b8ff]"
        >
          Get started
        </Button>
        <div className="flex justify-center">
          <button
            onClick={onSkipAll}
            className="py-2 text-xs text-[#8b949e] transition-colors hover:text-[#e6edf3]"
          >
            Skip setup
          </button>
        </div>
      </div>
    </div>
  );
}
