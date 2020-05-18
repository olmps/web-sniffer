import * as http from 'http'
import * as zlib from 'zlib'
import { EventEmitter } from 'events'

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

    let requestBody: Buffer

    try {
      requestBody = await this.collectMessageBody(req)
      request.body = requestBody.toString('utf-8')
      delete request.headers["content-encoding"]
    } catch (error) {
      req.destroy(new ProxyError('Error while fetching request body', ErrorType.unknown, error))
      return
    }

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

    forwardedRequest.write(requestBody)
    forwardedRequest.end()
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

    const contentEncoding = serverResponse.headers["content-encoding"]
    let responseContent: http.IncomingMessage | zlib.Gunzip = serverResponse

    if (contentEncoding && contentEncoding.toLowerCase() === "gzip") {
      responseContent = zlib.createGunzip()
      serverResponse.pipe(responseContent)
    } else if (contentEncoding && contentEncoding.toLowerCase() === "deflate") {
      responseContent = zlib.createDeflate()
      serverResponse.pipe(responseContent)
    }

    let responseBody: Buffer

    try {
      responseBody = await this.collectMessageBody(responseContent)
      response.body = responseBody.toString('utf-8')
      delete response.headers["content-encoding"]
    } catch (error) {
      proxyResponse.destroy(new ProxyError('Error while fetching response body', ErrorType.unknown, error))
      return
    }

    let modifiedResponse: AnyContent

    try {
      modifiedResponse = await this.interceptHandler('response', request, response) as IResponse
    } catch (error) {
      proxyResponse.destroy(new ProxyError('Response dropped by the client', ErrorType.denied, error))
      return
    }
    
    proxyResponse.writeHead(modifiedResponse.statusCode, modifiedResponse.httpHeaders)
    proxyResponse.write(responseBody)
    proxyResponse.end()
  }

  private collectMessageBody(incomingMessage: http.IncomingMessage | zlib.Gunzip): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      let bodyBuffers: Buffer[] = []

      incomingMessage.on('data', chunk => bodyBuffers.push(chunk))
      incomingMessage.on('end', () => resolve(Buffer.concat(bodyBuffers)))
      incomingMessage.on('error', error => reject(error))
    })
  }
}