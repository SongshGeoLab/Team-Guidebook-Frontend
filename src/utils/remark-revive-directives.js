/**
 * Turn unhandled remark-directive nodes back into the literal text the author
 * wrote.
 *
 * remark-directive claims `:name` as *text directive* syntax. That is fine for
 * the `:::info` container form we actually use, but it also swallows any colon
 * followed by word characters — and a daily-note bullet routinely starts with a
 * time:
 *
 *     - 19:15 今天设计了一下团队的文档库
 *
 * `:15` parses as a text directive named "15", so the line rendered as a bare
 * "19" with the rest of the sentence attached to a node nothing consumes. Only
 * container directives are meaningful here (callouts), so any text or leaf
 * directive that survives to this point was never markup — restore it verbatim.
 */

import { visit } from 'unist-util-visit';

/** Rebuild the source text for a directive node. */
function toLiteral(node) {
  const marker = node.type === 'leafDirective' ? '::' : ':';
  let text = `${marker}${node.name}`;

  const attrs = node.attributes ?? {};
  const id = attrs.id ? `#${attrs.id}` : '';
  const className = attrs.class ? `.${attrs.class.split(/\s+/).join('.')}` : '';
  const rest = Object.entries(attrs)
    .filter(([key]) => key !== 'id' && key !== 'class')
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');
  const inside = [id, className, rest].filter(Boolean).join(' ');
  if (inside) text += `{${inside}}`;

  return text;
}

export default function remarkReviveDirectives() {
  return function attacher() {
    return function transformer(tree) {
      visit(tree, (node, index, parent) => {
        if (!parent || typeof index !== 'number') return;
        if (node.type !== 'textDirective' && node.type !== 'leafDirective') return;

        // The label (`[...]`) parses into children; keep whatever is in there
        // after the restored marker, so no content is lost either way.
        const replacement = [{ type: 'text', value: toLiteral(node) }];
        if (Array.isArray(node.children) && node.children.length > 0) {
          replacement.push(...node.children);
        }
        parent.children.splice(index, 1, ...replacement);
        return index + replacement.length;
      });
      return tree;
    };
  };
}
