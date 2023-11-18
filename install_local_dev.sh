#!/bin/bash

npm run clean;
npm run build;
npm uninstall -g package-deps-admin;
npm uninstall -g deps;
npm uninstall -g pkgdeps;
npm install -g .