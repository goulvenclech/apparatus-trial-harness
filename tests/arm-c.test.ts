import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  ARM_C_PATH,
  ARM_C_TRIGGER,
  PACKAGED_SKILL_PATH,
  TASK_CORE_PATH,
  assembleArmC,
  skillBody,
} from "../src/arm-c.js";

const SKILL = '---\nname: "skill"\ndescription: "Use it."\n---\n\n# Skill\n\nBody.';

describe("assembleArmC", () => {
  it("appends the trigger and the skill body to the task core", () => {
    expect(assembleArmC("Core task.\n", SKILL)).toBe(
      `Core task.\n\n${ARM_C_TRIGGER}\n\n# Skill\n\nBody.\n`,
    );
  });

  it("ends with exactly one newline whatever the skill file's ending", () => {
    expect(skillBody(`${SKILL}\n\n`)).toBe("# Skill\n\nBody.\n");
  });

  it("fails loudly on a file without frontmatter", () => {
    expect(() => skillBody("# Skill\n\nBody.")).toThrow(/frontmatter/);
  });

  it("reproduces the current campaign's arm-c.txt byte for byte", async () => {
    const [core, skill, armC] = await Promise.all([
      readFile(TASK_CORE_PATH, "utf8"),
      readFile(PACKAGED_SKILL_PATH, "utf8"),
      readFile(ARM_C_PATH, "utf8"),
    ]);
    expect(assembleArmC(core, skill)).toBe(armC);
  });
});
