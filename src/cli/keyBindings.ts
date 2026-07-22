/** Minimal terminal-kit key metadata used by direct shortcut matching. */
export interface KeyData {
  readonly isCharacter?: boolean;
  readonly codepoint?: number;
}

/**
 * Match the pause shortcut across terminal-kit key representations.
 * Printable spaces are normally emitted with the literal name `" "`, while
 * some terminal configurations expose the symbolic name `SPACE`.
 */
export function isPauseKey(name: string, data?: KeyData): boolean {
  return name === 'SPACE' || name === ' ' || (data?.isCharacter === true && data.codepoint === 32);
}
