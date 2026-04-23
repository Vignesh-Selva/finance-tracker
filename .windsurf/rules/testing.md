---
trigger: model_decision
description: Apply when writing or editing tests
---
1. Use Vitest for all tests
2. Test files live in client/tests/
3. All exported functions must have at least one test case
4. Follow AAA pattern (Arrange, Act, Assert)
5. Use descriptive test names that explain what is being tested
6. Use describe blocks to group related tests
7. Use beforeEach and afterEach for test setup and teardown
8. Mock external dependencies using vi.mock() and vi.spyOn()
9. Use vi.useFakeTimers() for testing setTimeout and setInterval
10. Always call vi.restoreAllMocks() after each test suite
11. Test edge cases and error scenarios
12. Maintain 80%+ test coverage for critical functions
13. Never commit test.only() — remove it after debugging