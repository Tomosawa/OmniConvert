import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { Button } from '@/components/ui/button'

describe('components/ui/Button', () => {
  it('renders default slot text', () => {
    const wrapper = mount(Button, { slots: { default: 'Click me' } })
    expect(wrapper.text()).toBe('Click me')
  })

  it('applies the default variant classes', () => {
    const wrapper = mount(Button, { slots: { default: 'go' } })
    const cls = wrapper.attributes('class') ?? ''
    expect(cls).toContain('bg-primary')
    expect(cls).toContain('h-10')
  })

  it('switches to outline variant when requested', () => {
    const wrapper = mount(Button, {
      props: { variant: 'outline' },
      slots: { default: 'go' },
    })
    const cls = wrapper.attributes('class') ?? ''
    expect(cls).toContain('border')
    expect(cls).toContain('bg-background')
  })

  it('respects size=icon (square)', () => {
    const wrapper = mount(Button, {
      props: { size: 'icon' },
      slots: { default: 'X' },
    })
    const cls = wrapper.attributes('class') ?? ''
    expect(cls).toContain('h-10')
    expect(cls).toContain('w-10')
  })

  it('honors disabled attribute', () => {
    const wrapper = mount(Button, {
      props: { disabled: true },
      slots: { default: 'go' },
    })
    expect(wrapper.attributes('disabled')).toBeDefined()
  })

  it('emits click events', async () => {
    const wrapper = mount(Button, { slots: { default: 'go' } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
  })
})
