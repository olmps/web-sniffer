import { ProxyOptions } from './models'
import { Proxy } from './proxy'

export { IRequest, IResponse, CertAuthority, ProxyOptions } from './models'
export { Proxy }
export function createServer(options: ProxyOptions) { return new Proxy(options) }