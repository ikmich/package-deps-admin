#!/usr/bin/env node

import { Command } from 'commander';
import { reinstallCommandHandler } from './command-handler/reinstall.command-handler.js';

const cmd_reinstall = 'reinstall';

const program = new Command();

export type CliOpts = {
  runtime?: boolean;
  dev?: boolean;
  all?: boolean;
  npmLegacyPeerDeps?: boolean;
  packageManager?: string;
  force?: boolean;
}

export type DepType = 'runtime' | 'dev' | 'all';

program
  .description('Manage node project package dependencies.')
  .option('--runtime', 'Apply to runtime dependencies')
  .option('--dev', 'Apply to dev dependencies')
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

program.parse();

