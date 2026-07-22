"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AvatarMonogram } from "@/components/shared/avatar-monogram";
import { ForcedTheme } from "@/components/shared/forced-theme";
import TestGlyph from "@/components/icons/test-glyph.svg";

/**
 * Scaffold route — shadcn base-kit primitive states + Skeleton + AvatarMonogram +
 * ForcedTheme, re-themed through the new tokens (0.10 / 0.11 / 0.12 / 0.23 / 0.31
 * validation surface). Delete once the design system is stable.
 */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="type-h2">{title}</h2>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </section>
  );
}

export default function PrimitivesPage() {
  const [pain, setPain] = useState([5]);

  return (
    <main
      className="min-h-screen p-6"
      style={{ background: "var(--bg)", color: "var(--text)" }}
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-10">
        <h1 className="type-h1">Primitives</h1>

        <Section title="Button — variants & states">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Danger</Button>
          <Button disabled>Disabled</Button>
        </Section>

        <Section title="Badge">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Danger</Badge>
          <Badge variant="outline">Outline</Badge>
        </Section>

        <Section title="Card">
          <Card className="w-72">
            <CardHeader>
              <CardTitle>Back Squat</CardTitle>
              <CardDescription>Last session · 3 days ago</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="type-num-hero">225 lb</span>
            </CardContent>
          </Card>
        </Section>

        <Section title="Input">
          <Input className="w-64" placeholder="Search movements…" />
          <Input
            className="w-64"
            defaultValue="Filled value"
            aria-label="Filled input example"
          />
          <Input className="w-64" disabled placeholder="Disabled" />
        </Section>

        <Section title="Tabs">
          <Tabs defaultValue="summary" className="w-72">
            <TabsList>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="summary" className="type-small pt-2">
              Summary content
            </TabsContent>
            <TabsContent value="history" className="type-small pt-2">
              History content
            </TabsContent>
          </Tabs>
        </Section>

        <Section title="ToggleGroup">
          <ToggleGroup defaultValue={["30d"]} variant="outline">
            <ToggleGroupItem value="7d">7d</ToggleGroupItem>
            <ToggleGroupItem value="30d">30d</ToggleGroupItem>
            <ToggleGroupItem value="90d">90d</ToggleGroupItem>
          </ToggleGroup>
        </Section>

        <Section title="Select">
          <Select defaultValue="kg">
            <SelectTrigger className="w-40" aria-label="Unit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kg">Kilograms</SelectItem>
              <SelectItem value="lb">Pounds</SelectItem>
            </SelectContent>
          </Select>
        </Section>

        <Section title="Slider">
          <div className="w-64">
            <Slider
              value={pain}
              onValueChange={(v) =>
                setPain((Array.isArray(v) ? v : [v]) as number[])
              }
              min={0}
              max={10}
              step={1}
              aria-label="Pain level"
            />
            <span className="type-num-inline mt-2 block text-[13px]">
              {pain[0]} / 10
            </span>
          </div>
        </Section>

        <Section title="AlertDialog">
          <AlertDialog>
            <AlertDialogTrigger
              render={<Button variant="destructive">Delete workout</Button>}
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this workout?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes the session and its results.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Section>

        <Section title="Dialog / Sheet">
          <Dialog>
            <DialogTrigger
              render={<Button variant="outline">Open Dialog</Button>}
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dialog title</DialogTitle>
                <DialogDescription>
                  A centered modal for a focused task.
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
          <Sheet>
            <SheetTrigger
              render={<Button variant="outline">Open Sheet</Button>}
            />
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Sheet title</SheetTitle>
              </SheetHeader>
            </SheetContent>
          </Sheet>
        </Section>

        <Section title="SVGR import (0.24) — one asset, three sizes / token colors">
          <TestGlyph width={16} height={16} style={{ color: "var(--text)" }} />
          <TestGlyph
            width={20}
            height={20}
            style={{ color: "var(--accent)" }}
          />
          <TestGlyph width={24} height={24} style={{ color: "var(--green)" }} />
        </Section>

        <Section title="Skeleton (canonical, 1.2s shimmer)">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-4 w-48 rounded-sm" />
            <Skeleton className="h-24 w-72 rounded-lg" />
          </div>
        </Section>

        <Section title="AvatarMonogram (identity color, 0.31)">
          <AvatarMonogram name="Dana Lifter" seed="user-1" size="lg" />
          <AvatarMonogram name="Sam Row" seed="user-42" size="lg" />
          <AvatarMonogram name="Kai Pull" seed="user-777" size="lg" />
          <AvatarMonogram name="Mo Snatch" seed="user-9001" size="lg" />
          <AvatarMonogram name="Guest Ann" isGuest size="lg" />
        </Section>

        <section className="flex flex-col gap-3">
          <h2 className="type-h2">
            ForcedTheme — light subtree in a dark page (0.23)
          </h2>
          <ForcedTheme theme="light" className="rounded-lg border p-6">
            <div
              className="flex flex-col gap-3"
              style={{ background: "var(--bg)", color: "var(--text)" }}
            >
              <h3 className="type-h3">Log surface (always light)</h3>
              <p className="type-small" style={{ color: "var(--muted)" }}>
                Tokens resolve to light values here regardless of OS/app theme.
              </p>
              <div className="flex gap-3">
                <Button>Commit</Button>
                <Badge>Rx&apos;d</Badge>
              </div>
            </div>
          </ForcedTheme>
        </section>
      </div>
    </main>
  );
}
