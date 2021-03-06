<p align="center"><a href="https://grind.rocks"><img src="https://assets.grind.rocks/docs/img/grind-toolkit.svg" alt="Grind Toolkit" /></a></p>

<p align="center">
<a href="https://github.com/grindjs/grindjs/actions"><img src="https://github.com/grindjs/grindjs/workflows/build/badge.svg" alt="Build Status"></a>
<a href="https://www.npmjs.com/package/grind-toolkit"><img src="https://img.shields.io/npm/dt/grind-toolkit.svg" alt="Total Downloads"></a>
<a href="https://www.npmjs.com/package/grind-toolkit"><img src="https://img.shields.io/npm/v/grind-toolkit.svg" alt="Latest Version"></a>
<a href="https://chat.grind.rocks"><img src="https://chat.grind.rocks/badge.svg" alt="Slack"></a>
<a href="https://www.npmjs.com/package/grind-toolkit"><img src="https://img.shields.io/npm/l/grind-toolkit.svg" alt="License"></a>
<a href="https://github.com/prettier/prettier"><img src="https://img.shields.io/badge/code_style-prettier-ff69b4.svg" alt="code style: prettier"></a>
<a href="https://lerna.js.org/"><img src="https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg" alt="lerna"></a>
<a href="http://commitizen.github.io/cz-cli/"><img src="https://img.shields.io/badge/commitizen-friendly-brightgreen.svg" alt="Commitizen friendly"></a>
</p>

# Grind Toolkit

Grind Toolkit is a CLI tool you can use in your dev environment to quickly create and manage [Grind](https://github.com/grindjs/framework) projects.

## Installation

### npm

```bash
npm install -g grind-toolkit
```

### yarn

```bash
yarn install -g grind-toolkit
```

## Usage

```bash
Usage:
  grind new [options] <name?>

Arguments:
  name                     The name of the project to create

Options:
  --template[=TEMPLATE]    API or Web. [default: ‘web’]
  --tag[=TAG]              Repository tag to use, defaults to most recent tag.
  --skip-packages          If present, packages will not be installed.
  --prefer-npm             yarn will be used by default if it’s installed.  Pass this to use npm.
```

## License

Grind was created by [Shaun Harrison](https://github.com/shnhrrsn) and is made available under the [MIT license](LICENSE).
