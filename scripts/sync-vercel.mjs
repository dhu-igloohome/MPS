import { execSync } from "node:child_process";

function run(command) {
  execSync(command, { stdio: "inherit" });
}

function runSafe(command) {
  try {
    execSync(command, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

const branch = execSync("git rev-parse --abbrev-ref HEAD")
  .toString()
  .trim();

if (branch !== "main") {
  console.error(`Current branch is "${branch}". Please switch to "main" first.`);
  process.exit(1);
}

run("git add -A");

// Commit only when there are staged changes.
if (runSafe("git diff --cached --quiet")) {
  let ahead = 0;
  try {
    ahead = Number.parseInt(
      execSync("git rev-list --count origin/main..HEAD", { encoding: "utf8" }).trim(),
      10,
    );
  } catch {
    ahead = 0;
  }
  if (ahead > 0) {
    console.log(`No new files to commit; pushing ${ahead} local commit(s) to origin/main...`);
    run("git push origin main");
    console.log("Synced to GitHub. Vercel will auto-deploy this push.");
  } else {
    console.log("No changes to commit. Nothing to sync.");
  }
  process.exit(0);
}

const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
run(`git commit -m "chore: sync updates (${timestamp})"`);
run("git push origin main");

console.log("Synced to GitHub. Vercel will auto-deploy this push.");
