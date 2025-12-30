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
      // After remark-directive-rehype, directives become div elements with data-name
      if (node.type === 'element' && node.tagName === 'div' && node.properties?.dataName) {
        const calloutType = (node.properties.dataName || '').toLowerCase();
        const title = node.properties.dataTitle || '';

        if (CALLOUT_TYPES[calloutType] || CALLOUT_TYPES[calloutType.toUpperCase()]) {
          const normalizedType = CALLOUT_TYPES[calloutType] || CALLOUT_TYPES[calloutType.toUpperCase()] || 'note';

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
      // Also handle raw directive nodes (fallback, in case remark-directive-rehype didn't process them)
      else if (
        node.type === 'containerDirective' ||
        (node.type === 'textDirective' && node.name === 'admonition')
      ) {
        const calloutType = (node.name || '').toLowerCase();
        const title = node.attributes?.title || node.attributes?.name || '';

        if (CALLOUT_TYPES[calloutType] || CALLOUT_TYPES[calloutType.toUpperCase()]) {
          const normalizedType = CALLOUT_TYPES[calloutType] || CALLOUT_TYPES[calloutType.toUpperCase()] || 'note';

          // Transform to HTML structure
          node.type = 'element';
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
  };
}

