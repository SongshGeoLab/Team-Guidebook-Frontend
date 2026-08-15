import { describe, expect, it } from 'vitest';
import { buildLibraryTree, type TreeNode } from '../src/utils/libraryTree';

const names = (node: TreeNode) => node.children.map((c) => c.name);

describe('buildLibraryTree', () => {
  it('nests entries by path segment', () => {
    const root = buildLibraryTree([
      { id: '词条/Git', slug: '词条/Git', title: 'Git' },
      { id: '词条/Obsidian', slug: '词条/Obsidian', title: 'Obsidian' },
    ]);
    expect(names(root)).toEqual(['词条']);
    expect(names(root.children[0])).toEqual(['Git', 'Obsidian']);
    expect(root.children[0].isFile).toBe(false);
    expect(root.children[0].children[0].isFile).toBe(true);
  });

  it('carries the full path on every node, so a node can build its own href', () => {
    const root = buildLibraryTree([{ id: 'a/b/c', slug: 'a/b/c', title: 'C' }]);
    expect(root.children[0].fullPath).toBe('a');
    expect(root.children[0].children[0].fullPath).toBe('a/b');
    expect(root.children[0].children[0].children[0].fullPath).toBe('a/b/c');
  });

  it('sorts directories before files at every level', () => {
    const root = buildLibraryTree([
      { id: 'zebra', slug: 'zebra', title: 'Zebra' },
      { id: '专栏/one', slug: '专栏/one', title: 'One' },
      { id: 'alpha', slug: 'alpha', title: 'Alpha' },
    ]);
    // 专栏 is a directory, so it leads regardless of alphabetical order.
    expect(names(root)).toEqual(['专栏', 'alpha', 'zebra']);
  });

  it('sorts numerically so Week10 follows Week9', () => {
    const root = buildLibraryTree([
      { id: 'w/Week10', slug: 'w/Week10', title: 'Week10' },
      { id: 'w/Week9', slug: 'w/Week9', title: 'Week9' },
      { id: 'w/Week1', slug: 'w/Week1', title: 'Week1' },
    ]);
    expect(names(root.children[0])).toEqual(['Week1', 'Week9', 'Week10']);
  });

  it('merges a directory that is also a page rather than duplicating the node', () => {
    // 专栏/Python4Science both has children and its own index entry.
    const root = buildLibraryTree([
      { id: '专栏/Python', slug: '专栏/Python', title: 'Python' },
      { id: '专栏/Python/Week1', slug: '专栏/Python/Week1', title: 'Week1' },
    ]);
    const column = root.children[0];
    expect(names(column)).toEqual(['Python']);
    expect(column.children[0].children).toHaveLength(1);
  });

  it('returns a bare root for no items', () => {
    expect(buildLibraryTree([]).children).toEqual([]);
  });
});
