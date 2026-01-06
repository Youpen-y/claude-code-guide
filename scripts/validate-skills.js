#!/usr/bin/env node

/**
 * Skills Format Validator
 *
 * Validates all SKILL.md files for proper format and required fields.
 * Checks for:
 * - Frontmatter presence and structure
 * - Required fields (name, description)
 * - Proper heading structure
 * - Common formatting issues
 *
 * Usage: node scripts/validate-skills.js
 */

const fs = require('fs');
const path = require('path');

const SKILLS_DIR = path.join(__dirname, '..', 'skills');

// Validation results
const results = {
  passed: [],
  failed: [],
  warnings: []
};

/**
 * Parse and validate frontmatter
 */
function validateFrontmatter(content, filePath) {
  const errors = [];
  const warnings = [];

  // Check for frontmatter
  const frontmatterMatch = content.match(/^---\n(.*?)\n---/s);
  if (!frontmatterMatch) {
    errors.push('Missing frontmatter block (must start with ---)');
    return { errors, warnings, frontmatter: null };
  }

  const frontmatterText = frontmatterMatch[1];
  const frontmatter = {};

  // Parse key-value pairs
  const lines = frontmatterText.split('\n');
  for (const line of lines) {
    if (!line.trim() || line.startsWith('#')) continue;

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      warnings.push(`Invalid frontmatter line: ${line}`);
      continue;
    }

    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    frontmatter[key] = value;
  }

  // Check required fields
  if (!frontmatter.name) {
    errors.push('Missing required field: name');
  }
  if (!frontmatter.description) {
    errors.push('Missing required field: description');
  }

  // Validate field formats
  if (frontmatter.name && frontmatter.name.length > 60) {
    warnings.push('name is too long (should be < 60 chars)');
  }
  if (frontmatter?.description && frontmatter.description.length > 200) {
    warnings.push('description is too long (should be < 200 chars)');
  }

  return { errors, warnings, frontmatter };
}

/**
 * Validate heading structure
 */
function validateHeadings(content, filePath) {
  const errors = [];
  const warnings = [];

  const lines = content.split('\n');

  // Find frontmatter end line (second ---)
  let frontmatterEndLine = -1;
  let dashCount = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      dashCount++;
      if (dashCount === 2) {
        frontmatterEndLine = i;
        break;
      }
    }
  }

  // Check for # heading (should be after frontmatter)
  let hasMainHeading = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('# ')) {
      if (frontmatterEndLine !== -1 && i <= frontmatterEndLine) {
        errors.push('# heading found before end of frontmatter (line ' + (i + 1) + ')');
      } else {
        hasMainHeading = true;
      }
    }
  }

  if (!hasMainHeading) {
    warnings.push('No # heading found (recommended for structure)');
  }

  return { errors, warnings };
}

/**
 * Validate markdown content quality
 */
function validateContent(content, filePath) {
  const errors = [];
  const warnings = [];

  // Check for empty sections
  const emptySections = content.match(/#+ .*\n\n\n/g);
  if (emptySections) {
    warnings.push(`Found ${emptySections.length} empty section(s)`);
  }

  // Check for very long lines (code readability)
  const lines = content.split('\n');
  let longLines = 0;
  for (const line of lines) {
    if (line.length > 150 && !line.startsWith('|') && !line.startsWith('http')) {
      longLines++;
    }
  }
  if (longLines > 5) {
    warnings.push(`${longLines} lines exceed 150 characters`);
  }

  // Check for proper list formatting
  const unorderedLists = content.match(/^\s*-\s+/gm);
  if (unorderedLists && unorderedLists.length > 0) {
    // Check for consistent indentation
    const indents = new Set();
    for (const match of unorderedLists) {
      const spaces = match.match(/^\s*/)[0].length;
      if (spaces % 2 !== 0) {
        warnings.push('List indentation should be in multiples of 2 spaces');
        break;
      }
    }
  }

  return { errors, warnings };
}

/**
 * Validate a single skill file
 */
function validateSkill(skillId, filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  const skillResult = {
    id: skillId,
    errors: [],
    warnings: []
  };

  // Validate frontmatter
  const fmResult = validateFrontmatter(content, filePath);
  skillResult.errors.push(...fmResult.errors);
  skillResult.warnings.push(...fmResult.warnings);

  // Validate headings
  const hResult = validateHeadings(content, filePath);
  skillResult.errors.push(...hResult.errors);
  skillResult.warnings.push(...hResult.warnings);

  // Validate content
  const cResult = validateContent(content, filePath);
  skillResult.errors.push(...cResult.errors);
  skillResult.warnings.push(...cResult.warnings);

  return skillResult;
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Validating skills...\n');

  if (!fs.existsSync(SKILLS_DIR)) {
    console.error('❌ Skills directory not found: ' + SKILLS_DIR);
    process.exit(1);
  }

  const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
  let totalSkills = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const skillFile = path.join(SKILLS_DIR, entry.name, 'SKILL.md');

    if (!fs.existsSync(skillFile)) {
      console.warn('⚠️  Skipping ' + entry.name + ' (no SKILL.md)');
      continue;
    }

    totalSkills++;
    const result = validateSkill(entry.name, skillFile);

    if (result.errors.length > 0) {
      results.failed.push(result);
      console.log('❌ ' + entry.name);
      for (const err of result.errors) {
        console.log('   - ' + err);
      }
    } else if (result.warnings.length > 0) {
      results.warnings.push(result);
      console.log('⚠️  ' + entry.name);
      for (const warn of result.warnings) {
        console.log('   - ' + warn);
      }
    } else {
      results.passed.push(result);
      console.log('✅ ' + entry.name);
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Validation Summary');
  console.log('='.repeat(50));
  console.log('Total Skills: ' + totalSkills);
  console.log('✅ Passed: ' + results.passed.length);
  console.log('⚠️  Warnings: ' + results.warnings.length);
  console.log('❌ Failed: ' + results.failed.length);

  // Exit with error code if any failures
  if (results.failed.length > 0) {
    console.log('\n❌ Validation failed!');
    process.exit(1);
  } else if (results.warnings.length > 0) {
    console.log('\n⚠️  Validation passed with warnings.');
    process.exit(0);
  } else {
    console.log('\n✅ All validations passed!');
    process.exit(0);
  }
}

// Run
main();
