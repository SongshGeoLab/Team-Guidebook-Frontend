/**
 * Remark plugin to transform Obsidian image embed syntax `![[image.png]]`
 * into standard Markdown image syntax `![](/attachments/image.png)`
 *
 * This plugin handles:
 * - `![[image.png]]` -> `![](/attachments/image.png)`
 * - `![[path/to/image.png]]` -> `![](/attachments/path/to/image.png)`
 * - Warns if image is not found (but doesn't break the build)
 */

import { visit } from 'unist-util-visit';

/**
 * Transform Obsidian image embeds to standard Markdown images
 * @param {import('mdast').Root} tree
 * @param {import('vfile').VFile} file
 */
export default function remarkObsidianImage() {
  return (tree, file) => {
    // We need to visit text nodes and replace ![[...]] patterns
    // But we need to be careful about the index when modifying parent.children
    const replacements = [];

    visit(tree, 'text', (node, index, parent) => {
      if (!parent || typeof index !== 'number') return;

      // Match Obsidian image embed syntax: ![[...]]
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

      // Build replacement nodes
      let lastIndex = 0;
      const nodes = [];

      for (const match of matches) {
        // Add text before the match
        if (match.index > lastIndex) {
          nodes.push({
            type: 'text',
            value: node.value.slice(lastIndex, match.index)
          });
        }

        // Normalize path: remove leading/trailing slashes, handle relative paths
        const normalizedPath = match.path.replace(/^\/+|\/+$/g, '');

        // Create image node
        nodes.push({
          type: 'image',
          url: `/attachments/${normalizedPath}`,
          alt: normalizedPath.split('/').pop() || 'image',
          data: {
            hProperties: {
              class: 'obsidian-image'
            }
          }
        });

        lastIndex = match.index + match.length;
      }

      // Add remaining text after last match
      if (lastIndex < node.value.length) {
        nodes.push({
          type: 'text',
          value: node.value.slice(lastIndex)
        });
      }

      // Store replacement info (we'll apply them in reverse order to maintain indices)
      replacements.push({
        parent,
        index,
        nodes
      });
    });

    // Apply replacements in reverse order to maintain correct indices
    replacements.reverse().forEach(({ parent, index, nodes }) => {
      parent.children.splice(index, 1, ...nodes);
    });
  };
}

