#!/usr/bin/env node

/**
 * Skills Index Generator
 *
 * Automatically scans the skills directory and generates:
 * - A categorized index of all skills
 * - Statistics about the skills collection
 * - Quick reference documentation
 *
 * Usage: node scripts/generate-skills-index.js
 */

const fs = require('fs');
const path = require('path');

const SKILLS_DIR = path.join(__dirname, '..', 'skills');
const OUTPUT_FILE = path.join(__dirname, '..', 'SKILLS_INDEX.md');

// Categories for organizing skills
const CATEGORIES = {
  'web-app-security': {
    name: 'Web Application Security',
    description: 'Security testing for web applications and APIs',
    keywords: ['api', 'web', 'xss', 'injection', 'auth', 'html', 'idor', 'wordpress']
  },
  'network-security': {
    name: 'Network Security',
    description: 'Network reconnaissance, scanning, and analysis',
    keywords: ['network', 'scanning', 'shodan', 'smtp', 'ssh', 'wireshark']
  },
  'privilege-escalation': {
    name: 'Privilege Escalation',
    description: 'Techniques for escalating privileges on systems',
    keywords: ['privilege', 'escalation', 'linux', 'windows']
  },
  'platform-security': {
    name: 'Platform-Specific Security',
    description: 'Security testing for specific platforms and clouds',
    keywords: ['active-directory', 'aws', 'cloud', 'burp', 'metasploit']
  },
  'methodology': {
    name: 'Methodology & Tools',
    description: 'General methodologies and comprehensive tool guides',
    keywords: ['ethical', 'pentest', 'checklist', 'commands', 'red-team', 'methodology']
  }
};

/**
 * Parse frontmatter from a skill file
 */
function parseSkillFrontmatter(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/^---\n(.*?)\n---/s);

  if (!match) return null;

  const frontmatter = {};
  match[1].split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length > 0) {
      frontmatter[key.trim()] = valueParts.join(':').trim();
    }
  });

  return frontmatter;
}

/**
 * Categorize a skill based on its name and description
 */
function categorizeSkill(name, description) {
  const searchTerms = [name, description || ''].join(' ').toLowerCase();

  for (const [id, category] of Object.entries(CATEGORIES)) {
    for (const keyword of category.keywords) {
      if (searchTerms.includes(keyword.toLowerCase())) {
        return id;
      }
    }
  }

  return 'other';
}

/**
 * Scan skills directory and collect metadata
 */
function scanSkills() {
  const skills = [];

  if (!fs.existsSync(SKILLS_DIR)) {
    console.error('Skills directory not found: ' + SKILLS_DIR);
    return skills;
  }

  const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const skillDir = path.join(SKILLS_DIR, entry.name);
    const skillFile = path.join(skillDir, 'SKILL.md');

    if (!fs.existsSync(skillFile)) {
      console.warn('No SKILL.md found in: ' + entry.name);
      continue;
    }

    const frontmatter = parseSkillFrontmatter(skillFile);

    // Check for references directory
    const refsDir = path.join(skillDir, 'references');
    const hasReferences = fs.existsSync(refsDir);

    skills.push({
      id: entry.name,
      name: frontmatter?.name || entry.name,
      description: frontmatter?.description || 'No description available',
      category: categorizeSkill(entry.name, frontmatter?.description),
      hasReferences: hasReferences
    });
  }

  return skills;
}

/**
 * Generate markdown index
 */
