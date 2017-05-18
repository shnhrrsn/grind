/* eslint-disable max-lines */
import './ResourceRouteBuilder'
import './RouteLayer'

import '../Errors/RoutesLoadError'

import '../Middleware/CompressionMiddlewareBuilder'
import '../Middleware/CookieMiddlewareBuilder'
import '../Middleware/MethodOverrideMiddlewareBuilder'
import '../Middleware/SessionMiddlewareBuilder'

const fs = require('fs')
const path = require('path')
const express = require('express/lib/express.js')

export class Router {
	app = null
	router = null

	bindings = { }
	patterns = { }
	namedRoutes = { }

	bodyParserMiddleware = [ ]

	middleware = { }
	middlewareBuilders = {
		compression: CompressionMiddlewareBuilder,
		cookie: CookieMiddlewareBuilder,
		'method-override': MethodOverrideMiddlewareBuilder,
		session: SessionMiddlewareBuilder
	}

	resourceRouteBuilderClass = ResourceRouteBuilder

	_scope = [
		{
			prefix: '/',
			action: {
				before: [ ],
				after: [ ]
			}
		}
	]

	get _scopedAction() {
		return this._scope[this._scope.length - 1].action
	}

	get _scopedPrefix() {
		return this._scope[this._scope.length - 1].prefix
	}

	constructor(app) {
		this.app = app
		this.router = express.Router()
		this.app.express.use(this.router)

		this.router.param('__middlewareWorkaround', (req, res, next) => {
			req.route.dispatchMiddleware(req, res, next)
		})
	}

	boot() {
		this.setupBodyParsers()
		this.setupMiddleware()
	}

	setupBodyParsers() {
		const bodyParsersConfig = this.app.config.get('routing.body_parsers') || { }
		const parsers = bodyParsersConfig.default || [ 'json', 'form' ]
		const options = bodyParsersConfig.options || { }

		if(!Array.isArray(parsers)) {
			this.bodyParserMiddleware = parsers.isNil ? [ ] : [ parsers ]
		} else {
			this.bodyParserMiddleware = parsers
		}

		const bodyParser = require('body-parser')
		this.middleware.json = bodyParser.json(options.json || { })
		this.middleware.form = bodyParser.urlencoded(options.form || { extended: true })
	}

	setupMiddleware() {
		for(const name of this.app.config.get('routing.middleware', [ ])) {
			if(this.middlewareBuilders[name].isNil) {
				Log.error(`ERROR: Could not find middleware builder for: ${name}`)
				continue
			}

			const middleware = this.middlewareBuilders[name](this.app, this)

			if(middleware.isNil) {
				Log.error(`ERROR: Unable to load middleware for: ${name}`)
				continue
			}

			if(typeof middleware === 'function') {
				this.middleware[name] = middleware
				this.router.use(middleware)
			} else if(typeof middleware === 'object') {
				for(const [ childName, childMiddleware ] of Object.entries(middleware)) {
					this.middleware[childName] = childMiddleware
					this.router.use(childMiddleware)
				}
			} else {
				Log.error(`ERROR: Unknown middleware for: ${name}`)
			}
		}
	}

	group(options, callback) {
		if(typeof options === 'function') {
			callback = options
			options = { }
		}

		if(!options.controller.isNil && typeof options.controller === 'function') {
			options.controller = new options.controller(this.app)
		}

		const before = makeArray(options.before)
		const after = makeArray(options.after)

		if(!options.use.isNil) {
			Log.deprecated('Using `use` in Router.group', {
				version: 0.6,
				obsoleted: 0.8,
				rename: '`before` and `after`'
			})

			if(Array.isArray(options.use) || typeof options.use !== 'object') {
				options.use = { before: options.use }
			}

			before.push(...makeArray(options.use.before))
			after.push(...makeArray(options.use.after))
		}

		const parentAction = this._scopedAction
		const scope = {
			prefix: path.join(this._scopedPrefix, this._normalizePathComponent(options.prefix || '/')),
			action: {
				...this._scopedAction,
				before: [ ...parentAction.before, ...before ],
				after: [ ...parentAction.after, ...after ]
			}
		}

		if(!options.controller.isNil) {
			scope.action.controller = options.controller
		}

		this._scope.push(scope)
		callback(this, options.controller)
		this._scope.pop()

		return this
	}

