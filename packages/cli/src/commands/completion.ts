import type { Command } from "commander";
import { fail } from "../output";

const COMMANDS =
  "auth search grep get ls write rm tag share neighbors links link entity fact timeline review jobs status skill completion help";

const BASH = `# unison bash completion — add to ~/.bashrc:  source <(unison completion bash)
_unison() {
  local cur="\${COMP_WORDS[COMP_CWORD]}"
  COMPREPLY=( $(compgen -W "${COMMANDS}" -- "$cur") )
}
complete -F _unison unison
`;

const ZSH = `#compdef unison
# unison zsh completion — add to ~/.zshrc:  source <(unison completion zsh)
_unison() {
  local -a cmds
  cmds=(${COMMANDS})
  _describe 'unison command' cmds
}
compdef _unison unison
`;

const FISH = `# unison fish completion — write to ~/.config/fish/completions/unison.fish
complete -c unison -f
for c in ${COMMANDS}
  complete -c unison -n __fish_use_subcommand -a $c
end
`;

const SCRIPTS: Record<string, string> = { bash: BASH, zsh: ZSH, fish: FISH };

export function registerCompletion(program: Command): void {
  program
    .command("completion <shell>")
    .description("Print a shell completion script (bash | zsh | fish)")
    .action((shell: string) => {
      const script = SCRIPTS[shell];
      if (!script) {
        fail(`Unsupported shell "${shell}". Use bash, zsh, or fish.`);
        process.exit(1);
      }
      process.stdout.write(script);
    });
}
