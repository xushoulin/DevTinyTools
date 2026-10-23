import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { absoluteUrl } from "@/lib/site";

export interface Crumb {
  label: string;
  href?: string;
}

/**
 * Visible breadcrumbs plus their BreadcrumbList markup.
 *
 * The structured data is emitted here rather than per page so a page cannot
 * show a trail that Google never sees. Items before the last one must carry an
 * href; the current page is the last item and is left without one, which is the
 * shape Google expects.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const trail = items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.label,
    ...(item.href && index < items.length - 1
      ? { item: absoluteUrl(item.href) }
      : {}),
  }));

  return (
    <>
      <nav aria-label="Breadcrumb" className="text-xs">
        <ol className="flex flex-wrap items-center gap-1.5 text-slate-500">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;

            return (
              <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="rounded-sm hover:text-slate-900 hover:underline"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    aria-current={isLast ? "page" : undefined}
                    className={isLast ? "text-slate-700" : undefined}
                  >
                    {item.label}
                  </span>
                )}
                {isLast ? null : (
                  <span aria-hidden="true" className="text-slate-300">
                    /
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: trail,
        }}
      />
    </>
  );
}
