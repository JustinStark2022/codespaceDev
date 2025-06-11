import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

describe('Simple Test', () => {
  it('should pass basic test', () => {
    const div = document.createElement('div')
    div.textContent = 'Hello World'
    expect(div.textContent).toBe('Hello World')
  })
})
