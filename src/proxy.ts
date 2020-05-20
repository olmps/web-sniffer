import { EventEmitter } from 'events'

import { ProxyOptions, IRequest, IResponse } from './models'
import BridgeServer from './bridgeServer'

interface InterceptOptions { phase: Phase }
type Phase = 'request' | 'response'

type AnyContent = IRequest | IResponse
type InterceptHandler = (request: IRequest, response: IResponse) => Promise<AnyContent>
interface PortOptions {
  bridgePort: number
  httpPort?: number
  httpsPort?: number
}

export class Proxy extends EventEmitter {

  private bridgeServer: BridgeServer
  private interceptors: Map<string, InterceptHandler>

  constructor(options: ProxyOptions) {
    super()
    this.interceptors = new Map<string, InterceptHandler>()
    const interceptHandler = (phase: string, request: IRequest, response: IResponse) => this.onIntercept(phase, request, response)
    this.bridgeServer = new BridgeServer(interceptHandler, options.certAuthority)
    this.bridgeServer.on('error', (error: any) => this.emit('error', error))
  }

  async onIntercept(phase: string, request: IRequest, response: IResponse): Promise<IRequest | IResponse> {
    const handler = this.interceptors.get(phase)
    if (!handler) {
      const content = phase === 'request' ? request : response
      return Promise.resolve(content)
    }
    
    const modifiedContent = await handler(request, response)
    return Promise.resolve(modifiedContent)
  }

  intercept(options: InterceptOptions, handler: InterceptHandler) {
    this.interceptors.set(options.phase, handler)
  }

  listen(port: number | PortOptions) {
    this.bridgeServer.listen(port)
  }

  close() {
    this.bridgeServer.close()
  }
}