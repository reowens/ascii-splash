// dotmd.config.mjs — document management configuration
// All exports are optional. See dotmd.config.example.mjs for full reference.

export const root = 'docs';

export const index = {
  path: 'docs/docs.md',
  startMarker: '<!-- GENERATED:dotmd:start -->',
  endMarker: '<!-- GENERATED:dotmd:end -->',
  archivedLimit: 8,
};

// Frontmatter fields graph / deps / unblocks / pickup's Related: resolver
// traverse. Defaults match what the built-in plan/doc/prompt templates scaffold.
// Add field names here (and to your templates) to track more relationships.
export const referenceFields = {
  bidirectional: ['related_plans', 'related_docs'],
  unidirectional: ['parent_plan', 'runlist'],
};
