import plugin from '@/index'

const RULE_NAMES = [
  'no-derived-state',
  'no-effect-memo',
  'no-effect-event-handler',
  'no-effect-reset-state',
  'no-effect-adjust-state',
  'no-effect-post-action',
  'no-effect-chain',
  'no-effect-notify-parent',
  'no-effect-pass-data-parent',
  'no-effect-app-init',
] as const

describe('plugin', () => {
  it('exports all 10 rules', () => {
    for (const name of RULE_NAMES) {
      expect(plugin.rules).toHaveProperty(name)
    }
    expect(Object.keys(plugin.rules)).toHaveLength(10)
  })

  describe('configs.flat/recommended', () => {
    const flat = plugin.configs['flat/recommended']

    it('registers the plugin under react-effectless', () => {
      expect(flat.plugins).toHaveProperty('react-effectless')
    })

    it('sets all rules to warn', () => {
      for (const name of RULE_NAMES) {
        expect(flat.rules[`react-effectless/${name}`]).toBe('warn')
      }
    })

    it('has exactly 10 rule entries', () => {
      expect(Object.keys(flat.rules)).toHaveLength(10)
    })
  })

  describe('configs.recommended (legacy)', () => {
    const legacy = plugin.configs.recommended

    it('lists react-effectless in plugins', () => {
      expect(legacy.plugins).toContain('react-effectless')
    })

    it('sets all rules to warn', () => {
      for (const name of RULE_NAMES) {
        expect(legacy.rules[`react-effectless/${name}`]).toBe('warn')
      }
    })

    it('has exactly 10 rule entries', () => {
      expect(Object.keys(legacy.rules)).toHaveLength(10)
    })
  })
})
