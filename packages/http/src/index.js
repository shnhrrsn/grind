import { lazy } from 'grind-support'

import { PortProvider } from './HttpServer/PortProvider'
import { ExpressProvider } from './HttpServer/ExpressProvider'
import { RoutingProvider } from './Routing/RoutingProvider'
import { UrlProvider } from './Url/UrlProvider'

export { PortProvider, ExpressProvider, RoutingProvider, UrlProvider }

export const standardProviders = [PortProvider, ExpressProvider, RoutingProvider, UrlProvider]

lazy(module.exports, 'CommandsProvider', () => require('./CommandsProvider.js').CommandsProvider)
lazy(module.exports, 'Controller', () => require('./Controller.js').Controller)
lazy(module.exports, 'ErrorHandler', () => require('./ErrorHandler.js').ErrorHandler)
lazy(module.exports, 'HttpKernel', () => require('./HttpKernel.js').HttpKernel)
lazy(module.exports, 'HttpServer', () => require('./HttpServer/HttpServer.js').HttpServer)
lazy(
	module.exports,
	'ResourceRouteBuilder',
	() => require('./Routing/ResourceRouteBuilder.js').ResourceRouteBuilder,
)
lazy(module.exports, 'Router', () => require('./Routing/Router.js').Router)
lazy(
	module.exports,
	'RoutesLoadError',
	() => require('./Errors/RoutesLoadError.js').RoutesLoadError,
)
lazy(module.exports, 'UrlGenerator', () => require('./Url/UrlGenerator.js').UrlGenerator)
