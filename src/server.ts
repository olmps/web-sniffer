export default interface Server {
  startServer(): void
  listen(): void
  close(): void
}