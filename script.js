"use strict";

/* ========== DADOS ========== */
const COLORS = [
  { id: "blue", name: "Azul", hex: "#2d6bff" },
  { id: "cyan", name: "Ciano", hex: "#00f0ff" },
  { id: "green", name: "Verde", hex: "#39ff14" },
  { id: "yellow", name: "Amarelo", hex: "#fff200" },
  { id: "orange", name: "Laranja", hex: "#ff8c1a" },
  { id: "red", name: "Vermelho", hex: "#ff3150" },
  { id: "pink", name: "Rosa", hex: "#ff2bd6" },
  { id: "purple", name: "Roxo", hex: "#b026ff" }
];

const SHAPES = {
  x:        { name: "X",         d: '<path d="M22 22L78 78M78 22L22 78"/>' },
  o:        { name: "O",         d: '<circle cx="50" cy="50" r="30"/>' },
  triangle: { name: "Triângulo", d: '<path d="M50 16L86 80H14Z" fill="currentColor" fill-opacity=".18"/>' },
  square:   { name: "Quadrado",  d: '<rect x="20" y="20" width="60" height="60" rx="6" fill="currentColor" fill-opacity=".18"/>' },
  circle:   { name: "Círculo",   d: '<circle cx="50" cy="50" r="30" fill="currentColor" fill-opacity=".45"/>' },
  star:     { name: "Estrela",   d: '<path d="M50 12L61 38L89 40L67 58L74 86L50 71L26 86L33 58L11 40L39 38Z" fill="currentColor" fill-opacity=".2"/>' },
  diamond:  { name: "Diamante",  d: '<path d="M50 12L84 50L50 88L16 50Z" fill="currentColor" fill-opacity=".2"/>' },
  bolt:     { name: "Raio",      d: '<path d="M58 10L24 56H48L40 90L76 42H52Z" fill="currentColor" fill-opacity=".25"/>' },
  heart:    { name: "Coração",   d: '<path d="M50 84C14 58 16 28 34 24C42 22 48 28 50 34C52 28 58 22 66 24C84 28 86 58 50 84Z" fill="currentColor" fill-opacity=".25"/>' },
  cross:    { name: "Cruz",      d: '<path d="M38 14H62V38H86V62H62V86H38V62H14V38H38Z" fill="currentColor" fill-opacity=".2"/>' },
  hexagon:  { name: "Hexágono",  d: '<path d="M50 12L84 31V69L50 88L16 69V31Z" fill="currentColor" fill-opacity=".2"/>' }
};

const DIFFS = [
  { id: "beginner",   name: "Iniciante",  desc: "Joga quase ao acaso e erra bastante." },
  { id: "easy",       name: "Fácil",      desc: "Conhece jogadas básicas, mas ainda erra." },
  { id: "medium",     name: "Médio",      desc: "Equilibrado: às vezes vence, às vezes bloqueia." },
  { id: "hard",       name: "Difícil",    desc: "Vence quando pode, bloqueia você e prefere o centro e os cantos." },
  { id: "insane",     name: "Insano",     desc: "Estratégia quase perfeita. Raramente erra." },
  { id: "impossible", name: "Impossível", desc: "Minimax perfeito. Ela nunca perde." }
];

const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

/* ========== ESTADO ========== */
const S = {
  diff: "medium", name: "Jogador",
  player: { shape: "star", color: "cyan" },
  ai: { shape: "bolt", color: "pink" },
  board: Array(9).fill(null), turn: "P", over: true, busy: false,
  starter: "P", score: { P: 0, D: 0, A: 0 }, sound: true
};

try {
  const saved = JSON.parse(sessionStorage.getItem("jdvx_score"));
  if (saved) S.score = saved;
} catch (e) {}

const $ = (id) => document.getElementById(id);
const hex = (id) => COLORS.find((c) => c.id === id).hex;

/* ========== SOM ========== */
let actx = null;
function tone(freq, dur = 0.12, type = "square", delay = 0, vol = 0.06) {
  if (!S.sound) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === "suspended") actx.resume();
    const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + delay;
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + dur);
  } catch (e) {}
}
const SFX = {
  click: () => tone(660, 0.07),
  place: (ai) => tone(ai ? 330 : 520, 0.14, "triangle"),
  screen: () => { tone(300, 0.08, "sine"); tone(450, 0.1, "sine", 0.07); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, "square", i * 0.12)),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.22, "sawtooth", i * 0.14)),
  draw: () => { tone(400, 0.2, "triangle"); tone(400, 0.2, "triangle", 0.25); }
};

