/**
 * Remark plugin to transform Obsidian image embed syntax `![[image.png]]`
 * into standard Markdown image syntax `![](/attachments/image.png)`
 */

import { visit } from 'unist-util-visit';

/**
 * Factory that returns the Remark plugin.
 */
export default function remarkObsidianImage() {
  return function attacher() {
    return function transformer(tree, file) {
      if (!tree) return tree;
      const replacements = [];

      visit(tree, 'text', (node, index, parent) => {
        if (!parent || typeof index !== 'number') return;

        const imageEmbedRegex = /!\[\[([^\]]+)\]\]/g;
        const matches = [];
        let match;

        while ((match = imageEmbedRegex.exec(node.value)) !== null) {
          matches.push({
            index: match.index,
            length: match[0].length,
            path: match[1].trim()
          });
        }

        if (matches.length === 0) return;

        let lastIndex = 0;
        const nodes = [];

        for (const match of matches) {
          if (match.index > lastIndex) {
            nodes.push({
              type: 'text',
              value: node.value.slice(lastIndex, match.index)
            });
          }

          const normalizedPath = match.path.replace(/^\/+|\/+$/g, '');

          nodes.push({
            type: 'image',
            url: `/attachments/${normalizedPath}`,
            alt: normalizedPath.split('/').pop() || 'image',
            data: {
              hProperties: {
                className: ['obsidian-image']
              }
            }
          });

          lastIndex = match.index + match.length;
        }

        if (lastIndex < node.value.length) {
          nodes.push({
            type: 'text',
            value: node.value.slice(lastIndex)
          });
        }

        replacements.push({
          parent,
          index,
          nodes
        });
      });

      replacements.reverse().forEach(({ parent, index, nodes }) => {
        parent.children.splice(index, 1, ...nodes);
      });
      
      return tree;
    };
  };
}
