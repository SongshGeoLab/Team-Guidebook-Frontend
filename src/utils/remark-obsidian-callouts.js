/**
 * Remark plugin to transform Obsidian callout syntax to directive syntax.
 */

import { visit } from 'unist-util-visit';

const CALLOUT_TYPES = [
  'note', 'abstract', 'info', 'tip', 'success', 'question',
  'warning', 'failure', 'danger', 'bug', 'example', 'quote'
];

/**
 * Factory that returns the Remark plugin.
 */
export default function remarkObsidianCallouts() {
  return function attacher() {
    return function transformer(tree, file) {
      if (!tree) return tree;
      visit(tree, 'blockquote', (node, index, parent) => {
        if (!parent || typeof index !== 'number' || !node.children || node.children.length === 0) {
          return;
        }

        const firstChild = node.children[0];
        if (firstChild.type !== 'paragraph' || !firstChild.children || firstChild.children.length === 0) {
          return;
        }

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
        
        const calloutMatch = firstParagraphText.match(/^\[!([A-Z]+)\]\s*(.*)$/i);
        if (!calloutMatch) {
          return;
        }

        const calloutType = calloutMatch[1].toLowerCase();
        if (!CALLOUT_TYPES.includes(calloutType)) {
          return;
        }

        const titleText = calloutMatch[2].trim();
        
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
        
        const contentChildren = [];
        
        if (prefixEndIndex < firstChild.children.length) {
          const remainingInFirstParagraph = firstChild.children.slice(prefixEndIndex);
          if (remainingInFirstParagraph.length > 0) {
            contentChildren.push({
              type: 'paragraph',
              children: remainingInFirstParagraph
            });
          }
        }

        for (let i = 1; i < node.children.length; i++) {
          contentChildren.push(node.children[i]);
        }

        const directiveNode = {
          type: 'containerDirective',
          name: calloutType,
          attributes: titleText ? { title: titleText } : {},
          children: contentChildren,
          data: {
              hName: 'aside',
              hProperties: {
                  className: ['admonition', `admonition-${calloutType}`],
                  'data-callout': calloutType
              }
          }
        };

        if (titleText) {
            directiveNode.data.hProperties['data-title'] = titleText;
        }

        parent.children[index] = directiveNode;
      });
      return tree;
    };
  };
}
