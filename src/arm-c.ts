// The skill goes in the user message, at the position of arm B's scaffolding
// (docs/protocol.md, "Harness").
export const ARM_C_TRIGGER = "Apply the epistemological apparatus.";

const FRONTMATTER = /^---\n[\s\S]*?\n---\n/;

// The frontmatter is skill packaging (name, triggering description), not
// content the model is asked to apply, so it stays out of the prompt.
export function skillBody(skillMarkdown: string): string {
  if (!FRONTMATTER.test(skillMarkdown)) {
    throw new Error("SKILL.md has no leading --- frontmatter block — is this the packaged skill?");
  }
  return `${skillMarkdown.replace(FRONTMATTER, "").replace(/^\n+|\n+$/g, "")}\n`;
}

export function assembleArmC(taskCore: string, skillMarkdown: string): string {
  return `${taskCore.replace(/\n+$/, "")}\n\n${ARM_C_TRIGGER}\n\n${skillBody(skillMarkdown)}`;
}
