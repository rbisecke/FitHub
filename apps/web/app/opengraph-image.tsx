import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "FitHub — Git for your fitness.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0d1117",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "monospace",
        }}
      >
        {/* Logo mark */}
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 24,
            background: "#3fb950",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 32,
          }}
        >
          <svg
            width="56"
            height="56"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="7.5" y="5" width="3" height="14" rx="0.4" fill="#0d1117" />
            <rect
              x="7.5"
              y="5"
              width="8.5"
              height="3"
              rx="0.4"
              fill="#0d1117"
            />
            <rect
              x="7.5"
              y="10.6"
              width="6"
              height="2.8"
              rx="0.4"
              fill="#0d1117"
            />
          </svg>
        </div>

        {/* App name */}
        <div
          style={{
            fontSize: 80,
            fontWeight: 700,
            color: "#e6edf3",
            letterSpacing: "-2px",
            marginBottom: 16,
          }}
        >
          FitHub
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 32,
            color: "#8b949e",
            letterSpacing: "0.5px",
          }}
        >
          $ git commit -m &quot;today&apos;s workout&quot;
        </div>
      </div>
    ),
    { ...size },
  );
}
