import type { Rule } from 'eslint'
import type { Node } from 'estree'

// ── Rule.Node extensions ─────────────────────────────────────────────────────
// Use when working in ESLint rule visitor context (Rule.Node includes ESLint's
// parent/range/loc extensions on top of the base estree Node).

/** Rule.Node carrying the ESLint parent pointer for upward traversal. */
export type NodeWithParent = Rule.Node & { parent?: Rule.Node }

/** Rule.Node typed as a call expression — exposes its argument list. */
export type NodeWithArgs = Rule.Node & { arguments: Rule.Node[] }

/** Rule.Node typed as a function/arrow — exposes its single body node. */
export type NodeWithBody = Rule.Node & { body: Rule.Node }

/** Rule.Node typed as a block statement — exposes its statement list. */
export type NodeWithStatements = Rule.Node & { body: Rule.Node[] }

/** Rule.Node typed as an expression statement — exposes its expression. */
export type NodeWithExpression = Rule.Node & { expression: Rule.Node }

/** Rule.Node typed as a call expression — exposes callee and argument list. */
export type NodeWithCallee = Rule.Node & { callee: Rule.Node; arguments: Rule.Node[] }

/** Rule.Node typed as an identifier — exposes its name string. */
export type NodeWithName = Rule.Node & { name: string }

/** Rule.Node typed as a binary/logical expression — exposes left and right operands. */
export type NodeWithOperands = Rule.Node & { left: Rule.Node; right: Rule.Node }

/** Rule.Node typed as a template literal — exposes its interpolated expressions. */
export type NodeWithTemplateExprs = Rule.Node & { expressions: Rule.Node[] }

// ── estree Node narrowings ───────────────────────────────────────────────────
// Use in AST traversal helpers that receive plain estree Node (no ESLint extensions).

/** CallExpression — exposes callee only. */
export type CallNode = Node & { callee: Node }

/** CallExpression — exposes callee and full argument list. */
export type CallWithArgsNode = Node & { callee: Node; arguments: Node[] }

/** MemberExpression — exposes object and property. */
export type MemberNode = Node & { object: Node; property: Node }

/** Identifier — exposes its name string. */
export type IdentifierNode = Node & { name: string }

/** ReturnStatement — exposes its argument (may be absent). */
export type ReturnNode = Node & { argument: unknown }

/** ExpressionStatement — exposes its expression. */
export type ExprStmtNode = Node & { expression: Node }

/** Literal — exposes its value. */
export type LiteralNode = Node & { value: unknown }

/** ArrayExpression — exposes its element list. */
export type ArrayExprNode = Node & { elements: unknown[] }

/** ObjectExpression — exposes its property list. */
export type ObjectExprNode = Node & { properties: unknown[] }
