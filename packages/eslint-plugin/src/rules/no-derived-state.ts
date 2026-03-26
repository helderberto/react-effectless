import type { Rule } from 'eslint'

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: {
      noDerivedState: 'Derive this value during render instead of syncing it with useEffect.',
    },
  },
  create: () => ({}),
}

export default rule
