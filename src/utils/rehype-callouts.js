/**
 * Rehype plugin to transform Obsidian callouts (via remark-directive)
 * into styled HTML elements.
 *
 * Obsidian callouts use the syntax:
 * > [!INFO] Title
 * > Content here
 *
 * Which remark-directive converts to:
 * :::info[Title]
 * Content here
 * :::
 *
 * This plugin transforms those directives into semantic HTML.
 */

import { visit } from 'unist-util-visit';

/**
 * Map Obsidian callout types to CSS classes
 */
const CALLOUT_TYPES = {
  note: 'note',
  abstract: 'abstract',
  info: 'info',
  tip: 'tip',
  success: 'success',
  question: 'question',
  warning: 'warning',
  failure: 'failure',
  danger: 'danger',
  bug: 'bug',
  example: 'example',
  quote: 'quote',
  // Obsidian uses uppercase, but we normalize to lowercase
  NOTE: 'note',
  ABSTRACT: 'abstract',
  INFO: 'info',
  TIP: 'tip',
  SUCCESS: 'success',
  QUESTION: 'question',
  WARNING: 'warning',
  FAILURE: 'failure',
  DANGER: 'danger',
  BUG: 'bug',
  EXAMPLE: 'example',
  QUOTE: 'quote'
};

/**
 * Transform directive nodes into callout HTML
 * @param {import('hast').Root} tree
 */
export default function rehypeCallouts() {
  return (tree) => {
    visit(tree, (node) => {
      // After remark-directive-rehype, directives become HTML elements with tagName
      // set to the directive name (e.g., 'info', 'warning', 'note') instead of 'div'
      if (node.type === 'element' && node.tagName) {
        // Two ways in, and matching only the first one is why Obsidian callout
        // titles never rendered:
        //  - a hand-written `:::info` directive arrives with tagName 'info';
        //  - remark-obsidian-callouts already emits <aside data-callout="info">,
        //    so its tagName is 'aside' and never matched the type table.
        const fromTagName = (node.tagName || '').toLowerCase();
        const fromData = String(
          node.properties?.dataCallout ?? node.properties?.['data-callout'] ?? ''
        ).toLowerCase();
        const calloutType = CALLOUT_TYPES[fromData] ? fromData : fromTagName;

        if (CALLOUT_TYPES[calloutType] || CALLOUT_TYPES[calloutType.toUpperCase()]) {
          const normalizedType = CALLOUT_TYPES[calloutType] || CALLOUT_TYPES[calloutType.toUpperCase()] || 'note';

          // Already processed (idempotent guard: the aside path can be revisited)
          if (node.children?.[0]?.properties?.class === 'admonition-title') return;

          // Extract title from data-title attribute or from first child if it's a text node
          let title = node.properties?.dataTitle || node.properties?.['data-title'] || '';

          // Fallback only for the hand-written `:::info` form. When the node
          // came from remark-obsidian-callouts it carries data-callout, and an
          // absent data-title means the author genuinely wrote no title —
          // promoting the body's first line would steal content.
          const isObsidianCallout = Boolean(fromData);

          // Remove ONLY the text node used as the title. Slicing off the whole
          // <p> silently deleted the rest of the line, e.g. the bold run and
          // trailing words in `:::info` + `Hello **world** and more`.
          if (!title && !isObsidianCallout && node.children && node.children.length > 0) {
            const firstChild = node.children[0];
            if (firstChild.type === 'element' && firstChild.tagName === 'p' && firstChild.children) {
              const firstText = firstChild.children.find(child => child.type === 'text');
              if (firstText && firstText.value.trim()) {
                title = firstText.value.trim();
                firstChild.children = firstChild.children.filter(child => child !== firstText);
                if (firstChild.children.length === 0) {
                  node.children = node.children.slice(1);
                }
              }
            }
          }

          // Transform to callout HTML structure
          node.tagName = 'aside';
          node.properties = {
            class: `admonition admonition-${normalizedType}`,
            'data-callout': normalizedType
          };

          // Build children: title (if exists) + content
          const children = [];

          if (title) {
            children.push({
              type: 'element',
              tagName: 'p',
              properties: {
                class: 'admonition-title'
              },
              children: [
                {
                  type: 'text',
                  value: title
                }
              ]
            });
          }

          // Add existing children (the callout content)
          if (node.children) {
            children.push(...node.children);
          }

          node.children = children;
        }
      }
    });
    
    // Always return the tree to maintain the processing pipeline
    return tree;
  };
}