	load(pathname) {
		/* eslint-disable no-sync */
		if(!path.isAbsolute(pathname)) {
			const restore = Error.prepareStackTrace
			Error.prepareStackTrace = (_, stack) => stack
			const stack = (new Error).stack
			Error.prepareStackTrace = restore

			pathname = path.resolve(path.dirname(stack[1].getFileName()), pathname)
		}

		try {
			pathname = require.resolve(pathname)
		} catch(err) {
			// Ignore and just use original name, which is likely a directory
		}

		let stats = fs.statSync(pathname)

		if(stats.isDirectory()) {
			try {
				const index = path.join(pathname, 'index.js')
				const indexStats = fs.statSync(index)

				if(indexStats.isFile()) {
					pathname = index
					stats = indexStats
				}
			} catch(e) {
				// Will load each file in the directory
			}
		}

		const files = [ ]

		if(stats.isDirectory()) {
			files.push(
				...fs.readdirSync(pathname)
				.filter(file => path.extname(file) === '.js')
				.map(file => path.resolve(pathname, file))
			)
		} else {
			files.push(pathname)
		}

		const loaders = files.map(file => {
			let name = path.basename(file, '.js')

			if(name === 'index') {
				name = path.basename(path.dirname(file))
			}

			let loader = null

			try {
				loader = require(file)[name]
			} catch(err) {
				throw new RoutesLoadError(err, `Unable to load routes file: ${path.relative(process.cwd(), file)}`)
			}

			if(loader.isNil) {
				throw new RoutesLoadError(`Invalid routes file: ${path.relative(process.cwd(), file)}`)
			}

			return loader
		})

		loaders.sort((a, b) => {
			const priorityA = a.priority || 0
			const priorityB = b.priority || 0

			if(priorityA === priorityB) {
				return a.name.localeCompare(b.name) < 0 ? -1 : 1
			}

			return priorityA > priorityB ? -1 : 1
		})

		for(const loader of loaders) {
			try {
				this.group(loader.options || { }, routes => {
					loader(routes, this.app)
				})
			} catch(err) {
				if(err instanceof RoutesLoadError) {
					throw err
				}

				throw new RoutesLoadError(err, `Unable to load routes: ${loader.name}`)
			}
		}

		return this

		/* eslint-enable no-sync */
	}

	all(pathname, action) {
		Log.deprecated('Router.all', {
			obsoleted: '0.7',
			rename: 'Router.match'
		})

		return this.app.express.all(this._scopedPrefix + pathname, this._makeAction(action))
	}

	use(...middleware) {
		if(middleware.length > 1 && typeof middleware[0] === 'string') {
			Log.deprecated('Passing a path to Router.use', {
				version: '0.6',
				obsoleted: '0.7',
				rename: 'Router.group({ prefix: path })'
			})

			return this.group({ prefix: middleware.shift() }, routes => {
				routes.use(...middleware)
			})
		}

		if(this._scope.length === 1) {
			this.router.use(...middleware)
		} else {
			this._scopedAction.before.push(...middleware)
		}

		return this
	}

	static(pathname, filePath, options) {
		pathname = this._normalizePathComponent(pathname)

		if(filePath.isNil) {
			filePath = path.join(this._scopedPrefix, pathname)
			filePath = this.app.paths.public(filePath)
		} else if(filePath.substring(0, 1) !== '/') {
			filePath = this.app.paths.public(filePath)
		}

		const action = this._scopedAction
		const handlers = this.resolveHandlers([
			...action.before,
			express.static(filePath, options),
			...action.after
		])

		this.router.use(path.join(this._scopedPrefix, pathname), ...handlers)

		return this
	}

	get(pathname, action, context) {
		return this.addRoute('get', pathname, action, context)
	}

	post(pathname, action, context) {
		return this.addRoute('post', pathname, action, context)
	}

	put(pathname, action, context) {
		return this.addRoute('put', pathname, action, context)
	}

	patch(pathname, action, context) {
		return this.addRoute('patch', pathname, action, context)
	}

	delete(pathname, action, context) {
		return this.addRoute('delete', pathname, action, context)
	}

	options(pathname, action, context) {
		return this.addRoute('options', pathname, action, context)
	}

	head(pathname, action, context) {
		return this.addRoute('head', pathname, action, context)
	}

	match(methods, pathname, action, context) {
		return this.addRoute(methods, pathname, action, context)
	}

