/**
 * A `application/ld+json` block, escaped once and in one place.
 *
 * The `</` → `<` replacement is the only thing standing between structured
 * data and a `</script>` inside a product description closing the tag early.
 * It was written correctly on the product page and nowhere else, which is
 * exactly the shape that goes wrong when a second call site is added — so the
 * second call site is this component instead.
 */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
