import { EventEmitter } from 'events'
import * as http from 'http'
import * as https from 'https'
import { IRequest, IResponse, Request, Response } from './models'
import ProxyError, { ErrorType } from './errors/proxy-error'

type AnyContent = IRequest | IResponse
type InterceptHandler = (phase: string, request: IRequest, response: IResponse) => Promise<AnyContent>

export default class HttpServer extends EventEmitter {

  server: http.Server
  interceptHandler: InterceptHandler

  constructor(interceptHandler: InterceptHandler) {
    super()
    this.server = this.startHttpServer()
    this.interceptHandler = interceptHandler
  }

  startHttpServer() {
    const httpServer = http.createServer(async (req, res) => {
      const request = new Request(req)
      const response = new Response()

      const modifiedRequest = await this.interceptHandler('request', request, response)
      if (!(modifiedRequest instanceof Request)) {
        this.emit('error', new ProxyError(`Expecting a Request object, but received ${typeof modifiedRequest} instead`, ErrorType.unexpectedType))
        res.writeHead(HttpStatusCode.BAD_REQUEST, { })
        res.end()
        return
      }

      const options = {
        host: modifiedRequest.hostname,
        port: modifiedRequest.port,
        path: modifiedRequest.url,
        method: modifiedRequest.method,
        headers: modifiedRequest.httpHeaders
      }

      const httpSource = request.protocol === "https:" ? https : http

      const forwardRequest = httpSource.request(options, async (backendRes) => {
        response.populate(backendRes)
        const modifiedResponse = await this.interceptHandler('response', request, response) as Response
        
        res.writeHead(modifiedResponse.statusCode, modifiedResponse.httpHeaders)
        backendRes.on('data', chunk => {
          response.body += chunk.toString()
          res.write(chunk)
        })
        backendRes.on('end', () => res.end())
      })

      req.on('data', (chunk) => {
        request.body += chunk.toString()
        forwardRequest.write(chunk)
      })
      req.on('end', () => forwardRequest.end())
    })

    httpServer.on('error', (error: any) => this.emit('error', new ProxyError(error, ErrorType.unknown, error)))

    return httpServer
  }

  listen(port: number) {
    this.server.listen(port)
  }

  close() {
    this.server.close()
  }
}