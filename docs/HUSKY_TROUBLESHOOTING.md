# Husky Pre-commit Troubleshooting

## Issue: Pre-commit Hook Not Working

### Problem

The pre-commit hook wasn't running because:

1. Missing `.husky/_/husky.sh` file
2. Git hook not linked to `.husky/pre-commit`

### Solution Applied

✅ Created `.husky/_/husky.sh`  
✅ Linked `.git/hooks/pre-commit` to `.husky/pre-commit`

### Verify It Works

1. **Check if hook is installed**:

   ```bash
   ls -la .git/hooks/pre-commit
   # Should show: .git/hooks/pre-commit -> ../../.husky/pre-commit
   ```

2. **Test the hook**:

   ```bash
   # Make a small change
   echo "test" >> test-file.txt
   git add test-file.txt

   # Try to commit (should trigger pre-commit)
   git commit -m "test commit"

   # Clean up
   git reset HEAD test-file.txt
   rm test-file.txt
   ```

### If It Still Doesn't Work

1. **Reinstall Husky**:

   ```bash
   npm run prepare
   # or
   npx husky install
   ```

2. **Check Git hook permissions**:

   ```bash
   chmod +x .husky/pre-commit
   chmod +x .husky/_/husky.sh
   ```

3. **Manually link the hook** (if needed):

   ```bash
   ln -sf ../../.husky/pre-commit .git/hooks/pre-commit
   ```

4. **Check if Husky is installed**:

   ```bash
   npm list husky
   ```

5. **Reinstall dependencies**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### Bypass Hook (Not Recommended)

If you need to bypass the hook temporarily:

```bash
git commit --no-verify -m "your message"
```

⚠️ **Warning**: Only use `--no-verify` in emergencies. The pre-commit hook ensures code quality.

### What the Pre-commit Hook Does

1. **Runs lint-staged**:
   - Formats staged files with Prettier
   - Type-checks staged TypeScript files
   - Runs tests for changed files

2. **Full type check**:
   - Checks entire codebase for TypeScript errors

3. **Runs all tests**:
   - Ensures nothing is broken

### Performance Tips

If the hook is too slow:

1. **Optimize lint-staged** (already configured in `.lintstagedrc.json`):
   - Only runs on staged files
   - Uses `--findRelatedTests` to run only relevant tests

2. **Skip full type check** (edit `.husky/pre-commit`):

   ```bash
   # Comment out the full type check if it's too slow
   # npm run type-check
   ```

3. **Skip all tests** (not recommended):
   ```bash
   # Comment out the test run
   # npm test -- --passWithNoTests
   ```

### Common Issues

#### Issue: "command not found: npx"

- **Solution**: Make sure Node.js and npm are installed and in PATH

#### Issue: "husky.sh: No such file or directory"

- **Solution**: Run `npm run prepare` or manually create `.husky/_/husky.sh`

#### Issue: "Permission denied"

- **Solution**:
  ```bash
  chmod +x .husky/pre-commit
  chmod +x .husky/_/husky.sh
  ```

#### Issue: Hook runs but tests fail

- **Solution**: Fix the failing tests before committing

#### Issue: Hook is too slow

- **Solution**: Optimize `.lintstagedrc.json` or skip full checks (see Performance Tips above)
