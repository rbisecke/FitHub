# Component Inventory — Phase 3a

| Component           | Path                                       | Type   | Status  |
| ------------------- | ------------------------------------------ | ------ | ------- |
| WorkoutCard         | components/workout/WorkoutCard.tsx         | Client | Phase3a |
| WorkoutForm         | components/workout/WorkoutForm.tsx         | Client | Phase3a |
| ResultRow           | components/workout/ResultRow.tsx           | Client | Phase3a |
| MovementSearch      | components/workout/MovementSearch.tsx      | Client | Phase3a |
| WorkoutDetailClient | components/workout/WorkoutDetailClient.tsx | Client | Phase3a |
| HistoryControls     | components/workout/HistoryControls.tsx     | Client | Phase3a |
| ContributionGraph   | components/workout/ContributionGraph.tsx   | Client | Phase3a |
| CommitHashBadge     | components/ui/CommitHashBadge.tsx          | Server | Phase3a |
| CoauthoredBadge     | components/ui/CoauthoredBadge.tsx          | Server | Phase3a |
| SessionTypeBadge    | components/ui/SessionTypeBadge.tsx         | Server | Phase3a |

## shadcn/ui components in use (Base UI v4 preset)

| Component | Import path               | Used by                          |
| --------- | ------------------------- | -------------------------------- |
| Button    | @/components/ui/button    | WorkoutForm, WorkoutDetailClient |
| Input     | @/components/ui/input     | WorkoutForm                      |
| Label     | @/components/ui/label     | WorkoutForm                      |
| Select    | @/components/ui/select    | WorkoutForm                      |
| Textarea  | @/components/ui/textarea  | WorkoutForm                      |
| Badge     | @/components/ui/badge     | WorkoutCard, WorkoutDetailClient |
| Card      | @/components/ui/card      | (available if needed)            |
| Skeleton  | @/components/ui/skeleton  | loading.tsx placeholders         |
| Separator | @/components/ui/separator | WorkoutDetailClient              |
| Command   | @/components/ui/command   | MovementSearch                   |
| Dialog    | @/components/ui/dialog    | WorkoutDetailClient delete       |
| Popover   | @/components/ui/popover   | MovementSearch                   |
