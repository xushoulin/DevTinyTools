/**
 * Renders JSON-LD structured data.
 *
 * Only trusted, statically defined objects are passed in (never user input),
 * and `<` is escaped so a value cannot terminate the script element early.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
