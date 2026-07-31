// Declaração mínima para o módulo `simple-peer` (o pacote não traz tipos).
// Cobre apenas as APIs usadas pelo projeto (hooks/use-webrtc.ts).
declare module "simple-peer" {
  interface SimplePeerOptions {
    initiator?: boolean
    trickle?: boolean
    stream?: MediaStream
    config?: RTCConfiguration
  }

  type SignalData = { type: string; sdp?: string; candidate?: RTCIceCandidateInit }

  class Peer {
    constructor(opts?: SimplePeerOptions)
    signal(data: SignalData): void
    destroy(err?: Error): void
    on(event: string, callback: (...args: any[]) => void): this
  }

  namespace Peer {
    type Instance = Peer
  }

  export = Peer
}
