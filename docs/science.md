# Sports Science Methodology

FitHub embeds specific sports science models to calculate training load, readiness, and adaptation risk. This document explains what each model is, the exact formulas and constants used, and why those choices were made over alternatives.

**These are not tunable parameters.** The constants and formula choices below are scientific commitments backed by published research. Changing them without understanding the methodology will produce incorrect risk assessments for users.

---

## Why this matters

The app uses these metrics to:

1. Flag elevated injury risk when acute load spikes relative to chronic fitness
2. Gate plan generation (plans are not issued when ACWR exceeds the spike threshold or readiness is low)
3. Power the adaptation engine (auto-adjusts training load when thresholds are triggered)
4. Display training balance and fatigue trends to users

Getting the math wrong produces bad outcomes: either the app under-flags high risk (potentially contributing to overuse injury) or it over-flags low risk (reducing trust and usefulness). Both are real harms.

---

## Training load: sRPE

**Definition:** Session RPE (sRPE) is a perceived exertion measure applied to an entire training session, rather than a single exercise. Multiplied by session duration, it produces a unit-less load score.

**Formula:**

```
session_load = session_rpe × duration_minutes
```

Where `session_rpe` is the athlete's rating on the Borg CR-10 scale (0–10) collected after the session.

**Why sRPE × duration, not alternatives:**

- **vs. TRIMP (heart rate–based):** TRIMP requires a heart rate monitor; sRPE works without wearables. Since FitHub is wearable-optional, sRPE is the baseline load measure.
- **vs. GPS-based load:** CrossFit and strength training have low GPS signal; sRPE is movement-agnostic.
- **vs. raw RPE alone:** Multiplying by duration captures the dose-response relationship — a 10-minute 9-RPE session is less fatiguing than a 60-minute 9-RPE session.

**Reference:** Foster et al. (2001), "A new approach to monitoring exercise training." _Journal of Strength and Conditioning Research_, 15(1), 109–115.

---

## Acute-to-Chronic Workload Ratio (ACWR)

**Definition:** ACWR is the ratio of acute (recent, short-term) load to chronic (established, long-term) load. It quantifies how much the current training spike differs from what the athlete is adapted to.

```
ACWR = ATL / CTL
```

Where ATL = Acute Training Load and CTL = Chronic Training Load (defined below).

**Risk zones:**

| ACWR      | Zone          | Interpretation                               |
| --------- | ------------- | -------------------------------------------- |
| < 0.8     | Undertraining | Load well below baseline; detraining risk    |
| 0.8 – 1.3 | Sweet spot    | Appropriate progression; lower injury risk   |
| 1.3 – 1.5 | Caution       | Elevated risk; monitor                       |
| > 1.5     | Spike zone    | High injury risk; adaptation engine triggers |

**Reference:** Hulin et al. (2016), "Spikes in acute workload are associated with increased injury risk in elite cricket fast bowlers." _British Journal of Sports Medicine_, 48(8), 708–712.

---

## ATL and CTL: EWMA implementation

FitHub uses **Exponentially Weighted Moving Averages** (EWMA) rather than rolling-window averages to compute ATL and CTL.

**Why EWMA over rolling windows:**

