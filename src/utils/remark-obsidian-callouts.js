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
  return (tree, file) => {
    // Always return the tree, even if we can't process it
    // Remark plugins must return the tree to maintain the processing pipeline
    if (!tree) return tree;
    visit(tree, 'blockquote', (node, index, parent) => {
      if (!parent || typeof index !== 'number' || !node.children || node.children.length === 0) {
        return;
      }

      // Check if first child is a paragraph starting with [!TYPE]
      const firstChild = node.children[0];
      if (firstChild.type !== 'paragraph' || !firstChild.children || firstChild.children.length === 0) {
        return;
      }

      // Collect all text from the first paragraph to handle Markdown formatting
      // (e.g., > [!INFO] **Bold Title** where **Bold Title** is in separate nodes)
      const extractText = (nodes) => {
        let text = '';
        for (const child of nodes) {
          if (child.type === 'text') {
            text += child.value;
          } else if (child.children) {
            text += extractText(child.children);
          }
        }
        return text;
      };

      const firstParagraphText = extractText(firstChild.children);
      
      // Match [!TYPE] or [!TYPE] Title
      const calloutMatch = firstParagraphText.match(/^\[!([A-Z]+)\]\s*(.*)$/i);
      if (!calloutMatch) {
        return;
      }

      const calloutType = calloutMatch[1].toLowerCase();
      if (!CALLOUT_TYPES.includes(calloutType)) {
        return;
      }

      const titleText = calloutMatch[2].trim();
      
      // Find where the callout prefix ends in the paragraph children
      // This helps us separate the title (if any) from the rest of the content
      // If titleText is empty, the prefix is the entire calloutMatch[0] (e.g., "[!INFO]")
      // If titleText exists, find where it starts in calloutMatch[0]
      const calloutPrefixLength = titleText 
        ? calloutMatch[0].indexOf(titleText) 
        : calloutMatch[0].length;
      
      let charCount = 0;
      let prefixEndIndex = 0;
      for (let i = 0; i < firstChild.children.length; i++) {
        const child = firstChild.children[i];
        const childText = extractText([child]);
        charCount += childText.length;
        if (charCount >= calloutPrefixLength) {
          prefixEndIndex = i + 1;
          break;
        }
      }
      
      // Extract content: everything after the callout prefix in the first paragraph, plus all other paragraphs
      const contentChildren = [];
      
      // If there's content after the callout prefix in the first paragraph, add it
      if (prefixEndIndex < firstChild.children.length) {
        const remainingInFirstParagraph = firstChild.children.slice(prefixEndIndex);
        if (remainingInFirstParagraph.length > 0) {
          contentChildren.push({
            type: 'paragraph',
            children: remainingInFirstParagraph
          });
        }
      }

      // Add all remaining paragraphs from the blockquote
      for (let i = 1; i < node.children.length; i++) {
        contentChildren.push(node.children[i]);
      }

      // Create directive node
      // Use titleText (plain text) for the title attribute
      // The original Markdown formatting in the title will be preserved in the directive
      // and can be processed by rehype plugins if needed
      const directiveNode = {
        type: 'containerDirective',
        name: calloutType,
        attributes: titleText ? { title: titleText } : {},
        children: contentChildren
      };

      // Replace blockquote with directive
      parent.children[index] = directiveNode;
    });
    
    // Always return the tree to maintain the processing pipeline
    return tree;
  };
}

