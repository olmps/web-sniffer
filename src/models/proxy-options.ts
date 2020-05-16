export class CertAuthority {
  constructor(public cert: Buffer, public key: Buffer) { }
}

export class ProxyOptions {
  constructor(
    public certAuthority: CertAuthority | undefined = undefined
  ) { }
}