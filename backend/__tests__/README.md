# Backend Tests

This directory contains unit tests for the backend components of the PDF chatbot application.

## Test Structure

The test files are organized to mirror the source code structure:

```
__tests__/
├── ingestion_graph/
│   └── state.test.ts       # Tests for ingestion graph state management
├── retrieval_graph/
│   ├── state.test.ts       # Tests for retrieval graph state management
│   └── utils.test.ts       # Tests for retrieval graph utilities
└── shared/
    └── state.test.ts       # Tests for shared state utilities
```

## Running Tests

To run the tests, use one of the following commands from the `backend` directory:

```bash
# Run all unit tests
npm test

# Run integration tests
npm run test:int

# Run tests with coverage
npm test -- --coverage
```

## Testing Approach

1. **Unit Testing**: Each component is tested in isolation, with external dependencies mocked when necessary.
2. **State Management**: Tests focus on state transitions and data transformations.
3. **Document Handling**: Comprehensive tests for document processing and metadata management.
4. **Edge Cases**: Tests include handling of empty/invalid inputs and error conditions.

## Test Categories

- **State Management Tests**: Verify the behavior of state reducers and annotations
- **Document Processing Tests**: Validate document formatting and metadata handling
- **Utility Function Tests**: Ensure helper functions work correctly
- **Integration Tests**: Test interactions between components (in separate `.int.test.ts` files)

## Mocking Strategy

- External API calls are mocked using Jest's mocking capabilities
- Document objects are created with test data
- UUIDs and other random values are predictable in tests

## Adding New Tests

When adding new tests:

1. Create test files with the `.test.ts` extension
2. Follow the existing directory structure
3. Include both positive and negative test cases
4. Mock external dependencies appropriately
5. Ensure tests are isolated and don't depend on external state 