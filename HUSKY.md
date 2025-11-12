# Husky Pre-commit Hooks

This project uses [Husky](https://typicode.github.io/husky/) to run quality checks before commits.

## What Runs on Commit

When you commit code, the following checks run automatically:

1. **Format staged files** - Prettier formats all staged `.ts`, `.json`, and `.md` files
2. **Type check staged files** - TypeScript type checking on staged `.ts` files
3. **Test related files** - Jest runs tests related to staged files
4. **Full type check** - Complete TypeScript type check across the entire codebase
5. **Run all tests** - All unit tests are executed

If any check fails, the commit is blocked until issues are resolved.

## Setup

Husky is automatically set up when you run:

```bash
npm install
```

The `prepare` script in `package.json` initializes Husky automatically.

## Manual Setup

If you need to set up Husky manually:

```bash
# Install dependencies
npm install

# Initialize Husky
npx husky install

# The pre-commit hook is already created in .husky/pre-commit
```

## Configuration

### Pre-commit Hook

The pre-commit hook (`.husky/pre-commit`) runs:

- `lint-staged` for staged file checks
- Full type check
- All tests

### Lint-staged Configuration

Lint-staged (`.lintstagedrc.json`) runs on staged files:

- **Format**: Prettier formats staged files
- **Type check**: TypeScript checks staged `.ts` files
- **Test**: Jest runs tests related to staged files

## Bypassing Hooks (Not Recommended)

If you need to bypass hooks in an emergency (not recommended):

```bash
git commit --no-verify -m "Emergency commit"
```

**Warning**: Only use this in true emergencies. The hooks exist to maintain code quality.

## Troubleshooting

### Hook not running

1. Ensure Husky is installed: `npm install`
2. Check if `.husky/pre-commit` exists and is executable
3. Verify Git hooks are enabled: `git config core.hooksPath`

### Tests failing

Fix failing tests before committing. The hook will show which tests failed.

### Type errors

Fix TypeScript errors before committing. The hook will show type errors.

### Formatting issues

Prettier will auto-format files, but if there are issues:

```bash
npm run format
git add .
git commit
```

## Disabling Hooks Temporarily

If you need to disable hooks temporarily (e.g., for a large refactor):

1. Comment out the commands in `.husky/pre-commit`
2. Or use `--no-verify` flag (not recommended)

Remember to re-enable hooks before pushing to the repository.

## CI/CD Integration

The same checks run in CI/CD pipelines:

- `npm run format:check` - Verify formatting
- `npm run type-check` - Verify types
- `npm run test:ci` - Run tests with coverage

This ensures code quality is maintained both locally and in CI.
