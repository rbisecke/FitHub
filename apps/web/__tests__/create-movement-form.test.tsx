// @vitest-environment jsdom
/**
 * Tests for CreateMovementForm (01 §8): slug auto-suggests from the name and can
 * be overridden, the ^[a-z0-9-]+$ validation gates submit, and a 409 surfaces a
 * friendly conflict message rather than a raw DB error.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreateMovementForm } from "@/components/logging/catalog/CreateMovementForm";
import { ApiError, type ApiClient } from "@/lib/api/client";

function makeClient(create: ApiClient["movements"]["create"]): ApiClient {
  return { movements: { create } } as unknown as ApiClient;
}

describe("CreateMovementForm", () => {
  it("auto-suggests a slug from the typed name", () => {
    const client = makeClient(vi.fn());
    render(
      <CreateMovementForm
        client={client}
        onCreated={() => {}}
        onCancel={() => {}}
      />,
    );
    const name = screen.getByPlaceholderText("e.g. Bulgarian Split Squat");
    fireEvent.change(name, { target: { value: "Bulgarian Split Squat" } });
    const slug = screen.getByDisplayValue("bulgarian-split-squat");
    expect(slug).toBeTruthy();
  });

  it("shows a friendly conflict message on a 409", async () => {
    const create = vi.fn().mockRejectedValue(new ApiError(409, "conflict"));
    const client = makeClient(create as ApiClient["movements"]["create"]);
    render(
      <CreateMovementForm
        initialName="Back Squat"
        client={client}
        onCreated={() => {}}
        onCancel={() => {}}
      />,
    );
    fireEvent.click(screen.getByText("Create movement"));
    await waitFor(() =>
      expect(
        screen.getByText("A movement with that name or slug already exists."),
      ).toBeTruthy(),
    );
  });

  it("calls onCreated with the created movement on success", async () => {
    const created = { id: "m1", name: "Back Squat", slug: "back-squat" };
    const create = vi.fn().mockResolvedValue(created);
    const onCreated = vi.fn();
    const client = makeClient(create as ApiClient["movements"]["create"]);
    render(
      <CreateMovementForm
        initialName="Back Squat"
        client={client}
        onCreated={onCreated}
        onCancel={() => {}}
      />,
    );
    fireEvent.click(screen.getByText("Create movement"));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
  });
});
