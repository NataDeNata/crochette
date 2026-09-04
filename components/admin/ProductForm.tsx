"use client";

import { useActionState, useRef, useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  productSchema,
  slugify,
  DEFAULT_LOW_STOCK_THRESHOLD,
  type ProductFormValues,
  type ProductFormInput,
} from "@/lib/validation/product";
import { MAX_PRODUCT_IMAGES } from "@/lib/validation/product-images";
import { IDLE_STATE, type FormActionState } from "@/lib/actions/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, FieldLabel, FieldError, FieldGroup, FieldDescription } from "@/components/ui/field";
import { PhotoAttach } from "@/components/custom/PhotoAttach";
import { AdminBusyOverlay } from "@/components/admin/AdminBusyOverlay";

export type ProductFormDefaults = {
  name: string;
  slug: string;
  description: string;
  priceDollars: string;
  category: string;
  status: string;
  stockQty: string;
  lowStockThreshold: string;
  dimensions: string;
  materials: string;
  careInstructions: string;
};

export function ProductForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (prevState: FormActionState, formData: FormData) => Promise<FormActionState>;
  defaults?: ProductFormDefaults;
  submitLabel: string;
}) {
  const [state, dispatch, isPending] = useActionState(action, IDLE_STATE);
  const [isSubmitting, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const isCreate = !defaults;
  const busy = isPending || isSubmitting;
  // Editing an existing product means the slug was already deliberately set
  // (or auto-filled once already) — don't let a later name edit silently
  // rewrite a live storefront URL. A brand-new product starts untouched, so
  // the slug tracks the name until the admin types into the slug field
  // directly.
  const [slugTouched, setSlugTouched] = useState(!!defaults);

  const form = useForm<ProductFormInput, unknown, ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: defaults?.name ?? "",
      slug: defaults?.slug ?? "",
      description: defaults?.description ?? "",
      priceDollars: defaults ? Number(defaults.priceDollars) : undefined,
      category: (defaults?.category as ProductFormInput["category"]) ?? "amigurumi",
      status: (defaults?.status as ProductFormInput["status"]) ?? "active",
      stockQty: defaults ? Number(defaults.stockQty) : 0,
      lowStockThreshold: defaults ? Number(defaults.lowStockThreshold) : DEFAULT_LOW_STOCK_THRESHOLD,
      dimensions: defaults?.dimensions ?? "",
      materials: defaults?.materials ?? "",
      careInstructions: defaults?.careInstructions ?? "",
    },
  });

  function onValid(values: ProductFormValues) {
    const fd = new FormData();
    fd.set("name", values.name);
    fd.set("slug", values.slug);
    fd.set("description", values.description ?? "");
    fd.set("priceDollars", String(values.priceDollars));
    fd.set("category", values.category);
    fd.set("status", values.status);
    fd.set("stockQty", String(values.stockQty));
    fd.set("lowStockThreshold", String(values.lowStockThreshold));
    fd.set("dimensions", values.dimensions ?? "");
    fd.set("materials", values.materials ?? "");
    fd.set("careInstructions", values.careInstructions ?? "");

    // The photo picker below is a plain file input outside RHF's own field
    // registry (RHF has no file-list field type), so its FileList is pulled
    // off the DOM here rather than out of `values`.
    const imagesInput = formRef.current?.elements.namedItem("images");
    if (imagesInput instanceof HTMLInputElement && imagesInput.files) {
      for (const file of imagesInput.files) fd.append("images", file);
    }

    startTransition(() => dispatch(fd));
  }

  // A wrapping event handler rather than `onSubmit={form.handleSubmit(onValid)}`
  // directly: `onValid` reads `formRef.current`, and calling `handleSubmit`
  // inline in the JSX would evaluate that at render time. Deferring the call
  // to inside a real submit handler keeps the ref read where refs belong —
  // React Compiler's `react-hooks/refs` rule catches exactly this.
  function onFormSubmit(e: FormEvent<HTMLFormElement>) {
    form.handleSubmit(onValid)(e);
  }

  return (
    <form ref={formRef} onSubmit={onFormSubmit} className="flex max-w-md flex-col gap-6">
      {busy && <AdminBusyOverlay label={isCreate ? "Creating product…" : "Saving…"} />}
      <FieldGroup>
        <Field data-invalid={!!form.formState.errors.name}>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input
            id="name"
            {...form.register("name", {
              onChange: (e: ChangeEvent<HTMLInputElement>) => {
                if (!slugTouched) form.setValue("slug", slugify(e.target.value), { shouldValidate: true });
              },
            })}
          />
          <FieldError errors={[form.formState.errors.name]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.slug}>
          <FieldLabel htmlFor="slug">Slug (used in the product URL)</FieldLabel>
          <Input
            id="slug"
            placeholder="e.g. milo-the-bear"
            {...form.register("slug", { onChange: () => setSlugTouched(true) })}
          />
          <FieldDescription>
            Filled in automatically from the name. Edit it directly only if you need a different URL.
          </FieldDescription>
          <FieldError errors={[form.formState.errors.slug]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.description}>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea id="description" rows={4} {...form.register("description")} />
          <FieldError errors={[form.formState.errors.description]} />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field data-invalid={!!form.formState.errors.priceDollars}>
            <FieldLabel htmlFor="priceDollars">Price (₱)</FieldLabel>
            <Input id="priceDollars" type="number" step="0.01" min="0.01" {...form.register("priceDollars")} />
            <FieldError errors={[form.formState.errors.priceDollars]} />
          </Field>
          <Field data-invalid={!!form.formState.errors.stockQty}>
            <FieldLabel htmlFor="stockQty">Stock quantity</FieldLabel>
            <Input id="stockQty" type="number" step="1" min="0" {...form.register("stockQty")} />
            <FieldError errors={[form.formState.errors.stockQty]} />
          </Field>
        </div>

        <Field data-invalid={!!form.formState.errors.lowStockThreshold}>
          <FieldLabel htmlFor="lowStockThreshold">Low stock alert at</FieldLabel>
          <Input
            id="lowStockThreshold"
            type="number"
            step="1"
            min="0"
            {...form.register("lowStockThreshold")}
          />
          <FieldDescription>
            Flags this product on the admin dashboard once stock drops to this number or below. Set to 0 to turn
            the alert off.
          </FieldDescription>
          <FieldError errors={[form.formState.errors.lowStockThreshold]} />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field data-invalid={!!form.formState.errors.category}>
            <FieldLabel htmlFor="category">Category</FieldLabel>
            <Controller
              control={form.control}
              name="category"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="category" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amigurumi">Amigurumi</SelectItem>
                    <SelectItem value="flowers">Flowers</SelectItem>
                    <SelectItem value="home-decor">Home decor</SelectItem>
                    <SelectItem value="baskets">Baskets</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={[form.formState.errors.category]} />
          </Field>
          <Field data-invalid={!!form.formState.errors.status}>
            <FieldLabel htmlFor="status">Status</FieldLabel>
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sold_out">Sold out</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={[form.formState.errors.status]} />
          </Field>
        </div>

        <FieldDescription>
          &quot;New&quot; and &quot;Bestseller&quot; badges are automatic — new for the first two
          weeks, bestseller for the top 3 sellers — and show up on the shop, the homepage and this
          product&apos;s own page with no setting to manage here.
        </FieldDescription>

        {/* Only on create. An existing product already has its own Photos
            page (with reordering, captions and a cover picker this simple
            attach control doesn't try to replace) — this exists purely so a
            brand-new product doesn't have to round-trip through "create,
            then edit, then remember to add photos" to get its first ones. */}
        {isCreate && (
          <Field>
            <FieldLabel htmlFor="images">Photos (optional)</FieldLabel>
            <PhotoAttach
              name="images"
              maxPhotos={MAX_PRODUCT_IMAGES}
              helpText={`Up to ${MAX_PRODUCT_IMAGES} product photos, JPG/PNG/WebP, 5MB each. The first one becomes the cover — reorder or add more from the product's Photos page afterward.`}
            />
          </Field>
        )}

        {/* The specs block on the product page. Each of these appears there
            only when it has a value, so filling them in one product at a time
            is a supported state rather than a half-finished one. */}
        <Field data-invalid={!!form.formState.errors.dimensions}>
          <FieldLabel htmlFor="dimensions">Size (optional)</FieldLabel>
          <Input
            id="dimensions"
            placeholder="e.g. About 18cm tall, sitting"
            {...form.register("dimensions")}
          />
          <FieldDescription>
            Written the way you would say it out loud. A shopper buying something they
            cannot pick up needs this more than any other line on the page.
          </FieldDescription>
          <FieldError errors={[form.formState.errors.dimensions]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.materials}>
          <FieldLabel htmlFor="materials">Materials (optional)</FieldLabel>
          <Input
            id="materials"
            placeholder="e.g. Cotton yarn, polyester fill, safety eyes"
            {...form.register("materials")}
          />
          <FieldError errors={[form.formState.errors.materials]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.careInstructions}>
          <FieldLabel htmlFor="careInstructions">Care (optional)</FieldLabel>
          <Textarea
            id="careInstructions"
            rows={2}
            placeholder="e.g. Spot clean with cool water. Do not machine wash or tumble dry."
            {...form.register("careInstructions")}
          />
          <FieldError errors={[form.formState.errors.careInstructions]} />
        </Field>
      </FieldGroup>

      {state.status === "error" && state.message && <p className="text-sm text-destructive">{state.message}</p>}

      <Button type="submit" disabled={busy} className="self-start">
        {busy ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
