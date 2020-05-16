import { EventEmitter } from 'events'
import * as url from 'url'
import * as http from 'http'
import * as https from 'https'
import { IRequest, IResponse, Request } from './models'

export default class HttpServer extends EventEmitter {

  server: http.Server

  constructor() {
    super()
    this.server = this.startHttpServer()
  }

  buildHeaders(headers: http.IncomingHttpHeaders): Map<string, string> {
    const headersDictionary = new Map<string, string>()
    for (const key of Object.keys(headers)) {
      const value = headers[key]
      if (value === undefined) { continue }
      if (typeof value === 'string') {
        headersDictionary.set(key, value)
      } else { // TODO: TEST SET-COOKIE CASE
        headersDictionary.set(key, value.toString())
      }
    }

    return headersDictionary
  }

  startHttpServer() {
    const httpServer = http.createServer((req, res) => {

      const requestData = url.parse(req.url!)
      const requestPort = requestData.protocol === "https:" ? 443 : 80
      const queryParsedUrl = url.parse(req.url!, true)
      const parsedHeaders = this.buildHeaders(req.headers)
      const request = new Request(requestData.protocol!, requestData.hostname!, requestPort, req.method!, req.url!, queryParsedUrl, parsedHeaders, "")
      
      console.log(req.toString())

      const options = {
        host: requestData.hostname,
        port: requestData.protocol === "https:" ? 443 : 80,
        path: requestData.path,
        method: req.method,
        headers: req.headers
      }

      const httpSource = request.protocol === "https:" ? https : http

      const forwardRequest = httpSource.request(options, (backendRes) => {
        // TODO: PEGAR OS METADADOS
        res.writeHead(backendRes.statusCode!, backendRes.headers)
        backendRes.on('data', chunk => res.write(chunk))
        backendRes.on('end', () => res.end())
      })

      req.on('data', (chunk) => forwardRequest.write(chunk))
      req.on('end', () => forwardRequest.end())
    })

    httpServer.on('error', (error: any) => this.emit('error', error))

    return httpServer
  }

  listen(port: number) {
    this.server.listen(port)
  }

  close() {
    this.server.close()
  }
}