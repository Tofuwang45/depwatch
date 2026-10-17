import { defineSandbox } from "eve/sandbox";
import { JustBashSandbox } from "eve/sandbox/just-bash";

// depwatch never runs shell commands: defaultTools is false and no tool calls
// ctx.getSandbox(). eve still requires a sandbox definition, so use the
// pure-JavaScript one, which starts no container or VM.
export const environment = JustBashSandbox.environment({ autoInstall: false });
export default defineSandbox(() => environment.open());
