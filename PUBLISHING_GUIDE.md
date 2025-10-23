# Publishing Guide

This guide will walk you through publishing your `next-supabase-clerk-setup` package to npm and GitHub Packages.

## 📋 Pre-Publishing Checklist

Before publishing, ensure you have:

- [ ] ✅ Package builds successfully (`npm run build`)
- [ ] ✅ All tests pass (if any)
- [ ] ✅ Documentation is complete
- [ ] ✅ Version number is correct in `package.json`
- [ ] ✅ Repository is clean (no uncommitted changes)
- [ ] ✅ All files are committed and pushed to GitHub

## 🚀 Publishing to npm (Recommended)

### Step 1: Create npm Account

1. Go to [npmjs.com](https://www.npmjs.com/)
2. Click "Sign Up" and create an account
3. Verify your email address

### Step 2: Login to npm

```bash
npm login
```

Enter your npm username, password, and email when prompted.

### Step 3: Verify Package

```bash
# Check if package name is available
npm view next-supabase-clerk-setup

# If it returns 404, the name is available
# If it returns package info, you'll need to choose a different name
```

### Step 4: Update Package Information

Edit your `package.json` to ensure all information is correct:

```json
{
  "name": "next-supabase-clerk-setup",
  "version": "1.0.0",
  "description": "Automated setup package for integrating Supabase and Clerk with Next.js projects",
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/next-supabase-clerk-setup.git"
  },
  "bugs": {
    "url": "https://github.com/yourusername/next-supabase-clerk-setup/issues"
  },
  "homepage": "https://github.com/yourusername/next-supabase-clerk-setup#readme",
  "keywords": [
    "nextjs",
    "supabase",
    "clerk",
    "authentication",
    "setup",
    "boilerplate",
    "typescript"
  ]
}
```

### Step 5: Build and Publish

```bash
# Build the package
npm run build

# Publish to npm
npm publish
```

### Step 6: Verify Publication

```bash
# Check your package on npm
npm view next-supabase-clerk-setup

# Test installation
npm install -g next-supabase-clerk-setup
```

## 📦 Publishing to GitHub Packages

### Step 1: Create GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Select scopes: `write:packages`, `read:packages`, `delete:packages`
4. Copy the generated token

### Step 2: Configure npm for GitHub Packages

Create or update `.npmrc` file in your project root:

```
@yourusername:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

### Step 3: Update package.json

```json
{
  "name": "@yourusername/next-supabase-clerk-setup",
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}
```

### Step 4: Publish to GitHub Packages

```bash
npm publish
```

## 🔄 Publishing Updates

### Version Management

```bash
# Patch version (1.0.0 → 1.0.1)
npm version patch

# Minor version (1.0.0 → 1.1.0)
npm version minor

# Major version (1.0.0 → 2.0.0)
npm version major
```

### Publishing Updates

```bash
# After version bump
npm run build
npm publish
```

## 🏷️ Release Management

### Creating GitHub Releases

1. Go to your GitHub repository
2. Click "Releases" → "Create a new release"
3. Choose a tag (e.g., `v1.0.0`)
4. Add release notes
5. Publish the release

### Automated Releases with GitHub Actions

Your existing CI workflow will automatically:
- Run tests on push/PR
- Publish to npm on main branch push
- Create GitHub releases

## 📊 Post-Publishing Tasks

### 1. Update Documentation

- Update README.md with installation instructions
- Add usage examples
- Update changelog

### 2. Promote Your Package

- Share on social media
- Post in relevant communities (Reddit, Discord, etc.)
- Add to awesome lists
- Write blog posts about your package

### 3. Monitor Usage

```bash
# Check download stats
npm view next-supabase-clerk-setup

# Monitor GitHub repository
# Check issues and pull requests
```

## 🔧 Troubleshooting

### Common Issues

**1. "Package name already exists"**
```bash
# Choose a different name in package.json
"name": "next-supabase-clerk-setup-v2"
```

**2. "Authentication failed"**
```bash
# Re-login to npm
npm logout
npm login
```

**3. "Permission denied"**
```bash
# Check if you're logged in
npm whoami

# Login if needed
npm login
```

**4. "Package not found after publishing"**
```bash
# Wait a few minutes for npm to update
# Check npmjs.com directly
```

## 📈 Best Practices

### 1. Semantic Versioning

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes
- **MINOR** (1.0.0 → 1.1.0): New features, backward compatible
- **PATCH** (1.0.0 → 1.0.1): Bug fixes, backward compatible

### 2. Release Notes

Always include:
- What's new
- Bug fixes
- Breaking changes
- Migration guide (if needed)

### 3. Testing Before Release

```bash
# Test locally
npm pack
npm install -g ./next-supabase-clerk-setup-1.0.0.tgz

# Test in a new project
mkdir test-install
cd test-install
npx create-next-app@latest test-app
cd test-app
next-supabase-clerk-setup install --all
```

## 🎯 Publishing Commands Summary

```bash
# Complete publishing workflow
npm run build                    # Build the package
npm version patch                # Bump version
npm publish                      # Publish to npm
git push origin main --tags      # Push tags to GitHub
```

## 📞 Support

If you encounter issues:

1. Check npm status: [status.npmjs.com](https://status.npmjs.com/)
2. Check GitHub status: [status.github.com](https://status.github.com/)
3. Review npm documentation: [docs.npmjs.com](https://docs.npmjs.com/)
4. Check GitHub Packages docs: [docs.github.com/packages](https://docs.github.com/packages)

## 🎉 Congratulations!

Once published, your package will be available at:
- **npm**: `npm install next-supabase-clerk-setup`
- **GitHub**: `npm install @yourusername/next-supabase-clerk-setup`

Users can install it with:
```bash
npm install -g next-supabase-clerk-setup
# or
npx next-supabase-clerk-setup install --all
```

Happy publishing! 🚀
