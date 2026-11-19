// Mock Supabase client với dữ liệu "giống thật" (giống row trong DB của user)
const ADMIN_ID = "11111111-1111-1111-1111-111111111111";
const MATCH_ID = "22222222-2222-2222-2222-222222222222";

const now = new Date();
const in3days = new Date(now.getTime() + 3 * 86400000);
in3days.setHours(19, 30, 0, 0);

const adminProfile = {
  id: ADMIN_ID,
  username: "hoangphuc182",
  full_name: "Hoang Phuc",
  display_name: null,
  avatar_url: null,
  birth_date: "2000-11-22", // sinh nhật sắp tới để test section birthday
  jersey_number: null,
  preferred_foot: null,
  role: "admin",
  status: "active",
  is_active: true,
  fun_title: null,
  coach_comment: null,
  pace: 50,
  stamina: 50,
  shooting: 50,
  passing: 50,
  dribbling: 50,
  break_team: 50,
  troll_count: 0,
  matches_played: 0,
  goals: 0,
  assists: 0,
  created_at: "2026-11-19T00:00:00.000Z",
};

// supabase/PostgREST trả embedded resource DẠNG MẢNG (kể cả 1-1)
const adminEmbedded = [
  {
    username: "hoangphuc182",
    full_name: "Hoang Phuc",
    display_name: null,
    avatar_url: null,
    jersey_number: null,
  },
];

const match1 = {
  id: MATCH_ID,
  match_date: in3days.toISOString(),
  opponent: "Cá Heo FC",
  location: "Sân 5m khu dân cư",
  location_map_url: null,
  estimated_cost: 20000,
  jersey_color: "blue",
  is_completed: false,
  home_score: null,
  opponent_score: null,
  created_by: ADMIN_ID,
};

const DATA: Record<string, unknown[]> = {
  profiles: [adminProfile],
  matches: [match1],
  fund_transactions: [
    {
      id: "tx-1",
      type: "income",
      amount: 50000,
      description: "Thu quỹ đầu tháng",
      member_id: null,
      transaction_date: "2026-11-01",
      profiles: null,
    },
  ],
  lineups: [
    { player_id: ADMIN_ID, position: "FW", profiles: adminEmbedded },
  ],
  match_attendees: [
    {
      id: "att-1",
      match_id: MATCH_ID,
      player_id: ADMIN_ID,
      status: "attending",
      profiles: adminEmbedded,
    },
  ],
  player_debts: [],
  trophies: [],
  team_photos: [],
};

function makeQuery(table: string) {
  const filters: Record<string, unknown> = {};
  let maybeSingleMode = false;

  function resolve(): { data: unknown; error: null } {
    let rows: unknown[] = DATA[table] ? [...(DATA[table] as unknown[])] : [];

    // áp filter đơn giản
    for (const [k, v] of Object.entries(filters)) {
      rows = rows.filter((r) => (r as Record<string, unknown>)[k] === v);
    }

    if (maybeSingleMode) {
      return { data: rows[0] ?? null, error: null };
    }
    return { data: rows, error: null };
  }

  const q: any = {
    select: () => q,
    eq: (k: string, v: unknown) => {
      filters[k] = v;
      return q;
    },
    neq: (k: string, v: unknown) => {
      rows_neq.push([k, v]);
      return q;
    },
    order: () => q,
    limit: () => q,
    maybeSingle: () => {
      maybeSingleMode = true;
      return q;
    },
    single: () => {
      maybeSingleMode = true;
      return q;
    },
    in: () => q,
    gt: () => q,
    gte: () => q,
    lt: () => q,
    lte: () => q,
    is: () => q,
    or: () => q,
    insert: (val: unknown) => ({ data: val, error: null }),
    update: (val: unknown) => ({ data: val, error: null }),
    delete: () => ({ data: null, error: null }),
    upsert: (val: unknown) => ({ data: val, error: null }),
    then: (res: any, rej: any) => {
      const result = resolve();
      console.log(`[mock supabase] from(${table}) filters=`, JSON.stringify(filters));
      return Promise.resolve(result).then(res, rej);
    },
  };
  const rows_neq: [string, unknown][] = [];
  return q;
}

const client = {
  auth: {
    getSession: async () => ({
      data: { session: { user: { id: ADMIN_ID }, access_token: "mock-token" } },
    }),
    onAuthStateChange: () => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
    signInWithPassword: async () => ({ data: {}, error: null }),
    signUp: async () => ({ data: {}, error: null }),
    signOut: async () => {},
    updateUser: async () => ({ data: {}, error: null }),
  },
  from: (t: string) => makeQuery(t),
  storage: {
    from: () => ({
      upload: async () => ({ data: {}, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: "" } }),
    }),
  },
};

export const isSupabaseConfigured = true;
export function getSupabase() {
  return client;
}
