import { confirm, input, select } from "@inquirer/prompts";

export type PromptChoice = {
  name: string;
  value: string;
};

/**
 * A small adapter around Inquirer that keeps command wizards testable without
 * coupling their logic to a terminal implementation.
 */
export interface ServerPrompts {
  input(
    message: string,
    initial?: string,
    validate?: (value: string) => boolean | string
  ): Promise<string>;
  select(message: string, choices: PromptChoice[], initial?: string): Promise<string>;
  confirm(message: string, initial?: boolean): Promise<boolean>;
}

export const systemPrompts: ServerPrompts = {
  input: (message, initial, validate) => input({ message, default: initial, validate }),
  select: (message, choices, initial) => select({ message, choices, default: initial }),
  confirm: (message, initial) => confirm({ message, default: initial }),
};
