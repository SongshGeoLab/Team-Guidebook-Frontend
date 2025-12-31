/**
 * Utility functions for building Library navigation tree structure.
 */

export interface TreeNode {
  name: string;
  slug: string;
  fullPath: string;
  children: TreeNode[];
  isFile: boolean;
  title?: string;
}

/**
 * Build a tree structure from library items.
 * @param items Array of library items with id and slug
 * @returns Root tree node with nested structure
 */
export function buildLibraryTree(items: Array<{ id: string; slug: string; title?: string }>): TreeNode {
  const root: TreeNode = {
    name: 'root',
    slug: '',
    fullPath: '',
    children: [],
    isFile: false,
  };

  for (const item of items) {
    const pathParts = item.slug.split('/').filter((p) => p);
    let current = root;

    // Build path segments
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      const isLast = i === pathParts.length - 1;
      const fullPath = pathParts.slice(0, i + 1).join('/');

      // Find or create node
      let node = current.children.find((n) => n.name === part);
      if (!node) {
        node = {
          name: part,
          slug: fullPath,
          fullPath,
          children: [],
          isFile: isLast,
          title: isLast ? item.title : undefined,
        };
        current.children.push(node);
      }

      // Update title if this is a file
      if (isLast && item.title) {
        node.title = item.title;
        node.isFile = true;
      }

      current = node;
    }
  }

  // Sort children: directories first, then files, both alphabetically
  function sortNode(node: TreeNode) {
    node.children.sort((a, b) => {
      if (a.isFile !== b.isFile) {
        return a.isFile ? 1 : -1; // Directories first
      }
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });

    // Recursively sort children
    for (const child of node.children) {
      if (!child.isFile) {
        sortNode(child);
      }
    }
  }

  sortNode(root);
  return root;
}

/**
 * Find a node in the tree by slug.
 * @param tree Root tree node
 * @param slug Slug to find
 * @returns Found node or null
 */
export function findNodeBySlug(tree: TreeNode, slug: string): TreeNode | null {
  if (tree.slug === slug) {
    return tree;
  }

  for (const child of tree.children) {
    const found = findNodeBySlug(child, slug);
    if (found) {
      return found;
    }
  }

  return null;
}

/**
 * Get the path from root to a node (breadcrumb).
 * @param tree Root tree node
 * @param slug Slug to find
 * @returns Array of nodes from root to target
 */
export function getPathToNode(tree: TreeNode, slug: string): TreeNode[] {
  const path: TreeNode[] = [];

  function traverse(node: TreeNode, targetSlug: string): boolean {
    path.push(node);

    if (node.slug === targetSlug) {
      return true;
    }

    for (const child of node.children) {
      if (traverse(child, targetSlug)) {
        return true;
      }
    }

    path.pop();
    return false;
  }

  traverse(tree, slug);
  return path;
}

