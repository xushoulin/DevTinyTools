import Link from "next/link";
import {
  CodeBlock,
  ContentSection,
  InlineCode,
  ProseList,
} from "@/components/content-section";
import { FaqSection } from "@/components/faq-section";
import { GuideShell } from "@/components/guide-shell";
import { getGuide } from "@/lib/guides";
import { pageMetadata } from "@/lib/metadata";

const SLUG = "json-unexpected-token-at-position-0";
const guide = getGuide(SLUG)!;

export const metadata = pageMetadata({
  title: guide.title,
  description: guide.description,
  path: guide.href,
});

/** Verbatim output, captured by running each input through Node 22.22.2 (V8). */
const MESSAGES = [
  {
    engine: "Node 22 / current V8",
    message: `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`,
    note: "The current wording. It shows the first ten characters instead of a position.",
  },
  {
    engine: "Older Chrome, Safari",
    message: "Unexpected token < in JSON at position 0",
    note: "The wording most search results and Stack Overflow answers use.",
  },
  {
    engine: "Firefox",
    message: "JSON.parse: unexpected character at line 1 column 1 of the JSON data",
    note: "Same failure, phrased as a line and column.",
  },
  {
    engine: "Any engine, empty body",
    message: "Unexpected end of JSON input",
    note: "A 204 No Content, or a proxy that stripped the body.",
  },
  {
    engine: "Any engine, BOM first",
    message: `Unexpected token '﻿', "﻿{"a":1}" is not valid JSON`,
    note: "An invisible U+FEFF byte before the brace. Note the empty-looking quote.",
  },
  {
    engine: "Any engine, plain-text error",
    message: `Unexpected token 'E', "Error: not found" is not valid JSON`,
    note: "A text/plain error body, often from a hand-written server handler.",
  },
];

const CAUSES = [
  {
    cause: "The route does not exist",
    body: "An HTML 404 page",
    tell: "Status 404, and the body starts with <!DOCTYPE or contains “Cannot GET”.",
  },
  {
    cause: "The handler threw",
    body: "An HTML 500 page",
    tell: "Status 500. In development, most frameworks return a stack trace page.",
  },
  {
    cause: "Single-page-app rewrite",
    body: "index.html, with status 200",
    tell: "Any unknown path is rewritten to the app shell. The status is 200 and nothing looks wrong.",
  },
  {
    cause: "Auth redirect",
    body: "The login page",
    tell: "The request was followed by fetch, so you get the redirect target and its 200.",
  },
  {
    cause: "Reverse proxy or CDN error",
    body: "An nginx, Cloudflare or load-balancer page",
    tell: "502, 503 or 504 with a header like server: nginx. The app never saw the request.",
  },
  {
    cause: "Missing or extra trailing slash",
    body: "A 301 to the slashless path, then that page",
    tell: "Check the response URL, not the one you requested.",
  },
  {
    cause: "Wrong base URL",
    body: "Whatever lives at that host root",
    tell: "A typo in a base URL, or http instead of https, lands on the marketing site.",
  },
];

const FAQ = [
  {
    question: "Is position 0 always the first character of the response?",
    answer:
      "Yes — after leading whitespace is skipped. A parser that reports position 0 never consumed a value, so the response is not JSON with a mistake in it; it is a different document. That is why editing the JSON you think you sent does nothing.",
  },
  {
    question: "The status is 200 and the content-type says application/json. How?",
    answer:
      "A proxy or a server framework can set the header before the error page replaces the body, and a catch-all rewrite can serve an HTML shell with a 200. Trust the body more than the header: if the first byte is a brace or a bracket, it is JSON; if it is an angle bracket, it is not, whatever the header claims.",
  },
  {
    question: "Why does this never happen in Postman?",
    answer:
      "Usually because Postman shows you the raw response and the status side by side, so a 404 page is obvious. fetch hides that: the promise resolves on a 404, res.ok is a separate check, and only res.json() fails. Reproduce it in the browser once and the cause is normally visible immediately.",
  },
  {
    question: "Does an empty response cause the same message?",
    answer:
      "No, it is a different one: Unexpected end of JSON input. An empty string has no character to be unexpected. This matters for 204 No Content, which is a correct response for a DELETE, so a client that always calls res.json() fails on a successful request.",
  },
  {
    question: "How do I find the request that returned HTML?",
    answer:
      "Open the network panel, filter to Fetch/XHR, and sort by status. Click the failing row and read the Response tab — not Preview, which tries to render the body and can hide the fact that it is a page. The first line of the response is usually enough to name the cause.",
  },
  {
    question: "Can a byte-order mark alone cause it?",
    answer:
      "Yes. A file saved by a Windows editor can begin with U+FEFF. It is invisible in every editor, it is not whitespace to a strict JSON parser, and the message quotes what looks like an empty string. Strip it, or read the file as text and remove the first character if it is U+FEFF.",
  },
];