function generateIndex(skills) {
  // Group skills by category
  const grouped = {};
  for (const skill of skills) {
    if (!grouped[skill.category]) {
      grouped[skill.category] = [];
    }
    grouped[skill.category].push(skill);
  }

  let markdown = '# Skills Index\n\n';
  markdown += '> **Auto-generated** by `scripts/generate-skills-index.js`\n';
  markdown += '> \n';
  markdown += '> Last updated: ' + new Date().toISOString().split('T')[0] + '\n\n';

  // Statistics
  markdown += '## Stats\n\n';
  markdown += '- **Total Skills**: ' + skills.length + '\n';
  markdown += '- **Categories**: ' + (Object.keys(CATEGORIES).length + 1) + '\n';
  markdown += '- **With References**: ' + skills.filter(s => s.hasReferences).length + '\n\n';

  // Category breakdown
  markdown += '### By Category\n\n';
  for (const [id, category] of Object.entries(CATEGORIES)) {
    const count = grouped[id]?.length || 0;
    markdown += '- ' + category.name + ': ' + count + ' skills\n';
  }
  markdown += '- Other: ' + (grouped['other']?.length || 0) + ' skills\n\n';

  // Skills list by category
  markdown += '## Skills Directory\n\n';

  for (const [id, category] of Object.entries(CATEGORIES)) {
    const categorySkills = grouped[id] || [];
    if (categorySkills.length === 0) continue;

    markdown += '### ' + category.name + '\n\n';
    markdown += category.description + '\n\n';
    markdown += '| Skill | Description | Refs |\n';
    markdown += '|-------|-------------|------|\n';

    for (const skill of categorySkills) {
      const refs = skill.hasReferences ? '✅' : '';
      const link = '[' + skill.name + '](skills/' + skill.id + '/SKILL.md)';
      const desc = skill.description.slice(0, 60) + (skill.description.length > 60 ? '...' : '');
      markdown += '| ' + link + ' | ' + desc + ' | ' + refs + ' |\n';
    }

    markdown += '\n';
  }

  // Other skills
  if (grouped['other'] && grouped['other'].length > 0) {
    markdown += '### Other\n\n';
    markdown += 'Skills that do not fit into the main categories.\n\n';
    markdown += '| Skill | Description | Refs |\n';
    markdown += '|-------|-------------|------|\n';

    for (const skill of grouped['other']) {
      const refs = skill.hasReferences ? '✅' : '';
      const link = '[' + skill.name + '](skills/' + skill.id + '/SKILL.md)';
      const desc = skill.description.slice(0, 60) + (skill.description.length > 60 ? '...' : '');
      markdown += '| ' + link + ' | ' + desc + ' | ' + refs + ' |\n';
    }

    markdown += '\n';
  }

  // All skills list
  markdown += '## All Skills (Alphabetical)\n\n';
  const sortedSkills = [...skills].sort((a, b) => a.name.localeCompare(b.name));

  for (const skill of sortedSkills) {
    const refs = skill.hasReferences ? ' 📖' : '';
    markdown += '- [' + skill.name + '](skills/' + skill.id + '/SKILL.md)' + refs + '\n';
  }

  markdown += '\n';

  // Footer
  markdown += '---\n\n';
  markdown += '## Updating This Index\n\n';
  markdown += 'To update this index, run:\n';
  markdown += '```bash\n';
  markdown += 'node scripts/generate-skills-index.js\n';
  markdown += '```\n';

  return markdown;
}

/**
 * Main execution
 */
function main() {
  console.log('Scanning skills directory...');
  const skills = scanSkills();

  if (skills.length === 0) {
    console.log('No skills found!');
    process.exit(1);
  }

  console.log('Found ' + skills.length + ' skills');

  console.log('Generating index...');
  const index = generateIndex(skills);

  fs.writeFileSync(OUTPUT_FILE, index);

  console.log('Index written to: ' + OUTPUT_FILE);

  // Print summary
  console.log('\nSummary:');
  const byCategory = {};
  for (const skill of skills) {
    byCategory[skill.category] = (byCategory[skill.category] || 0) + 1;
  }

  for (const [id, category] of Object.entries(CATEGORIES)) {
    const count = byCategory[id] || 0;
    if (count > 0) {
      console.log('   ' + category.name + ': ' + count);
    }
  }

  if (byCategory['other']) {
    console.log('   Other: ' + byCategory['other']);
  }
}

// Run
main();