/* ========== FORMAS ========== */
function shapeSVG(shape, colorId) {
  const c = hex(colorId);
  return `<svg viewBox="0 0 100 100" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" style="color:${c};filter:drop-shadow(0 0 4px ${c}) drop-shadow(0 0 12px ${c})">${SHAPES[shape].d}</svg>`;
}

/* ========== TELAS ========== */
function show(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  $(id).classList.add("active");
  window.scrollTo(0, 0);
  SFX.screen();
}

/* ========== CONFIGURAÇÃO ========== */
function buildSetup() {
  $("diffs").innerHTML = DIFFS.map((d) => `<button class="chip" data-diff="${d.id}">${d.name}</button>`).join("");
  document.querySelectorAll(".shapes").forEach((box) => {
    box.innerHTML = Object.keys(SHAPES).map((k) =>
      `<button class="chip" title="${SHAPES[k].name}" data-shape="${k}">${shapeSVG(k, "cyan").replace(/filter:[^"]*/, "")}</button>`).join("");
  });
  document.querySelectorAll(".colors").forEach((box) => {
    box.innerHTML = COLORS.map((c) =>
      `<button class="chip" title="${c.name}" data-color="${c.id}" style="background:${c.hex};box-shadow:0 0 10px ${c.hex}"></button>`).join("");
  });
}

function refreshSetup() {
  document.querySelectorAll("#diffs .chip").forEach((b) => b.classList.toggle("sel", b.dataset.diff === S.diff));
  $("diffDesc").textContent = DIFFS.find((d) => d.id === S.diff).desc;
  ["player", "ai"].forEach((who) => {
    const other = who === "player" ? "ai" : "player";
    document.querySelectorAll(`.shapes[data-who="${who}"] .chip`).forEach((b) => b.classList.toggle("sel", b.dataset.shape === S[who].shape));
    document.querySelectorAll(`.colors[data-who="${who}"] .chip`).forEach((b) => {
      const locked = b.dataset.color === S[other].color;
      b.classList.toggle("sel", b.dataset.color === S[who].color);
      b.classList.toggle("locked", locked);
      b.disabled = locked;
    });
  });
  $("prevPlayer").innerHTML = shapeSVG(S.player.shape, S.player.color);
  $("prevAI").innerHTML = shapeSVG(S.ai.shape, S.ai.color);
}

document.addEventListener("click", (e) => {
  const t = e.target.closest("button");
  if (!t) return;
  if (t.dataset.go) { SFX.click(); show(t.dataset.go); return; }
  if (t.dataset.diff) { S.diff = t.dataset.diff; SFX.click(); refreshSetup(); return; }
  const who = t.parentElement.dataset && t.parentElement.dataset.who;
  if (who && t.dataset.shape) { S[who].shape = t.dataset.shape; SFX.click(); refreshSetup(); }
  if (who && t.dataset.color && !t.disabled) {
    const other = who === "player" ? "ai" : "player";
    if (S[other].color === t.dataset.color) return; // regra: cores nunca iguais
    S[who].color = t.dataset.color; SFX.click(); refreshSetup();
  }
});

