import { Command } from '../Command'

export class ListCommand extends Command {
	name = 'list'
	help = 'List available commands'

	run() {
		const info = require(this.app.paths.package)

		if (info.name.isNil) {
			const info = require(require.resolve('@grindjs/framework/package.json'))
			this.line(`<magenta>Grind framework</magenta> version <cyan>${info.version}</cyan>`)
		} else {
			let line = `<magenta>${info.name}</magenta>`

			if (!info.version.isNil) {
				line += ` <cyan>v${info.version}</cyan>`
			}

			this.line(line)
		}

		this.line('')

		this.line('<groupTitle>Usage:</groupTitle>')
		this.line('  command [options] [arguments]')
		this.line('')

		const grouped: Record<string, Command[]> = {}
		let maxCommandNameLength = 20

		for (const command of this.cli.commands) {
			const name = command.name
			if (!name) {
				continue
			}

			maxCommandNameLength = Math.max(maxCommandNameLength, name.length + 4)

			let namespace: string | null = null
			const separatorIndex = name.indexOf(':')

			if (separatorIndex >= 0) {
				namespace = name.substring(0, separatorIndex)
			} else {
				namespace = '_'
			}

			if (!Array.isArray(grouped[namespace])) {
				grouped[namespace] = []
			}

			grouped[namespace].push(command)
		}

		const keys = Object.keys(grouped).sort()

		for (const key of keys) {
			if (key === '_') {
				this.line('<groupTitle>Available commands:</groupTitle>')
			} else {
				this.line(` <groupTitle>${key}</groupTitle>`)
			}

			for (const command of grouped[key]) {
				const paddedName = (command.name ?? '').padEnd(maxCommandNameLength, ' ')
				const description = command.description || ''

				this.line(
					`  <groupItem>${paddedName}</groupItem><groupItemHelp>${description}</groupItemHelp>`,
				)
			}
		}
	}
}