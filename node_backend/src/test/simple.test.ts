describe('Simple Backend Test', () => {
  it('should pass basic test', () => {
    const result = 2 + 2
    expect(result).toBe(4)
  })

  it('should test environment variable', () => {
    expect(process.env.NODE_ENV).toBe('test')
  })
})
