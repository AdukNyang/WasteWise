const readline = require("node:readline");

const bcrypt = require("bcryptjs");
const { validateRegistration } = require("../src/services/auth-validation.service");

const roles = {
  "1": "ADMINISTRATOR",
  "2": "RESPONSIBLE_STAKEHOLDER",
};

function getDatabaseTarget(databaseUrl) {
  if (!databaseUrl) throw new Error("PROVISION_DATABASE_URL is required.");

  let url;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL is not a valid URL.");
  }

  if (!["postgres:", "postgresql:"].includes(url.protocol))
    throw new Error("DATABASE_URL must use PostgreSQL.");

  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  const database = decodeURIComponent(url.pathname.slice(1));
  if (!host || !database) throw new Error("DATABASE_URL must include a host and database name.");

  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(host);
  return {
    isLocal,
    label: `${url.hostname}/${encodeURIComponent(database)}`,
  };
}

function assertRemoteDatabaseConfirmed(target, confirmed) {
  if (!target.isLocal && !confirmed)
    throw new Error("Refusing to use a remote database without --confirm-remote-database.");
}

function ask(terminal, question) {
  return new Promise((resolve) => terminal.question(question, resolve));
}

function askHidden(question) {
  return new Promise((resolve, reject) => {
    const input = process.stdin;
    if (!input.isTTY || typeof input.setRawMode !== "function") {
      reject(new Error("Run this command in an interactive terminal so passwords can be hidden."));
      return;
    }

    const wasRaw = input.isRaw;
    let value = "";
    process.stdout.write(question);
    input.setEncoding("utf8");
    input.setRawMode(true);
    input.resume();

    const finish = (error) => {
      input.removeListener("data", onInput);
      input.setRawMode(wasRaw);
      input.pause();
      process.stdout.write("\n");
      if (error) reject(error);
      else resolve(value);
    };

    const onInput = (chunk) => {
      for (const character of chunk) {
        if (character === "\u0003") {
          finish(new Error("Password entry cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish();
          return;
        }
        if (character === "\u007f" || character === "\b") {
          value = Array.from(value).slice(0, -1).join("");
          continue;
        }
        value += character;
      }
    };

    input.on("data", onInput);
  });
}

async function main() {
  if (process.argv.includes("--help")) {
    console.log("Set PROVISION_DATABASE_URL explicitly, then run npm run provision:staff -- [--confirm-remote-database]");
    return;
  }

  const databaseUrl = process.env.PROVISION_DATABASE_URL;
  const target = getDatabaseTarget(databaseUrl);
  const confirmRemote = process.argv.includes("--confirm-remote-database");
  assertRemoteDatabaseConfirmed(target, confirmRemote);

  console.log(`Database target: ${target.label}`);
  const terminal = readline.createInterface({ input: process.stdin, output: process.stdout });
  let name;
  let email;
  let roleChoice;
  try {
    const targetConfirmation = await ask(terminal, `Type "${target.label}" exactly to continue: `);
    if (targetConfirmation.trim() !== target.label)
      throw new Error("Database target did not match; no account was created.");

    name = (await ask(terminal, "Full name: ")).trim();
    email = (await ask(terminal, "Email: ")).trim().toLowerCase();
    roleChoice = await ask(terminal, "Role (1 = administrator, 2 = responsible stakeholder): ");
  } finally {
    terminal.close();
  }

  const role = roles[roleChoice.trim()];
  if (!role) throw new Error("Choose 1 for administrator or 2 for responsible stakeholder.");

  const password = await askHidden("Password (input hidden): ");
  const confirmation = await askHidden("Confirm password (input hidden): ");
  if (password !== confirmation) throw new Error("Passwords do not match.");

  const validationError = validateRegistration({ name, email, password });
  if (validationError) throw new Error(validationError);

  process.env.DATABASE_URL = databaseUrl;
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existingUser) throw new Error("That email already belongs to an account; no changes were made.");

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role, accountStatus: "active" },
      select: { email: true, role: true },
    });

    console.log(`Created ${user.role} account for ${user.email}. The password was not displayed or saved by this command.`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(`Staff account provisioning failed: ${error.message}`);
      process.exitCode = 1;
    });
}

module.exports = { assertRemoteDatabaseConfirmed, getDatabaseTarget };
