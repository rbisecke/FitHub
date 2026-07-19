import Link from "next/link";
import type { BodyRegion } from "./picker/taxonomy";
import { REGION_DISPLAY_NAME } from "./picker/taxonomy";
import { ReferralVerdictCard } from "./ReferralVerdictCard";
import { formatLabel } from "@/lib/display";

export interface InjuryReportResultData {
  bodyRegion: BodyRegion;
  painLevel: number;
  requiresReferral: boolean;
  substitutions: string[];
  contraindicated: string[];
}

/**
 * Submission result (05 §1.3) — renders in place below the form. Order
 * follows severity: a calm confirmation line first, then either the referral
 * verdict (substitutions omitted entirely when it fires — the API returns
 * none in that case anyway) or substitutions + the always-present
 * contraindication list.
 */
export function InjuryReportResult({
  result,
}: {
  result: InjuryReportResultData;
}) {
  const {
    bodyRegion,
    painLevel,
    requiresReferral,
    substitutions,
    contraindicated,
  } = result;

  return (
    <div
      className="mt-4 flex flex-col gap-3"
      data-testid="injury-report-result"
    >
      <p className="font-sans text-[13px]" style={{ color: "var(--muted)" }}>
        Recorded: {REGION_DISPLAY_NAME[bodyRegion]}, pain{" "}
        <span className="font-mono tabular-nums">{painLevel}</span>/10.
      </p>

      {requiresReferral ? (
        <ReferralVerdictCard painLevel={painLevel} />
      ) : (
        <>
          {substitutions.length > 0 && (
            <div
              className="rounded-[10px] p-3"
              style={{
                background: "color-mix(in srgb, var(--green) 12%, var(--bg))",
                border: "1px solid var(--green)",
              }}
            >
              <p
                className="mb-2 font-sans text-[13px] font-semibold"
                style={{ color: "var(--green)" }}
              >
                What you can do
              </p>
              <ul className="flex flex-col gap-1">
                {substitutions.map((name) => (
                  <li
                    key={name}
                    className="font-sans text-[13px]"
                    style={{ color: "var(--text)" }}
                  >
                    {formatLabel(name)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div
            className="rounded-[10px] p-3"
            style={{
              background: "color-mix(in srgb, var(--red) 10%, var(--bg))",
              border: "1px solid var(--red)",
            }}
          >
            <p
              className="mb-2 font-sans text-[13px] font-semibold"
              style={{ color: "var(--red)" }}
            >
              <span className="font-mono tabular-nums">
                {contraindicated.length}
              </span>{" "}
              movement{contraindicated.length === 1 ? "" : "s"} to avoid
            </p>
            {contraindicated.length === 0 ? (
              <p
                className="font-sans text-[13px]"
                style={{ color: "var(--muted)" }}
              >
                No specific movements on file for this region — consult a coach.
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {contraindicated.map((name) => {
                  const hasSub = substitutions.includes(name);
                  return (
                    <li
                      key={name}
                      className="font-sans text-[13px]"
                      style={{ color: "var(--text)" }}
                    >
                      {formatLabel(name)}
                      {!hasSub && (
                        <span
                          className="ml-1 font-sans text-[11px]"
                          style={{ color: "var(--muted)" }}
                        >
                          — no substitution on file, ask your coach
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}

      <div className="mt-1 flex flex-wrap gap-3">
        <Link
          href="/injuries"
          className="inline-flex min-h-11 items-center font-sans text-[13px] font-medium underline"
          style={{ color: "var(--accent)" }}
        >
          View in my injuries
        </Link>
        <Link
          href="/today"
          className="inline-flex min-h-11 items-center font-sans text-[13px] font-medium underline"
          style={{ color: "var(--accent)" }}
        >
          Check today&apos;s workout
        </Link>
      </div>
    </div>
  );
}
