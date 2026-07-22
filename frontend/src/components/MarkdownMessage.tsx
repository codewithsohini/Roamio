/**
 * MarkdownMessage.tsx
 * ====================
 * Renders AI assistant responses as formatted Markdown.
 *
 * Uses react-markdown + remark-gfm for full GitHub Flavored Markdown support:
 *   headings, bold, italic, bullet lists, numbered lists, tables,
 *   horizontal rules, links, and inline code.
 *
 * The component maps each Markdown element to Tailwind classes that match
 * Roamio's design system — tight spacing, muted palette, primary-accented
 * headings — styled to feel like ChatGPT rather than a raw JSON viewer.
 *
 * Usage:
 *   import { MarkdownMessage } from "@/components/MarkdownMessage";
 *   <MarkdownMessage text={assistantResponseString} />
 *
 * User messages should remain plain <span>{text}</span> — never pass
 * user input through this component.
 */

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

// ---------------------------------------------------------------------------
// Custom renderers — map every Markdown node to styled JSX
// ---------------------------------------------------------------------------
const components: Components = {
  // ── Headings ──────────────────────────────────────────────────────────────
  h1: ({ children }) => (
    <h1 className="text-[17px] font-bold text-secondary-foreground leading-snug mt-1 mb-3">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-[15px] font-bold text-secondary-foreground mt-5 mb-2 pb-1 border-b border-border/60 first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-[14px] font-semibold text-secondary-foreground mt-4 mb-1">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-[13px] font-semibold text-secondary-foreground mt-3 mb-1">
      {children}
    </h4>
  ),

  // ── Paragraphs ────────────────────────────────────────────────────────────
  p: ({ children }) => (
    <p className="text-[13px] leading-relaxed text-secondary-foreground/90 mb-2 last:mb-0">
      {children}
    </p>
  ),

  // ── Lists ─────────────────────────────────────────────────────────────────
  ul: ({ children }) => (
    <ul className="my-2 space-y-1.5 ml-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 space-y-1.5 ml-1 list-none counter-reset-[item]">{children}</ol>
  ),
  li: ({ children, ...props }) => {
    // Detect ordered vs unordered from the parent via the node type
    const isOrdered = (props as { ordered?: boolean }).ordered;
    return isOrdered ? (
      <li className="flex gap-2 text-[13px] leading-relaxed text-secondary-foreground/90">
        <span className="font-semibold text-primary shrink-0 min-w-[1.2rem]" aria-hidden />
        <span>{children}</span>
      </li>
    ) : (
      <li className="flex gap-2 text-[13px] leading-relaxed text-secondary-foreground/90">
        <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" aria-hidden />
        <span>{children}</span>
      </li>
    );
  },

  // ── Inline formatting ─────────────────────────────────────────────────────
  strong: ({ children }) => (
    <strong className="font-semibold text-secondary-foreground">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="not-italic text-primary/90 font-medium">{children}</em>
  ),

  // ── Code ──────────────────────────────────────────────────────────────────
  code: ({ children, className }) => {
    const isBlock = className?.startsWith("language-");
    return isBlock ? (
      <code className="block bg-muted/60 border border-border rounded-lg px-3 py-2 text-[12px] font-mono text-secondary-foreground overflow-x-auto my-2">
        {children}
      </code>
    ) : (
      <code className="bg-muted/60 border border-border rounded px-1 py-0.5 text-[12px] font-mono text-secondary-foreground">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto">{children}</pre>
  ),

  // ── Blockquote ────────────────────────────────────────────────────────────
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-primary/40 pl-3 my-2 italic text-[13px] text-secondary-foreground/80 leading-relaxed">
      {children}
    </blockquote>
  ),

  // ── Horizontal rule ───────────────────────────────────────────────────────
  hr: () => (
    <hr className="my-4 border-border/50" />
  ),

  // ── Links ─────────────────────────────────────────────────────────────────
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
    >
      {children}
    </a>
  ),

  // ── Table (GFM) ───────────────────────────────────────────────────────────
  table: ({ children }) => (
    <div className="overflow-x-auto my-3">
      <table className="w-full text-[12px] border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-muted/40 border-b border-border">{children}</thead>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-b border-border/40 last:border-0">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="text-left px-3 py-2 font-semibold text-secondary-foreground">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-secondary-foreground/90">{children}</td>
  ),
};

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------
interface MarkdownMessageProps {
  text: string;
}

export function MarkdownMessage({ text }: MarkdownMessageProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={components}
    >
      {text}
    </ReactMarkdown>
  );
}
