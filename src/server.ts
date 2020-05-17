import { EventEmitter } from 'events'
import * as http from 'http'
import { IRequest, IResponse, Request, Response } from './models'
import ProxyError, { ErrorType } from './errors/proxy-error'
import Router from './router'

type AnyContent = IRequest | IResponse
type InterceptHandler = (phase: string, request: IRequest, response: IResponse) => Promise<AnyContent>

// TODO: COMMON BEHAVIOR BETWEEN BOTH SERVERS
export default class Server extends EventEmitter {

  private interceptHandler: InterceptHandler

  constructor(interceptHandler: InterceptHandler) {
    super()
    this.interceptHandler = interceptHandler
  }

  protected async sendRequest(req: http.IncomingMessage, res: http.ServerResponse, protocol: string) {
    const request = new Request(req, protocol)
    // At this request phase, `res` is not populated yet
    const response = new Response()
    let modifiedRequest: AnyContent

    try {
      // Send the intercepted request to the client before forwarding to its destination
      modifiedRequest = await this.interceptHandler('request', request, response) as IRequest
    } catch (error) {
      req.destroy(new ProxyError('Request dropped by the client', ErrorType.denied, error))
      return
    }

    const responseHandler = async (serverResponse: http.IncomingMessage) => this.receiveResponse(request, response, serverResponse, res)
    const forwardedRequest = Router.forward(request, responseHandler)
    forwardedRequest.on('error', error => this.emit('error', error))

    req.on('data', (chunk) => {
      request.body += chunk.toString()
      forwardedRequest.write(chunk)
    })
    req.on('end', () => forwardedRequest.end())
  }

  /**
   * Handles the response from a forwarded request.
   * 
   * Receives the response and send it to the client before letting the system receive it.
   * Once the client returns - a modified or not - response, send it to the system.
   * 
   * @param request The request made
   * @param response The response that can be send to the client
   * @param serverResponse The response received from the Router
   * @param proxyResponse The proxy response, that will be sent to the system
   */
  protected async receiveResponse(request: Request, response: Response, serverResponse: http.IncomingMessage, proxyResponse: http.ServerResponse) {
    response.populate(serverResponse)
    let modifiedResponse: AnyContent

    try {
      modifiedResponse = await this.interceptHandler('response', request, response) as IResponse
    } catch (error) {
      proxyResponse.destroy(new ProxyError('Response dropped by the client', ErrorType.denied, error))
      return
    }

    proxyResponse.writeHead(modifiedResponse.statusCode, modifiedResponse.httpHeaders)
    serverResponse.on('data', chunk => {
      response.body += chunk.toString()
      proxyResponse.write(chunk)
    })
    serverResponse.on('end', () => proxyResponse.end())
  }
}