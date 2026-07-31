"use client";

import { useActionState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { discountSchema, type DiscountFormValues, type DiscountFormInput } from "@/lib/validation/discount";
import { IDLE_STATE, type FormActionState } from "@/lib/actions/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field";

export type DiscountFormDefaults = {
  code: string;
  description: string;
  type: "percentage" | "fixed";
  value: string;
  active: boolean;
  maxUses: string;
  minSubtotalDollars: string;
  expiresAt: string;
};

export function DiscountForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (prevState: FormActionState, formData: FormData) => Promise<FormActionState>;
  defaults?: DiscountFormDefaults;
  submitLabel: string;
}) {
  const [state, dispatch, isPending] = useActionState(action, IDLE_STATE);
  const [isSubmitting, startTransition] = useTransition();

  const form = useForm<DiscountFormInput, unknown, DiscountFormValues>({
    resolver: zodResolver(discountSchema),
    defaultValues: {
      code: defaults?.code ?? "",
      description: defaults?.description ?? "",
      type: defaults?.type ?? "percentage",
      value: defaults ? Number(defaults.value) : undefined,
      active: defaults?.active ?? true,
      maxUses: defaults?.maxUses ? Number(defaults.maxUses) : "",
      minSubtotalDollars: defaults?.minSubtotalDollars ? Number(defaults.minSubtotalDollars) : "",
      expiresAt: defaults?.expiresAt ?? "",
    },
  });

  const type = form.watch("type");

  function onValid(values: DiscountFormValues) {
    const fd = new FormData();
    fd.set("code", values.code);
    fd.set("description", values.description ?? "");
    fd.set("type", values.type);
    fd.set("value", String(values.value));
    fd.set("active", String(values.active));
    fd.set("maxUses", values.maxUses === "" || values.maxUses === undefined ? "" : String(values.maxUses));
    fd.set(
      "minSubtotalDollars",
      values.minSubtotalDollars === "" || values.minSubtotalDollars === undefined ? "" : String(values.minSubtotalDollars)
    );
    fd.set("expiresAt", values.expiresAt ?? "");
    startTransition(() => dispatch(fd));
  }

  return (
    <form onSubmit={form.handleSubmit(onValid)} className="flex max-w-md flex-col gap-6">
      <FieldGroup>
        <Field data-invalid={!!form.formState.errors.code}>
          <FieldLabel htmlFor="code">Code</FieldLabel>
          <Input id="code" placeholder="e.g. WELCOME10" autoCapitalize="characters" {...form.register("code")} />
          <FieldError errors={[form.formState.errors.code]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.description}>
          <FieldLabel htmlFor="description">Description (optional, admin-only)</FieldLabel>
          <Textarea id="description" rows={2} {...form.register("description")} />
          <FieldError errors={[form.formState.errors.description]} />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field data-invalid={!!form.formState.errors.type}>
            <FieldLabel htmlFor="type">Type</FieldLabel>
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage off</SelectItem>
                    <SelectItem value="fixed">Fixed amount off</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field data-invalid={!!form.formState.errors.value}>
            <FieldLabel htmlFor="value">{type === "percentage" ? "Percent off" : "Amount off (₱)"}</FieldLabel>
            <Input id="value" type="number" step={type === "percentage" ? 1 : 0.01} min={0} {...form.register("value")} />
            <FieldError errors={[form.formState.errors.value]} />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field data-invalid={!!form.formState.errors.maxUses}>
            <FieldLabel htmlFor="maxUses">Max uses (optional)</FieldLabel>
            <Input id="maxUses" type="number" step={1} min={1} placeholder="Unlimited" {...form.register("maxUses")} />
            <FieldError errors={[form.formState.errors.maxUses]} />
          </Field>
          <Field data-invalid={!!form.formState.errors.minSubtotalDollars}>
            <FieldLabel htmlFor="minSubtotalDollars">Minimum order (₱, optional)</FieldLabel>
            <Input
              id="minSubtotalDollars"
              type="number"
              step={0.01}
              min={0}
              placeholder="None"
              {...form.register("minSubtotalDollars")}
            />
            <FieldError errors={[form.formState.errors.minSubtotalDollars]} />
          </Field>
        </div>

        <Field data-invalid={!!form.formState.errors.expiresAt}>
          <FieldLabel htmlFor="expiresAt">Expires (optional)</FieldLabel>
          <Input id="expiresAt" type="date" {...form.register("expiresAt")} />
          <FieldError errors={[form.formState.errors.expiresAt]} />
        </Field>

        <Field orientation="horizontal">
          <Controller
            control={form.control}
            name="active"
            render={({ field }) => (
              <Switch id="active" checked={Boolean(field.value)} onCheckedChange={field.onChange} />
            )}
          />
          <FieldLabel htmlFor="active" className="font-normal">
            Active
          </FieldLabel>
        </Field>
      </FieldGroup>

      {state.status === "error" && state.message && <p className="text-sm text-destructive">{state.message}</p>}

      <Button type="submit" disabled={isPending || isSubmitting} className="self-start">
        {isPending || isSubmitting ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
