import * as fs from 'fs'
import Proxy from './proxy'
import { ProxyOptions } from './models'

const cert = fs.readFileSync(`./src/proxy-cert.crt.pem`)
const key = fs.readFileSync(`./src/proxy-cert-key.key.pem`)

const options = new ProxyOptions({ cert, key })

const proxy = new Proxy(options)
proxy.listen(8888)

proxy.intercept({ phase: 'request' }, (request, response) => {
  return Promise.resolve(request)
})

proxy.intercept({ phase: 'response' }, (request, response) => {
  return Promise.resolve(response)
})