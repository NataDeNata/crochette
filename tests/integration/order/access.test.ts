import { beforeEach, describe, expect, it, vi } from "vitest";
import { mintOrderToken } from "@/lib/security/order-token";

/** Thrown by the mocked `notFound`, mirroring how Next signals a 404. */
class NotFoundSignal extends Error {
  constructor() {
    super("NEXT_NOT_FOUND");
    this.name = "NotFoundSignal";
  }
}

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new NotFoundSignal();
  },
}));

const auth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => auth() }));

const OrderConfirmationPage = (await import("@/app/order/[id]/page")).default;
const { makeCustomer, makeOrder } = await import("../helpers/factories");

function render(id: string, t?: string) {
  return OrderConfirmationPage({
    params: Promise.resolve({ id }),
    searchParams: Promise.resolve(t ? { t } : {}),
  });
}

async function isRefused(id: string, t?: string): Promise<boolean> {
  try {
    await render(id, t);
    return false;
  } catch (err) {
    if (err instanceof NotFoundSignal) return true;
    throw err;
  }
}

beforeEach(() => {
  auth.mockReset();
  auth.mockResolvedValue(null);
});

describe("order confirmation access", () => {
  it("is visible to the customer who placed it", async () => {
    const customer = await makeCustomer();
    const order = await makeOrder({ customerId: customer.id });
    auth.mockResolvedValue({ user: { id: customer.id, role: "customer" } });

    expect(await isRefused(order.id)).toBe(false);
  });

  it("refuses a different signed-in customer with no token", async () => {
    const owner = await makeCustomer();
    const stranger = await makeCustomer();
    const order = await makeOrder({ customerId: owner.id });
    auth.mockResolvedValue({ user: { id: stranger.id, role: "customer" } });

    expect(await isRefused(order.id)).toBe(true);
  });

  it("is visible to a guest holding a valid token, with no session at all", async () => {
    const order = await makeOrder();
    auth.mockResolvedValue(null);

    expect(await isRefused(order.id, mintOrderToken(order.id))).toBe(false);
  });

  it("refuses a token minted for a different order", async () => {
    const order = await makeOrder();
    const otherOrder = await makeOrder();

    expect(await isRefused(order.id, mintOrderToken(otherOrder.id))).toBe(true);
  });

  it("refuses a guest with no token and no session", async () => {
    const order = await makeOrder();

    expect(await isRefused(order.id)).toBe(true);
  });

  it("is visible to an admin, with no token and no ownership", async () => {
    const order = await makeOrder();
    auth.mockResolvedValue({ user: { id: "admin-1", role: "admin" } });

    expect(await isRefused(order.id)).toBe(false);
  });

  it("discloses nothing for an order id that doesn't exist, admin or not", async () => {
    auth.mockResolvedValue({ user: { id: "admin-1", role: "admin" } });

    expect(await isRefused("00000000-0000-0000-0000-000000000000")).toBe(true);
  });
});
