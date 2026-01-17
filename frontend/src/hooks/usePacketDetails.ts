import { useMemo } from 'react'
import { Packet } from '../types/viewer'

export function usePacketDetails(packet: Packet | null) {
  const details = useMemo(() => packet, [packet])
  return { details, isLoading: false }
}
