/**
 * Test fixtures for ZTM API responses
 */

export const mockStopsResponse = {
  lastUpdate: "2026-01-24T10:00:00Z",
  stops: [
    {
      stopId: 117,
      stopCode: "117",
      stopName: "Politechnika",
      stopLat: 54.372158,
      stopLon: 18.612357,
    },
    {
      stopId: 199,
      stopCode: "199",
      stopName: "Wrzeszcz",
      stopLat: 54.386389,
      stopLon: 18.610556,
    },
  ],
};

export const mockDeparturesResponse = {
  lastUpdate: "2026-01-24T10:05:00Z",
  departures: [
    {
      id: "1",
      patternText: "1",
      line: "3",
      routeId: 123,
      direction: "Zaspy Ulica Witosa",
      headsign: "Zaspy Ulica Witosa",
      tripId: 456,
      scheduledTripStartTime: "10:00:00",
      stopId: 117,
      stopSeqNum: 5,
      delayInSeconds: 60,
      theoreticalTime: "10:05:00",
      estimatedTime: "10:06:00",
      status: "REALTIME",
      vehicleCode: 1001,
      vehicleService: null,
      vehicleId: 1001,
    },
  ],
};

export const mockSetResponse = {
  id: "set-uuid-1",
  name: "Do pracy",
  user_id: "user-uuid-1",
  created_at: "2026-01-20T10:00:00Z",
  updated_at: "2026-01-20T10:00:00Z",
};

export const mockSetItemResponse = {
  id: "item-uuid-1",
  set_id: "set-uuid-1",
  stop_id: 117,
  position: 0,
  created_at: "2026-01-20T10:00:00Z",
};

/**
 * Helper to create test user data
 */
export function createTestUser(overrides = {}) {
  return {
    id: "user-uuid-1",
    email: "test@example.com",
    created_at: "2026-01-20T10:00:00Z",
    ...overrides,
  };
}

/**
 * Helper to create test set data
 */
export function createTestSet(overrides = {}) {
  return {
    id: "set-uuid-1",
    name: "Test Set",
    user_id: "user-uuid-1",
    created_at: "2026-01-20T10:00:00Z",
    updated_at: "2026-01-20T10:00:00Z",
    ...overrides,
  };
}

/**
 * Helper to create test set item data
 */
export function createTestSetItem(overrides = {}) {
  return {
    id: "item-uuid-1",
    set_id: "set-uuid-1",
    stop_id: 117,
    position: 0,
    created_at: "2026-01-20T10:00:00Z",
    ...overrides,
  };
}
