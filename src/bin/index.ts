#!/usr/bin/env node

import { Command } from 'commander';
import { reinstallCommandHandler } from './command-handler/reinstall.command-handler.js';
import { installCommandHandler } from './command-handler/install.command-handler.js';
import { uninstallCommandHandler } from './command-handler/uninstall.command-handler.js';

const cmd_reinstall = 'reinstall';
const cmd_install = 'install';
const cmd_uninstall = 'uninstall';

const program = new Command();

export type CliOpts = {
  runtime?: boolean;
  dev?: boolean;
  all?: boolean;
  npmLegacyPeerDeps?: boolean;
  packageManager?: string;
  force?: boolean;
}

export type DepType = 'runtime' | 'dev';

program
  .description('Manage node project package dependencies.')
  .option('--runtime', 'Apply to runtime dependencies')
  .option('--dev', 'Apply to dev dependencies')
  // --global
  .option('--all', 'Apply to all dependencies')
  .option('--npm-legacy-peer-deps', 'Use --legacy-peer-deps npm option')
  .option('--pm | --package-manager <char>', 'The package manager to use. Supported: npm, yarn, pnpm, bun.')
  .option('--force', 'Apply the force option')
;

program
  .command(cmd_reinstall)
  .description('Uninstall and re-install dependencies.')
  .action(async () => {
    await reinstallCommandHandler.execute(program);
  });

program
  .command(cmd_install)
  .description('Install one or more dependencies.')
  .action(async () => {
    await installCommandHandler.execute(program);
  });

program
  .command(cmd_uninstall)
  .description('Uninstall one or more dependencies.')
  .action(async () => {
    await uninstallCommandHandler.execute(program);
  });

program.parse();

// todo - cli prompt user to accept commands first. safety is key.

