// The finale's tools: what the voice agent can do, and what each one does to the mission board.

const CACHED_WEATHER = { tempC: 4, rainChancePct: 70, summary: 'Rain likely this evening', cached: true };

const fn = (name, description, properties = {}, required = Object.keys(properties)) => ({
  type: 'function', name, description,
  parameters: { type: 'object', properties, required, additionalProperties: false },
});

export const FINALE_TOOLS = [
  fn('recall_memory', 'Read what you remember about the user and their team. Always do this first.'),
  fn('save_memory', 'Remember one short fact for later.', { fact: { type: 'string' } }),
  fn('search_restaurants', 'Find restaurants in Tampere for tonight.', {
    vegetarian: { type: 'boolean', description: 'Needs a vegetarian option' },
    maxPricePerPerson: { type: 'number' },
    partySize: { type: 'number' },
  }),
  fn('get_weather', "Tonight's weather in Tampere (decides terrace or indoors)."),
  fn('call_restaurant', 'Phone the restaurant\'s own AI agent and negotiate a booking. Returns the agreed booking.', {
    restaurantId: { type: 'string' },
    partySize: { type: 'number' },
    preferredTime: { type: 'string', description: 'HH:MM, 24h' },
    vegetarianCount: { type: 'number' },
  }),
  fn('send_invite', "Send the dinner invite to the Demo speaker's phone via Telegram.", {
    who: { type: 'string', enum: ['nasir', 'aidul'] },
    text: { type: 'string', description: 'Short invite: place, time, seating.' },
  }),
];

export function filterRestaurants(list, { vegetarian, maxPricePerPerson, partySize } = {}) {
  return list.filter((r) =>
    (!vegetarian || r.vegetarian) &&
    (maxPricePerPerson === undefined || r.pricePerPerson <= maxPricePerPerson) &&
    (partySize === undefined || r.maxParty >= partySize));
}

// negotiate(request) -> Promise<{booking, fallback}> ; the caller wires it to the server and the board.
export function createHandlers({ api, board, data, negotiate }) {
  const memory = data.memory;
  let weather = CACHED_WEATHER;
  const json = (x) => JSON.stringify(x);

  return {
    async recall_memory() {
      board.memory(memory.map((m) => m.fact), 'all');
      return json({ facts: memory.map((m) => m.fact) });
    },
    async save_memory({ fact }) {
      memory.push({ fact });
      board.memory(memory.map((m) => m.fact), memory.length - 1);
      return json({ saved: fact });
    },
    async search_restaurants(args) {
      const matches = filterRestaurants(data.restaurants, args);
      board.pins(data.restaurants, matches.map((r) => r.id));
      return json({ matches: matches.map(({ id, name, area, pricePerPerson, terrace }) => ({ id, name, area, pricePerPerson, terrace })) });
    },
    async get_weather() {
      try {
        weather = await api.json('/api/weather');
      } catch {
        weather = CACHED_WEATHER;
      }
      board.weather(weather);
      return json(weather);
    },
    async call_restaurant({ restaurantId, partySize, preferredTime, vegetarianCount }) {
      const r = data.restaurants.find((x) => x.id === restaurantId) ?? data.restaurants[0];
      const result = await negotiate({
        restaurant: r.name, partySize, vegetarian: vegetarianCount, preferredTime,
        budgetPerPerson: 40, rainChancePct: weather.rainChancePct,
      });
      if (result.booking) board.booking(result.booking);
      return json({ booking: result.booking });
    },
    async send_invite({ who, text }) {
      let delivered = false;
      try {
        delivered = Boolean((await api.json('/api/telegram', { who, text })).delivered);
      } catch {}
      board.invite({ delivered, who, text });
      return json({ delivered });
    },
  };
}