- Rolling windows (e.g., 7-day average) give equal weight to all sessions in the window and zero weight to sessions just outside it — a cliff edge. A session from 8 days ago contributes nothing; a session from 6 days ago contributes fully.
- EWMA weights recent sessions more heavily and tapers off smoothly, which better reflects biological adaptation (the body doesn't forget a training session the moment it crosses a 7-day threshold).
- EWMA is also robust to missed sessions (a zero-session day naturally reduces the weighted average rather than requiring explicit handling).

**EWMA formulas:**

```
# Acute Training Load (λ = 2/(7+1) = 0.25 — 7-day emphasis)
ATL_today = ATL_yesterday × (1 - λ_acute) + load_today × λ_acute

# Chronic Training Load (λ = 2/(28+1) ≈ 0.067 — 28-day emphasis)
CTL_today = CTL_yesterday × (1 - λ_chronic) + load_today × λ_chronic
```

**Constants:**

- Acute window: 7 days → `λ_acute = 2 / (7 + 1) = 0.25`
- Chronic window: 28 days → `λ_chronic = 2 / (28 + 1) ≈ 0.067`

These are the standard windows from the Banister impulse-response model and are the most commonly cited values in the sports science literature.

**Implementation:** `apps/api/app/engine/acwr.py`

**Reference:** Banister et al. (1975), "A systems model of training for athletic performance." _Australian Journal of Sports Medicine_, 7(3), 57–61.

---

## Training Stress Balance (TSB)

```
TSB = CTL - ATL
```

TSB represents the athlete's form: positive values indicate freshness (CTL built up, acute load low), negative values indicate accumulated fatigue.

This is directly analogous to the "performance manager" chart used in endurance sports (Coggan's model). The app displays ATL, CTL, and TSB as the primary analytics chart.

---

## Hooper Index (readiness)

**Definition:** The Hooper Index is a subjective wellness questionnaire assessing four components: sleep quality, stress, fatigue, and muscle soreness. Each is rated 1–7 (lower = better). Total scores range from 4 (excellent) to 28 (very poor).

**Components:**

1. Sleep quality (1 = very good, 7 = very poor)
2. Stress (1 = very low, 7 = very high)
3. Fatigue (1 = very low, 7 = very high)
4. Muscle soreness (1 = very low, 7 = very high)

**Normalized readiness score (0–100):**

```
readiness = ((28 - hooper_total) / 24) × 100
```

This maps the Hooper scale such that 100 = maximum readiness (score of 4) and 0 = minimum readiness (score of 28).

**Adaptation gate:** The plan generator and adaptation engine treat readiness < 40 as a trigger condition (equivalent to a Hooper total above approximately 18.4). Below this threshold, training load is reduced rather than increased.

**Why Hooper over HRV:** HRV (heart rate variability) is a more physiologically direct readiness measure, but it requires wearable hardware. Hooper is validated for daily subjective monitoring and provides useful readiness signals without any external equipment. Once wearable data pipelines are implemented, HRV and resting HR will be incorporated as additional readiness signals.

**Reference:** Hooper & Mackinnon (1995), "Monitoring overtraining in athletes." _Sports Medicine_, 20(5), 321–327.

---

## 1RM Estimation: Epley formula

For exercises where the user logs a weight and rep count (rather than a true 1-rep max), the app estimates a 1RM using the Epley formula:

```
estimated_1RM = weight × (1 + reps / 30)
```

This is the most commonly cited single-set 1RM estimation formula. The estimated 1RM is:

- Cached at write time (stored on the result row, not recalculated on read)
- Used as input to the plan generator for strength programming
- Displayed in personal records as the comparable metric across sessions

**Why Epley:** It's simple, widely adopted, and performs comparably to more complex formulas (Brzycki, Lander, O'Conner) in the 1–10 rep range most relevant to CrossFit and strength training. At very high rep counts (>15) all formulas become unreliable; the app only displays 1RM estimates for sets ≤ 12 reps.

**Implementation:** `apps/api/app/engine/epley.py`

---

## What these metrics do NOT replace

These metrics are decision-support tools. They help an informed athlete and coach notice patterns that manual review might miss. They are not:

- A substitute for clinical assessment of pain, injury, or illness
- A substitute for a qualified coach's judgment about training readiness
- A medical recommendation

The app does not issue medical advice. Red-flag language ("seek medical attention", "consult a physician") is rule-based Python in the safety classifier — it triggers on specific keywords and injury descriptions, independent of any LLM.

---

## References

1. Foster et al. (2001). A new approach to monitoring exercise training. _Journal of Strength and Conditioning Research_, 15(1), 109–115.
2. Hulin et al. (2016). Spikes in acute workload are associated with increased injury risk in elite cricket fast bowlers. _British Journal of Sports Medicine_, 48(8), 708–712.
3. Banister et al. (1975). A systems model of training for athletic performance. _Australian Journal of Sports Medicine_, 7(3), 57–61.
4. Hooper & Mackinnon (1995). Monitoring overtraining in athletes. _Sports Medicine_, 20(5), 321–327.
5. Gabbett (2016). The training-injury prevention paradox: should athletes be training smarter and harder? _British Journal of Sports Medicine_, 50(5), 273–280.
