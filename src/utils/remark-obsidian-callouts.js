/**
 * Remark plugin to transform Obsidian callout syntax to directive syntax.
 *
 * Obsidian callouts use:
 * > [!INFO] Title
 * > Content here
 *
 * This plugin converts them to:
 * :::info[Title]
 * Content here
 * :::
 *
 * Which can then be processed by remark-directive and rehype-callouts.
 */

import { visit } from 'unist-util-visit';

/**
 * Map Obsidian callout types (case-insensitive)
 */
const CALLOUT_TYPES = [
  'note', 'abstract', 'info', 'tip', 'success', 'question',
  'warning', 'failure', 'danger', 'bug', 'example', 'quote'
];

/**
 * Transform Obsidian callouts to directive format
 * @param {import('mdast').Root} tree
 */
export default function remarkObsidianCallouts() {
  return (tree) => {
    visit(tree, 'blockquote', (node, index, parent) => {
      if (!parent || typeof index !== 'number' || !node.children || node.children.length === 0) {
        return;
      }

      // Check if first child is a paragraph starting with [!TYPE]
      const firstChild = node.children[0];
      if (firstChild.type !== 'paragraph' || !firstChild.children || firstChild.children.length === 0) {
        return;
      }

      const firstText = firstChild.children[0];
      if (firstText.type !== 'text') {
        return;
      }

      // Match [!TYPE] or [!TYPE] Title
      const calloutMatch = firstText.value.match(/^\[!([A-Z]+)\]\s*(.*)$/i);
      if (!calloutMatch) {
        return;
      }

      const calloutType = calloutMatch[1].toLowerCase();
      if (!CALLOUT_TYPES.includes(calloutType)) {
        return;
      }

      const title = calloutMatch[2].trim();

      // Extract content: everything after the first paragraph (which contains [!TYPE])
      const contentChildren = [];
      
      // If title exists and there's more content in the first paragraph, extract it
      if (title && firstChild.children.length > 1) {
        // Title is in the same paragraph, create a new paragraph with remaining content
        const remainingContent = firstChild.children.slice(1);
        if (remainingContent.length > 0) {
          contentChildren.push({
            type: 'paragraph',
            children: remainingContent
          });
        }
      }

      // Add all remaining paragraphs from the blockquote
      for (let i = 1; i < node.children.length; i++) {
        contentChildren.push(node.children[i]);
      }

      // If no title but there's content in the first paragraph after [!TYPE], use it as content
      if (!title && firstChild.children.length > 1) {
        const remainingContent = firstChild.children.slice(1);
        if (remainingContent.length > 0) {
          contentChildren.unshift({
            type: 'paragraph',
            children: remainingContent
          });
        }
      }

      // Create directive node
      const directiveNode = {
        type: 'containerDirective',
        name: calloutType,
        attributes: title ? { title } : {},
        children: contentChildren
      };

      // Replace blockquote with directive
      parent.children[index] = directiveNode;
    });
  };
}

