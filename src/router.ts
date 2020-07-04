import http from 'http'
import https from 'https'
import ProxyError, { ErrorType } from './errors/proxy-error'
import { IRequest } from './models'

type RouterCallback = (response: http.IncomingMessage) => void

export default class Router {

  static forward(request: IRequest, callback: RouterCallback) {
    
    const requestOptions: http.RequestOptions = {
      host: request.hostname,
      port: request.protocol === 'https:' ? 443 : 80,
      path: request.url,
      method: request.method,
      headers: request.headers
    }

    switch (request.protocol) {
      case 'http:': return http.request(requestOptions, (response) => callback(response))
      case 'https:': return https.request(requestOptions, (response) => callback(response))
      default:  
      throw new ProxyError(
        `Unknown protocol ${request.protocol} received by the Router`,
        ErrorType.inconsistency
      )
    }
  }
}