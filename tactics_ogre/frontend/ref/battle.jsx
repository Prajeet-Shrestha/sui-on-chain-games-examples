import { useState, useCallback, useEffect, useRef } from "react";

const COLS = 8, ROWS = 7;
const TERRAIN = {
  PLAIN:  { name:"Plain",  cost:1,  color:"#2a2640", border:"#3a3258" },
  FOREST: { name:"Forest", cost:2,  color:"#1a3020", border:"#2a4830", icon:"🌲" },
  WATER:  { name:"Water",  cost:3,  color:"#1a2040", border:"#2a3060", icon:"💧" },
  STONE:  { name:"Stone",  cost:99, color:"#1a1820", border:"#2a2830", icon:"🪨" },
};

const genTerrain = () => {
  const g = Array(ROWS).fill(null).map(() => Array(COLS).fill(TERRAIN.PLAIN));
  [[1,2],[1,3],[2,5],[3,1],[4,6],[5,4],[5,5]].forEach(([r,c])=>{ if(r<ROWS&&c<COLS) g[r][c]=TERRAIN.FOREST; });
  [[3,3],[3,4],[4,3]].forEach(([r,c])=>{ if(r<ROWS&&c<COLS) g[r][c]=TERRAIN.WATER; });
  [[2,2],[4,5],[1,6]].forEach(([r,c])=>{ if(r<ROWS&&c<COLS) g[r][c]=TERRAIN.STONE; });
  return g;
};

const RC = {
  legendary: { main:"#e8a020", dark:"#503800", glow:"rgba(232,160,32,0.3)", bg:"#2e2640" },
  epic:      { main:"#a050d0", dark:"#2a1840", glow:"rgba(160,80,208,0.3)", bg:"#2a2040" },
  rare:      { main:"#4080d0", dark:"#182840", glow:"rgba(64,128,208,0.3)", bg:"#202840" },
  common:    { main:"#808080", dark:"#282828", glow:"rgba(128,128,128,0.2)", bg:"#262626" },
};

const ELEM_C = { shadow:"#b070d0", blood:"#e04848", void:"#9060c0", physical:"#d0a030", fire:"#e08030", self:"#50b868" };

// Each unit is UNIQUE — one of each
const ALL_UNITS = [
  { id:"vorgath", name:"VORGATH", sub:"THE HOLLOW", cls:"Dark Knight", rarity:"legendary", str:92,int:34,dex:48,con:85, maxHp:340,maxMp:120,atk:187,moveRange:3,atkRange:1,emoji:"⚔️",stars:5,
    skills:[{name:"SHADOW CLEAVE",mp:40,dmg:95,range:1,area:"cone",element:"shadow",desc:"Cone shadow damage"},
            {name:"BLOOD OATH",mp:30,dmg:0,range:0,area:"self",element:"blood",desc:"+50% ATK, costs 20% HP"}] },
  { id:"dread", name:"DREAD", sub:"WARDEN", cls:"Shadow Guard", rarity:"epic", str:72,int:58,dex:65,con:60, maxHp:265,maxMp:160,atk:142,moveRange:4,atkRange:1,emoji:"🗡️",stars:4,
    skills:[{name:"VOID STRIKE",mp:35,dmg:75,range:2,area:"single",element:"void",desc:"Ranged shadow bolt"},
            {name:"DARK VEIL",mp:25,dmg:0,range:0,area:"self",element:"shadow",desc:"+40% DEF for 2 turns"}] },
  { id:"ironclad", name:"IRONCLAD", sub:"SENTINEL", cls:"Steel Knight", rarity:"rare", str:55,int:20,dex:40,con:68, maxHp:210,maxMp:60,atk:98,moveRange:2,atkRange:1,emoji:"🛡️",stars:3,
    skills:[{name:"SHIELD BASH",mp:20,dmg:55,range:1,area:"single",element:"physical",desc:"Stun target 1 turn"}] },
  { id:"footman", name:"ASHEN", sub:"FOOTMAN", cls:"Soldier", rarity:"common", str:30,int:10,dex:22,con:35, maxHp:120,maxMp:30,atk:52,moveRange:2,atkRange:1,emoji:"💀",stars:1, skills:[] },
];

const ENEMIES = [
  { id:"orc1", name:"ORC BRUTE", sub:"", cls:"Berserker", rarity:"rare", str:65,int:10,dex:35,con:70, maxHp:220,maxMp:40,atk:120,moveRange:2,atkRange:1,emoji:"👹",stars:3, skills:[] },
  { id:"mage1", name:"DARK MAGE", sub:"", cls:"Sorcerer", rarity:"epic", str:20,int:80,dex:50,con:30, maxHp:140,maxMp:200,atk:60,moveRange:3,atkRange:3,emoji:"🧙",stars:4,
    skills:[{name:"FIREBALL",mp:40,dmg:85,range:3,area:"single",element:"fire",desc:"Ranged fire damage"}] },
  { id:"gob1", name:"GOBLIN", sub:"SCOUT", cls:"Scout", rarity:"common", str:25,int:8,dex:60,con:20, maxHp:80,maxMp:20,atk:45,moveRange:4,atkRange:1,emoji:"👺",stars:1, skills:[] },
  { id:"gob2", name:"GOBLIN", sub:"THIEF", cls:"Thief", rarity:"common", str:28,int:12,dex:55,con:22, maxHp:90,maxMp:20,atk:48,moveRange:4,atkRange:1,emoji:"👺",stars:1, skills:[] },
  { id:"orc2", name:"ORC CHIEF", sub:"", cls:"Warlord", rarity:"legendary", str:78,int:15,dex:30,con:80, maxHp:300,maxMp:50,atk:150,moveRange:2,atkRange:1,emoji:"👹",stars:5, skills:[] },
];

