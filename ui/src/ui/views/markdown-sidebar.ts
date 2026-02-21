import { html } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { icons } from "../icons.ts";
import { toSanitizedMarkdownHtml } from "../markdown.ts";

export type MarkdownSidebarProps = {
  content: string | null;
  error: string | null;
  onClose: () => void;
  onViewRawText: () => void;
};

export function renderMarkdownSidebar(props: MarkdownSidebarProps) {
  return html`
    <div
      class="sidebar-panel"
      data-testid="inspector-tools-panel"
      aria-label="Inspector tools output"
    >
      <div class="sidebar-header">
        <div class="sidebar-title">Tool Output</div>
        <button @click=${props.onClose} class="btn" title="Close sidebar">
          ${icons.x}
        </button>
      </div>
      <div class="sidebar-content">
        ${
          props.error
            ? html`
              <div class="callout danger" data-testid="inspector-tools-error">${props.error}</div>
              <button @click=${props.onViewRawText} class="btn" style="margin-top: 12px;">
                View Raw Text
              </button>
            `
            : props.content
              ? html`
                  <div class="sidebar-markdown" data-testid="inspector-tools-markdown">
                    ${unsafeHTML(toSanitizedMarkdownHtml(props.content))}
                  </div>
                `
              : html`
                  <div class="muted" data-testid="inspector-tools-empty">No tool output yet</div>
                `
        }
      </div>
    </div>
  `;
}
