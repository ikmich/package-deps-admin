# `package-deps-admin`

Manage node project package dependencies.

# CLI

## Install Dependencies

### `deps install`

#### Install a single dependency

```shell
deps install <dep>
```

#### Install multiple dependencies

```shell
deps install <dep1> <dep2> ...
```

#### Install dev or runtime dependencies specifically

If no flag is provided, it defaults to "runtime".

```shell
deps install [deps...] --dev
deps install [deps...] --runtime
```

## Re-install dependencies.

Uninstall and install dependencies.

### `deps reinstall`

#### Reinstall specific dependencies

```shell
deps reinstall [dep...]
```

#### Reinstall all dependencies

```shell
deps reinstall
```

#### Reinstall only runtime dependencies

```shell
deps reinstall --runtime
```

#### Reinstall only dev dependencies

```shell
deps reinstall --dev
```