const mkUnit = (t, team, row, col) => ({...t, uid:`${t.id}_${team}`, team, row, col, hp:t.maxHp, mp:t.maxMp, buffs:[], hasMoved:false, hasActed:false, stunned:0 });
const dist = (r1,c1,r2,c2) => Math.abs(r1-r2)+Math.abs(c1-c2);

const getReach = (u, units, terr) => {
  const vis = new Map(); const q = [[u.row,u.col,u.moveRange]];
  vis.set(`${u.row},${u.col}`,true);
  while(q.length){const[r,c,rem]=q.shift();for(const[dr,dc]of[[-1,0],[1,0],[0,-1],[0,1]]){
    const nr=r+dr,nc=c+dc,k=`${nr},${nc}`;
    if(nr<0||nr>=ROWS||nc<0||nc>=COLS||vis.has(k))continue;
    const cost=terr[nr][nc].cost; if(cost>rem)continue;
    if(units.find(x=>x.row===nr&&x.col===nc&&x.hp>0))continue;
    vis.set(k,true); if(rem-cost>0)q.push([nr,nc,rem-cost]);
  }}
  vis.delete(`${u.row},${u.col}`);
  return [...vis.keys()].map(k=>k.split(",").map(Number));
};

const getTargets = (row,col,range,units,team) => {
  const t=[];
  units.forEach(u=>{if(u.hp<=0||u.team===team)return; if(dist(row,col,u.row,u.col)<=range)t.push([u.row,u.col]);});
  return t;
};

const calcDmg = (a, d) => {
  const base=a.atk, def=Math.floor(d.con*0.8);
  const am = a.buffs.find(b=>b.type==="atk"); const dm = d.buffs.find(b=>b.type==="def");
  return Math.max(1, Math.floor((base*(am?1+am.value:1) - def*(dm?1-dm.value:1))*(0.85+Math.random()*0.3)));
};