export default function Page() {
  return (
    <GuideShell guide={guide}>
      <ContentSection id="what-the-message-means" title="What position 0 actually means">
        <p>
          A JSON document can only start with one of seven things: an opening brace, an
          opening bracket, a double quote, a minus sign, a digit, or the letters t, f and n
          that begin true, false and null. A strict parser reads the first non-whitespace
          character, checks it against that list, and stops immediately if it does not match.
        </p>
        <p>
          An angle bracket matches nothing on that list. So the parser stops before reading a
          value, reports position 0, and tells you nothing about your data — because it never
          saw your data. The response is not malformed JSON. It is not JSON.
        </p>
        <p>
          That distinction is the whole fix. People spend hours looking for a stray comma in
          a payload they never received. The payload was fine; the response was somebody
          else&apos;s error page.
        </p>
      </ContentSection>

      <ContentSection id="what-actually-arrived" title="What actually arrived">
        <p>
          Seven causes account for almost every case. The second column is the part that
          matters, because it decides whether your code can tell anything went wrong at all.
        </p>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full border-collapse text-left text-[13px]">
            <caption className="sr-only">
              Causes of an HTML body where JSON was expected
            </caption>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <th scope="col" className="px-3 py-2 font-semibold">
                  Cause
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Body you received
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  How to recognise it
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 align-top">
              {CAUSES.map((row) => (
                <tr key={row.cause}>
                  <td className="px-3 py-2.5 text-slate-800">{row.cause}</td>
                  <td className="px-3 py-2.5 text-slate-600">{row.body}</td>
                  <td className="px-3 py-2.5 text-slate-600">{row.tell}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Notice that only the first, second and fifth rows come with a non-200 status. The
          other four are the interesting ones, and the rewrite is the worst of them.
        </p>
      </ContentSection>

      <ContentSection id="the-200-problem" title="The 200 that lies">
        <p>
          A static host deployed with a catch-all rewrite — the standard single-page-app
          configuration — answers every unknown path with the app shell and a 200. So a
          request to a path that does not exist returns a perfectly successful-looking
          response whose body begins <InlineCode>{"<!DOCTYPE html>"}</InlineCode>.
        </p>
        <p>
          In that case <InlineCode>fetch</InlineCode> does not reject, and{" "}
          <InlineCode>res.ok</InlineCode> is <InlineCode>true</InlineCode>. The only thing
          that fails is <InlineCode>res.json()</InlineCode>, and its message names a
          character rather than the actual problem. Checking the status code cannot save you
          here, because the status code is correct.
        </p>
        <p>
          What separates the two cases is the content type. It is the one signal that is
          still telling the truth, which is why the fix below checks it first and reads the
          body as text second.
        </p>
      </ContentSection>

      <ContentSection id="how-to-see-the-body" title="How to see the body">
        <p>
          The fastest route is the one that shows headers and body together. From a
          terminal:
        </p>
        <CodeBlock>{`curl -i -H 'Accept: application/json' https://api.example.com/v1/orders`}</CodeBlock>
        <p>
          The <InlineCode>-i</InlineCode> flag prints the status line and headers before the
          body, and the first line of the body is normally enough to identify the page. If
          you would rather not re-run the request, <InlineCode>res.clone()</InlineCode> gives
          you a second readable stream:
        </p>
        <CodeBlock>{`const text = await res.clone().text();
console.log(res.status, res.headers.get("content-type"));
console.log(text.slice(0, 200));`}</CodeBlock>
        <p>
          In the browser, the network panel&apos;s Response tab shows the raw bytes. The
          Preview tab tries to render them, which is helpful for JSON and actively misleading
          for an error page — it can make a 404 page look like a successfully rendered
          document.
        </p>
      </ContentSection>

      <ContentSection id="similar-messages" title="The messages that look alike">
        <p>
          These were captured by running each input through Node 22.22.2, not paraphrased.
          The same failure has at least three different wordings depending on the engine and
          its version:
        </p>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full border-collapse text-left text-[13px]">
            <caption className="sr-only">
              Verbatim parser messages for an HTML or empty body
            </caption>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <th scope="col" className="px-3 py-2 font-semibold">
                  Engine
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Message
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  What it means
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 align-top">
              {MESSAGES.map((row) => (
                <tr key={row.engine}>
                  <td className="px-3 py-2.5 text-slate-800">{row.engine}</td>
                  <td className="px-3 py-2.5 font-mono text-[11px] leading-relaxed break-words text-slate-700">
                    {row.message}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500">
          Captured on 29 October 2026. Parser messages are not part of the JSON
          specification, so an engine update can change the wording without changing
          behaviour.
        </p>
      </ContentSection>

      <ContentSection id="fix" title="The fix that holds">
        <p>
          Everything above collapses into one rule: never call <InlineCode>.json()</InlineCode>{" "}
          on a response you have not inspected. Read the text, decide whether it is JSON, and
          parse it yourself so the failure message contains evidence.
        </p>
        <CodeBlock>{`async function readJson(res) {
  const text = await res.text();
  const type = res.headers.get("content-type") ?? "";

  if (!type.includes("json")) {
    throw new Error(
      \`\${res.status} \${res.url} returned "\${type || "no content-type"}": \` +
        text.slice(0, 120),
    );
  }
  return JSON.parse(text);
}`}</CodeBlock>
        <p>
          The important part is <InlineCode>text.slice(0, 120)</InlineCode>. The next time
          this happens, the error message contains the beginning of the page that came
          back — <InlineCode>{"<!DOCTYPE html><html><head><title>404"}</InlineCode> or a
          Cloudflare banner or a login form. That is a cause, not a character.
        </p>
        <p>
          Two smaller habits worth keeping: treat a 204 as success with no body rather than
          calling <InlineCode>.json()</InlineCode> on it, and strip a leading U+FEFF before
          parsing anything that came from a file rather than the network.
        </p>
      </ContentSection>

      <ContentSection id="server-side" title="Where to look on the server">
        <ProseList
          items={[
            <>
              <strong className="font-medium text-slate-900">
                The catch-all is registered before the API route.
              </strong>{" "}
              In Express, a catch-all route (<InlineCode>{'app.get("*")'}</InlineCode> in
              version 4, <InlineCode>{'app.get("/*splat")'}</InlineCode> in version 5) or a
              static handler placed above the router swallows the request and serves the shell.
            </>,
            <>
              <strong className="font-medium text-slate-900">
                The error handler returns HTML.
              </strong>{" "}
              A framework&apos;s default error page does exactly that. If the request
              accepted JSON, the handler should answer with JSON too.
            </>,
            <>
              <strong className="font-medium text-slate-900">
                The rewrite rule covers too much.
              </strong>{" "}
              A host-level rewrite of <InlineCode>{"/*"}</InlineCode> to{" "}
              <InlineCode>/index.html</InlineCode> must exclude the API prefix.
            </>,
            <>
              <strong className="font-medium text-slate-900">
                Auth is handled by a redirect.
              </strong>{" "}
              A session-based login guard answers an expired token with a 302 to the login
              page. APIs should answer 401 and let the client decide.
            </>,
            <>
              <strong className="font-medium text-slate-900">
                A proxy in between owns the error.
              </strong>{" "}
              If the body is stamped nginx or Cloudflare, the application never ran. Look at
              the upstream health, not the code.
            </>,
          ]}
        />
        <p>
          Once you have the body, the cause is usually one of these five, and the fix is in
          routing or headers rather than in any JSON.
        </p>
      </ContentSection>

      <ContentSection id="next" title="Related reading">
        <p>
          If the response really was JSON and still failed, the shape of the message changes:
          it names a position inside a document it managed to read.{" "}
          <Link
            href="/guides/json-error-messages-explained"
            className="text-blue-700 underline underline-offset-2"
          >
            The guide to parser messages
          </Link>{" "}
          covers those, and{" "}
          <Link
            href="/guides/json5-trailing-commas-and-comments"
            className="text-blue-700 underline underline-offset-2"
          >
            the JSON5 guide
          </Link>{" "}
          covers the trailing comma and comment complaints that arrive with a position
          attached.
        </p>
      </ContentSection>

      <FaqSection items={FAQ} path={guide.href} />
    </GuideShell>
  );
}
