/**
 * Sample documents. Each tool gets its own example so the pages demonstrate
 * different behaviour instead of sharing one blob of filler text.
 */

/** Compact payload: good for showing what Format actually changes. */
export const FORMATTER_EXAMPLE = `{"id":1042,"name":"Ada Lovelace","role":"engineer","active":true,"skills":["typescript","react","node"],"profile":{"location":"London","timezone":"Europe/London"},"projects":[{"name":"analytics-api","stars":128,"tags":["internal","beta"]},{"name":"docs-site","stars":34,"tags":[]}],"lastLogin":"2026-10-19T08:12:44Z","notes":null}`;

/** A realistic config file, formatted, for the validator page. */
export const VALIDATOR_VALID_EXAMPLE = `{
  "service": "checkout",
  "environment": "production",
  "retries": 3,
  "timeoutMs": 2500,
  "endpoints": [
    "https://api.example.com/v1/orders",
    "https://api.example.com/v1/payments"
  ],
  "featureFlags": {
    "expressCheckout": true,
    "savedCards": false
  },
  "maintainers": ["platform-team@example.com"],
  "notes": null
}`;

/** Deliberately broken: the last member ends with a trailing comma. */
export const VALIDATOR_INVALID_EXAMPLE = `{
  "service": "checkout",
  "environment": "production",
  "retries": 3,
  "timeoutMs": 2500,
}`;

/** Verbose payload with deep indentation, for the minifier page. */
export const MINIFIER_EXAMPLE = `{
  "meta": {
    "generatedAt": "2026-10-21T09:00:00Z",
    "version": "2.4.0",
    "source": "orders-service"
  },
  "pagination": {
    "page": 1,
    "perPage": 25,
    "total": 3
  },
  "orders": [
    {
      "id": "ORD-1001",
      "status": "shipped",
      "total": 129.5,
      "currency": "USD",
      "customer": {
        "id": "CUS-88",
        "email": "buyer@example.com"
      },
      "items": [
        { "sku": "KB-01", "quantity": 1, "price": 99.5 },
        { "sku": "CBL-03", "quantity": 2, "price": 15 }
      ]
    },
    {
      "id": "ORD-1002",
      "status": "pending",
      "total": 42,
      "currency": "USD",
      "customer": {
        "id": "CUS-91",
        "email": "another@example.com"
      },
      "items": [
        { "sku": "MS-07", "quantity": 1, "price": 42 }
      ]
    },
    {
      "id": "ORD-1003",
      "status": "cancelled",
      "total": 0,
      "currency": "USD",
      "customer": {
        "id": "CUS-95",
        "email": "third@example.com"
      },
      "items": []
    }
  ]
}`;

/**
 * A pair for the diff page: one changed value, one removed member, one added
 * member and one array element out of order, so the default settings show every
 * kind of row except a reorder.
 */
export const DIFF_BEFORE_EXAMPLE = `{
  "orderId": "ORD-1001",
  "status": "pending",
  "total": 129.5,
  "currency": "USD",
  "customer": {
    "id": "CUS-88",
    "email": "buyer@example.com",
    "vip": false
  },
  "items": [
    { "sku": "KB-01", "quantity": 1 },
    { "sku": "CBL-03", "quantity": 2 }
  ]
}`;

export const DIFF_AFTER_EXAMPLE = `{
  "orderId": "ORD-1001",
  "status": "shipped",
  "total": 129.5,
  "currency": "USD",
  "customer": {
    "id": "CUS-88",
    "email": "buyer@example.com"
  },
  "items": [
    { "sku": "KB-01", "quantity": 1 },
    { "sku": "CBL-03", "quantity": 3 },
    { "sku": "MS-07", "quantity": 1 }
  ],
  "shippedAt": "2026-10-23T07:40:00Z"
}`;

/** Raw text with quotes, a backslash path, a tab and an emoji, for the escaper. */
export const ESCAPE_EXAMPLE = `He said "ship it" — then left.

Path: C:\\Users\\ada\\notes.txt
Indent:	one tab
Emoji: 😀`;

/** An escaped string, including one sequence JSON does not define. */
export const UNESCAPE_EXAMPLE = `"Line one\\nLine two\\tindented \\u00e9 \\u2615 \\x41 done"`;

/**
 * An orders array for the CSV converter: three records whose nested customers
 * flatten into dotted columns, one empty items array (serialised as `[]`) and
 * a price written as a string, so the output shows the real-world wrinkles.
 */
export const CSV_EXAMPLE = `[
  {
    "id": "ORD-1001",
    "status": "shipped",
    "total": 129.5,
    "currency": "USD",
    "customer": {
      "id": "CUS-88",
      "email": "buyer@example.com"
    },
    "items": [
      { "sku": "KB-01", "quantity": 1, "price": 99.5 },
      { "sku": "CBL-03", "quantity": 2, "price": 15 }
    ]
  },
  {
    "id": "ORD-1002",
    "status": "pending",
    "total": 42,
    "currency": "USD",
    "customer": {
      "id": "CUS-91",
      "email": "another@example.com"
    },
    "items": []
  },
  {
    "id": "ORD-1003",
    "status": "cancelled",
    "total": 0,
    "currency": "USD",
    "customer": {
      "id": "CUS-95",
      "email": "third@example.com"
    },
    "items": []
  }
]`;

/**
 * Two records that deliberately disagree: the second user has no avatarUrl and
 * a null lastSeenAt. Generates optional properties and a string | null union,
 * which is the whole point of the tool.
 */
export const TYPES_EXAMPLE = `[
  {
    "id": 1042,
    "email": "ada@example.com",
    "profile": {
      "displayName": "Ada",
      "avatarUrl": "https://cdn.example.com/ada.png"
    },
    "roles": ["admin", "editor"],
    "lastSeenAt": "2026-11-01T09:30:00Z",
    "creditBalance": 12.5
  },
  {
    "id": 1043,
    "email": "alan@example.com",
    "profile": {
      "displayName": "Alan"
    },
    "roles": ["viewer"],
    "lastSeenAt": null,
    "creditBalance": 0
  }
]`;

/**
 * Order payload for the Go generator. Every Go-specific decision is visible at
 * once: `api_url` exercises the initialism rule, the second order omits
 * `unit_price` (→ `,omitempty`), `coupon_code` is null in one record (→
 * `*string`), and `unit_price` mixes 19.5 with 4 (→ `float64`, not `int64`).
 */
export const GO_EXAMPLE = `[
  {
    "id": 8891,
    "api_url": "https://api.example.com/v1/orders",
    "customer": {
      "id": "c_8812",
      "email": "ada@example.com"
    },
    "items": [
      { "sku": "J-01", "qty": 2, "unit_price": 19.5 },
      { "sku": "J-07", "qty": 1 }
    ],
    "coupon_code": null,
    "created_at": "2026-11-01T09:30:00Z"
  },
  {
    "id": 8892,
    "api_url": "https://api.example.com/v1/orders",
    "customer": {
      "id": "c_8813",
      "email": "alan@example.com"
    },
    "items": [
      { "sku": "B-12", "qty": 1, "unit_price": 4 }
    ],
    "coupon_code": "LAUNCH10",
    "created_at": "2026-11-02T11:00:00Z"
  }
]`;
