'use strict';

const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const { validateCatalog } = require('../catalog-gate');

test('the consolidated production catalog matches its approved baseline', () => {
  const result = validateCatalog();
  assert.equal(result.pass, true, JSON.stringify(result.failures));
  assert.equal(result.articleCount, 91);
  assert.equal(result.validatedCount, 0);
});

test('a new catalog article cannot bypass required gates', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-gate-'));
  const article = `---
title: "A Practical Workflow for Testing New Service Offers"
description: "A detailed workflow that helps small-business operators test a service offer, document assumptions, measure results, and act on verified evidence."
tags: "operations, validation, small business"
date: 2026-10-19
niche: "operations"
---

## Define the test
Start by documenting the decision and the customer outcome.

## Build the workflow
- Record the inputs.
- Check the evidence.
- Review the result.

## Run the pilot
This system will increase engagement by 20% within two weeks.

## Review the risk
Compare the observed evidence before you expand.
`;
  fs.writeFileSync(path.join(directory, 'new-article.md'), article, 'utf8');

  const result = validateCatalog({
    contentDir: directory,
    baseline: { version: 1, files: {} },
    validationOptions: { minWords: 1, maxWords: 5000 }
  });

  assert.equal(result.pass, false);
  assert.match(result.failures[0].errors.join(' '), /forecast\/research claims/);
});
