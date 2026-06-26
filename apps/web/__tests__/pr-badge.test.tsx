// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PRBadge } from "@/components/log/PRBadge";

describe("PRBadge", () => {
  it("shows [PR] when working set and estimatedOneRM > prThreshold", () => {
    render(
      <PRBadge estimatedOneRM={120} prThreshold={100} setType="working" />,
    );
    expect(screen.getByText("[PR]")).toBeTruthy();
  });

  it("is hidden when setType is warmup", () => {
    const { container } = render(
      <PRBadge estimatedOneRM={120} prThreshold={100} setType="warmup" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("is hidden when setType is drop", () => {
    const { container } = render(
      <PRBadge estimatedOneRM={120} prThreshold={100} setType="drop" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("is hidden when estimatedOneRM is null", () => {
    const { container } = render(
      <PRBadge estimatedOneRM={null} prThreshold={100} setType="working" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("is hidden when prThreshold is null", () => {
    const { container } = render(
      <PRBadge estimatedOneRM={120} prThreshold={null} setType="working" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("is hidden when estimatedOneRM equals prThreshold", () => {
    const { container } = render(
      <PRBadge estimatedOneRM={100} prThreshold={100} setType="working" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("is hidden when estimatedOneRM is less than prThreshold", () => {
    const { container } = render(
      <PRBadge estimatedOneRM={90} prThreshold={100} setType="working" />,
    );
    expect(container.firstChild).toBeNull();
  });
});
