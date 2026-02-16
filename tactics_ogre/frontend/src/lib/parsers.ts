import type { Roster, GameSession, UnitState } from './types';

// Parse Move Option<address> into string | null
// Sui SDK may return this in several formats depending on version
function parseOptionAddress(raw: any): string | null {
    if (!raw) return null;
    // Plain string (already unwrapped)
    if (typeof raw === 'string') return raw;
    // { Some: "0x..." } or { None: null }
    if (raw.Some) return raw.Some;
    // { fields: { Some: "0x..." } }
    if (raw.fields?.Some) return raw.fields.Some;
    // BCS-style: { vec: ["0x..."] }
    if (Array.isArray(raw.vec) && raw.vec.length > 0) return raw.vec[0];
    console.log('[parseOptionAddress] unrecognized format:', JSON.stringify(raw));
    return null;
}
// ═══ Parse Roster from on-chain fields ═══
export function parseRoster(fields: Record<string, any>, id: string): Roster {
    return {
        id,
        owner: fields.owner,
        gold: Number(fields.gold),
        units: (fields.units || []).map((u: any) => typeof u === 'string' ? u : u.fields?.id || u),
        inBattle: Boolean(fields.in_battle),
    };
}

// ═══ Parse GameSession from on-chain fields ═══
export function parseGameSession(fields: Record<string, any>, id: string): GameSession {
    return {
        id,
        state: Number(fields.state),
        players: fields.players || [],
        maxUnitsPerPlayer: Number(fields.max_units_per_player),
        p1Ready: Boolean(fields.p1_ready),
        p2Ready: Boolean(fields.p2_ready),
        p1Units: (fields.p1_units || []).map((u: any) => typeof u === 'string' ? u : u),
        p2Units: (fields.p2_units || []).map((u: any) => typeof u === 'string' ? u : u),
        p1AliveCount: Number(fields.p1_alive_count),
        p2AliveCount: Number(fields.p2_alive_count),
        winner: parseOptionAddress(fields.winner),
        currentTurn: Number(fields.current_turn),
        turnNumber: Number(fields.turn_number),
    };
}

// ═══ Parse Entity components from dynamic fields ═══
export function parseUnitFromDynamicFields(
    entityId: string,
    objects: any[],
): UnitState {
    const unit: UnitState = {
        id: entityId,
        name: '',
        class: 0,
        element: 0,
        team: 0,
        hp: { current: 0, max: 0 },
        atk: 0,
        def: 0,
        range: 0,
        speed: 0,
        ap: { current: 0, max: 0, regen: 0 },
        position: { x: 0, y: 0 },
    };

    for (const obj of objects) {
        if (obj.data?.content?.dataType !== 'moveObject') continue;

        const typeName = obj.data.content.type ?? '';
        const allFields = obj.data.content.fields as Record<string, any>;
        // Dynamic fields are Field<K, V> — value lives in allFields.value
        const v = allFields.value?.fields ?? allFields.value ?? allFields;

        if (typeName.includes('Health')) {
            unit.hp = { current: Number(v.current), max: Number(v.max) };
        } else if (typeName.includes('Energy')) {
            unit.ap = { current: Number(v.current), max: Number(v.max), regen: Number(v.regen) };
        } else if (typeName.includes('Attack')) {
            unit.atk = Number(v.damage ?? v.value);
            unit.range = Number(v.range);
        } else if (typeName.includes('Defense')) {
            unit.def = Number(v.armor);
        } else if (typeName.includes('Movement')) {
            unit.speed = Number(v.speed);
        } else if (typeName.includes('Position')) {
            unit.position = { x: Number(v.x), y: Number(v.y) };
        } else if (typeName.includes('Team')) {
            unit.team = Number(v.team_id);
        } else if (typeName.includes('Identity')) {
            unit.name = v.name || '';
        }

        // Custom dynamic fields (class, element) use vector<u8> keys
        // They show up as Field<vector<u8>, u8> — name is in allFields.name
        const fieldName = allFields.name;
        if (fieldName && typeof v === 'number') {
            const nameBytes = typeof fieldName === 'string' ? fieldName : '';
            if (nameBytes === 'class' || (Array.isArray(fieldName) && arrEquals(fieldName, [99, 108, 97, 115, 115]))) {
                unit.class = v;
            } else if (nameBytes === 'element' || (Array.isArray(fieldName) && arrEquals(fieldName, [101, 108, 101, 109, 101, 110, 116]))) {
                unit.element = v;
            }
        }
    }

    return unit;
}

function arrEquals(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}
