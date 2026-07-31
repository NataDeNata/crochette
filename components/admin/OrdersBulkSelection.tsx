"use client";

import { createContext, useActionState, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { bulkUpdateOrders } from "@/app/admin/orders/actions";
import { ORDER_ADMIN_STATUSES } from "@/lib/validation/order-admin";
import { IDLE_STATE } from "@/lib/actions/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Row selection for the orders list.
 *
 * The table itself stays a Server Component — only the three small pieces that
 * need shared state (the row checkbox, the header's select-all, the action bar)
 * are client. They talk through this context rather than the page lifting a
 * `Set` it has no other use for.
 *
 * The selection is *not* in the URL, unlike every other bit of list state here
 * (search, filter, page). Those describe what you're looking at and are worth
 * sharing or reloading into; a selection is a transient step in an action and
 * putting thirty uuids in the address bar would only make the back button
 * strange.
 */
type SelectionValue = {
  selected: ReadonlySet<string>;
  toggle: (id: string) => void;
  setAll: (checked: boolean) => void;
  pageIds: readonly string[];
};

const SelectionContext = createContext<SelectionValue | null>(null);

function useSelection(): SelectionValue {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("Orders selection components must be rendered inside <OrdersSelectionProvider>");
  return ctx;
}

export function OrdersSelectionProvider({
  pageIds,
  children,
}: {
  pageIds: string[];
  children: ReactNode;
}) {
  const [ticked, setTicked] = useState<ReadonlySet<string>>(() => new Set());

  // Paging, searching or filtering swaps the rows underneath us, and anything
  // ticked that is no longer on screen has to stop counting — otherwise the bar
  // claims a number the admin can't see, and a bulk change reaches an order
  // they scrolled past three pages ago.
  //
  // Narrowed here during render rather than pruned in an effect. Same result,
  // but no second render pass and no window in which the stale count is the one
  // on screen: what the bar reads and what the form posts are both this value.
  const pageKey = pageIds.join(",");
  const selected = useMemo(() => {
    const onPage = new Set(pageIds);
    return new Set([...ticked].filter((id) => onPage.has(id)));
    // pageKey stands in for the pageIds array, which is a fresh identity on
    // every server render even when the ids are unchanged.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticked, pageKey]);

  const value = useMemo<SelectionValue>(
    () => ({
      selected,
      pageIds,
      toggle: (id) =>
        setTicked((prev) => {
          const next = new Set(prev);
          if (!next.delete(id)) next.add(id);
          return next;
        }),
      setAll: (checked) => setTicked(checked ? new Set(pageIds) : new Set()),
    }),
    [selected, pageIds],
  );

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export function OrderRowCheckbox({ id, label }: { id: string; label: string }) {
  const { selected, toggle } = useSelection();
  return (
    <Checkbox
      checked={selected.has(id)}
      onCheckedChange={() => toggle(id)}
      aria-label={`Select order for ${label}`}
    />
  );
}

export function OrdersSelectAllCheckbox() {
  const { selected, setAll, pageIds } = useSelection();
  const allSelected = pageIds.length > 0 && selected.size === pageIds.length;
  // Radix renders "indeterminate" as its own state rather than a boolean, which
  // is what gives the partial-selection dash for free.
  const checked = allSelected ? true : selected.size > 0 ? "indeterminate" : false;

  return (
    <Checkbox
      checked={checked}
      onCheckedChange={() => setAll(!allSelected)}
      aria-label={allSelected ? "Clear selection" : "Select all orders on this page"}
      disabled={pageIds.length === 0}
    />
  );
}

export function OrdersBulkBar() {
  const { selected, setAll } = useSelection();
  const [state, formAction, isPending] = useActionState(bulkUpdateOrders, IDLE_STATE);
  const lastHandled = useRef(state);

  // Clear the selection once a run comes back successful. Left alone on error
  // so the admin can retry the same set rather than re-tick thirty boxes; the
  // partial-failure message says how many did go through.
  useEffect(() => {
    if (state === lastHandled.current) return;
    lastHandled.current = state;
    if (state.status === "success") setAll(false);
  }, [state, setAll]);

  const count = selected.size;

  return (
    <>
      {state.message ? (
        <p
          role="status"
          className={`m-0 text-[13px] ${state.status === "error" ? "text-destructive" : "text-muted-foreground"}`}
        >
          {state.message}
        </p>
      ) : null}

      {count > 0 ? (
        <form
          action={formAction}
          className="sticky bottom-4 z-10 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2.5 shadow-lg"
        >
          {[...selected].map((id) => (
            <input key={id} type="hidden" name="orderIds" value={id} />
          ))}

          <span className="px-1 text-[13px] font-medium">
            {count} {count === 1 ? "order" : "orders"} selected
          </span>

          <Select name="status" defaultValue="shipped">
            <SelectTrigger size="sm" className="w-[150px]" aria-label="Status to apply">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORDER_ADMIN_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  Mark {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Applying…" : "Apply"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setAll(false)} disabled={isPending}>
            Clear
          </Button>
        </form>
      ) : null}
    </>
  );
}
