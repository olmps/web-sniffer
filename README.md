# Web Sniffer

A simple and clean web-traffic proxy sniffer written in `typescript`. Inspired by the no longer maintained [Hoxy](https://github.com/greim/hoxy)

# Install

`npm install --save web-proxy-sniffer`

# Contributing

Please see [CONTRIBUTING.md](/CONTRIBUTING.md) to see how to help us maintain and evolve this project.

# Examples
```typescript
import * as Sniffer from 'web-proxy-sniffer'

const proxy = Sniffer.createServer()

proxy.intercept({
  // Intercept before the request is sent
  phase: 'request'
}, (request, response) => {
  // Redirects the request to google.com
  request.hostname = "www.google.com"

  return request
})

proxy.listen(8080)
```

## Intercepting HTTPS requests

In order to support HTTPS requests intercept, it's required to provide a valid self-signed Certificate Authority when initializing the proxy.
To create a new certificate run on your terminal:

```bash
# Create the key
openssl genrsa -out ~/.ssh/my-private-root-ca.key.pem 2048
# Create the cert
openssl req -x509 -new -nodes -key ~/.ssh/my-private-root-ca.key.pem -days 1024 -out ~/.ssh/my-private-root-ca.crt.pem -subj "/C=US/ST=Utah/L=Provo/O=ACME Signing Authority Inc/CN=example.com"
```

After that, you need to trust this certificate. How to do this varies depending on your environment. If your are using a browser, you must trust the certificate on the browser,
if you are using the proxy on a OS level, you must trust the certificate on your machine.

After trusting the certificate, you must send this certificate and its key when initializing the proxy:

```typescript
import * as fs from 'fs'
import * as Sniffer from 'web-proxy-sniffer'

const proxy = Sniffer.createServer({
  certAuthority: {
    key: fs.readFileSync(`src/resources/certificates/proxy-cert-key.key.pem`),
    cert: fs.readFileSync(`src/resources/certificates/proxy-cert.crt.pem`)
  }
})
```

# Roadmap

Today the proxy only supports intercepting and changing HTTP and HTTPS requests before they are sent and responses before they are received.
Based on that, we established the following Roadmap to the future releases of this library

- [ ] Support reverse proxy
- [ ] Filter intercepted content by type
- [ ] Intercept requests after they are sent to its destination
- [ ] Intercept responses before they are received by the client