// ============================================
// PIXEL CARD COMPONENT (matches HTML card design)
// ============================================
function UnitCard({ unit, selected, onClick, deployed, small }) {
  const rc = RC[unit.rarity];
  const w = small ? 150 : 200;
  const h = small ? 220 : 300;
  return (
    <div onClick={onClick} style={{
      width: w, height: h, cursor: deployed ? "default" : "pointer",
      opacity: deployed ? 0.3 : 1,
      transition: "all 0.2s",
      transform: selected ? "translateY(-8px)" : "none",
      filter: selected ? "brightness(1.15)" : "none",
      flexShrink: 0,
    }}>
      <div style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column",
        background: rc.bg, overflow: "hidden",
        boxShadow: selected
          ? `0 0 0 3px ${rc.dark}, 0 0 0 5px ${rc.main}, 0 0 0 7px ${rc.dark}, 0 0 16px ${rc.glow}`
          : `0 0 0 3px ${rc.dark}, 0 0 0 5px ${rc.main}, 0 0 0 7px ${rc.dark}, 4px 6px 0 3px rgba(0,0,0,0.35)`,
      }}>
        {/* Top bar */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: small ? "4px 6px" : "6px 8px",
          background: "#2a2236", borderBottom: "3px solid #14101c",
        }}>
          <span style={{ fontFamily: "Silkscreen, monospace", fontSize: small ? 9 : 11, color: "#c0b8a8", letterSpacing: "0.06em" }}>
            {unit.cls}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <div style={{
              width: small ? 12 : 14, height: small ? 12 : 14,
              background: "linear-gradient(135deg, #5888e0, #3060a0)",
              boxShadow: "inset -2px -2px 0 rgba(0,0,0,0.3), inset 2px 2px 0 rgba(255,255,255,0.15)",
              clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
            }} />
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: small ? 10 : 12, color: "#c0d8ff", textShadow: "1px 1px 0 rgba(0,0,0,0.5)" }}>
              {unit.rarity === "legendary" ? 8 : unit.rarity === "epic" ? 6 : unit.rarity === "rare" ? 4 : 2}
            </span>
          </div>
        </div>

        {/* Portrait */}
        <div style={{
          width: `calc(100% - ${small ? 10 : 14}px)`,
          height: small ? 80 : 110,
          margin: `${small ? 5 : 7}px auto 0`,
          background: "#0e0a14",
          border: "3px solid #14101c",
          boxShadow: "inset 0 0 0 2px #4a4260",
          overflow: "hidden", position: "relative",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: small ? 36 : 48, filter: `drop-shadow(0 0 6px ${rc.glow})` }}>{unit.emoji}</span>
          {/* Stars */}
          <div style={{ position: "absolute", bottom: 3, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 2 }}>
            {Array(unit.stars).fill(0).map((_, i) => (
              <div key={i} style={{
                width: small ? 8 : 10, height: small ? 8 : 10,
                background: rc.main,
                clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
              }} />
            ))}
          </div>
        </div>

        {/* Name plate */}
        <div style={{
          padding: small ? "5px 6px 3px" : "7px 8px 4px",
          textAlign: "center", borderBottom: "2px solid #14101c",
          position: "relative",
        }}>
          <div style={{ position: "absolute", top: 0, left: 6, right: 6, height: 2,
            background: "repeating-linear-gradient(90deg, #4a4260 0px, #4a4260 4px, transparent 4px, transparent 8px)" }} />
          <div style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: small ? 8 : 10, lineHeight: 1.4, color: rc.main,
            textShadow: "2px 2px 0 rgba(0,0,0,0.5)",
          }}>
            {unit.name}{unit.sub ? <><br/>{unit.sub}</> : null}
          </div>
          <div style={{ fontFamily: "Silkscreen, monospace", fontSize: small ? 8 : 9, color: "#605850", marginTop: 2 }}>
            {unit.rarity === "legendary" ? "Legendary" : unit.rarity === "epic" ? "Epic" : unit.rarity === "rare" ? "Rare" : "Common"}
          </div>
        </div>

        {/* Stats */}
        <div style={{
          padding: small ? "4px 6px" : "6px 8px",
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: small ? 3 : 4, flex: 1,
        }}>
          {[["STR", unit.str, "#e06030"], ["INT", unit.int, "#6088d8"], ["DEX", unit.dex, "#50b868"], ["CON", unit.con, "#d0a030"]].map(([label, val, color]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: small ? 7 : 8, color, width: 24, textShadow: "1px 1px 0 rgba(0,0,0,0.4)" }}>{label}</span>
              <div style={{ flex: 1, height: small ? 5 : 6, background: "#1a1422", border: "1px solid #14101c", overflow: "hidden", position: "relative" }}>
                <div style={{ height: "100%", width: `${val}%`, background: color, boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.3)", position: "absolute" }} />
              </div>
              <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: small ? 7 : 8, color: "#c0b8a8", width: 20, textAlign: "right", textShadow: "1px 1px 0 rgba(0,0,0,0.4)" }}>{val}</span>
            </div>
          ))}
        </div>

        {/* ATK / HP bottom bar */}
        <div style={{
          display: "flex", borderTop: "3px solid #14101c", background: "#2a2236",
        }}>
          <div style={{ flex: 1, padding: small ? "4px 0" : "5px 0", textAlign: "center", borderRight: "2px solid #14101c" }}>
            <div style={{ fontFamily: "Silkscreen, monospace", fontSize: small ? 7 : 8, color: "#e06030", letterSpacing: "0.1em" }}>ATK</div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: small ? 12 : 16, color: "#f0cc60", textShadow: "2px 2px 0 rgba(0,0,0,0.5)" }}>{unit.atk}</div>
          </div>
          <div style={{ flex: 1, padding: small ? "4px 0" : "5px 0", textAlign: "center" }}>
            <div style={{ fontFamily: "Silkscreen, monospace", fontSize: small ? 7 : 8, color: "#e84848", letterSpacing: "0.1em" }}>HP</div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: small ? 12 : 16, color: "#e84848", textShadow: "2px 2px 0 rgba(0,0,0,0.5)" }}>{unit.maxHp}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN GAME
