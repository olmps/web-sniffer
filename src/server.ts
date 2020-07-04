import * as http from 'http'
import * as zlib from 'zlib'
import { EventEmitter } from 'events'

import { IRequest, IResponse, Request, Response } from './models'
import ProxyError, { ErrorType } from './errors/proxy-error'
import Router from './router'

type Decoder = zlib.Gunzip | zlib.Inflate | zlib.BrotliDecompress
type AnyContent = IRequest | IResponse
type InterceptHandler = (phase: string, request: IRequest, response: IResponse) => Promise<AnyContent>

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

    try {
      request.body = await this.collectMessageBody(req)
    } catch (error) {
      console.log(error)
      req.destroy(new ProxyError('Error while fetching request body', ErrorType.unknown, error))
      return
    }

    let modifiedRequest: IRequest

    try {
      // Send the intercepted request to the client before forwarding to its destination
      modifiedRequest = await this.interceptHandler('request', request, response) as IRequest
    } catch (error) {
      console.log(error)
      req.destroy()
      return
    }

    const responseHandler = async (serverResponse: http.IncomingMessage) => this.receiveResponse(request, response, serverResponse, res)
    const forwardedRequest = Router.forward(modifiedRequest, responseHandler)
    forwardedRequest.on('error', error => this.emit('error', error))

    forwardedRequest.write(modifiedRequest.body)
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
    let responseContent: http.IncomingMessage | Decoder = serverResponse

    if (contentEncoding && contentEncoding.toLowerCase().includes("gzip")) {
      const gunzip = zlib.createUnzip()
      serverResponse.pipe(gunzip)
      responseContent = gunzip
      delete response.headers["content-encoding"]
    } else if (contentEncoding && contentEncoding.toLowerCase().includes("deflate")) {
      const deflate = zlib.createInflate()
      serverResponse.pipe(deflate)
      responseContent = deflate
      delete response.headers["content-encoding"]
    } else if (contentEncoding && contentEncoding.toLowerCase().includes("br")) {
      const brotli = zlib.createBrotliDecompress()
      serverResponse.pipe(brotli)
      responseContent = brotli
      delete response.headers["content-encoding"]
    }

    try {
      response.body = await this.collectMessageBody(responseContent)
      if (contentEncoding) { response.headers['content-length'] = response.body.byteLength.toString() }
    } catch (error) {
      console.log(error)
      proxyResponse.destroy(new ProxyError('Error while fetching response body', ErrorType.inconsistency, error))
      return
    }

    let modifiedResponse: IResponse

    try {
      modifiedResponse = await this.interceptHandler('response', request, response) as IResponse
    } catch (error) {
      console.log(error)
      proxyResponse.destroy()
      return
    }
    
    proxyResponse.writeHead(modifiedResponse.statusCode, modifiedResponse.headers)
    proxyResponse.write(modifiedResponse.body)
    proxyResponse.end()
  }

  private collectMessageBody(incomingMessage: http.IncomingMessage | Decoder): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      let bodyBuffers: Buffer[] = []

      incomingMessage.on('data', chunk => bodyBuffers.push(chunk))
      incomingMessage.on('end', () => resolve(Buffer.concat(bodyBuffers)))
      incomingMessage.on('error', error => reject(error))
    })
  }
}