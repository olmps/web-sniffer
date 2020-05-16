import { EventEmitter } from 'events'
import * as http from 'http'
import * as https from 'https'
import * as net from 'net'
import { IRequest, IResponse, Request, Response } from './models'
import ProxyError, { ErrorType } from './errors/proxy-error'

type AnyContent = IRequest | IResponse
type InterceptHandler = (phase: string, request: IRequest, response: IResponse) => Promise<AnyContent>

export default class HttpServer extends EventEmitter {

  private server: http.Server
  private interceptHandler: InterceptHandler

  get address(): net.AddressInfo {
    return this.server.address() as net.AddressInfo
  }

  constructor(interceptHandler: InterceptHandler) {
    super()
    this.interceptHandler = interceptHandler
    this.server = this.createServer()
  }

  private createServer() {
    const httpServer = http.createServer(async (req, res) => {
      const request = new Request(req)
      // At this request phase, `res` is not populated yet
      const response = new Response()

      try {
        // Send the intercepted request to the client before forwarding to its destination
        const modifiedRequest = await this.interceptHandler('request', request, response)

        if (!(modifiedRequest instanceof Request)) {
          this.emit('error', new ProxyError(`Expecting a Request object, but received ${typeof modifiedRequest} instead`, ErrorType.unexpectedType))
          res.writeHead(HttpStatusCode.BAD_REQUEST, {})
          res.end()
          return
        }

        const responseHandler = async (serverResponse: http.IncomingMessage) => this.receiveResponse(request, response, serverResponse, res)

        // Forward the requests - modified or not - to its original destination
        this.forward(modifiedRequest, req, responseHandler)
      } catch (error) {
        req.destroy(new ProxyError('Request dropped by the client', ErrorType.denied, error))
      }
    })

    httpServer.on('connect', (request, clientSocket, head) => this.emit('connect', request, clientSocket, head))
    httpServer.on('error', (error: any) => this.emit('error', new ProxyError(error, ErrorType.unknown, error)))

    return httpServer
  }

  /**
   * Handles the response from a forwarded request.
   * 
   * Receives the response and send it to the client before letting the system receive it.
   * Once the client returns - a modified or not - response, send it to the system.
   * 
   * @param request The request that originated `serverResponse`
   * @param response The response that will be send to the client
   * @param serverResponse The response from the destination server
   * @param proxyResponse The proxy response, that will be sent to the system
   */
  private async receiveResponse(request: Request, response: Response, serverResponse: http.IncomingMessage, proxyResponse: http.ServerResponse) {
    response.populate(serverResponse)
    try {
      const modifiedResponse = await this.interceptHandler('response', request, response)

      if (!(modifiedResponse instanceof Response)) {
        this.emit('error', new ProxyError(`Expecting a Request object, but received ${typeof modifiedResponse} instead`, ErrorType.unexpectedType))
        proxyResponse.writeHead(HttpStatusCode.BAD_REQUEST, {})
        proxyResponse.end()
        return
      }

      proxyResponse.writeHead(modifiedResponse.statusCode, modifiedResponse.httpHeaders)
      serverResponse.on('data', chunk => {
        response.body += chunk.toString()
        proxyResponse.write(chunk)
      })
      serverResponse.on('end', () => proxyResponse.end())
    } catch (error) {
      proxyResponse.destroy(new ProxyError('Response dropped by the client', ErrorType.denied, error))
    }
  }

  /**
   * Performs a new request with the content of `request`. Once a response is received, the `responseHandler` callback is
   * called with the response content.
   * 
   * @param request The request to be sent
   * @param originalReq The original request made by the client
   * @param responseHandler The handler that will called when the forwarded requests received a response
   */
  private forward(request: Request, originalReq: http.IncomingMessage, responseHandler: (response: http.IncomingMessage) => void) {
    const options = {
      host: request.hostname,
      port: request.port,
      path: request.url,
      method: request.method,
      headers: request.httpHeaders
    }

    // See resources/flow-diagram.png to understand why we may have HTTPS requests here
    const httpSource = request.protocol === "https:" ? https : http

    const forwardRequest = httpSource.request(options, responseHandler)

    originalReq.on('data', (chunk) => {
      request.body += chunk.toString()
      forwardRequest.write(chunk)
    })

    originalReq.on('end', () => forwardRequest.end())
  }

  listen(port: number) {
    this.server.listen(port)
  }

  close() {
    this.server.close()
  }
}