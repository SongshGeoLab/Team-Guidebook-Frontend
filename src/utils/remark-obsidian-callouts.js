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

        // The marker lives on the FIRST LINE only. Matching against the whole
        // flattened paragraph made `\s*` swallow the newline, so a callout
        // whose body started on the next line either failed to match (when it
        // had a title) or promoted its body text to the title (when it did not).
        const firstNode = firstChild.children[0];
        if (!firstNode || firstNode.type !== 'text') {
          return;
        }

        const newlineAt = firstNode.value.indexOf('\n');
        const firstLine = newlineAt === -1 ? firstNode.value : firstNode.value.slice(0, newlineAt);

        const calloutMatch = firstLine.match(/^\[!([A-Za-z]+)\]\s*(.*)$/);
        if (!calloutMatch) {
          return;
        }

        const calloutType = calloutMatch[1].toLowerCase();
        if (!CALLOUT_TYPES.includes(calloutType)) {
          return;
        }

        const titleText = calloutMatch[2].trim();

        // Drop the consumed first line from the text node, keeping whatever
        // followed it. Removing the whole node (or the whole paragraph) is what
        // used to delete body content.
        const remainder = newlineAt === -1 ? '' : firstNode.value.slice(newlineAt + 1);
        if (remainder) {
          firstNode.value = remainder;
        } else {
          firstChild.children = firstChild.children.slice(1);
        }

        const contentChildren = [];
        if (firstChild.children.length > 0) {
          contentChildren.push(firstChild);
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
