export function chargeRoom(chargeId: string) {
  return `charge:${chargeId}`;
}

export function overlayRoom(streamerId: string) {
  return `overlay:${streamerId}`;
}

export function dashboardRoom(streamerId: string) {
  return `dashboard:${streamerId}`;
}