/* ========== PLACAR ========== */
function saveScore() { try { sessionStorage.setItem("jdvx_score", JSON.stringify(S.score)); } catch (e) {} }
function renderScore(bump) {
  $("nP").textContent = S.score.P; $("nD").textContent = S.score.D; $("nA").textContent = S.score.A;
  $("scPName").textContent = S.name.toUpperCase();
  $("scP").style.color = hex(S.player.color); $("scA").style.color = hex(S.ai.color);
  if (bump) { const el = { P: $("scP"), D: $("nD").parentElement, A: $("scA") }[bump]; el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
}
function resetScore() { S.score = { P: 0, D: 0, A: 0 }; saveScore(); renderScore(); SFX.click(); }

/* ========== PARTIDA ========== */
function startGame() {
  S.name = ($("playerName").value.trim() || "Jogador").slice(0, 12);
  show("game");
  $("legP").innerHTML = `<span style="color:${hex(S.player.color)}">${S.name}:</span> ${shapeSVG(S.player.shape, S.player.color).replace("<svg", '<svg width="22" height="22"')}`;
  $("legA").innerHTML = `<span style="color:${hex(S.ai.color)}">IA:</span> ${shapeSVG(S.ai.shape, S.ai.color).replace("<svg", '<svg width="22" height="22"')}`;
  $("infoDiff").textContent = "Dificuldade: " + DIFFS.find((d) => d.id === S.diff).name;
  S.starter = "P";
  newRound(false);
}

function newRound(alternate = true) {
  if (alternate) S.starter = S.starter === "P" ? "A" : "P";
  S.round = (S.round || 0) + 1; S.board = Array(9).fill(null); S.over = false; S.busy = false; S.turn = S.starter;
  $("modal").classList.remove("show");
  renderBoard(); renderScore(); updateTurn();
  if (S.turn === "A") aiTurn();
}

function renderBoard() {
  $("board").innerHTML = "";
  S.board.forEach((v, i) => {
    const c = document.createElement("div");
    c.className = "cell" + (v ? " taken" : " free");
    c.dataset.i = i; c.setAttribute("role", "button");
    c.style.setProperty("--ghost", hex(S.player.color));
    if (v) c.innerHTML = shapeSVG(S[v === "P" ? "player" : "ai"].shape, S[v === "P" ? "player" : "ai"].color);
    c.addEventListener("click", () => playerMove(i));
    $("board").appendChild(c);
  });
}

function updateTurn() {
  const t = $("turn");
  if (S.over) { t.textContent = "FIM DE JOGO"; t.style.color = "#9fb7c9"; return; }
  const p = S.turn === "P";
  t.textContent = p ? "SUA VEZ" : "VEZ DA IA";
  t.style.color = hex(p ? S.player.color : S.ai.color);
}

function place(i, who) {
  S.board[i] = who;
  const cell = $("board").children[i];
  cell.classList.remove("free"); cell.classList.add("taken");
  const k = who === "P" ? "player" : "ai";
  cell.innerHTML = shapeSVG(S[k].shape, S[k].color);
  SFX.place(who === "A");
  const line = winnerLine(S.board);
  if (line) return finish(who, line);
  if (S.board.every(Boolean)) return finish("D");
  S.turn = who === "P" ? "A" : "P";
  updateTurn();
  if (S.turn === "A") aiTurn();
}

function playerMove(i) {
  if (S.over || S.busy || S.turn !== "P" || S.board[i]) return; // sem jogar em casa ocupada ou após o fim
  place(i, "P");
}

function aiTurn() {
  S.busy = true;
  const round = S.round;
  setTimeout(() => {
    if (S.over || round !== S.round) return;
    S.busy = false;
    place(aiChoose(S.board, S.diff), "A");
  }, 450 + Math.random() * 350);
}

function finish(res, line) {
  S.over = true; S.busy = false; updateTurn();
  S.score[res]++; saveScore(); renderScore(res);
  const cells = [...$("board").children];
  if (line) cells.forEach((c, i) => c.classList.add(line.includes(i) ? "win" : "dim"));
  const box = document.querySelector(".mbox");
  box.className = "mbox";
  let title, sub, color;
  if (res === "P") { title = "VITÓRIA!"; sub = "Você dominou o tabuleiro."; color = hex(S.player.color); SFX.win(); }
  else if (res === "A") { title = "DERROTA!"; sub = "A IA levou essa."; color = hex(S.ai.color); box.classList.add("lose"); SFX.lose(); }
  else { title = "EMPATE!"; sub = "Ninguém cedeu."; color = "#fff200"; box.classList.add("draw"); SFX.draw(); }
  $("mTitle").textContent = title; $("mSub").textContent = sub; box.style.setProperty("--mc", color);
  if (res !== "D") burst(line, color); else burst(null, color, true);
  setTimeout(() => $("modal").classList.add("show"), line ? 1100 : 500);
}

/* ========== IA ========== */
function winnerLine(b) {
  return LINES.find(([a, c, d]) => b[a] && b[a] === b[c] && b[a] === b[d]) || null;
}
const empties = (b) => b.map((v, i) => (v ? null : i)).filter((v) => v !== null);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function findWinFor(b, who) {
  for (const i of empties(b)) { b[i] = who; const w = winnerLine(b); b[i] = null; if (w) return i; }
  return null;
}

function minimax(b, turn, depth) {
  const w = winnerLine(b);
  if (w) return b[w[0]] === "A" ? 10 - depth : depth - 10;
  const e = empties(b);
  if (!e.length) return 0;
  let best = turn === "A" ? -Infinity : Infinity;
  for (const i of e) {
    b[i] = turn;
    const s = minimax(b, turn === "A" ? "P" : "A", depth + 1);
    b[i] = null;
    best = turn === "A" ? Math.max(best, s) : Math.min(best, s);
  }
  return best;
}

function rankedMoves(b) {
  return empties(b).map((i) => { b[i] = "A"; const s = minimax(b, "P", 1); b[i] = null; return { i, s }; })
    .sort((x, y) => y.s - x.s);
}

function heuristic(b) {
  const win = findWinFor(b, "A"); if (win !== null) return win;
  const block = findWinFor(b, "P"); if (block !== null) return block;
  if (!b[4]) return 4;
  const corners = [0, 2, 6, 8].filter((i) => !b[i]);
  if (corners.length) return pick(corners);
  return pick(empties(b));
}

function aiChoose(board, diff) {
  const b = board.slice(), free = empties(b), r = Math.random();
  switch (diff) {
    case "beginner": {
      if (r < 0.12) { const w = findWinFor(b, "A"); if (w !== null) return w; }
      return pick(free);
    }
    case "easy": {
      if (r < 0.45) { const w = findWinFor(b, "A"); if (w !== null) return w; }
      if (r < 0.55) { const k = findWinFor(b, "P"); if (k !== null) return k; }
      return pick(free);
    }
    case "medium": {
      if (r < 0.85) { const w = findWinFor(b, "A"); if (w !== null) return w; }
      if (r < 0.75) { const k = findWinFor(b, "P"); if (k !== null) return k; }
      return r < 0.5 && !b[4] ? 4 : pick(free);
    }
    case "hard":
      return r < 0.1 ? pick(free) : heuristic(b);
    case "insane": {
      const m = rankedMoves(b);
      if (r < 0.1 && m.length > 1) return m[1].i; // erra raramente
      return pick(m.filter((x) => x.s === m[0].s)).i;
    }
    default: { // impossivel: minimax perfeito
      const m = rankedMoves(b);
      return pick(m.filter((x) => x.s === m[0].s)).i;
    }
  }
}

/* ========== PARTÍCULAS ========== */
const cv = $("fx"), cx = cv.getContext("2d");
let parts = [], raf = null;
function fit() { cv.width = innerWidth; cv.height = innerHeight; }
addEventListener("resize", fit); fit();

function burst(line, color, draw) {
  const boardRect = $("board").getBoundingClientRect();
  const origins = [];
  if (line) line.forEach((i) => { const r = $("board").children[i].getBoundingClientRect(); origins.push([r.left + r.width / 2, r.top + r.height / 2]); });
  else origins.push([boardRect.left + boardRect.width / 2, boardRect.top + boardRect.height / 2]);
  const palette = draw ? ["#fff200", "#ff8c1a", "#ffffff"] : [color, "#ffffff", color];
  origins.forEach(([x, y]) => {
    for (let n = 0; n < 28; n++) {
      const a = Math.random() * Math.PI * 2, s = 1.5 + Math.random() * 4.5;
      parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, life: 1, c: pick(palette), r: 2 + Math.random() * 3 });
    }
  });
  if (!raf) raf = requestAnimationFrame(tick);
}
function tick() {
  cx.clearRect(0, 0, cv.width, cv.height);
  parts.forEach((p) => {
    p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.life -= 0.014;
    cx.globalAlpha = Math.max(p.life, 0); cx.fillStyle = p.c; cx.shadowColor = p.c; cx.shadowBlur = 10;
    cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.283); cx.fill();
  });
  parts = parts.filter((p) => p.life > 0);
  if (parts.length) raf = requestAnimationFrame(tick);
  else { raf = null; cx.clearRect(0, 0, cv.width, cv.height); }
}

/* ========== EVENTOS ========== */
$("btnStart").onclick = () => { SFX.click(); startGame(); };
$("btnNew").onclick = () => { SFX.click(); newRound(!S.over ? false : true); };
$("btnReset").onclick = resetScore;
$("menuReset").onclick = resetScore;
$("btnMenu").onclick = () => { S.over = true; show("menu"); };
$("mAgain").onclick = () => { SFX.click(); newRound(true); };
$("mMenu").onclick = () => { $("modal").classList.remove("show"); S.over = true; show("menu"); };
$("btnSound").onclick = () => {
  S.sound = !S.sound;
  $("btnSound").textContent = S.sound ? "🔊 Som ON" : "🔇 Som OFF";
  if (S.sound) SFX.click();
};

buildSetup(); refreshSetup(); renderScore();
