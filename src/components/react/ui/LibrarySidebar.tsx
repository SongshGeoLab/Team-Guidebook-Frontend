import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, FileText, Folder, FolderOpen } from 'lucide-react';
import type { TreeNode } from '../../../utils/libraryTree';
import clsx from 'clsx';

interface LibrarySidebarProps {
  tree: TreeNode;
  currentSlug: string;
  lang: 'zh' | 'en';
  basePath?: string;
}

interface TreeNodeProps {
  node: TreeNode;
  currentSlug: string;
  lang: 'zh' | 'en';
  basePath: string;
  level: number;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
}

function TreeNodeComponent({
  node,
  currentSlug,
  lang,
  basePath,
  level,
  expandedPaths,
  onToggle,
}: TreeNodeProps) {
  const isExpanded = expandedPaths.has(node.slug);
  const isActive = node.slug === currentSlug;
  const hasChildren = node.children.length > 0;
  const isDirectory = !node.isFile;

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasChildren) {
      onToggle(node.slug);
    }
  };

  const href = node.isFile ? `${basePath}/${node.slug}` : '#';
  const displayName = node.title || node.name;

  return (
    <div>
      <div
        className={clsx(
          'flex items-center gap-2 py-1.5 px-2 rounded-md text-sm transition-colors',
          'hover:bg-white/5',
          isActive && 'bg-teal-500/20 text-teal-200 border-l-2 border-teal-500',
          !isActive && 'text-gray-300'
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {hasChildren ? (
          <button
            onClick={handleToggle}
            className="flex items-center justify-center w-4 h-4 hover:bg-white/10 rounded transition-colors"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-gray-400" />
            ) : (
              <ChevronRight className="w-3 h-3 text-gray-400" />
            )}
          </button>
        ) : (
          <div className="w-4" />
        )}

        {isDirectory ? (
          isExpanded ? (
            <FolderOpen className="w-4 h-4 text-teal-400/60 flex-shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-teal-400/60 flex-shrink-0" />
          )
        ) : (
          <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
        )}

        {node.isFile ? (
          <a
            href={href}
            className={clsx(
              'flex-1 truncate',
              isActive && 'font-medium',
              !isActive && 'hover:text-white'
            )}
          >
            {displayName}
          </a>
        ) : (
          <span className="flex-1 truncate font-medium text-gray-400">{displayName}</span>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeNodeComponent
              key={child.slug}
              node={child}
              currentSlug={currentSlug}
              lang={lang}
              basePath={basePath}
              level={level + 1}
              expandedPaths={expandedPaths}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Slugs of every ancestor of `targetSlug`, so the sidebar can auto-expand down
 * to the current page. Module-level: this exact 30-line traversal used to be
 * copy-pasted twice inside the component, once for the initial state and once
 * in the effect that reacts to navigation.
 */
function collectAncestorPaths(tree: TreeNode, targetSlug: string): Set<string> {
  const paths = new Set<string>();

  const walk = (node: TreeNode): boolean => {
    if (node.slug && (targetSlug === node.slug || targetSlug.startsWith(node.slug + '/'))) {
      paths.add(node.slug);
      for (const child of node.children) {
        if (targetSlug === child.slug || targetSlug.startsWith(child.slug + '/')) {
          walk(child);
          break;
        }
      }
      return true;
    }

    for (const child of node.children) {
      if (walk(child)) {
        if (node.slug) paths.add(node.slug);
        return true;
      }
    }
    return false;
  };

  walk(tree);
  return paths;
}

export function LibrarySidebar({ tree, currentSlug, lang, basePath = '' }: LibrarySidebarProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() =>
    collectAncestorPaths(tree, currentSlug)
  );

  const handleToggle = (slug: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  };

  // Re-expand when navigation changes the current page.
  useEffect(() => {
    setExpandedPaths(collectAncestorPaths(tree, currentSlug));
  }, [currentSlug, tree]);

  if (!tree.children.length) {
    return null;
  }

  return (
    <aside className="w-full lg:w-64 flex-shrink-0 lg:border-r border-white/10 lg:pr-6 pb-8 lg:pb-0">
      <div className="lg:sticky lg:top-8">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 px-2">
          {lang === 'zh' ? '目录' : 'Table of Contents'}
        </h2>
        <nav className="space-y-1 max-h-[calc(100vh-12rem)] overflow-y-auto">
          {tree.children.map((child) => (
            <TreeNodeComponent
              key={child.slug}
              node={child}
              currentSlug={currentSlug}
              lang={lang}
              basePath={basePath}
              level={0}
              expandedPaths={expandedPaths}
              onToggle={handleToggle}
            />
          ))}
        </nav>
      </div>
    </aside>
  );
}