	resource(name, controller, options = { }, callback = null) {
		if(typeof controller === 'function') {
			controller = new controller(this.app)
		}

		return (new this.resourceRouteBuilderClass(this)).buildRoutes(name, controller, options, callback)
	}

	addRoute(methods, pathname, action, context) {
		if(typeof methods === 'string') {
			methods = [ methods ]
		}

		methods = methods.map(method => method.toLowerCase().trim())

		const handler = this._makeAction(action)
		const before = [ ]
		const after = [ ...this._scopedAction.after ]

		if(typeof action === 'object') {
			if(!action.use.isNil) {
				Log.deprecated('Using `use` in route actions', {
					version: 0.6,
					obsoleted: 0.7,
					rename: '`before` and `after`'
				})

				if(Array.isArray(action.use) || typeof action.use !== 'object') {
					action.use = { before: action.use }
				}

				before.push(...makeArray(action.use.before))
				after.unshift(...makeArray(action.use.after))
			}

			before.push(...makeArray(action.before))
			after.unshift(...makeArray(action.after))
		}

		pathname = this._normalizePathComponent(pathname)
		const fullPath = path.join('/', this._scopedPrefix, pathname)
		const compiledPath = fullPath.replace(/:([a-z0-0_\-.]+)/g, (param, name) => {
			const pattern = this.patterns[name]

			if(pattern.isNil) {
				return param
			} else {
				return `${param}(${pattern})`
			}
		})

		const route = this.router.route(compiledPath)
		route.context = context || { }
		route.grindRouter = this

		let layer = this.router.stack[this.router.stack.length - 1]

		if(this._scopedAction.before.length > 0) {
			layer = new RouteLayer(route, layer, this.resolveHandlers(this._scopedAction.before), {
				sensitive: this.router.caseSensitive,
				strict: this.router.strict,
				end: true
			})

			this.router.stack[this.router.stack.length - 1] = layer
		}

		for(const method of methods) {
			const handlers = [ handler ]

			if(method !== 'get' && method !== 'head') {
				handlers.unshift(...this.bodyParserMiddleware)
			}

			route[method](...this.resolveHandlers(handlers))
		}

		if(before.length > 0) {
			route.before(...this.resolveHandlers(before))
		}

		if(after.length > 0) {
			route.after(...this.resolveHandlers(after))
		}

		if(typeof action.as === 'string') {
			route.as(action.as)
		}

		return route
	}

	_makeAction(action) {
		if(typeof action === 'function') {
			return action
		}

		if(typeof action === 'string') {
			action = { method: action }
		}

		action = Object.assign({ }, this._scopedAction, action)
		const method = action.controller[action.method]
		const controller = action.controller

		return (...args) => {
			const result = method.apply(controller, args)

			if(typeof result === 'object' && typeof result.catch === 'function') {
				return result.catch(args[2])
			}

			return result
		}
	}

	_normalizePathComponent(component) {
		component = path.normalize(component.trim()).replace(/^\//, '')

		if(component.length === 0) {
			return '/'
		}

		return component
	}

	bind(name, resolver, context) {
		this.bindings[name] = { resolver }

		if(!context.isNil) {
			this.bindings[name].context = context
		}

		this.router.param(name, (req, res, next, value) => {
			const resolve = newValue => {
				req.params[name] = newValue
				next()
			}

			const reject = next
			const result = resolver(value, resolve, reject, req, res)

			if(result.isNil || typeof result.then !== 'function') {
				return
			}

			result.then(resolve).catch(reject)
		})
	}

	pattern(name, pattern) {
		this.patterns[name] = pattern
	}

	nameRoute(name, route) {
		route.routeName = name
		this.namedRoutes[name] = route
	}

	registerMiddleware(name, middleware) {
		this.middleware[name] = middleware
	}

	resolveHandlers(handlers) {
		handlers = [ ...handlers ]

		for(const i in handlers) {
			handlers[i] = this.resolveMiddleware(handlers[i])
		}

		return handlers
	}

	resolveMiddleware(middleware) {
		if(typeof middleware === 'function') {
			return middleware
		}

		if(this.middleware[middleware].isNil) {
			throw new Error(`Unknown middleware alias: ${middleware}`)
		}

		return this.middleware[middleware]
	}

	trustProxy(...args) {
		this.app.express.set('trust proxy', ...args)
	}

}

function makeArray(value) {
	if(value.isNil) {
		return [ ]
	}

	if(Array.isArray(value)) {
		return value
	}

	return [ value ]
}