// ============================================
export default function TacticsBattle() {
  const [phase, setPhase] = useState("deploy");
  const [terrain] = useState(genTerrain);
  const [units, setUnits] = useState([]);
  const [hand, setHand] = useState([...ALL_UNITS]); // cards in hand
  const [selectedCard, setSelectedCard] = useState(null);
  const [turnOrder, setTurnOrder] = useState([]);
  const [turnIdx, setTurnIdx] = useState(0);
  const [action, setAction] = useState(null);
  const [activeSkill, setActiveSkill] = useState(null);
  const [hl, setHl] = useState({ move:[], atk:[], skill:[] });
  const [log, setLog] = useState(["[ DEPLOY ] Tap a card, then tap a tile in the bottom 2 rows."]);
  const [turnCount, setTurnCount] = useState(1);
  const [popups, setPopups] = useState([]);
  const pid = useRef(0);
  const aiRef = useRef(null);
  const logRef = useRef(null);

  const addLog = useCallback(m => setLog(p => [...p.slice(-40), m]), []);
  const showPop = useCallback((row, col, val, type="dmg") => {
    const id = pid.current++;
    setPopups(p => [...p, { id, row, col, val, type }]);
    setTimeout(() => setPopups(p => p.filter(x => x.id !== id)), 900);
  }, []);

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [log]);

  // DEPLOY
  const onDeployCell = (r, c) => {
    if (!selectedCard || r < ROWS-2 || terrain[r][c] === TERRAIN.STONE) return;
    if (units.find(u => u.row===r && u.col===c)) return;
    const u = mkUnit(selectedCard, "player", r, c);
    setUnits(prev => [...prev, u]);
    setHand(prev => prev.filter(x => x.id !== selectedCard.id));
    setSelectedCard(null);
    addLog(`Deployed ${selectedCard.name} at row ${r}, col ${c}`);
  };

  // START BATTLE
  const startBattle = useCallback(() => {
    if (units.filter(u=>u.team==="player").length===0) return;
    const es = ENEMIES.map((e,i) => {
      const positions = [[0,1],[0,4],[1,0],[0,6],[1,5]];
      return mkUnit(e, "enemy", positions[i][0], positions[i][1]);
    });
    const all = [...units, ...es];
    const order = [...all].filter(u=>u.hp>0).sort((a,b)=>b.dex-a.dex);
    setUnits(all);
    setTurnOrder(order.map(u=>u.uid));
    setTurnIdx(0);
    setPhase("battle");
    setTurnCount(1);
    addLog("═══ BATTLE START ═══");
    addLog(`Turn 1 — ${order[0].name}'s turn`);
  }, [units, addLog]);

  const getCur = useCallback(() => {
    if (!turnOrder.length) return null;
    return units.find(u => u.uid === turnOrder[turnIdx % turnOrder.length] && u.hp > 0);
  }, [turnOrder, turnIdx, units]);

  const nextTurn = useCallback((uList) => {
    const alive = uList.filter(u=>u.hp>0).sort((a,b)=>b.dex-a.dex);
    if (!alive.length) return;
    const pAlive = alive.filter(u=>u.team==="player");
    const eAlive = alive.filter(u=>u.team==="enemy");
    if (!eAlive.length) { setPhase("victory"); addLog("═══ VICTORY! ═══"); return; }
    if (!pAlive.length) { setPhase("defeat"); addLog("═══ DEFEAT... ═══"); return; }
    const newOrder = alive.map(u=>u.uid);
    const reset = uList.map(u => ({ ...u, hasMoved:false, hasActed:false,
      buffs: u.buffs.map(b=>({...b,turns:b.turns-1})).filter(b=>b.turns>0),
      stunned: Math.max(0, u.stunned-1) }));
    let ni = (turnIdx+1) % newOrder.length;
    const nt = ni===0 ? turnCount+1 : turnCount;
    setUnits(reset); setTurnOrder(newOrder); setTurnIdx(ni); setTurnCount(nt);
    setAction(null); setActiveSkill(null); setHl({move:[],atk:[],skill:[]});
    const nu = reset.find(u=>u.uid===newOrder[ni]);
    if (nu) { if(ni===0) addLog(`── Turn ${nt} ──`); addLog(`${nu.name}'s turn`); }
  }, [turnIdx, turnCount, addLog]);

  // BATTLE CLICK
  const onBattleCell = useCallback((r, c) => {
    const cur = getCur();
    if (!cur || cur.team !== "player") return;

    if (action==="move" && hl.move.some(([hr,hc])=>hr===r&&hc===c)) {
      setUnits(prev => prev.map(u => u.uid===cur.uid ? {...u, row:r, col:c, hasMoved:true} : u));
      setAction(null); setHl({move:[],atk:[],skill:[]});
      addLog(`${cur.name} moved to (${r},${c})`);
    } else if (action==="attack") {
      const tgt = units.find(u=>u.row===r&&u.col===c&&u.hp>0&&u.team!==cur.team);
      if (tgt && hl.atk.some(([hr,hc])=>hr===r&&hc===c)) {
        const d = calcDmg(cur, tgt); showPop(r,c,d);
        setUnits(prev => prev.map(u => {
          if(u.uid===tgt.uid) return {...u,hp:Math.max(0,u.hp-d)};
          if(u.uid===cur.uid) return {...u,hasActed:true};
          return u;
        }));
        addLog(`${cur.name} → ${tgt.name} for ${d} DMG!`);
        if(tgt.hp-d<=0) addLog(`${tgt.name} defeated!`);
        setAction(null); setHl({move:[],atk:[],skill:[]});
      }
    } else if (action==="skill" && activeSkill) {
      if (activeSkill.area==="self") {
        let upd;
        if (activeSkill.element==="blood") {
          const cost = Math.floor(cur.maxHp*0.2);
          upd = units.map(u => u.uid===cur.uid ? {...u,mp:u.mp-activeSkill.mp,hp:Math.max(1,u.hp-cost),hasActed:true,buffs:[...u.buffs,{type:"atk",value:0.5,turns:3}]} : u);
          showPop(cur.row,cur.col,"+ATK","buff"); addLog(`${cur.name} uses ${activeSkill.name}!`);
        } else {
          upd = units.map(u => u.uid===cur.uid ? {...u,mp:u.mp-activeSkill.mp,hasActed:true,buffs:[...u.buffs,{type:"def",value:0.4,turns:2}]} : u);
          showPop(cur.row,cur.col,"+DEF","buff"); addLog(`${cur.name} uses ${activeSkill.name}!`);
        }
        setUnits(upd); setAction(null); setActiveSkill(null); setHl({move:[],atk:[],skill:[]});
      } else {
        const tgt = units.find(u=>u.row===r&&u.col===c&&u.hp>0&&u.team!==cur.team);
        if (tgt && hl.skill.some(([hr,hc])=>hr===r&&hc===c)) {
          const d = activeSkill.dmg + Math.floor(cur.int*0.5*(0.9+Math.random()*0.2));
          const stun = activeSkill.name==="SHIELD BASH" ? 1 : 0;
          showPop(r,c,d);
          setUnits(prev => prev.map(u => {
            if(u.uid===tgt.uid) return {...u,hp:Math.max(0,u.hp-d),stunned:u.stunned+stun};
            if(u.uid===cur.uid) return {...u,mp:u.mp-activeSkill.mp,hasActed:true};
            return u;
          }));
          addLog(`${cur.name} casts ${activeSkill.name} → ${tgt.name} for ${d}!`);
          if(stun) addLog(`${tgt.name} stunned!`);
          if(tgt.hp-d<=0) addLog(`${tgt.name} defeated!`);
          setAction(null); setActiveSkill(null); setHl({move:[],atk:[],skill:[]});
        }
      }
    }
  }, [action, hl, units, getCur, activeSkill, addLog, showPop]);

  const doMove = () => { const u=getCur(); if(!u||u.hasMoved)return; setAction("move"); setHl({move:getReach(u,units,terrain),atk:[],skill:[]}); };
  const doAttack = () => { const u=getCur(); if(!u||u.hasActed)return; setAction("attack"); setHl({move:[],atk:getTargets(u.row,u.col,u.atkRange,units,u.team),skill:[]}); };
  const doSkill = (sk) => {
    const u=getCur(); if(!u||u.hasActed||u.mp<sk.mp)return;
    if(sk.area==="self") { setAction("skill"); setActiveSkill(sk); setHl({move:[],atk:[],skill:[[u.row,u.col]]}); setTimeout(()=>onBattleCell(u.row,u.col),100); return; }
    setAction("skill"); setActiveSkill(sk); setHl({move:[],atk:[],skill:getTargets(u.row,u.col,sk.range,units,u.team)});
  };
  const doEnd = () => nextTurn(units);

  // AI
  useEffect(() => {
    if (phase!=="battle") return;
    const cur = getCur(); if(!cur||cur.team!=="enemy") return;
    if(cur.stunned>0){addLog(`${cur.name} is stunned!`); aiRef.current=setTimeout(()=>nextTurn(units),800); return;}
    aiRef.current = setTimeout(() => {
      let uList = [...units];
      const pUnits = uList.filter(u=>u.team==="player"&&u.hp>0);
      if(!pUnits.length){nextTurn(uList);return;}
      let near=pUnits[0], nd=dist(cur.row,cur.col,near.row,near.col);
      pUnits.forEach(p=>{const d=dist(cur.row,cur.col,p.row,p.col);if(d<nd){near=p;nd=d;}});
      // skill
      if(cur.skills.length&&!cur.hasActed){const sk=cur.skills[0];
        if(cur.mp>=sk.mp&&nd<=sk.range){const d=sk.dmg+Math.floor(cur.int*0.5);
          uList=uList.map(u=>{if(u.uid===near.uid)return{...u,hp:Math.max(0,u.hp-d)};if(u.uid===cur.uid)return{...u,mp:u.mp-sk.mp,hasActed:true};return u;});
          showPop(near.row,near.col,d); addLog(`${cur.name} casts ${sk.name} → ${near.name} for ${d}!`);
          if(near.hp-d<=0) addLog(`${near.name} defeated!`);
          setUnits(uList); setTimeout(()=>nextTurn(uList),600); return;
      }}
      // move
      const reach=getReach(cur,uList,terrain);
      if(reach.length){let best=reach[0],bd=dist(best[0],best[1],near.row,near.col);
        reach.forEach(([r,c])=>{const d=dist(r,c,near.row,near.col);if(d<bd){bd=d;best=[r,c];}});
        uList=uList.map(u=>u.uid===cur.uid?{...u,row:best[0],col:best[1],hasMoved:true}:u);
        addLog(`${cur.name} moves to (${best[0]},${best[1]})`);
      }
      // attack
      const mu=uList.find(u=>u.uid===cur.uid);
      if(mu&&!mu.hasActed){const ts=getTargets(mu.row,mu.col,mu.atkRange,uList,mu.team);
        if(ts.length){const[tr,tc]=ts[0];const tgt=uList.find(u=>u.row===tr&&u.col===tc&&u.hp>0);
          if(tgt){const d=calcDmg(mu,tgt); uList=uList.map(u=>{if(u.uid===tgt.uid)return{...u,hp:Math.max(0,u.hp-d)};if(u.uid===mu.uid)return{...u,hasActed:true};return u;});
            showPop(tr,tc,d); addLog(`${cur.name} → ${tgt.name} for ${d}!`); if(tgt.hp-d<=0) addLog(`${tgt.name} defeated!`);
      }}}
      setUnits(uList); setTimeout(()=>nextTurn(uList),600);
    }, 700);
    return ()=>clearTimeout(aiRef.current);
  }, [phase, turnIdx, turnOrder]);

  const cur = getCur();
  const isPlayer = cur && cur.team === "player";
  const cellSz = 72;

  return (
    <div style={{ minHeight:"100vh", background:"#0e0a14", fontFamily:"'Press Start 2P', monospace", color:"#e8e0d0", display:"flex", flexDirection:"column", alignItems:"center", padding:16, imageRendering:"pixelated" }}>
      {/* Scanlines */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:100, background:"repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)" }} />

      {/* Title */}
      <div style={{ textAlign:"center", marginBottom:12 }}>
        <h1 style={{ fontSize:24, color:"#f0cc60", textShadow:"2px 2px 0 #a07830, 4px 4px 0 rgba(0,0,0,0.5)", letterSpacing:"0.12em", margin:0 }}>TACTICS BATTLE</h1>
        <div style={{ fontSize:12, color:"#605850", letterSpacing:"0.2em", marginTop:4, fontFamily:"Silkscreen, monospace" }}>
          {phase==="deploy" ? "DEPLOY PHASE — Select a card, then place it" :
           phase==="battle" ? `TURN ${turnCount}` :
           phase==="victory" ? "VICTORY!" : "DEFEAT..."}
        </div>
      </div>

      {/* DEPLOY: Card Hand */}
      {phase === "deploy" && (
        <div style={{ marginBottom: 16, width: "100%", maxWidth: 900 }}>
          <div style={{ fontSize: 12, color: "#d4a84a", marginBottom: 10, textAlign: "center", letterSpacing: "0.1em" }}>
            [ YOUR HAND — {hand.length} cards ]
          </div>
          <div style={{
            display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap",
            padding: "12px 8px",
            background: "rgba(42,34,54,0.5)", border: "3px solid #3a3258",
            boxShadow: "0 0 0 2px #14101c",
          }}>
            {hand.map(u => (
              <UnitCard key={u.id} unit={u} selected={selectedCard?.id === u.id}
                onClick={() => setSelectedCard(selectedCard?.id === u.id ? null : u)}
                deployed={false} small={hand.length > 3} />
            ))}
            {hand.length === 0 && (
              <div style={{ fontSize: 12, color: "#605850", padding: 20, fontFamily: "Silkscreen, monospace" }}>
                All cards deployed!
              </div>
            )}
          </div>
          {units.filter(u=>u.team==="player").length > 0 && (
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <button onClick={startBattle} style={{
                padding: "10px 24px", fontSize: 13, fontFamily: "'Press Start 2P', monospace",
                background: "#308848", border: "3px solid #50b868", color: "#e8e0d0",
                cursor: "pointer", letterSpacing: "0.1em",
                boxShadow: "4px 4px 0 2px rgba(0,0,0,0.4)",
              }}>START BATTLE</button>
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", maxWidth: 1100 }}>
        {/* GRID */}
        <div>
          <div style={{
            display: "grid", gridTemplateColumns: `repeat(${COLS}, ${cellSz}px)`, gridTemplateRows: `repeat(${ROWS}, ${cellSz}px)`,
            gap: 2, background: "#14101c", padding: 4,
            border: "3px solid #2a2236", boxShadow: "0 0 0 3px #14101c, 0 0 0 5px #3a3258, 4px 6px 0 3px rgba(0,0,0,0.4)",
            position: "relative",
          }}>
            {terrain.map((row, r) => row.map((t, c) => {
              const u = units.find(x => x.row===r && x.col===c && x.hp>0);
              const isM = hl.move.some(([hr,hc])=>hr===r&&hc===c);
              const isA = hl.atk.some(([hr,hc])=>hr===r&&hc===c);
              const isS = hl.skill.some(([hr,hc])=>hr===r&&hc===c);
              const isCur = cur && u && u.uid===cur.uid;
              const isDZ = phase==="deploy" && r>=ROWS-2 && t!==TERRAIN.STONE;
              const rc = u ? RC[u.rarity] : null;
              const pop = popups.find(p=>p.row===r&&p.col===c);
              return (
                <div key={`${r}-${c}`} onClick={() => phase==="deploy" ? onDeployCell(r,c) : onBattleCell(r,c)} style={{
                  width:cellSz, height:cellSz, position:"relative",
                  background: isM?"rgba(80,184,104,0.2)":isA?"rgba(224,72,72,0.2)":isS?"rgba(176,112,208,0.2)":isDZ?"rgba(80,184,104,0.08)":t.color,
                  border: `2px solid ${isCur?"#f0cc60":isM?"#50b868":isA?"#e04848":isS?"#b070d0":isDZ?"rgba(80,184,104,0.2)":t.border}`,
                  cursor:(isM||isA||isS||isDZ)?"pointer":"default",
                  display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                  transition:"background 0.15s",
                  boxShadow: isCur ? "inset 0 0 12px rgba(240,204,96,0.3), 0 0 8px rgba(240,204,96,0.2)" : "none",
                }}>
                  {t.icon && !u && <span style={{ fontSize:14, opacity:0.3, position:"absolute", top:2, right:3 }}>{t.icon}</span>}
                  {u && (
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:1 }}>
                      <span style={{ fontSize:26, filter: u.team==="enemy" ? "drop-shadow(0 0 4px rgba(224,72,72,0.4))" : `drop-shadow(0 0 4px ${rc?.glow})` }}>{u.emoji}</span>
                      <div style={{ fontSize:7, color:rc?.main, textShadow:"1px 1px 0 rgba(0,0,0,0.6)", whiteSpace:"nowrap", maxWidth:cellSz-8, overflow:"hidden", textOverflow:"ellipsis", fontFamily:"'Press Start 2P', monospace" }}>{u.name}</div>
                      <div style={{ width:cellSz-16, height:5, background:"#14101c", border:"1px solid #2a2236", overflow:"hidden" }}>
                        <div style={{ width:`${(u.hp/u.maxHp)*100}%`, height:"100%", background: u.hp/u.maxHp>0.5?"linear-gradient(180deg,#50b868,#308848)":u.hp/u.maxHp>0.25?"linear-gradient(180deg,#d0a030,#a08020)":"linear-gradient(180deg,#e04848,#a02020)", transition:"width 0.3s" }} />
                      </div>
                    </div>
                  )}
                  {isDZ && !u && selectedCard && <span style={{ fontSize:14, color:"#50b868", opacity:0.5 }}>+</span>}
                  {pop && <div style={{ position:"absolute", top:-8, left:"50%", transform:"translateX(-50%)", fontSize:pop.type==="buff"?12:15, color:pop.type==="buff"?"#50b868":"#ff4444", fontFamily:"'Press Start 2P', monospace", textShadow:"2px 2px 0 rgba(0,0,0,0.8)", animation:"dmgPop 0.9s ease forwards", pointerEvents:"none", zIndex:50, whiteSpace:"nowrap" }}>
                    {pop.type==="buff"?pop.val:`-${pop.val}`}</div>}
                </div>
              );
            }))}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ width:300, display:"flex", flexDirection:"column", gap:10 }}>

          {/* Current unit card (battle) */}
          {phase==="battle" && cur && (
            <div style={{ background:"#2a2236", border:"3px solid #3a3258", boxShadow:"0 0 0 2px #14101c", padding:12 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8, paddingBottom:8, borderBottom:"2px solid #14101c" }}>
                <span style={{ fontSize:28 }}>{cur.emoji}</span>
                <div>
                  <div style={{ fontSize:12, color:RC[cur.rarity]?.main }}>{cur.name} {cur.sub}</div>
                  <div style={{ fontSize:11, color:"#605850", fontFamily:"Silkscreen, monospace" }}>{cur.cls} • {cur.team.toUpperCase()}</div>
                </div>
              </div>

              {/* HP/MP bars */}
              <div style={{ marginBottom: 8 }}>
                {[["HP", cur.hp, cur.maxHp, "#e84848", "linear-gradient(180deg,#e84848,#c83030)"],
                  ["MP", cur.mp, cur.maxMp, "#5888e0", "linear-gradient(180deg,#5888e0,#3060c0)"]].map(([lbl,val,max,col,grad]) => (
                  <div key={lbl} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                    <span style={{ fontSize:11, color:col, width:22 }}>{lbl}</span>
                    <div style={{ flex:1, height:10, background:"#14101c", border:"1px solid #2a2236", overflow:"hidden" }}>
                      <div style={{ width:`${(val/max)*100}%`, height:"100%", background:grad, transition:"width 0.3s" }} />
                    </div>
                    <span style={{ fontSize:10, color:"#908878", width:70, textAlign:"right" }}>{val}/{max}</span>
                  </div>
                ))}
              </div>

              {/* Buffs */}
              {cur.buffs.length > 0 && <div style={{ marginBottom:6, display:"flex", gap:4, flexWrap:"wrap" }}>
                {cur.buffs.map((b,i) => <span key={i} style={{ fontSize:10, padding:"2px 6px", background:b.type==="atk"?"rgba(224,96,48,0.2)":"rgba(64,128,208,0.2)", border:`1px solid ${b.type==="atk"?"#e06030":"#4080d0"}`, color:b.type==="atk"?"#e06030":"#4080d0", fontFamily:"Silkscreen, monospace" }}>
                  {b.type.toUpperCase()}+{Math.round(b.value*100)}% ({b.turns}t)</span>)}
              </div>}

              {/* Actions */}
              {isPlayer ? (
                <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                  {[["▶ MOVE", doMove, !cur.hasMoved, "#50b868", `(${cur.moveRange} tiles)`],
                    ["▶ ATTACK", doAttack, !cur.hasActed, "#e04848", `(ATK ${cur.atk})`]].map(([label,fn,ok,col,info]) => (
                    <button key={label} onClick={fn} disabled={!ok} style={{
                      padding:"8px 10px", fontSize:12, fontFamily:"'Press Start 2P', monospace",
                      background:ok?`${col}15`:"#1a1a1a", border:`2px solid ${ok?col:"#333"}`, color:ok?col:"#555",
                      cursor:ok?"pointer":"not-allowed", textAlign:"left", display:"flex", justifyContent:"space-between",
                    }}>
                      <span>{label}</span><span style={{ fontSize:10, opacity:0.6 }}>{info}</span>
                    </button>
                  ))}
                  {cur.skills.map((sk,i) => {
                    const ok = !cur.hasActed && cur.mp >= sk.mp;
                    const col = ELEM_C[sk.element] || "#b070d0";
                    return (
                      <button key={i} onClick={()=>doSkill(sk)} disabled={!ok} style={{
                        padding:"8px 10px", fontSize:11, fontFamily:"'Press Start 2P', monospace",
                        background:ok?`${col}15`:"#1a1a1a", border:`2px solid ${ok?col:"#333"}`, color:ok?col:"#555",
                        cursor:ok?"pointer":"not-allowed", textAlign:"left",
                      }}>
                        ◈ {sk.name} <span style={{ opacity:0.5 }}>({sk.mp}MP)</span>
                        <div style={{ fontSize:10, opacity:0.5, marginTop:2, fontFamily:"Silkscreen, monospace" }}>{sk.desc}</div>
                      </button>
                    );
                  })}
                  <button onClick={doEnd} style={{ padding:"8px 10px", fontSize:12, fontFamily:"'Press Start 2P', monospace", background:"#2a2236", border:"2px solid #4a4260", color:"#908878", cursor:"pointer", textAlign:"left", marginTop:4 }}>
                    ▶ END TURN
                  </button>
                </div>
              ) : (
                <div style={{ fontSize:13, color:"#e04848", textAlign:"center", padding:12, animation:"pulse 1s ease infinite" }}>ENEMY TURN...</div>
              )}
            </div>
          )}

          {/* Victory/Defeat */}
          {(phase==="victory"||phase==="defeat") && (
            <div style={{ background:"#2a2236", border:"3px solid #3a3258", padding:20, textAlign:"center" }}>
              <div style={{ fontSize:22, color:phase==="victory"?"#f0cc60":"#e04848", textShadow:"2px 2px 0 rgba(0,0,0,0.5)", marginBottom:10 }}>
                {phase==="victory"?"VICTORY!":"DEFEAT..."}
              </div>
              <div style={{ fontSize:12, color:"#908878", marginBottom:14 }}>Completed in {turnCount} turns</div>
              <button onClick={()=>{setPhase("deploy");setUnits([]);setHand([...ALL_UNITS]);setLog(["[ DEPLOY ] Select a card."]);setTurnOrder([]);setTurnIdx(0);setSelectedCard(null);}} style={{
                padding:"10px 20px", fontSize:13, fontFamily:"'Press Start 2P', monospace", background:"#308848", border:"3px solid #50b868", color:"#e8e0d0", cursor:"pointer", letterSpacing:"0.1em" }}>
                PLAY AGAIN
              </button>
            </div>
          )}

          {/* Log */}
          <div style={{ background:"#1a1422", border:"3px solid #2a2236", boxShadow:"0 0 0 2px #14101c", padding:10, maxHeight:220, overflow:"hidden", display:"flex", flexDirection:"column" }}>
            <div style={{ fontSize:11, color:"#d4a84a", marginBottom:6, letterSpacing:"0.12em" }}>BATTLE LOG</div>
            <div ref={logRef} style={{ flex:1, overflowY:"auto", scrollbarWidth:"thin" }}>
              {log.map((m,i) => <div key={i} style={{ fontSize:10, color:m.includes("═══")?"#f0cc60":m.includes("──")?"#d4a84a":m.includes("defeated")?"#e04848":"#908878", fontFamily:"Silkscreen, monospace", lineHeight:1.7, borderBottom:"1px solid rgba(42,34,54,0.5)", padding:"2px 0" }}>{m}</div>)}
            </div>
          </div>

          {/* Legend */}
          <div style={{ background:"#1a1422", border:"2px solid #2a2236", padding:10 }}>
            <div style={{ fontSize:10, color:"#605850", fontFamily:"Silkscreen, monospace", lineHeight:2 }}>
              🌲 Forest = 2 move cost<br/>💧 Water = 3 move cost<br/>🪨 Stone = impassable
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Silkscreen:wght@400;700&display=swap');
        @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.7;} }
        @keyframes dmgPop { 0%{opacity:1;transform:translateX(-50%) translateY(0);} 100%{opacity:0;transform:translateX(-50%) translateY(-36px);} }
        *{scrollbar-width:thin;scrollbar-color:#3a3258 #1a1422;}
        button:hover{filter:brightness(1.15);}
      `}</style>
    </div>
  );
}