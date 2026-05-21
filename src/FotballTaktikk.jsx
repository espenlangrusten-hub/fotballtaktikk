import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Lock, User, Plus, Trash2, ChevronLeft, Users, Shield, Target,
  Save, Move, ArrowRight, X, LogOut, Edit3, Check, Settings,
  Trophy, ClipboardList, Activity, Eye, EyeOff, ShieldCheck,
  UserCog, KeyRound, AlertCircle
} from "lucide-react";
import { supabase } from './supabase';

/* ============================================================
   FOTBALL.TAKTIKK — v2
   - Admin-side med bruker/lag/spillerstyring
   - Rollebasert tilgang (admin / lagleder med les eller skriv)
   - Taktikkbrett vises umiddelbart
============================================================ */

// ---------- FONTS & STYLES ----------
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Manrope:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');
    .font-display { font-family: 'Oswald', sans-serif; letter-spacing: 0.02em; }
    .font-body { font-family: 'Manrope', sans-serif; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
    body { font-family: 'Manrope', sans-serif; background: #020617; }
    .pitch-grad {
      background:
        repeating-linear-gradient(180deg,
          rgba(0,0,0,0.08) 0% 9%,
          transparent 9% 18%
        ),
        linear-gradient(180deg, #3a9e48 0%, #2e8a3c 50%, #3a9e48 100%);
    }
    .scrollbar-thin::-webkit-scrollbar { width: 6px; height: 6px; }
    .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(132, 204, 22, 0.3); border-radius: 3px; }
    .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
    .no-select { user-select: none; -webkit-user-select: none; touch-action: none; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .anim-in { animation: fadeIn 0.35s ease-out both; }
    @keyframes pulseDot { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
    .pulse-dot { animation: pulseDot 1.8s ease-in-out infinite; }
  `}</style>
);

// ---------- CONSTANTS ----------
const POSITIONS = [
  { code: "K",  label: "Keeper",            color: "#facc15", group: "K" },
  { code: "CB", label: "Midtstopper",       color: "#60a5fa", group: "DEF" },
  { code: "LB", label: "Venstreback",       color: "#60a5fa", group: "DEF" },
  { code: "RB", label: "Høyreback",         color: "#60a5fa", group: "DEF" },
  { code: "DM", label: "Defensiv midt",     color: "#a78bfa", group: "MID" },
  { code: "CM", label: "Sentral midt",      color: "#a78bfa", group: "MID" },
  { code: "AM", label: "Offensiv midt",     color: "#a78bfa", group: "MID" },
  { code: "LM", label: "Venstre midt",      color: "#a78bfa", group: "MID" },
  { code: "RM", label: "Høyre midt",        color: "#a78bfa", group: "MID" },
  { code: "LW", label: "Venstre ving",      color: "#f97316", group: "ATT" },
  { code: "RW", label: "Høyre ving",        color: "#f97316", group: "ATT" },
  { code: "ST", label: "Spiss",             color: "#ef4444", group: "ATT" },
];
const POSITION_BY_CODE = Object.fromEntries(POSITIONS.map(p => [p.code, p]));

const FORMATIONS = {
  "4-4-2": [
    { role: "K",  x: 50, y: 92 },
    { role: "LB", x: 15, y: 72 }, { role: "CB", x: 37, y: 76 },
    { role: "CB", x: 63, y: 76 }, { role: "RB", x: 85, y: 72 },
    { role: "LM", x: 15, y: 48 }, { role: "CM", x: 37, y: 48 },
    { role: "CM", x: 63, y: 48 }, { role: "RM", x: 85, y: 48 },
    { role: "ST", x: 37, y: 22 }, { role: "ST", x: 63, y: 22 },
  ],
  "4-3-3": [
    { role: "K",  x: 50, y: 92 },
    { role: "LB", x: 15, y: 72 }, { role: "CB", x: 37, y: 76 },
    { role: "CB", x: 63, y: 76 }, { role: "RB", x: 85, y: 72 },
    { role: "CM", x: 30, y: 52 }, { role: "CM", x: 50, y: 50 }, { role: "CM", x: 70, y: 52 },
    { role: "LW", x: 17, y: 24 }, { role: "ST", x: 50, y: 18 }, { role: "RW", x: 83, y: 24 },
  ],
  "4-2-3-1": [
    { role: "K",  x: 50, y: 92 },
    { role: "LB", x: 15, y: 72 }, { role: "CB", x: 37, y: 76 },
    { role: "CB", x: 63, y: 76 }, { role: "RB", x: 85, y: 72 },
    { role: "DM", x: 37, y: 60 }, { role: "DM", x: 63, y: 60 },
    { role: "AM", x: 20, y: 38 }, { role: "AM", x: 50, y: 36 }, { role: "AM", x: 80, y: 38 },
    { role: "ST", x: 50, y: 18 },
  ],
  "4-1-2-1-2": [
    { role: "K",  x: 50, y: 92 },
    { role: "LB", x: 15, y: 72 }, { role: "CB", x: 37, y: 76 },
    { role: "CB", x: 63, y: 76 }, { role: "RB", x: 85, y: 72 },
    { role: "DM", x: 50, y: 62 },
    { role: "CM", x: 28, y: 48 }, { role: "CM", x: 72, y: 48 },
    { role: "AM", x: 50, y: 34 },
    { role: "ST", x: 35, y: 18 }, { role: "ST", x: 65, y: 18 },
  ],
  "3-4-3": [
    { role: "K",  x: 50, y: 92 },
    { role: "CB", x: 27, y: 76 }, { role: "CB", x: 50, y: 78 }, { role: "CB", x: 73, y: 76 },
    { role: "LM", x: 12, y: 52 }, { role: "CM", x: 37, y: 54 },
    { role: "CM", x: 63, y: 54 }, { role: "RM", x: 88, y: 52 },
    { role: "LW", x: 20, y: 22 }, { role: "ST", x: 50, y: 17 }, { role: "RW", x: 80, y: 22 },
  ],
  "3-4-2-1": [
    { role: "K",  x: 50, y: 92 },
    { role: "CB", x: 22, y: 78 }, { role: "CB", x: 50, y: 80 }, { role: "CB", x: 78, y: 78 },
    { role: "LM", x: 10, y: 56 }, { role: "CM", x: 33, y: 56 },
    { role: "CM", x: 67, y: 56 }, { role: "RM", x: 90, y: 56 },
    { role: "AM", x: 33, y: 32 }, { role: "AM", x: 67, y: 32 },
    { role: "ST", x: 50, y: 16 },
  ],
  "3-5-2": [
    { role: "K",  x: 50, y: 92 },
    { role: "CB", x: 27, y: 76 }, { role: "CB", x: 50, y: 78 }, { role: "CB", x: 73, y: 76 },
    { role: "LM", x: 10, y: 55 }, { role: "CM", x: 33, y: 52 },
    { role: "CM", x: 50, y: 50 }, { role: "CM", x: 67, y: 52 }, { role: "RM", x: 90, y: 55 },
    { role: "ST", x: 37, y: 22 }, { role: "ST", x: 63, y: 22 },
  ],
  "4-3-2-1": [
    { role: "K",  x: 50, y: 92 },
    { role: "LB", x: 15, y: 72 }, { role: "CB", x: 37, y: 76 },
    { role: "CB", x: 63, y: 76 }, { role: "RB", x: 85, y: 72 },
    { role: "CM", x: 25, y: 57 }, { role: "CM", x: 50, y: 55 }, { role: "CM", x: 75, y: 57 },
    { role: "AM", x: 35, y: 38 }, { role: "AM", x: 65, y: 38 },
    { role: "ST", x: 50, y: 18 },
  ],
  "5-3-2": [
    { role: "K",  x: 50, y: 92 },
    { role: "LB", x: 10, y: 70 }, { role: "CB", x: 30, y: 76 },
    { role: "CB", x: 50, y: 78 }, { role: "CB", x: 70, y: 76 }, { role: "RB", x: 90, y: 70 },
    { role: "CM", x: 28, y: 50 }, { role: "CM", x: 50, y: 48 }, { role: "CM", x: 72, y: 50 },
    { role: "ST", x: 37, y: 22 }, { role: "ST", x: 63, y: 22 },
  ],
  "4-5-1": [
    { role: "K",  x: 50, y: 92 },
    { role: "LB", x: 15, y: 72 }, { role: "CB", x: 37, y: 76 },
    { role: "CB", x: 63, y: 76 }, { role: "RB", x: 85, y: 72 },
    { role: "LM", x: 12, y: 45 }, { role: "CM", x: 33, y: 50 },
    { role: "CM", x: 50, y: 50 }, { role: "CM", x: 67, y: 50 }, { role: "RM", x: 88, y: 45 },
    { role: "ST", x: 50, y: 22 },
  ],
  "4-1-4-1": [
    { role: "K",  x: 50, y: 92 },
    { role: "LB", x: 15, y: 72 }, { role: "CB", x: 37, y: 76 },
    { role: "CB", x: 63, y: 76 }, { role: "RB", x: 85, y: 72 },
    { role: "DM", x: 50, y: 60 },
    { role: "LM", x: 12, y: 42 }, { role: "CM", x: 35, y: 44 },
    { role: "CM", x: 65, y: 44 }, { role: "RM", x: 88, y: 42 },
    { role: "ST", x: 50, y: 20 },
  ],
};

// Manager-inspired labels shown next to each formation
const FORMATION_LABELS = {
  "4-4-2":     "Klassisk",
  "4-3-3":     "Guardiola / Klopp",
  "4-2-3-1":   "Mourinho",
  "4-1-2-1-2": "Diamant (Pirlo)",
  "3-4-3":     "Tuchel / Chelsea",
  "3-4-2-1":   "Conte (Inter)",
  "3-5-2":     "Deschamps",
  "4-3-2-1":   "Juletreet (Capello)",
  "5-3-2":     "Defensiv blokk",
  "4-5-1":     "Kompakt midtbane",
  "4-1-4-1":   "Dobbel indreløper",
};

const FORMATION_NOTES = {
  "4-4-2": {
    description: "Den klassiske 4-4-2 gir god balanse mellom forsvar og angrep med to kompakte blokker på fire. Tosspissystemet skaper konstant press på motstanderens forsvarslinje og åpner rom for innløpende midtbanespillere.",
    defense: "Kompakt 4-4-blokk mellom linjene. De to spissene presser bakover og tvinger motstanderen utover. Midtbanen holder avstandene korte og dekker sentrum. Backene holder linjen og unngår å bli dradd ut av posisjon.",
    attack: "Rask ball fra midtbane til de to spissene som kombinerer og skaper rom. Ytre midtbanespillere strekker spillet bredt og leverer innlegg. Ved ballinnvinding satses det raskt på kontring med korte pasninger mellom spissene.",
  },
  "4-3-3": {
    description: "4-3-3 er kjent for aggressivt høypress og dominant posisjonsspill, popularisert av Guardiola og Klopp. Tre offensive spillere skaper konstant trussel i dybden og presser motstanderens forsvar høyt opp på banen.",
    defense: "Høyintensivt press initieres av de tre angriperne. Midtbanden på tre løper frem og tilbake for å støtte presset og blokkere pasningslinjene. Laget presser i kompakte enheter og forsøker å vinne ballen høyt.",
    attack: "Vingspillere strekker spillet maksimalt og søker 1v1-situasjoner. Sentral spiss drar på seg CB-er og skaper rom bak. Indreløperne løper sent inn i boksen som en tredje scoring-trussel.",
  },
  "4-2-3-1": {
    description: "4-2-3-1 er Mourinhos signatur — kontroll via dobbel defensiv pivot og en kreativ offensiv midtbanespiller bak en ensom spiss. Gir sterk kompakthet, solid ballsikring og god defensiv balanse.",
    defense: "Dobbel pivot sitter lavt og dekker sentrale rom foran backlinjen. De tre offensive midtbanespillerne trekker seg tilbake og danner en 4-5-1 ved ballap. Ensom spiss presser keeper og CB-er for å hindre rolig oppbygging.",
    attack: "Spiss vinner luftdueller eller holder ballen som ankerpunkt. Nr. 10 finner rom mellom linjene og trigger dyp pasning. Bredden sørges for av de ytre AMs og backene som løper overlappende.",
  },
  "4-1-2-1-2": {
    description: "Diamant-midtbanen (popularisert av Pirlo) skaper overtalighet sentralt. Den smale strukturen er svak på kantene, og backene må kompensere med høye og brede overlappinger for å gi tilstrekkelig bredde i spillet.",
    defense: "Én enkelt DM ankrer defensiven og dekker rommet foran backlinjen. De to sentrale midtbanespillerne løper ut og dekker bredden. Spissene presser nedover og tvinger spill ut mot kantene der backene ligger høyt.",
    attack: "Tett ballsirkulasjon sentralt presser motstanderens midtbane. Offensiv AM opererer mellom linjene og trigger de to spissene med gjennomslagspasninger. Backene overlapper og gir bredden som den smale diamanten mangler.",
  },
  "3-4-3": {
    description: "Tuchels tre-back-system med brede wingbacks skaper en 5-2-3 ved balltap. Tre angripere utgjør en konstant trussel, og wingbacks bidrar offensivt med innlegg og dybdeløp langs hele sidelinjen.",
    defense: "Tre midtstoppere dekker bredden i eget forsvar. Wingbacks trekker inn og danner en fembackslinje ved balltap. Dobbel pivot styrer sentralt rom og støtter forsvaret.",
    attack: "Wingbacks overlapper aggressivt og leverer innlegg fra dype posisjoner. Tre offensive spillere roterer og bytter posisjoner for å skape forvirring i motstanderens forsvar. Spillet skiftes raskt fra side til side.",
  },
  "3-4-2-1": {
    description: "Contes system med tre CB-er, fire midtbanespillere, to trequartisti og en ensom spiss. Svært kompakt defensivt med raske kombinasjoner via de to halvspissene som opererer mellom linjene.",
    defense: "Tre CB-er sikrer bredde og dybde i forsvar. Wingbacks trekker seg inn i en 5-linje ved balltap. De to trequartistiene hjelper i midtbanen og danner en kompakt 5-4-1-blokk.",
    attack: "De to nr. 10-ene fluktuerer mellom linjene og kombinerer med spissen. Wingbacks gir bredde og krysser. Spissen jobber hardt for å gi rom og utnytte hullene bak motstanderens forsvar.",
  },
  "3-5-2": {
    description: "Deschamps' franske system med fem på midtbanen dominerer ballbesittelse og presser effektivt. To spisser jobber hardt og kombinerer for å åpne rom og utnytte overtalighet i midtbanen.",
    defense: "Tre CB-er holder linjen mens wingbacks trekker inn og danner en fembackslinje. De tre sentrale midtbanespillerne jobber hardt for å dekke rom og støtte forsvaret.",
    attack: "Wingbacks gir bredde og fungerer som faktiske midtbanespillere offensivt. De tre sentrale midtbanespillerne sørger for ballsirkulasjon og timing av dybdeløp. To spisser presser og kombinerer i angrepssonen.",
  },
  "4-3-2-1": {
    description: "Juletreet (Capello) er smalt og intenst sentralt. To offensive midtbanespillere bak en spiss skaper krydssituasjoner og vanskelige markeringsproblemer som er utfordrende for motstanderens forsvarslinje.",
    defense: "Tre sentrale midtbanespillere dekker sentralt rom effektivt og støtter backlinjen. Spissen presser bakover. Kompakt blokk i midtsonen gjør det vanskelig for motstanderen å spille gjennom laget.",
    attack: "De to halvoffensive midtbanespillerne bytter posisjoner for å forvirre motstanderens forsvar. Spissen fluktuerer og drar CB-er med seg. Pasningsspillet er raskt og kort for å utnytte tette mellomrom.",
  },
  "5-3-2": {
    description: "Defensiv blokk med fem bakspillere og tre midtbanespillere. Prioriterer kompakthet og ballsikkerhet, og søker å slå kontringer med raske, effektive pasninger til de to spissene i front.",
    defense: "Fem bakspillere danner en bred og kompakt linje. Midtbanden på tre dekker sentralt rom og støtter backlinjen. Laget trekker seg organisert tilbake og inviterer motstanderen til å ha ballen.",
    attack: "Ballen vinnes og slås raskt til de to spissene. Midtbanespillerne støtter kontringen med løp inn i boksen. Wingbacks gjør offensive løp ved stabile faser.",
  },
  "4-5-1": {
    description: "Kompakt midtbanelinje på fem med en ensom spiss. Laget presser og kontrer effektivt, med ytre midtbanespillere som fungerer som vinger og gir bredde i spillet.",
    defense: "Fem midtbanespillere danner en tett blokk foran de fire backene. Spissen presser nedover for å hindre CB-er i å sette opp spillet. Laget er svært vanskelig å spille seg gjennom sentralt.",
    attack: "Rask transisjon via ytre midtbanespillere når ballen er vunnet. Spissen er alltid i fart og venter på gjennomspillinger. Kreative innbyttere brukes sent i kamp for å åpne spillet.",
  },
  "4-1-4-1": {
    description: "Enkelt defensiv midtbanespiller med fire midtbanespillere og en spiss. Balansert system med god dekning sentralt og fleksibel midtbane der indreløperne kan løpe høyt offensivt.",
    defense: "DM-en sitter sentralt og dekker rom foran backlinjen. De fire midtbanespillerne presser aggressivt og støtter defensiven. Spissen setter press på CB-er og tvinger feil i oppbyggingen.",
    attack: "Indreløperne overlapper ytre midtbanespillere og støtter spissen ved innlegg. Backene legger seg høyt og gir bredden. Spissen holder ballen som ankerpunkt og gir tid til at midtbanen løper inn.",
  },
};

const ROLE_NOTES = {
  "4-4-2": {
    K:  "Kommander boksen og distribuér raskt til backene eller midtbanen. Organiser backlinjen høyt.",
    LB: "Hold deg bred og overlapp LM ved mulighet. Trekk raskt tilbake ved ballap.",
    CB: "Hold linjen stramt og vinn luftdueller. Spill enkelt og rolig ut under press.",
    RB: "Hold deg bred og overlapp RM ved mulighet. Trekk raskt tilbake ved ballap.",
    LM: "Lever innlegg fra venstre og dekk LB-en defensivt ved ballap.",
    CM: "Sirkuler ballen og dekk sentralt rom. Timing-løp inn i boksen ved innlegg.",
    RM: "Lever innlegg fra høyre og dekk RB-en defensivt ved ballap.",
    ST: "Press bakover fra front, kombiner med medspiss og søk hull bak backlinjen.",
  },
  "4-3-3": {
    K:  "Kommander boksen. Distribuér til backene for oppbygging bakfra.",
    LB: "Overlapp LW og gi bredde. Trekk raskt tilbake ved ballap.",
    CB: "Hold linjen. Støtt oppbygging bakfra med korte pasninger til midtbanen.",
    RB: "Overlapp RW og gi bredde. Trekk raskt tilbake ved ballap.",
    CM: "Press høyt, dekk rom og støtt vingene med timing-løp inn i boksen.",
    LW: "Søk 1v1 mot RB, skjær inn i boksen og bidra til pressing høyt oppe.",
    ST: "Dra CB-er ut av posisjon og skap rom for indreløpere. Press keeper og CB-ene.",
    RW: "Søk 1v1 mot LB, skjær inn i boksen og bidra til pressing høyt oppe.",
  },
  "4-2-3-1": {
    K:  "Distribuér til pivoter eller backene. Hold deg klar for lange baller ved press.",
    LB: "Overlapp AML og gi bredde. DM-en dekker ryggen når du går fremover.",
    CB: "Hold linjen. Spill enkelt til pivoter. Vær klar for lange baller.",
    RB: "Overlapp AMR og gi bredde. DM-en dekker ryggen når du går fremover.",
    DM: "Dekk rom foran backlinjen. Spill enkelt og støtt oppbygging. Sitt aldri for høyt.",
    AM: "Finn rom mellom linjene og trigger gjennomspillinger til spissen. Press ned ved ballap.",
    ST: "Vinn luftdueller eller hold ballen som ankerpunkt. Søk hull bak linjen ved gjennomspilling.",
  },
  "4-1-2-1-2": {
    K:  "Distribuér raskt. Backene må strekke seg bredt for å gi bredde til den smale diamanten.",
    LB: "Legg deg veldig høyt og bredt — du er lagets eneste bredde på venstre side.",
    CB: "Hold linjen og støtt DM-en ved gjennombrudd. Spill enkelt og rolig.",
    RB: "Legg deg veldig høyt og bredt — du er lagets eneste bredde på høyre side.",
    DM: "Ankre defensiven. Dekk rom og støtt backlinjen. Spill aldri for offensivt.",
    CM: "Løp inn i boksen fra midtre posisjon. Støtt spissene og backene med timing.",
    AM: "Operér mellom linjene og trigger spissene. Kom deg raskt tilbake ved ballap.",
    ST: "Press bakover og kombiner med medspiss. Utnytt rom som backene og AM skaper.",
  },
  "3-4-3": {
    K:  "Kommander boksen og organiser de tre CB-ene. Distribuér til wingbacks.",
    CB: "De tre CB-ene deler bredden. Ytterste CB støtter sin wingback og dekker sin side.",
    LM: "Wingback — legg deg høyt, lever innlegg og trekk tilbake i 5-linja ved ballap.",
    CM: "Dekk sentralt rom og støtt pivotet. Løp inn i boksen ved innlegg fra wingbacks.",
    RM: "Wingback — legg deg høyt, lever innlegg og trekk tilbake i 5-linja ved ballap.",
    LW: "Søk 1v1-situasjoner, skjær inn i boksen og rotér med ST og RW.",
    ST: "Roter med LW og RW. Søk dybderom og trekk på deg CB-ene.",
    RW: "Søk 1v1-situasjoner, skjær inn i boksen og rotér med ST og LW.",
  },
  "3-4-2-1": {
    K:  "Distribuér til wingbacks eller CB-ene. Hold deg klar for lange baller.",
    CB: "Tre CB-er dekker bredden. Midterste organiserer linja. Ytterste støtter wingback.",
    LM: "Wingback — lever bredde og innlegg. Trekk tilbake i 5-linja ved ballap.",
    CM: "Dekk sentralt rom og støtt wingbacks. Spill enkelt og effektivt.",
    RM: "Wingback — lever bredde og innlegg. Trekk tilbake i 5-linja ved ballap.",
    AM: "Trequartista — operér mellom linjene og kombiner med spissen og den andre AM-en.",
    ST: "Jobbe hardt for å skape rom. Utnytt hull bak backlinjen og kombiner med AM-ene.",
  },
  "3-5-2": {
    K:  "Kommander boksen og støtt de tre CB-ene. Distribuér til wingbacks for bredde.",
    CB: "Tre CB-er deler bredden. Hold linjen og støtt midtbanen med enkle pasninger.",
    LM: "Wingback — fungér som midtbanespiller offensivt. Lever innlegg og trekk inn i 5-linja.",
    CM: "Sirkuler ballen effektivt. Dekk rom og støtt de to spissene.",
    RM: "Wingback — fungér som midtbanespiller offensivt. Lever innlegg og trekk inn i 5-linja.",
    ST: "Kombiner med medspiss. Press bakover fra front og søk hull bak linjen.",
  },
  "4-3-2-1": {
    K:  "Distribuér til backene for oppbygging. Organiser den kompakte midtblokken.",
    LB: "Hold posisjonen og gi enkle pasninger til CM. Unngå å bli isolert på kanten.",
    CB: "Hold linjen. Spill enkelt til de tre CM-ene. Vinn luftdueller.",
    RB: "Hold posisjonen og gi enkle pasninger til CM. Unngå å bli isolert på kanten.",
    CM: "Tre CM-er dekker sentralt rom. Sirkuler ballen og bytt spill raskt.",
    AM: "Skjær inn fra din side og kombiner med medspiss. Bytt posisjoner for å forvirre.",
    ST: "Utnytt dybderom. Jobbe tett med de to AM-ene. Press bakover fra front.",
  },
  "5-3-2": {
    K:  "Distribuér raskt til de fem bakspillerne eller midtbanen. Klar for kontringssituasjoner.",
    LB: "Wingback — hold deg lavt defensivt. Gjør offensive løp kun ved stabile faser.",
    CB: "Hold den kompakte 5-linja. Vinn luftdueller og spill enkelt fremover.",
    RB: "Wingback — hold deg lavt defensivt. Gjør offensive løp kun ved stabile faser.",
    CM: "Støtt forsvaret og dekk rom. Distribuér raskt til spissene ved ballinnvining.",
    ST: "Hold ballen som ankerpunkt. Press bakover ved ballap og forbered kontring.",
  },
  "4-5-1": {
    K:  "Distribuér til backene. Hold deg klar for lange baller ved høypress fra motstanderen.",
    LB: "Hold posisjonen bak LM. Overlapp kun ved trygg situasjon.",
    CB: "Hold linjen. Spill enkelt til CM-ene. Vær kompakt med de fire backene.",
    RB: "Hold posisjonen bak RM. Overlapp kun ved trygg situasjon.",
    LM: "Fungér som vingstopper. Lever innlegg ved mulighet og dekk LB-en defensivt.",
    CM: "Tre CM-er sitter kompakt og dekker sentralt. Distribuér effektivt.",
    RM: "Fungér som vingstopper. Lever innlegg ved mulighet og dekk RB-en defensivt.",
    ST: "Hold ballen alene og vent på støtte fra midtbanen. Press bakover fra front.",
  },
  "4-1-4-1": {
    K:  "Kommander boksen. Distribuér til DM eller backene for oppbygging.",
    LB: "Overlapp LM og gi bredde. DM-en dekker sentralt mens du er fremme.",
    CB: "Hold linjen. Spill enkelt til DM-en. Vinn luftdueller.",
    RB: "Overlapp RM og gi bredde. DM-en dekker sentralt mens du er fremme.",
    DM: "Ankre defensiven. Aldri for langt fremover. Dekk rom foran backlinjen.",
    LM: "Kombiner med LB-en. Lever innlegg og trekk tilbake defensivt.",
    CM: "Løp inn i boksen fra indre bane. Støtt spissen og bidra med mål.",
    RM: "Kombiner med RB-en. Lever innlegg og trekk tilbake defensivt.",
    ST: "Hold ballen og vent på indreløpere. Press bakover fra front.",
  },
};

const uid = () => Math.random().toString(36).slice(2, 10);
const roleGroup = (code) => POSITION_BY_CODE[code]?.group || "ATT";

const GROUP_ORDER = { K: 0, DEF: 1, MID: 2, ATT: 3 };
const sortPlayers = (players) => [...players].sort((a, b) => {
  const ga = GROUP_ORDER[POSITION_BY_CODE[a.positions?.[0]]?.group] ?? 9;
  const gb = GROUP_ORDER[POSITION_BY_CODE[b.positions?.[0]]?.group] ?? 9;
  if (ga !== gb) return ga - gb;
  return (a.number || 999) - (b.number || 999);
});

const sortTeamNames = (a, b) => {
  const aM = a.match(/^(.*?)(\d+)$/);
  const bM = b.match(/^(.*?)(\d+)$/);
  if (aM && bM && aM[1].trim().toLowerCase() === bM[1].trim().toLowerCase()) {
    return parseInt(aM[2]) - parseInt(bM[2]);
  }
  return a.localeCompare(b, "nb", { sensitivity: "base" });
};

// ---------- STORAGE ----------
const storage = {
  async get(key) {
    try {
      const { data, error } = await supabase
        .from('app_data')
        .select('value')
        .eq('key', key)
        .maybeSingle();
      if (error) throw error;
      if (data) return data.value;
    } catch {}
    // fallback: localStorage
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  async set(key, value) {
    try {
      const { error } = await supabase
        .from('app_data')
        .upsert({ key, value });
      if (error) throw error;
    } catch {}
    // mirror to localStorage as offline cache
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
};

const DB_KEY = "fotball_app_v2";
const defaultDB = () => ({
  users: [{
    id: uid(),
    username: "admin",
    password: "admin",
    role: "admin",      // "admin" | "lagleder"
    teamAccess: [],     // for lagledere: [{ teamId, permission: "read" | "write" }]
  }],
  club: { name: "Min Klubb" },
  teams: [],
});

// ---------- PERMISSIONS ----------
const isAdmin = (u) => u?.role === "admin";
const canRead = (u, teamId) => {
  if (!u) return false;
  if (isAdmin(u)) return true;
  return u.teamAccess?.some(a => a.teamId === teamId);
};
const canWrite = (u, teamId) => {
  if (!u) return false;
  if (isAdmin(u)) return true;
  return u.teamAccess?.some(a => a.teamId === teamId && a.permission === "write");
};
const visibleTeams = (u, teams) => {
  if (!u) return [];
  if (isAdmin(u)) return teams;
  return teams.filter(t => canRead(u, t.id));
};

// ---------- SHARED UI ----------
function Field({ icon, label, children }) {
  return (
    <div>
      {label && <label className="text-xs font-semibold tracking-wider mb-1.5 block" style={{ color: "rgba(255,255,255,0.85)" }}>{label.toUpperCase()}</label>}
      <div className="flex items-center gap-3 bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 focus-within:border-lime-400/50 transition-colors">
        {icon && <span style={{ color: "rgba(255,255,255,0.5)" }}>{icon}</span>}
        {children}
      </div>
    </div>
  );
}

function Modal({ title, onClose, children, size = "md" }) {
  const sizeCls = size === "lg" ? "max-w-2xl" : size === "xl" ? "max-w-4xl" : "max-w-lg";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm anim-in" onClick={onClose}>
      <div className={`bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full ${sizeCls} max-h-[90vh] flex flex-col`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h3 className="font-display text-xl text-white">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto scrollbar-thin">{children}</div>
      </div>
    </div>
  );
}

function RoleBadge({ role }) {
  if (role === "admin") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider bg-lime-400/15 text-lime-400 border border-lime-400/30">
        <ShieldCheck className="w-3 h-3" /> ADMIN
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider bg-slate-700/30 text-slate-300 border border-slate-700">
      LAGLEDER
    </span>
  );
}

function PermBadge({ permission }) {
  const map = {
    write: { label: "SKRIVE", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
    read:  { label: "LESE",   cls: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  };
  const m = map[permission] || map.read;
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider border ${m.cls}`}>
      {m.label}
    </span>
  );
}

function ReadOnlyBanner() {
  return (
    <div className="bg-blue-500/10 border border-blue-500/30 text-blue-300 text-sm rounded-xl px-4 py-2.5 flex items-center gap-2 mb-4">
      <Eye className="w-4 h-4 flex-shrink-0" />
      <span>Du har <strong>lese-tilgang</strong> til dette laget. Redigering er deaktivert.</span>
    </div>
  );
}

// ---------- AUTH ----------
function AuthScreen({ onLogin, db }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState("");

  const submit = () => {
    setErr("");
    if (!u.trim() || !p.trim()) return setErr("Fyll inn brukernavn og passord");
    const found = db.users.find(x => x.username === u.trim() && x.password === p);
    if (!found) return setErr("Feil brukernavn eller passord");
    onLogin(found.id);
  };

  return (
    <div className="min-h-screen w-full pitch-grad relative overflow-hidden flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/85 via-slate-900/75 to-slate-950/95" />
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-lime-400 via-emerald-400 to-lime-400" />

      <div className="relative w-full max-w-md anim-in">
        <div className="text-center mb-8">
          <img src="logo.svg" alt="Fotball Taktikk" className="mx-auto mb-5" style={{ width: 100, height: 112 }} />
          <h1 className="font-display text-5xl font-bold" style={{ color: "#ffffff" }}>
            Fotballtaktikk
          </h1>
          <p className="text-white text-sm mt-2 tracking-wide">
            PROFESJONELL KLUBBSTYRING FOR LAGLEDERE
          </p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="space-y-4">
            <Field icon={<User className="w-4 h-4" />} label="Brukernavn">
              <input value={u} onChange={e => setU(e.target.value)}
                className="bg-transparent w-full outline-none text-white placeholder:text-slate-600"
                placeholder="Brukernavn" autoComplete="username" style={{ fontSize: 16 }} />
            </Field>
            <Field icon={<Lock className="w-4 h-4" />} label="Passord">
              <input type={showPass ? "text" : "password"} value={p} onChange={e => setP(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submit()}
                className="bg-transparent w-full outline-none text-white placeholder:text-slate-600"
                placeholder="••••••••" autoComplete="current-password" style={{ fontSize: 16 }} />
              <button onClick={() => setShowPass(s => !s)} className="hover:text-lime-400" style={{ color: "rgba(255,255,255,0.5)" }}>
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </Field>

            {err && (
              <div className="text-red-400 text-sm bg-red-950/40 border border-red-900/60 rounded-lg p-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {err}
              </div>
            )}

            <button onClick={submit}
              className="w-full py-3.5 bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold rounded-xl shadow-lg shadow-lime-400/20 active:scale-[0.98]">
              LOGG INN
            </button>

            <p className="text-xs text-white/40 text-center pt-1">
              Brukerkontoer opprettes og administreres av admin.
            </p>
          </div>
        </div>

        <p className="text-center text-white/30 text-xs mt-6 tracking-wider">v2.0 · DATA LAGRES LOKALT</p>
      </div>
    </div>
  );
}

// ---------- HEADER ----------
function Header({ user, club, onLogout, breadcrumbs, onBack, onAdmin, currentView, teamName }) {
  return (
    <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-800 text-slate-300 flex-shrink-0">
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div className="w-9 h-9 rounded-xl bg-lime-400 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-5 h-5 text-slate-950" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            {teamName ? (
              <>
                <div className="font-display text-xl sm:text-2xl text-white leading-tight truncate">{teamName}</div>
                <div className="text-[10px] text-slate-500 leading-none truncate">{club?.name || ""}</div>
              </>
            ) : (
              <>
                <div className="font-display text-lg text-white leading-none truncate">
                  {club?.name || "FOTBALL.TAKTIKK"}
                </div>
                {breadcrumbs && <div className="text-xs text-slate-500 mt-0.5 truncate">{breadcrumbs}</div>}
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin(user) && (
            <button onClick={onAdmin}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider flex items-center gap-2 transition-all ${
                currentView === "admin"
                  ? "bg-lime-400 text-slate-950"
                  : "bg-slate-900 border border-slate-800 hover:border-lime-400/50 text-lime-400"
              }`}>
              <ShieldCheck className="w-4 h-4" /> ADMIN
            </button>
          )}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
            <div className="w-2 h-2 rounded-full bg-lime-400 pulse-dot" />
            <span className="text-xs text-slate-300 font-medium">{user.username}</span>
            <RoleBadge role={user.role} />
          </div>
          <button onClick={onLogout} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400" title="Logg ut">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

// ---------- CLUB VIEW ----------
function ClubView({ user, db, setDB, onOpenTeam }) {
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [year, setYear] = useState(new Date().getFullYear() - 13);
  const [variant, setVariant] = useState("1");

  const teams = visibleTeams(user, db.teams);
  const isAdminUser = isAdmin(user);

  const createTeam = async () => {
    if (!name.trim()) return;
    const team = {
      id: uid(), name: name.trim(), ageYear: year, variant, format: "11v11",
      players: [], tactics: [], createdAt: Date.now(),
    };
    const next = { ...db, teams: [...db.teams, team] };
    setDB(next); await storage.set(DB_KEY, next);
    setShowNew(false); setName(""); setVariant("1");
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(155deg, #08111e 0%, #0d2340 45%, #08111e 100%)" }}>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-end justify-between mb-2 flex-wrap gap-4">
        <div>
          <div className="text-xs font-semibold text-lime-400 tracking-widest mb-2">KLUBBSIDE</div>
          <h1 className="font-display text-4xl sm:text-5xl text-white" style={{ color: "#fff" }}>LAG OVERSIKT</h1>
          <p style={{ color: "rgba(255,255,255,0.6)" }} className="mt-2">
            {isAdminUser ? "Administrer alle 11-er lag i klubben" : `${teams.length} lag du har tilgang til`}
          </p>
        </div>
        {isAdminUser && (
          <button onClick={() => setShowNew(true)}
            className="px-4 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-semibold text-sm flex items-center gap-2 shadow-lg shadow-lime-400/20">
            <Plus className="w-4 h-4" /> Nytt lag
          </button>
        )}
      </div>

      {teams.length === 0 ? (
        <div className="border-2 border-dashed border-white/10 rounded-2xl p-16 text-center mt-8">
          <Shield className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h3 className="font-display text-2xl text-white/40 mb-2">
            {isAdminUser ? "INGEN LAG ENNÅ" : "INGEN TILGANG TIL LAG"}
          </h3>
          <p className="text-slate-500 text-sm mb-6">
            {isAdminUser ? "Opprett ditt første 11-er lag" : "Ta kontakt med admin for tilgang"}
          </p>
          {isAdminUser && (
            <button onClick={() => setShowNew(true)}
              className="px-5 py-2.5 rounded-xl bg-lime-400 text-slate-950 font-semibold text-sm inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Opprett lag
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="text-xs font-bold tracking-widest mt-6 mb-3" style={{ color: "#475569" }}>VELG LAG</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...teams].sort((a, b) => {
              const nc = a.name.localeCompare(b.name, "nb", { sensitivity: "base" });
              if (nc !== 0) return nc;
              const av = parseInt(a.variant) || 0;
              const bv = parseInt(b.variant) || 0;
              if (av !== bv) return av - bv;
              return (a.variant || "").localeCompare(b.variant || "", "nb");
            }).map(team => (
              <TeamCard key={team.id} team={team} user={user} onClick={() => onOpenTeam(team.id)} />
            ))}
          </div>
        </>
      )}

      {showNew && (
        <Modal title="Opprett nytt lag" onClose={() => setShowNew(false)}>
          <div className="space-y-4">
            <Field icon={<Shield className="w-4 h-4" />} label="Lagnavn">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="f.eks. Monolitten G14"
                className="bg-transparent w-full outline-none text-white placeholder:text-slate-600" autoFocus />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field icon={<Activity className="w-4 h-4" />} label="Årskull">
                <input type="number" value={year} onChange={e => setYear(parseInt(e.target.value) || year)}
                  className="bg-transparent w-full outline-none text-white" />
              </Field>
              <Field icon={<Target className="w-4 h-4" />} label="Variant">
                <input value={variant} onChange={e => setVariant(e.target.value)} placeholder="1, 2, A, B..."
                  className="bg-transparent w-full outline-none text-white placeholder:text-slate-600" />
              </Field>
            </div>
            <div className="text-xs text-slate-500 bg-slate-950/50 border border-slate-800 rounded-lg p-3">
              Format: <span className="text-lime-400 font-semibold">11-er fotball</span>
            </div>
            <button onClick={createTeam} className="w-full py-3 bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold rounded-xl">
              Opprett lag
            </button>
          </div>
        </Modal>
      )}
    </div>
    </div>
  );
}


function TeamCard({ team, user, onClick }) {
  const write = canWrite(user, team.id);
  return (
    <button onClick={onClick}
      className="group text-left rounded-2xl p-5 transition-all"
      style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)" }}
      onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; e.currentTarget.style.borderColor = "rgba(132,204,22,0.5)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; }}
    >
      <div className="flex items-start justify-between mb-3">
        <PermBadge permission={write ? "write" : "read"} />
      </div>
      <h3 className="font-display text-xl" style={{ color: "#fff" }}>
        {team.name}{team.variant ? ` ${team.variant}` : ""}
      </h3>
      <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.65)" }}>Årskull {team.ageYear} · {team.format}</div>
      <div className="flex gap-4 mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }}>
        <div>
          <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Spillere</div>
          <div className="font-display text-lg" style={{ color: "#fff" }}>{team.players.length}</div>
        </div>
      </div>
    </button>
  );
}

// ---------- TEAM VIEW (tabbed) ----------
function TeamView({ team, user, db, setDB, onBack }) {
  const [tab, setTab] = useState("oversikt");
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(team.name);
  const [newVariant, setNewVariant] = useState(team.variant || "");
  const liveTeam = db.teams.find(t => t.id === team.id) || team;
  const write = canWrite(user, liveTeam.id);
  const adminUser = isAdmin(user);

  const saveTeamName = async () => {
    if (!newName.trim()) return;
    const next = { ...db, teams: db.teams.map(t => t.id === liveTeam.id
      ? { ...t, name: newName.trim(), variant: newVariant.trim() || "" }
      : t) };
    setDB(next); await storage.set(DB_KEY, next);
    setEditingName(false);
  };

  const deleteTeam = async () => {
    if (!confirm(`Slette laget "${liveTeam.name}"? Alle spillere og taktikker forsvinner.`)) return;
    const nextUsers = db.users.map(u => ({ ...u, teamAccess: (u.teamAccess || []).filter(a => a.teamId !== liveTeam.id) }));
    const next = { ...db, teams: db.teams.filter(t => t.id !== liveTeam.id), users: nextUsers };
    setDB(next); await storage.set(DB_KEY, next);
    onBack?.();
  };

  return (
    <div className="min-h-screen" style={{ background: "#020617" }}>
      {/* Sticky tab bar — sits right below the sticky global header */}
      <div className="sticky top-[60px] z-20 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          {/* Team edit row (only shown when editing) */}
          {editingName ? (
            <div className="flex items-center gap-2 py-2 flex-wrap">
              <div className="text-xs font-bold text-lime-600 tracking-widest mr-1 uppercase hidden sm:block">
                {liveTeam.format} · {liveTeam.ageYear}
              </div>
              <input value={newName} onChange={e => setNewName(e.target.value)}
                className="font-display text-lg text-white bg-transparent border-b border-lime-400 outline-none w-36 sm:w-48"
                autoFocus onKeyDown={e => e.key === "Enter" && saveTeamName()} />
              <input value={newVariant} onChange={e => setNewVariant(e.target.value)}
                placeholder="variant"
                className="font-display text-base text-slate-400 bg-transparent border-b border-slate-600 outline-none w-16"
                onKeyDown={e => e.key === "Enter" && saveTeamName()} />
              <button onClick={saveTeamName} className="p-1.5 rounded-lg bg-lime-400 hover:bg-lime-300 text-slate-950">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => { setEditingName(false); setNewName(liveTeam.name); setNewVariant(liveTeam.variant || ""); }}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : null}

          {/* Tab bar + edit/delete actions */}
          <div className="flex items-center justify-between">
            <div className="flex">
              {[["oversikt","Oversikt"],["spillere","Spillere"],["taktikk","Taktikk"],["kamp","Kamp"]].map(([key,label]) => (
                <button key={key} onClick={() => setTab(key)}
                  className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                    tab === key
                      ? "border-lime-400 text-lime-400"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}>
                  {label}
                </button>
              ))}
            </div>
            {!editingName && (write || adminUser) && (
              <div className="flex items-center gap-1 pr-1">
                {write && (
                  <button onClick={() => setEditingName(true)}
                    className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300"
                    title="Endre lagnavn">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
                {adminUser && (
                  <button onClick={deleteTeam}
                    className="p-2 rounded-lg hover:bg-red-900/40 text-slate-600 hover:text-red-400"
                    title="Slett lag">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        {!write && <div className="px-4"><ReadOnlyBanner /></div>}
      </div>

      {/* Tab content */}
      {tab === "oversikt" && <TeamOverview team={liveTeam} user={user} db={db} setDB={setDB} setTab={setTab} />}
      {tab === "spillere" && <TeamPlayers team={liveTeam} user={user} db={db} setDB={setDB} />}
      {tab === "taktikk" && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5">
          <TacticsView team={liveTeam} user={user} db={db} setDB={setDB} />
        </div>
      )}
      {tab === "kamp" && <TeamMatches team={liveTeam} user={user} db={db} setDB={setDB} />}
    </div>
  );
}

function TeamOverview({ team, user, db, setDB, setTab }) {
  const write = canWrite(user, team.id);
  const pitchRef = useRef(null);
  const selectedPlayerRef = useRef(null);

  const savedTactics = team.tactics || [];

  const buildFromFormation = useCallback((key) => ({
    id: uid(), name: key, formation: key,
    slots: FORMATIONS[key].map(s => ({ id: uid(), x: s.x, y: s.y, role: s.role, playerId: null })),
    arrows: [],
  }), []);

  const autoAssign = useCallback((t) => {
    const used = new Set();
    const slots = t.slots.map(slot => {
      const g = roleGroup(slot.role);
      const cand = [...team.players].find(p =>
        !used.has(p.id) && (p.positions.includes(slot.role) || p.positions.some(c => roleGroup(c) === g))
      );
      if (cand) { used.add(cand.id); return { ...slot, playerId: cand.id }; }
      return { ...slot, playerId: null };
    });
    return { ...t, slots };
  }, [team.players]);

  const [tactic, setTactic] = useState(() => {
    if (savedTactics.length) return autoAssign({ ...savedTactics[savedTactics.length - 1] });
    return autoAssign(buildFromFormation("4-4-2"));
  });
  const [dropVal, setDropVal] = useState(() =>
    savedTactics.length ? `tactic:${savedTactics[savedTactics.length - 1].id}` : `formation:4-4-2`
  );
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [draggingSlot, setDraggingSlot] = useState(null);
  const [livePos, setLivePos] = useState(null);
  const [arrowMode, setArrowMode] = useState(false);
  const [drawingArrow, setDrawingArrow] = useState(null);
  const [selectedArrowId, setSelectedArrowId] = useState(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [overwriteId, setOverwriteId] = useState("");
  const [saveMode, setSaveMode] = useState("new");

  useEffect(() => { selectedPlayerRef.current = selectedPlayerId; }, [selectedPlayerId]);

  const saveTacticToDb = useCallback(async (t) => {
    const list = team.tactics || [];
    if (!list.some(x => x.id === t.id)) return;
    const newList = list.map(x => x.id === t.id ? t : x);
    const next = { ...db, teams: db.teams.map(tm => tm.id === team.id ? { ...tm, tactics: newList } : tm) };
    setDB(next);
    await storage.set(DB_KEY, next);
  }, [db, setDB, team.id]);

  const handleSaveDialog = () => {
    setSaveName(tactic.name || tactic.formation || "");
    setOverwriteId(savedTactics[0]?.id || "");
    setSaveMode("new");
    setShowSaveDialog(true);
  };

  const handleConfirmSave = () => {
    let newList;
    let savedId;
    if (saveMode === "overwrite" && overwriteId) {
      savedId = overwriteId;
      const updated = { ...tactic, id: overwriteId, name: savedTactics.find(t => t.id === overwriteId)?.name || tactic.name };
      newList = (team.tactics || []).map(t => t.id === overwriteId ? updated : t);
      setTactic(updated);
      setDropVal(`tactic:${overwriteId}`);
    } else {
      const name = saveName.trim();
      if (!name) return;
      savedId = uid();
      const newT = { ...tactic, id: savedId, name };
      newList = [...(team.tactics || []), newT];
      setTactic(newT);
      setDropVal(`tactic:${savedId}`);
    }
    const next = { ...db, teams: db.teams.map(tm => tm.id === team.id ? { ...tm, tactics: newList } : tm) };
    setDB(next);
    storage.set(DB_KEY, next);
    setShowSaveDialog(false);
    setSaveName("");
    setOverwriteId("");
  };

  const assignPlayer = useCallback((slotId, playerId) => {
    setTactic(prev => {
      const updated = {
        ...prev,
        slots: prev.slots.map(s => {
          if (s.id === slotId) return { ...s, playerId };
          if (s.playerId === playerId && playerId) return { ...s, playerId: null };
          return s;
        }),
      };
      saveTacticToDb(updated);
      return updated;
    });
  }, [saveTacticToDb]);

  const handleDropdownChange = (val) => {
    setDropVal(val);
    setSelectedPlayerId(null);
    if (val.startsWith("formation:")) {
      const key = val.slice(10);
      setTactic(autoAssign(buildFromFormation(key)));
    } else {
      const id = val.slice(7);
      const found = (team.tactics || []).find(t => t.id === id);
      if (found) setTactic(autoAssign({ ...found }));
    }
  };

  const pitchCoords = (clientX, clientY) => {
    const rect = pitchRef.current?.getBoundingClientRect();
    if (!rect) return { x: 50, y: 50 };
    return {
      x: Math.max(2, Math.min(98, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.max(2, Math.min(98, ((clientY - rect.top) / rect.height) * 100)),
    };
  };

  const onPitchPointerDown = useCallback((e) => {
    if (!write || !arrowMode) return;
    if (e.target !== pitchRef.current && !e.target.classList.contains('pitch-surface')) return;
    e.preventDefault();
    const from = pitchCoords(e.clientX, e.clientY);
    let current = { fromX: from.x, fromY: from.y, toX: from.x, toY: from.y };
    setDrawingArrow(current);

    const onMove = (ev) => {
      ev.preventDefault();
      const to = pitchCoords(ev.clientX, ev.clientY);
      current = { ...current, toX: to.x, toY: to.y };
      setDrawingArrow({ ...current });
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      const dist = Math.hypot(current.toX - current.fromX, current.toY - current.fromY);
      if (dist > 3) {
        const arrow = { id: uid(), ...current };
        setTactic(t => {
          const updated = { ...t, arrows: [...(t.arrows || []), arrow] };
          saveTacticToDb(updated);
          return updated;
        });
      }
      setDrawingArrow(null);
    };
    document.addEventListener('pointermove', onMove, { passive: false });
    document.addEventListener('pointerup', onUp);
  }, [write, arrowMode, pitchCoords, saveTacticToDb]);

  const onSlotPointerDown = (e, slot) => {
    if (!write) return;
    e.preventDefault();
    e.stopPropagation();

    if (arrowMode) {
      const from = pitchCoords(e.clientX, e.clientY);
      let current = { fromX: from.x, fromY: from.y, toX: from.x, toY: from.y };
      setDrawingArrow(current);
      const onMove = (ev) => {
        ev.preventDefault();
        const to = pitchCoords(ev.clientX, ev.clientY);
        current = { ...current, toX: to.x, toY: to.y };
        setDrawingArrow({ ...current });
      };
      const onUp = () => {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        const dist = Math.hypot(current.toX - current.fromX, current.toY - current.fromY);
        if (dist > 3) {
          const arrow = { id: uid(), ...current };
          setTactic(t => {
            const updated = { ...t, arrows: [...(t.arrows || []), arrow] };
            saveTacticToDb(updated);
            return updated;
          });
        }
        setDrawingArrow(null);
      };
      document.addEventListener('pointermove', onMove, { passive: false });
      document.addEventListener('pointerup', onUp);
      return;
    }

    const startX = e.clientX, startY = e.clientY;
    const slotId = slot.id;
    let active = false;
    let latestPos = { x: slot.x, y: slot.y };
    let rafId = null;

    const onMove = (ev) => {
      ev.preventDefault();
      if (!active) {
        if (Math.abs(ev.clientX - startX) > 8 || Math.abs(ev.clientY - startY) > 8) {
          active = true;
          latestPos = pitchCoords(ev.clientX, ev.clientY);
          setDraggingSlot(slotId);
          setLivePos(latestPos);
          setSelectedPlayerId(null);
        }
        return;
      }
      latestPos = pitchCoords(ev.clientX, ev.clientY);
      if (!rafId) rafId = requestAnimationFrame(() => { setLivePos({ ...latestPos }); rafId = null; });
    };

    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      if (!active) {
        // tap: assign or deassign
        const selId = selectedPlayerRef.current;
        if (selId) {
          assignPlayer(slotId, selId);
          setSelectedPlayerId(null);
        } else if (slot.playerId) {
          assignPlayer(slotId, null);
        }
      } else {
        // drag: move slot locally only, no DB save
        setTactic(t => ({ ...t, slots: t.slots.map(s => s.id === slotId ? { ...s, ...latestPos } : s) }));
      }
      setDraggingSlot(null);
      setLivePos(null);
    };

    document.addEventListener('pointermove', onMove, { passive: false });
    document.addEventListener('pointerup', onUp);
  };

  const sortedPlayers = useMemo(() =>
    [...team.players].sort((a, b) => (a.number || 999) - (b.number || 999))
  , [team.players]);

  const pitchHasSelection = !!selectedPlayerId;

  return (
    <>
    <div className="min-h-screen" style={{ background: "linear-gradient(155deg, #08111e 0%, #0d2340 45%, #08111e 100%)" }}>
      <div className="px-3 sm:px-5 pt-4 pb-8 max-w-2xl mx-auto">

        {/* ── DROPDOWN ── */}
        <div className="flex items-center gap-2 mb-4">
          <select
            value={dropVal}
            onChange={e => handleDropdownChange(e.target.value)}
            className="min-w-0 px-2 py-2 rounded-xl text-sm outline-none cursor-pointer font-semibold"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)", color: "#e2e8f0", flex: "1 1 0", maxWidth: "calc(100% - 130px)" }}
          >
            <optgroup label="Standard formasjoner" style={{ background: "#0d2340" }}>
              {Object.keys(FORMATIONS).map(key => (
                <option key={key} value={`formation:${key}`} style={{ background: "#0d2340" }}>{key}</option>
              ))}
            </optgroup>
            {savedTactics.length > 0 && (
              <optgroup label="Lagrede taktikker" style={{ background: "#0d2340" }}>
                {savedTactics.map(t => (
                  <option key={t.id} value={`tactic:${t.id}`} style={{ background: "#0d2340" }}>
                    {t.name} — {t.formation}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          {write && (
            <button
              onClick={handleSaveDialog}
              className="px-3 py-2 rounded-xl text-sm font-bold flex-shrink-0 flex items-center gap-1.5"
              style={{ background: "rgba(132,204,22,0.15)", border: "1px solid rgba(132,204,22,0.35)", color: "#84cc16" }}
            >
              <Save className="w-4 h-4" /> Lagre
            </button>
          )}
          {write && (
            <button
              title="Auto-tilordne spillere"
              onClick={() => { setTactic(t => { const u = autoAssign(t); saveTacticToDb(u); return u; }); setSelectedPlayerId(null); }}
              className="p-2 rounded-xl flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)" }}
            >
              <Activity className="w-4 h-4" />
            </button>
          )}
          {write && (
            <button
              title="Pilemodus"
              onClick={() => { setArrowMode(m => !m); setSelectedArrowId(null); }}
              className="p-2 rounded-xl flex-shrink-0"
              style={{
                background: arrowMode ? "rgba(132,204,22,0.2)" : "rgba(255,255,255,0.07)",
                border: `1px solid ${arrowMode ? "#84cc16" : "rgba(255,255,255,0.12)"}`,
                color: arrowMode ? "#84cc16" : "rgba(255,255,255,0.6)",
              }}
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ── PITCH ── */}
        {arrowMode && (
          <div className="text-center text-xs mb-2 font-semibold" style={{ color: "#84cc16" }}>
            Pilemodus — dra fra et punkt for å tegne · trykk pil for å slette
          </div>
        )}
        {!arrowMode && pitchHasSelection && (
          <div className="text-center text-xs mb-2 font-semibold" style={{ color: "#84cc16" }}>
            Trykk på en posisjon for å plassere spilleren
          </div>
        )}
        <div className="flex justify-center mb-4">
          <div
            ref={pitchRef}
            onPointerDown={write && arrowMode ? onPitchPointerDown : undefined}
            onClick={() => setSelectedArrowId(null)}
            className="relative pitch-grad rounded-2xl overflow-hidden no-select w-full"
            style={{ maxWidth: "360px", aspectRatio: "68/100", touchAction: "none" }}
          >
            <PitchMarkings />
            {((tactic.arrows?.length > 0) || drawingArrow) && (
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ zIndex: 5, pointerEvents: "none" }}>
                <defs>
                  <marker id="ov-ah" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(132,204,22,0.9)" />
                  </marker>
                  <marker id="ov-ah-drawing" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255,255,255,0.6)" />
                  </marker>
                </defs>
                {tactic.arrows?.map(a => (
                  <line key={a.id} x1={a.fromX} y1={a.fromY} x2={a.toX} y2={a.toY}
                    stroke={selectedArrowId === a.id ? "rgba(239,68,68,0.9)" : "rgba(132,204,22,0.8)"}
                    strokeWidth="1.5"
                    markerEnd="url(#ov-ah)" vectorEffect="non-scaling-stroke" />
                ))}
                {drawingArrow && (
                  <line x1={drawingArrow.fromX} y1={drawingArrow.fromY} x2={drawingArrow.toX} y2={drawingArrow.toY}
                    stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeDasharray="3,2"
                    markerEnd="url(#ov-ah-drawing)" vectorEffect="non-scaling-stroke" />
                )}
              </svg>
            )}
            {write && tactic.arrows?.map(a => {
              const midX = (a.fromX + a.toX) / 2;
              const midY = (a.fromY + a.toY) / 2;
              return (
                <button
                  key={`del-${a.id}`}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setTactic(t => {
                      const updated = { ...t, arrows: t.arrows.filter(x => x.id !== a.id) };
                      saveTacticToDb(updated);
                      return updated;
                    });
                  }}
                  className="absolute flex items-center justify-center rounded-full"
                  style={{
                    left: `${midX}%`, top: `${midY}%`,
                    transform: "translate(-50%,-50%)",
                    width: 22, height: 22,
                    background: "rgba(239,68,68,0.85)",
                    border: "2px solid rgba(255,255,255,0.7)",
                    zIndex: 25,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                  }}
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              );
            })}
            {tactic.slots.map(slot => {
              const isDragging = draggingSlot === slot.id;
              const pos = isDragging && livePos ? livePos : { x: slot.x, y: slot.y };
              const player = team.players.find(p => p.id === slot.playerId);
              const posMeta = POSITION_BY_CODE[slot.role];
              const glowSlot = pitchHasSelection && !player;
              return (
                <div
                  key={slot.id}
                  onPointerDown={write ? (e) => onSlotPointerDown(e, slot) : undefined}
                  className="absolute no-select"
                  style={{
                    left: `${pos.x}%`, top: `${pos.y}%`,
                    transform: "translate(-50%,-50%)",
                    cursor: write ? "grab" : "default",
                    zIndex: isDragging ? 30 : 10,
                  }}
                >
                  <div className="flex flex-col items-center pointer-events-none" style={{ gap: 2 }}>
                    <div
                      className="rounded-full flex items-center justify-center font-bold shadow-lg"
                      style={{
                        width: 36, height: 36,
                        background: player
                          ? "linear-gradient(160deg,#c0392b 0%,#96281b 100%)"
                          : glowSlot ? "rgba(132,204,22,0.15)" : "rgba(0,0,0,0.35)",
                        border: player
                          ? "2.5px solid rgba(255,255,255,0.5)"
                          : glowSlot ? "2px solid #84cc16"
                          : `2px dashed ${posMeta?.color || "#fff"}60`,
                        boxShadow: isDragging ? "0 6px 20px rgba(0,0,0,0.7)" : glowSlot ? "0 0 12px rgba(132,204,22,0.4)" : player ? "0 3px 10px rgba(0,0,0,0.5)" : "none",
                        color: player ? "#fff" : glowSlot ? "#84cc16" : (posMeta?.color || "#fff"),
                        fontSize: 12,
                      }}
                    >
                      {player ? (player.number || "") : slot.role}
                    </div>
                    <div className="text-center" style={{ minWidth: 42 }}>
                      <div className="font-semibold text-white truncate" style={{ fontSize: 10, maxWidth: 58, textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}>
                        {player ? player.name.split(" ").slice(-1)[0] : ""}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── ALL PLAYERS ── */}
        <div>
          {write && pitchHasSelection && (
            <div className="text-[10px] font-bold tracking-widest mb-2" style={{ color: "#84cc16" }}>
              VALGT — trykk posisjon på banen
            </div>
          )}
          {!pitchHasSelection && write && (
            <div className="text-[10px] font-bold tracking-widest mb-2" style={{ color: "#475569" }}>
              SPILLERE — trykk for å velge, trykk deretter på posisjon
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {sortedPlayers.filter(p => !tactic.slots.some(s => s.playerId === p.id)).map(p => {
              const isSelected = selectedPlayerId === p.id;
              const posMeta = POSITION_BY_CODE[p.positions[0]];
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    if (!write) return;
                    setSelectedPlayerId(prev => prev === p.id ? null : p.id);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: isSelected ? "#84cc16" : "rgba(255,255,255,0.09)",
                    border: `1px solid ${isSelected ? "#84cc16" : "rgba(255,255,255,0.14)"}`,
                    color: isSelected ? "#0f172a" : "rgba(255,255,255,0.85)",
                    boxShadow: isSelected ? "0 0 16px rgba(132,204,22,0.5)" : "none",
                    cursor: write ? "pointer" : "default",
                  }}
                >
                  <span className="font-mono text-xs opacity-70">{p.number || "—"}</span>
                  {p.name}
                  <span className="text-[9px] font-bold opacity-50" style={{ color: isSelected ? "#0f172a" : posMeta?.color }}>
                    {p.positions[0] || ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>

    {/* ── SAVE DIALOG ── */}

    {showSaveDialog && (
      <div className="fixed inset-0 z-50 flex items-end justify-center"
        style={{ background: "rgba(0,0,0,0.55)" }}
        onClick={() => setShowSaveDialog(false)}>
        <div className="w-full rounded-t-2xl px-4 pt-4 pb-6 space-y-3"
          style={{ background: "#0d2340", border: "1px solid rgba(255,255,255,0.12)", maxWidth: 480 }}
          onClick={e => e.stopPropagation()}>
          <div className="font-bold text-white text-sm">Lagre taktikk</div>

          <div className="flex gap-2">
            <button
              onClick={() => setSaveMode("new")}
              className="flex-1 py-2 rounded-lg text-sm font-semibold"
              style={{ background: saveMode === "new" ? "rgba(132,204,22,0.2)" : "rgba(255,255,255,0.07)", border: `1px solid ${saveMode === "new" ? "#84cc16" : "rgba(255,255,255,0.15)"}`, color: saveMode === "new" ? "#a3e635" : "rgba(255,255,255,0.55)" }}>
              Lagre ny kopi
            </button>
            {savedTactics.length > 0 && (
              <button
                onClick={() => setSaveMode("overwrite")}
                className="flex-1 py-2 rounded-lg text-sm font-semibold"
                style={{ background: saveMode === "overwrite" ? "rgba(132,204,22,0.2)" : "rgba(255,255,255,0.07)", border: `1px solid ${saveMode === "overwrite" ? "#84cc16" : "rgba(255,255,255,0.15)"}`, color: saveMode === "overwrite" ? "#a3e635" : "rgba(255,255,255,0.55)" }}>
                Lagre over eksisterende
              </button>
            )}
          </div>

          {saveMode === "new" && (
            <div>
              <label className="text-[10px] font-semibold block mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>NAVN</label>
              <input
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleConfirmSave()}
                placeholder="f.eks. Presstrykk 4-3-3"
                autoFocus
                className="w-full rounded-lg px-3 py-2 text-white outline-none"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", fontSize: 16 }}
              />
            </div>
          )}

          {saveMode === "overwrite" && savedTactics.length > 0 && (
            <div>
              <label className="text-[10px] font-semibold block mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>VELG TAKTIKK Å OVERSKRIVE</label>
              <select
                value={overwriteId}
                onChange={e => setOverwriteId(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", color: "#e2e8f0", fontSize: 16 }}
              >
                {savedTactics.map(t => (
                  <option key={t.id} value={t.id} style={{ background: "#0d2340" }}>{t.name} — {t.formation}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => setShowSaveDialog(false)}
              className="flex-1 py-2 rounded-lg text-sm font-semibold"
              style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.55)" }}>
              Avbryt
            </button>
            <button onClick={handleConfirmSave}
              disabled={saveMode === "new" ? !saveName.trim() : !overwriteId}
              className="flex-1 py-2 rounded-lg text-sm font-bold bg-lime-400 text-slate-950 disabled:opacity-40">
              Lagre
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function TeamPlayers({ team, user, db, setDB }) {
  const [showAdd, setShowAdd] = useState(false);
  const write = canWrite(user, team.id);

  const update = async (mut) => {
    const next = { ...db, teams: db.teams.map(t => t.id === team.id ? mut(t) : t) };
    setDB(next); await storage.set(DB_KEY, next);
  };
  const removePlayer = async (pid) => {
    if (!write) return;
    if (!confirm("Fjerne spilleren?")) return;
    await update(t => ({ ...t, players: t.players.filter(p => p.id !== pid) }));
  };
  const addPlayer = async (player) => {
    await update(t => ({ ...t, players: [...t.players, { ...player, id: uid() }] }));
    setShowAdd(false);
  };
  const editPlayer = async (pid, patch) => {
    await update(t => ({ ...t, players: t.players.map(p => p.id === pid ? { ...p, ...patch } : p) }));
  };

  const getPlayerStats = (pid) => {
    const matches = team.matches || [];
    let minutes = 0, goals = 0, yellow = 0, red = 0, ratings = [], matchCount = 0;
    matches.filter(m => m.status === "finished").forEach(m => {
      const mins = (m.playerMinutes || {})[pid];
      if (mins === undefined) return;
      matchCount++;
      minutes += mins;
      (m.events || []).forEach(ev => {
        if (ev.playerId !== pid) return;
        if (ev.type === "goal") goals++;
        if (ev.type === "yellow") yellow++;
        if (ev.type === "red") red++;
      });
      const r = (m.playerRatings || {})[pid];
      if (r?.rating > 0) ratings.push(r.rating);
    });
    const avgRating = ratings.length ? (ratings.reduce((a,b) => a+b, 0) / ratings.length).toFixed(1) : null;
    return { minutes, goals, yellow, red, avgRating, matchCount };
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      {write && (
        <div className="flex justify-end mb-4">
          <button onClick={() => setShowAdd(true)}
            className="px-4 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-semibold text-sm flex items-center gap-2 shadow-lg shadow-lime-400/20">
            <Plus className="w-4 h-4" /> Ny spiller
          </button>
        </div>
      )}

      {team.players.length === 0 ? (
        <div className="border-2 border-dashed rounded-2xl p-16 text-center" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
          <Users className="w-12 h-12 mx-auto mb-4" style={{ color: "rgba(255,255,255,0.2)" }} />
          <h3 className="font-display text-2xl mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>INGEN SPILLERE</h3>
          {write && (
            <>
              <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>Legg til spillere for å bygge laget</p>
              <button onClick={() => setShowAdd(true)} className="px-5 py-2.5 rounded-xl bg-lime-400 text-slate-950 font-semibold text-sm inline-flex items-center gap-2">
                <Plus className="w-4 h-4" /> Legg til spiller
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div className="grid grid-cols-12 gap-3 px-5 py-3 text-xs font-semibold tracking-wider" style={{ background: "rgba(255,255,255,0.07)", borderBottom: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
            <div className="col-span-1">NR</div>
            <div className="col-span-4">NAVN</div>
            <div className="col-span-6">POSISJONER</div>
            <div className="col-span-1 text-right"></div>
          </div>
          {team.players
            .slice()
            .sort((a, b) => {
              const ga = GROUP_ORDER[POSITION_BY_CODE[a.positions?.[0]]?.group] ?? 9;
              const gb = GROUP_ORDER[POSITION_BY_CODE[b.positions?.[0]]?.group] ?? 9;
              if (ga !== gb) return ga - gb;
              return (a.number || 999) - (b.number || 999);
            })
            .map(p => (
              <PlayerRow key={p.id} player={p} writable={write}
                playerStats={getPlayerStats(p.id)}
                onRemove={() => removePlayer(p.id)}
                onEdit={(patch) => editPlayer(p.id, patch)} />
          ))}
        </div>
      )}

      {showAdd && (
        <PlayerEditor onSave={addPlayer} onClose={() => setShowAdd(false)} title="Ny spiller" />
      )}
    </div>
  );
}

function PlayerRow({ player, writable, onRemove, onEdit, playerStats = {} }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <PlayerEditor player={player} title="Rediger spiller"
        onSave={(patch) => { onEdit(patch); setEditing(false); }}
        onClose={() => setEditing(false)} />
    );
  }
  return (
    <div className="grid grid-cols-12 gap-3 px-5 py-3.5 items-center" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="col-span-1">
        <span className="font-mono font-bold text-lime-400">{player.number || "—"}</span>
      </div>
      <div className="col-span-4">
        <div className="font-medium text-white">{player.name}</div>
        {(playerStats.goals > 0 || playerStats.minutes > 0) && (
          <div className="text-[10px] text-slate-500 mt-0.5">
            {playerStats.minutes > 0 && `${playerStats.minutes}min `}
            {playerStats.goals > 0 && `⚽${playerStats.goals} `}
            {playerStats.yellow > 0 && `🟨${playerStats.yellow} `}
            {playerStats.red > 0 && `🟥${playerStats.red}`}
          </div>
        )}
      </div>
      <div className="col-span-6 flex flex-wrap gap-1.5">
        {player.positions.map(code => {
          const pos = POSITION_BY_CODE[code];
          if (!pos) return null;
          return (
            <span key={code} className="text-xs font-semibold px-2 py-0.5 rounded-md border"
              style={{ color: pos.color, borderColor: pos.color + "50", backgroundColor: pos.color + "15" }}>
              {pos.code}
            </span>
          );
        })}
      </div>
      <div className="col-span-1 flex justify-end gap-1">
        {writable && (
          <>
            <button onClick={() => setEditing(true)} className="p-2 rounded-lg" style={{ color: "rgba(255,255,255,0.4)" }}>
              <Edit3 className="w-4 h-4" />
            </button>
            <button onClick={onRemove} className="p-2 rounded-lg hover:text-red-400" style={{ color: "rgba(255,255,255,0.4)" }}>
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function PlayerEditor({ player, onSave, onClose, title }) {
  const [name, setName] = useState(player?.name || "");
  const [number, setNumber] = useState(player?.number || "");
  const [positions, setPositions] = useState(player?.positions || []);
  const toggle = (code) => setPositions(p => p.includes(code) ? p.filter(c => c !== code) : [...p, code]);
  const save = () => {
    if (!name.trim()) return alert("Skriv inn navn");
    if (positions.length === 0) return alert("Velg minst én posisjon");
    onSave({ name: name.trim(), number: number ? parseInt(number) : null, positions });
  };
  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Field icon={<User className="w-4 h-4" />} label="Navn">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Ola Nordmann"
                className="bg-transparent w-full outline-none text-white placeholder:text-slate-600" autoFocus />
            </Field>
          </div>
          <Field icon={<span className="text-xs font-mono text-slate-500">#</span>} label="Draktnr">
            <input value={number} onChange={e => setNumber(e.target.value.replace(/\D/g, ""))} placeholder="10"
              className="bg-transparent w-full outline-none text-white placeholder:text-slate-600" />
          </Field>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-400 tracking-wider mb-2 block">POSISJONER (velg en eller flere)</label>
          <div className="flex flex-wrap gap-2">
            {POSITIONS.map(pos => {
              const active = positions.includes(pos.code);
              return (
                <button key={pos.code} onClick={() => toggle(pos.code)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                  style={{
                    color: active ? pos.color : "#94a3b8",
                    borderColor: active ? pos.color : "#334155",
                    backgroundColor: active ? pos.color + "20" : "transparent",
                  }}>
                  <span className="font-mono mr-1">{pos.code}</span>
                  <span className="opacity-80">{pos.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <button onClick={save} className="w-full py-3 bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold rounded-xl">
          Lagre spiller
        </button>
      </div>
    </Modal>
  );
}

// ==================================================================
// =============== TACTICS BOARD (always visible) ===================
// ==================================================================
function TacticsView({ team, user, db, setDB }) {
  const write = canWrite(user, team.id);

  const makeFresh = (formationKey = "4-4-2") => ({
    id: uid(), name: "Ny taktikk", formation: formationKey,
    slots: FORMATIONS[formationKey].map(s => ({ id: uid(), x: s.x, y: s.y, role: s.role, playerId: null })),
    arrows: [], isNew: true,
  });

  const initial = useMemo(() => {
    const list = team.tactics || [];
    if (list.length) return { ...list[list.length - 1], isNew: false };
    return makeFresh("4-4-2");
  }, [team.id]);

  const [tactic, setTactic] = useState(initial);
  const [mode, setMode] = useState("move");
  const [draggingSlot, setDraggingSlot] = useState(null);
  const [drawingArrow, setDrawingArrow] = useState(null);
  const [showAssign, setShowAssign] = useState(null);
  const [showFormations, setShowFormations] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveMode, setSaveMode] = useState("new");
  const [overwriteId, setOverwriteId] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // ---- sidebar click-to-select state ----
  const [selectedSidebarPlayerId, setSelectedSidebarPlayerId] = useState(null);
  const selectedSidebarRef = useRef(null);
  useEffect(() => { selectedSidebarRef.current = selectedSidebarPlayerId; }, [selectedSidebarPlayerId]);

  const pitchRef = useRef(null);
  const [livePos, setLivePos] = useState(null); // { x, y } | null — position of dragged slot

  const pitchCoords = useCallback((clientX, clientY) => {
    const r = pitchRef.current.getBoundingClientRect();
    return {
      x: Math.max(3, Math.min(97, ((clientX - r.left) / r.width) * 100)),
      y: Math.max(3, Math.min(97, ((clientY - r.top) / r.height) * 100)),
    };
  }, []);

  // Find nearest slot within `threshold` pitch-% units of a client position
  const nearestSlot = useCallback((clientX, clientY, threshold = 12) => {
    if (!pitchRef.current) return null;
    const r = pitchRef.current.getBoundingClientRect();
    if (clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom) return null;
    const px = ((clientX - r.left) / r.width) * 100;
    const py = ((clientY - r.top) / r.height) * 100;
    let best = null, bestDist = Infinity;
    tactic.slots.forEach(s => {
      const d = Math.hypot(s.x - px, s.y - py);
      if (d < bestDist) { best = s; bestDist = d; }
    });
    return bestDist < threshold ? best : null;
  }, [tactic.slots]);

  // ---- assign helper (used by both sidebar drop and click-modal) ----
  const assignPlayer = useCallback((slotId, playerId) => {
    setTactic(t => ({
      ...t,
      slots: t.slots.map(s => {
        if (s.id === slotId) return { ...s, playerId };
        if (s.playerId === playerId && playerId) return { ...s, playerId: null };
        return s;
      }),
    }));
    setShowAssign(null);
  }, []);

  // ---- pitch slot drag: document-level listeners (avoids pointerleave/capture issues) ----
  const onSlotPointerDown = (e, slot) => {
    if (!write) return;
    e.preventDefault();
    e.stopPropagation();

    if (mode === "arrow") {
      const { x, y } = pitchCoords(e.clientX, e.clientY);
      setDrawingArrow({ slotId: slot.id, fromX: slot.x, fromY: slot.y, toX: x, toY: y });
      try { pitchRef.current.setPointerCapture(e.pointerId); } catch {}
      return;
    }

    // move mode — track drag entirely with document listeners
    const startX = e.clientX;
    const startY = e.clientY;
    const slotId = slot.id;
    let active = false;
    let latestPos = { x: slot.x, y: slot.y };
    let rafId = null;

    const onMove = (ev) => {
      ev.preventDefault();
      if (!active) {
        if (Math.abs(ev.clientX - startX) > 8 || Math.abs(ev.clientY - startY) > 8) {
          active = true;
          const pos = pitchCoords(ev.clientX, ev.clientY);
          latestPos = pos;
          setDraggingSlot(slotId);
          setLivePos(pos);
        }
        return;
      }
      latestPos = pitchCoords(ev.clientX, ev.clientY);
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          setLivePos({ ...latestPos });
          rafId = null;
        });
      }
    };

    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }

      if (!active) {
        const selId = selectedSidebarRef.current;
        if (selId) {
          assignPlayer(slotId, selId);
          setSelectedSidebarPlayerId(null);
        } else {
          setShowAssign(slotId);
        }
      } else {
        setTactic(t => ({ ...t, slots: t.slots.map(s => s.id === slotId ? { ...s, ...latestPos } : s) }));
      }
      setDraggingSlot(null);
      setLivePos(null);
    };

    document.addEventListener('pointermove', onMove, { passive: false });
    document.addEventListener('pointerup', onUp);
  };

  // pitch pointer move/up: only used for arrow drawing now
  const onPitchPointerMove = (e) => {
    if (drawingArrow) {
      const { x, y } = pitchCoords(e.clientX, e.clientY);
      setDrawingArrow(a => ({ ...a, toX: x, toY: y }));
    }
  };

  const onPitchPointerUp = () => {
    if (drawingArrow) {
      const dist = Math.hypot(drawingArrow.toX - drawingArrow.fromX, drawingArrow.toY - drawingArrow.fromY);
      if (dist > 3) {
        setTactic(t => ({
          ...t,
          arrows: [...t.arrows, {
            id: uid(), slotId: drawingArrow.slotId,
            fromX: drawingArrow.fromX, fromY: drawingArrow.fromY,
            toX: drawingArrow.toX, toY: drawingArrow.toY,
          }],
        }));
      }
      setDrawingArrow(null);
    }
  };

  const autoAssign = () => {
    if (!write) return;
    const players = [...team.players];
    const used = new Set();
    setTactic(t => ({
      ...t,
      slots: t.slots.map(slot => {
        const g = roleGroup(slot.role);
        const cand = players.find(p =>
          !used.has(p.id) && (p.positions.includes(slot.role) || p.positions.some(c => roleGroup(c) === g))
        );
        if (cand) { used.add(cand.id); return { ...slot, playerId: cand.id }; }
        return { ...slot, playerId: null };
      }),
    }));
  };

  const clearArrows = () => {
    if (!write) return;
    if (tactic.arrows.length && confirm("Fjern alle piler?")) setTactic(t => ({ ...t, arrows: [] }));
  };

  const removeArrow = (id) => {
    if (!write) return;
    setTactic(t => ({ ...t, arrows: t.arrows.filter(a => a.id !== id) }));
  };

  const switchFormation = (key) => {
    if (!write) return;
    const newSlots = FORMATIONS[key].map((s, i) => {
      const prev = tactic.slots[i];
      return { id: uid(), x: s.x, y: s.y, role: s.role, playerId: prev?.playerId || null };
    });
    setTactic({ ...tactic, formation: key, slots: newSlots, arrows: [] });
    setShowFormations(false);
  };

  const openSaveDialog = () => {
    if (!write) return;
    const list = team.tactics || [];
    setSaveName(tactic.name || "");
    setSaveMode("new");
    setOverwriteId(list[0]?.id || "");
    setShowSaveDialog(true);
  };

  const handleConfirmSave = async () => {
    const list = team.tactics || [];
    let newList;
    let saved;
    if (saveMode === "overwrite" && overwriteId) {
      const existing = list.find(t => t.id === overwriteId);
      const cleaned = { ...tactic, id: overwriteId, name: existing?.name || tactic.name }; delete cleaned.isNew;
      newList = list.map(x => x.id === overwriteId ? cleaned : x);
      saved = cleaned;
    } else {
      const name = saveName.trim();
      if (!name) return;
      const cleaned = { ...tactic, id: tactic.isNew ? uid() : tactic.id, name }; delete cleaned.isNew;
      const exists = list.some(t => t.id === cleaned.id);
      newList = exists ? list.map(x => x.id === cleaned.id ? cleaned : x) : [...list, cleaned];
      saved = cleaned;
    }
    const next = { ...db, teams: db.teams.map(t => t.id === team.id ? { ...t, tactics: newList } : t) };
    setDB(next); await storage.set(DB_KEY, next);
    setTactic(saved);
    setShowSaveDialog(false);
  };

  const saveTacticNotes = useCallback(() => {
    setTactic(current => {
      if (!current.isNew) {
        // save to db
        const list = team.tactics || [];
        const newList = list.map(x => x.id === current.id ? current : x);
        const next = { ...db, teams: db.teams.map(tm => tm.id === team.id ? { ...tm, tactics: newList } : tm) };
        setDB(next);
        storage.set(DB_KEY, next);
      }
      return current;
    });
  }, [db, setDB, team.id, team.tactics]);

  const deleteTactic = async (tid) => {
    if (!write) return;
    const newList = (team.tactics || []).filter(x => x.id !== tid);
    const next = { ...db, teams: db.teams.map(t => t.id === team.id ? { ...t, tactics: newList } : t) };
    setDB(next); await storage.set(DB_KEY, next);
    if (tactic.id === tid) setTactic(makeFresh("4-4-2"));
  };

  const handleConfirmDelete = async () => {
    await deleteTactic(tactic.id);
    setShowDeleteDialog(false);
  };

  const newTactic = () => { if (!write) return; setTactic(makeFresh(tactic.formation || "4-4-2")); setShowSaved(false); };
  const loadTactic = (t) => { setTactic({ ...t, isNew: false }); setShowSaved(false); };
  const playerById = (id) => team.players.find(p => p.id === id);

  // Sorted roster
  const sortedPlayers = useMemo(() =>
    sortPlayers(team.players)
  , [team.players]);

  return (
    <div className="min-h-screen" style={{ background: "#020617" }}>
    <div className="px-2 pt-3 pb-6">
      {!write && <ReadOnlyBanner />}

      {/* ===== TOP BAR ===== */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <input value={tactic.name}
            onChange={e => write && setTactic({ ...tactic, name: e.target.value })}
            disabled={!write}
            placeholder="Navn på taktikk"
            className="outline-none font-display text-base disabled:opacity-70"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "6px 10px", color: "#fff", width: 130, fontSize: 16 }} />
          <select
            value={tactic.formation}
            onChange={e => write && switchFormation(e.target.value)}
            disabled={!write}
            className="outline-none cursor-pointer font-display text-base disabled:opacity-50"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "6px 10px", color: "#84cc16", fontSize: 16 }}
          >
            {Object.keys(FORMATIONS).map(key => (
              <option key={key} value={key} style={{ background: "#0d2340" }}>{key} — {FORMATION_LABELS[key]}</option>
            ))}
          </select>
          <button onClick={() => setShowFormations(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)" }}>
            Bytt
          </button>
        </div>
        {write && (
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={newTactic}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)" }}>
              <Plus className="w-3.5 h-3.5 inline mr-1" /> Ny
            </button>
            <button onClick={autoAssign}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)" }}>
              <Activity className="w-3.5 h-3.5 inline mr-1" /> Auto
            </button>
            {!tactic.isNew && (
              <button onClick={() => setShowDeleteDialog(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.35)", color: "#f87171" }}>
                <Trash2 className="w-3.5 h-3.5 inline mr-1" /> Slett
              </button>
            )}
            <button onClick={openSaveDialog}
              className="px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: "rgba(132,204,22,0.15)", border: "1px solid rgba(132,204,22,0.4)", color: "#84cc16" }}>
              <Save className="w-3.5 h-3.5 inline mr-1" /> Lagre
            </button>
          </div>
        )}
      </div>

      {/* ===== MAIN: PITCH + SIDEBAR ===== */}
      <div className="flex gap-2 items-start">

        {/* ===== PITCH ===== */}
        <div className="flex-1 min-w-0">
          {write && (
            <div className="flex items-center gap-1.5 mb-2">
              <button onClick={() => setMode("move")}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                style={{ background: mode === "move" ? "rgba(132,204,22,0.2)" : "rgba(255,255,255,0.07)", border: `1px solid ${mode === "move" ? "#84cc16" : "rgba(255,255,255,0.15)"}`, color: mode === "move" ? "#84cc16" : "rgba(255,255,255,0.6)" }}>
                <Move className="w-3.5 h-3.5" /> Flytt
              </button>
              <button onClick={() => setMode("arrow")}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                style={{ background: mode === "arrow" ? "rgba(132,204,22,0.2)" : "rgba(255,255,255,0.07)", border: `1px solid ${mode === "arrow" ? "#84cc16" : "rgba(255,255,255,0.15)"}`, color: mode === "arrow" ? "#84cc16" : "rgba(255,255,255,0.6)" }}>
                <ArrowRight className="w-3.5 h-3.5" /> Piler
              </button>
              {tactic.arrows.length > 0 && (
                <button onClick={clearArrows} className="px-2 py-1.5 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Nullstill</button>
              )}
            </div>
          )}

          <div
            ref={pitchRef}
            onPointerDown={(e) => {
              if (!write || mode !== "arrow" || drawingArrow || draggingSlot) return;
              const { x, y } = pitchCoords(e.clientX, e.clientY);
              setDrawingArrow({ slotId: null, fromX: x, fromY: y, toX: x, toY: y });
              try { pitchRef.current.setPointerCapture(e.pointerId); } catch {}
            }}
            onPointerMove={onPitchPointerMove}
            onPointerUp={onPitchPointerUp}
            className="relative w-full pitch-grad no-select rounded-xl overflow-hidden"
            style={{ aspectRatio: "68 / 100", touchAction: "none" }}
          >
            <PitchMarkings />

            {/* Arrows SVG */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <marker id="arrowhead" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="#facc15" />
                </marker>
                <marker id="arrowhead-drawing" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="#fde047" />
                </marker>
              </defs>
              {tactic.arrows.map(a => (
                <line key={a.id} x1={a.fromX} y1={a.fromY} x2={a.toX} y2={a.toY}
                  stroke="#facc15" strokeWidth="1.5" strokeDasharray="3 2"
                  markerEnd="url(#arrowhead)" vectorEffect="non-scaling-stroke" />
              ))}
              {drawingArrow && (
                <line x1={drawingArrow.fromX} y1={drawingArrow.fromY} x2={drawingArrow.toX} y2={drawingArrow.toY}
                  stroke="#fde047" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.85"
                  markerEnd="url(#arrowhead-drawing)" vectorEffect="non-scaling-stroke" />
              )}
            </svg>

            {/* Arrow delete buttons */}
            {write && tactic.arrows.map(a => (
              <button key={"del-" + a.id}
                onClick={(e) => { e.stopPropagation(); removeArrow(a.id); }}
                className="absolute flex items-center justify-center rounded-full"
                style={{ left: `${a.toX}%`, top: `${a.toY}%`, transform: "translate(-50%,-50%) translate(10px,-10px)", width: 18, height: 18, background: "rgba(239,68,68,0.85)", border: "1.5px solid rgba(255,255,255,0.6)", zIndex: 20 }}>
                <X className="w-2.5 h-2.5 text-white" />
              </button>
            ))}

            {/* Player slots */}
            {tactic.slots.map(slot => {
              const player = playerById(slot.playerId);
              const posMeta = POSITION_BY_CODE[slot.role];
              const isDragging = draggingSlot === slot.id;
              return (
                <div
                  key={slot.id}
                  onPointerDown={(e) => onSlotPointerDown(e, slot)}
                  className="absolute no-select"
                  style={{
                    left: `${isDragging && livePos ? livePos.x : slot.x}%`,
                    top: `${isDragging && livePos ? livePos.y : slot.y}%`,
                    transform: "translate(-50%,-50%)",
                    touchAction: "none",
                    cursor: !write ? "default" : mode === "move" ? (isDragging ? "grabbing" : "grab") : "crosshair",
                    zIndex: isDragging ? 50 : 10,
                  }}
                >
                  <div className={`flex flex-col items-center pointer-events-none transition-transform ${isDragging ? "scale-110" : ""}`} style={{ gap: 2 }}>
                    {/* Jersey circle */}
                    <div
                      className="rounded-full flex items-center justify-center font-bold shadow-lg"
                      style={{
                        width: 32, height: 32,
                        background: player ? "linear-gradient(160deg,#c0392b 0%,#96281b 100%)" : "rgba(0,0,0,0.4)",
                        border: player ? "2px solid rgba(255,255,255,0.55)" : `2px dashed ${posMeta?.color || "#fff"}70`,
                        color: player ? "#fff" : (posMeta?.color || "#fff"),
                        fontSize: 10, fontWeight: "800",
                      }}
                    >
                      {player ? (player.number || "") : slot.role}
                    </div>
                    {/* Plain name text only */}
                    <div style={{ fontSize: 9, fontWeight: "600", color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,1)", maxWidth: 52, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {player ? player.name.split(" ").slice(-1)[0] : ""}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {write && (
            <div className="text-[10px] mt-1.5 text-center" style={{ color: selectedSidebarPlayerId ? "rgba(132,204,22,0.8)" : "rgba(255,255,255,0.3)" }}>
              {selectedSidebarPlayerId
                ? "Trykk på en posisjon for å plassere spilleren"
                : mode === "move" ? "Dra brikke · Trykk for å tilordne" : "Dra fra spiller for å tegne løp"}
            </div>
          )}
        </div>

        {/* ===== RIGHT SIDEBAR ===== */}
        <div style={{ width: 90, flexShrink: 0 }}>
          <div className="text-[9px] font-bold tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>
            STALL
          </div>
          <div className="overflow-y-auto scrollbar-thin" style={{ maxHeight: "calc(100vh - 180px)" }}>
            {sortedPlayers.filter(p => !tactic.slots.some(s => s.playerId === p.id)).map(p => {
              const isSelected = selectedSidebarPlayerId === p.id;
              const posMeta = POSITION_BY_CODE[p.positions[0]];
              return (
                <div key={p.id}
                  onClick={() => {
                    if (!write) return;
                    setSelectedSidebarPlayerId(id => id === p.id ? null : p.id);
                  }}
                  className="no-select flex items-center gap-1 py-0.5 rounded"
                  style={{
                    cursor: write ? "pointer" : "default",
                    background: isSelected ? "rgba(132,204,22,0.15)" : "transparent",
                    outline: isSelected ? "1px solid rgba(132,204,22,0.5)" : "none",
                  }}
                >
                  <span style={{ fontSize: 9, fontWeight: "700", color: isSelected ? "#84cc16" : (posMeta?.color || "#64748b"), flexShrink: 0, minWidth: 14, textAlign: "right" }}>
                    {p.number || ""}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: "500", color: isSelected ? "#84cc16" : "rgba(255,255,255,0.85)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.name.split(" ").slice(-1)[0]}
                  </span>
                </div>
              );
            })}
            {sortedPlayers.every(p => tactic.slots.some(s => s.playerId === p.id)) && sortedPlayers.length > 0 && (
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontStyle: "italic" }}>Alle på banen</div>
            )}
          </div>
        </div>
      </div>

      {/* ===== TACTICAL NOTES ===== */}
      <div className="mt-6 space-y-5">
        {/* Description — predefined based on formation */}
        <div>
          <div className="text-xs font-bold tracking-widest mb-2 text-slate-400">TAKTIKKBESKRIVELSE</div>
          <div className="text-sm bg-slate-950/30 border border-slate-800 rounded-xl px-4 py-4 leading-relaxed" style={{ color: "#fff" }}>
            {FORMATION_NOTES[tactic.formation]?.description || <span className="italic text-slate-600">Ingen beskrivelse tilgjengelig</span>}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Defensive */}
          <div>
            <div className="text-xs font-bold tracking-widest mb-2" style={{ color: "#60a5fa" }}>DEFENSIVPRINSIPPER</div>
            {write && !tactic.isNew ? (
              <textarea
                value={tactic.notes?.defense || ""}
                onChange={e => setTactic(t => ({ ...t, notes: { ...t.notes, defense: e.target.value } }))}
                onBlur={() => saveTacticNotes()}
                placeholder={FORMATION_NOTES[tactic.formation]?.defense || "Legg inn defensive prinsipper..."}
                rows={6}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-4 text-white text-sm outline-none focus:border-blue-400/50 resize-none placeholder:text-slate-500 leading-relaxed"
                style={{ fontSize: 16 }}
              />
            ) : (
              <div className="text-sm bg-slate-950/30 border border-slate-800 rounded-xl px-4 py-4 leading-relaxed" style={{ color: "#fff" }}>
                {tactic.notes?.defense || FORMATION_NOTES[tactic.formation]?.defense || <span className="italic text-slate-600">Ingen notater</span>}
              </div>
            )}
          </div>

          {/* Attacking */}
          <div>
            <div className="text-xs font-bold tracking-widest mb-2" style={{ color: "#84cc16" }}>ANGREPSPRINSIPPER</div>
            {write && !tactic.isNew ? (
              <textarea
                value={tactic.notes?.attack || ""}
                onChange={e => setTactic(t => ({ ...t, notes: { ...t.notes, attack: e.target.value } }))}
                onBlur={() => saveTacticNotes()}
                placeholder={FORMATION_NOTES[tactic.formation]?.attack || "Legg inn angrepsprinsipper..."}
                rows={6}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-4 text-white text-sm outline-none focus:border-lime-400/50 resize-none placeholder:text-slate-500 leading-relaxed"
                style={{ fontSize: 16 }}
              />
            ) : (
              <div className="text-sm bg-slate-950/30 border border-slate-800 rounded-xl px-4 py-4 leading-relaxed" style={{ color: "#fff" }}>
                {tactic.notes?.attack || FORMATION_NOTES[tactic.formation]?.attack || <span className="italic text-slate-600">Ingen notater</span>}
              </div>
            )}
          </div>
        </div>

        {/* Position instructions */}
        <div>
          <div className="text-xs font-bold tracking-widest mb-3 text-slate-400">INSTRUKSJONER PER POSISJON</div>
          <div className="space-y-3">
            {tactic.slots.map(slot => {
              const player = team.players.find(p => p.id === slot.playerId);
              const posMeta = POSITION_BY_CODE[slot.role];
              const label = player ? player.name : slot.role;
              const noteKey = slot.id;
              const predefined = ROLE_NOTES[tactic.formation]?.[slot.role] || "";
              return (
                <div key={slot.id} className="rounded-xl px-4 py-3 bg-slate-950/30 border border-slate-800">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-bold" style={{ color: player ? "#84cc16" : (posMeta?.color || "#94a3b8") }}>
                      {label}
                    </span>
                    {player && <span className="text-[9px] text-slate-600">{slot.role}</span>}
                  </div>
                  {write && !tactic.isNew ? (
                    <textarea
                      value={tactic.notes?.positions?.[noteKey] || ""}
                      onChange={e => setTactic(t => ({
                        ...t,
                        notes: { ...t.notes, positions: { ...(t.notes?.positions || {}), [noteKey]: e.target.value } }
                      }))}
                      onBlur={() => saveTacticNotes()}
                      placeholder={predefined || `Instruksjon for ${slot.role}...`}
                      rows={2}
                      className="w-full bg-transparent outline-none text-white text-sm resize-none placeholder:text-slate-500 leading-relaxed"
                      style={{ fontSize: 16 }}
                    />
                  ) : (
                    <div className="text-sm leading-relaxed" style={{ color: "#fff" }}>
                      {tactic.notes?.positions?.[noteKey] || predefined || <span className="italic text-slate-600">—</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showFormations && (
        <Modal title="Velg formasjon" onClose={() => setShowFormations(false)} size="lg">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.keys(FORMATIONS).map(key => (
              <button key={key} onClick={() => switchFormation(key)}
                className={`bg-slate-950/50 hover:bg-slate-950 border rounded-xl p-3 transition-all ${
                  tactic.formation === key ? "border-lime-400" : "border-slate-800 hover:border-slate-700"
                }`}>
                <FormationPreview formation={FORMATIONS[key]} />
                <div className="font-display text-lg text-white mt-2">{key}</div>
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-3">Spillertilordninger beholdes der det er mulig. Piler nullstilles.</p>
        </Modal>
      )}

      {showSaved && (
        <Modal title="Lagrede taktikker" onClose={() => setShowSaved(false)}>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto scrollbar-thin">
            {write && (
              <button onClick={newTactic}
                className="w-full flex items-center gap-2 px-3 py-3 rounded-lg bg-lime-400/10 border border-lime-400/30 hover:bg-lime-400/20 text-lime-400 text-sm font-semibold">
                <Plus className="w-4 h-4" /> Ny taktikk (4-4-2)
              </button>
            )}
            {(team.tactics || []).length === 0 ? (
              <div className="text-sm text-slate-500 text-center py-6">Ingen lagrede taktikker</div>
            ) : team.tactics.map(t => (
              <div key={t.id} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border ${
                t.id === tactic.id ? "bg-lime-400/10 border-lime-400/40" : "bg-slate-950/50 border-slate-800"
              }`}>
                <button onClick={() => loadTactic(t)} className="flex-1 text-left min-w-0">
                  <div className="text-white text-sm font-medium truncate">{t.name}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{t.formation} · {t.arrows.length} løp</div>
                </button>
                {write && (
                  <button onClick={() => deleteTactic(t.id)} className="p-2 text-slate-500 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </Modal>
      )}

      {showAssign && (
        <AssignPlayerModal
          slot={tactic.slots.find(s => s.id === showAssign)}
          players={team.players}
          currentPlayerId={tactic.slots.find(s => s.id === showAssign)?.playerId}
          usedPlayerIds={tactic.slots.filter(s => s.id !== showAssign && s.playerId).map(s => s.playerId)}
          onAssign={(pid) => assignPlayer(showAssign, pid)}
          onClose={() => setShowAssign(null)} />
      )}

      {/* ===== SAVE DIALOG ===== */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setShowSaveDialog(false)}>
          <div className="w-full rounded-t-2xl px-4 pt-4 pb-8 space-y-3"
            style={{ background: "#0d2340", border: "1px solid rgba(255,255,255,0.12)", maxWidth: 480 }}
            onClick={e => e.stopPropagation()}>
            <div className="font-bold text-white text-sm">Lagre taktikk</div>

            <div className="flex gap-2">
              <button
                onClick={() => setSaveMode("new")}
                className="flex-1 py-2 rounded-lg text-sm font-semibold"
                style={{ background: saveMode === "new" ? "rgba(132,204,22,0.2)" : "rgba(255,255,255,0.07)", border: `1px solid ${saveMode === "new" ? "#84cc16" : "rgba(255,255,255,0.15)"}`, color: saveMode === "new" ? "#a3e635" : "rgba(255,255,255,0.55)" }}>
                Lagre ny kopi
              </button>
              {(team.tactics || []).length > 0 && (
                <button
                  onClick={() => setSaveMode("overwrite")}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold"
                  style={{ background: saveMode === "overwrite" ? "rgba(132,204,22,0.2)" : "rgba(255,255,255,0.07)", border: `1px solid ${saveMode === "overwrite" ? "#84cc16" : "rgba(255,255,255,0.15)"}`, color: saveMode === "overwrite" ? "#a3e635" : "rgba(255,255,255,0.55)" }}>
                  Lagre over eksisterende
                </button>
              )}
            </div>

            {saveMode === "new" && (
              <div>
                <label className="text-[10px] font-semibold block mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>NAVN</label>
                <input
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleConfirmSave()}
                  placeholder="f.eks. Presstrykk 4-3-3"
                  autoFocus
                  className="w-full rounded-lg px-3 py-2 text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", fontSize: 16 }}
                />
              </div>
            )}

            {saveMode === "overwrite" && (team.tactics || []).length > 0 && (
              <div>
                <label className="text-[10px] font-semibold block mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>VELG TAKTIKK Å OVERSKRIVE</label>
                <select
                  value={overwriteId}
                  onChange={e => setOverwriteId(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", color: "#e2e8f0", fontSize: 16 }}
                >
                  {(team.tactics || []).map(t => (
                    <option key={t.id} value={t.id} style={{ background: "#0d2340" }}>{t.name} — {t.formation}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => setShowSaveDialog(false)}
                className="flex-1 py-2 rounded-lg text-sm font-semibold"
                style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.55)" }}>
                Avbryt
              </button>
              <button onClick={handleConfirmSave}
                disabled={saveMode === "new" ? !saveName.trim() : !overwriteId}
                className="flex-1 py-2 rounded-lg text-sm font-bold bg-lime-400 text-slate-950 disabled:opacity-40">
                Lagre
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== DELETE CONFIRM DIALOG ===== */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setShowDeleteDialog(false)}>
          <div className="w-full rounded-t-2xl px-4 pt-4 pb-8 space-y-3"
            style={{ background: "#0d2340", border: "1px solid rgba(255,255,255,0.12)", maxWidth: 480 }}
            onClick={e => e.stopPropagation()}>
            <div className="font-bold text-white text-sm">Slett taktikk</div>
            <div className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
              Er du sikker på at du vil slette <span className="text-white font-semibold">«{tactic.name}»</span>? Dette kan ikke angres.
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteDialog(false)}
                className="flex-1 py-2 rounded-lg text-sm font-semibold"
                style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.55)" }}>
                Avbryt
              </button>
              <button onClick={handleConfirmDelete}
                className="flex-1 py-2 rounded-lg text-sm font-bold"
                style={{ background: "rgba(239,68,68,0.9)", color: "#fff" }}>
                Slett
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}

// ============================================================
// KAMP — Match management
// ============================================================

function TeamMatches({ team, user, db, setDB }) {
  const write = canWrite(user, team.id);
  const [showNew, setShowNew] = useState(false);
  const [activeMatch, setActiveMatch] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Form state for new match
  const [opponent, setOpponent] = useState("");
  const [halfDuration, setHalfDuration] = useState("45");
  const [halves, setHalves] = useState("2");
  const [tacticId, setTacticId] = useState("");

  const matches = team.matches || [];
  const savedTactics = team.tactics || [];

  const saveDB = async (next) => { setDB(next); await storage.set(DB_KEY, next); };

  const updateTeam = (mut) => {
    const next = { ...db, teams: db.teams.map(t => t.id === team.id ? mut(t) : t) };
    saveDB(next);
  };

  const deleteMatch = (mid) => {
    updateTeam(t => ({ ...t, matches: (t.matches || []).filter(m => m.id !== mid) }));
    setDeleteConfirm(null);
  };

  const startMatch = () => {
    if (!opponent.trim()) return;
    const tactic = savedTactics.find(t => t.id === tacticId) || savedTactics[0] || null;
    const match = {
      id: uid(),
      opponent: opponent.trim(),
      date: Date.now(),
      halfDuration: parseInt(halfDuration) || 45,
      halves: parseInt(halves) || 2,
      homeScore: 0,
      awayScore: 0,
      status: "live",
      tacticSnapshot: tactic ? { formation: tactic.formation, slots: tactic.slots } : null,
      events: [],
      subs: [],
      playerRatings: {},
      timerElapsed: 0,
    };
    updateTeam(t => ({ ...t, matches: [...(t.matches || []), match] }));
    setShowNew(false);
    setOpponent(""); setTacticId("");
    setActiveMatch(match.id);
  };

  if (activeMatch) {
    const match = (team.matches || []).find(m => m.id === activeMatch);
    if (match) {
      return (
        <MatchView
          match={match}
          team={team}
          user={user}
          db={db}
          setDB={setDB}
          onBack={() => setActiveMatch(null)}
        />
      );
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6" style={{ color: "#fff" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs font-bold tracking-widest text-lime-400 mb-1">KAMPHISTORIKK</div>
          <h2 className="font-display text-2xl text-white">{team.name}</h2>
        </div>
        {write && (
          <button onClick={() => setShowNew(true)}
            className="px-4 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-slate-950 font-semibold text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> Ny kamp
          </button>
        )}
      </div>

      {matches.length === 0 ? (
        <div className="border-2 border-dashed rounded-2xl p-16 text-center" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
          <Trophy className="w-12 h-12 mx-auto mb-4" style={{ color: "rgba(255,255,255,0.2)" }} />
          <div className="font-display text-2xl mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>INGEN KAMPER ENNÅ</div>
          {write && (
            <button onClick={() => setShowNew(true)}
              className="mt-4 px-5 py-2.5 rounded-xl bg-lime-400 text-slate-950 font-semibold text-sm inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Start første kamp
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {[...matches].reverse().map(m => {
            const d = new Date(m.date);
            const dateStr = d.toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" });
            return (
              <div key={m.id} className="rounded-2xl p-4 transition-all"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <button className="w-full text-left" onClick={() => setActiveMatch(m.id)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-500 mb-1">{dateStr}</div>
                      <div className="font-semibold text-white text-sm">vs {m.opponent}</div>
                      {m.tacticSnapshot && (
                        <div className="text-xs text-slate-500 mt-0.5">{m.tacticSnapshot.formation}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-display text-2xl text-white">{m.homeScore} — {m.awayScore}</div>
                      <div className={`text-xs font-bold mt-0.5 ${
                        m.status === "live" ? "text-lime-400" :
                        m.homeScore > m.awayScore ? "text-lime-400" :
                        m.homeScore < m.awayScore ? "text-red-400" : "text-slate-400"
                      }`}>
                        {m.status === "live" ? "● LIVE" : m.homeScore > m.awayScore ? "SEIER" : m.homeScore < m.awayScore ? "TAP" : "UAVGJORT"}
                      </div>
                    </div>
                  </div>
                </button>
                {write && (
                  <div className="flex justify-end mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <button onClick={() => setDeleteConfirm(m.id)}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
                      style={{ color: "rgba(255,255,255,0.3)" }}>
                      <Trash2 className="w-3 h-3" /> Slett
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New match dialog */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setShowNew(false)}>
          <div className="w-full rounded-t-2xl px-4 pt-4 pb-8 space-y-4"
            style={{ background: "#0d2340", border: "1px solid rgba(255,255,255,0.12)", maxWidth: 480 }}
            onClick={e => e.stopPropagation()}>
            <div className="font-bold text-white">Ny kamp</div>

            <div>
              <label className="text-[10px] font-semibold block mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>MOTSTANDER</label>
              <input value={opponent} onChange={e => setOpponent(e.target.value)}
                placeholder="Motstanderlag"
                autoFocus
                className="w-full rounded-lg px-3 py-2 text-white outline-none"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", fontSize: 16 }} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold block mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>OMGANGSLENGDE (MIN)</label>
                <input type="number" value={halfDuration} onChange={e => setHalfDuration(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", fontSize: 16 }} />
              </div>
              <div>
                <label className="text-[10px] font-semibold block mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>ANTALL OMGANGER</label>
                <select value={halves} onChange={e => setHalves(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", fontSize: 16, color: "#e2e8f0" }}>
                  <option value="1" style={{ background: "#0d2340" }}>1 omgang</option>
                  <option value="2" style={{ background: "#0d2340" }}>2 omganger</option>
                </select>
              </div>
            </div>

            {savedTactics.length > 0 && (
              <div>
                <label className="text-[10px] font-semibold block mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>TAKTIKK / STARTOPPSTILLING</label>
                <select value={tacticId} onChange={e => setTacticId(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 outline-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", fontSize: 16, color: "#e2e8f0" }}>
                  <option value="" style={{ background: "#0d2340" }}>Ingen taktikk valgt</option>
                  {savedTactics.map(t => (
                    <option key={t.id} value={t.id} style={{ background: "#0d2340" }}>{t.name} — {t.formation}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowNew(false)}
                className="flex-1 py-2 rounded-lg text-sm font-semibold"
                style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.55)" }}>
                Avbryt
              </button>
              <button onClick={startMatch} disabled={!opponent.trim()}
                className="flex-1 py-2 rounded-lg text-sm font-bold bg-lime-400 text-slate-950 disabled:opacity-40">
                Start kamp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setDeleteConfirm(null)}>
          <div className="w-full rounded-t-2xl px-4 pt-4 pb-8 space-y-3"
            style={{ background: "#0d2340", border: "1px solid rgba(255,255,255,0.12)", maxWidth: 480 }}
            onClick={e => e.stopPropagation()}>
            <div className="font-bold text-white">Slett kamp</div>
            <div className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
              Er du sikker? All kampstatistikk og spillervurderinger slettes permanent.
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 rounded-lg text-sm font-semibold"
                style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.55)" }}>
                Avbryt
              </button>
              <button onClick={() => deleteMatch(deleteConfirm)}
                className="flex-1 py-2 rounded-lg text-sm font-bold"
                style={{ background: "rgba(239,68,68,0.9)", color: "#fff" }}>
                Slett
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MatchView({ match: initialMatch, team, user, db, setDB, onBack }) {
  const write = canWrite(user, team.id);

  // Always read match from db so we get latest state
  const match = (team.matches || []).find(m => m.id === initialMatch.id) || initialMatch;

  const [timerRunning, setTimerRunning] = useState(false);
  const [timerMs, setTimerMs] = useState(match.timerElapsed || 0);
  const timerRef = useRef(null);
  const lastTickRef = useRef(Date.now());

  const [subMode, setSubMode] = useState(false);
  const [subOutPlayer, setSubOutPlayer] = useState(null);
  const [showPostMatch, setShowPostMatch] = useState(false);
  const [ratings, setRatings] = useState(match.playerRatings || {});

  // Goal modal state
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalScorer, setGoalScorer] = useState("");
  const [goalAssist, setGoalAssist] = useState("");

  // Build current active lineup from snapshot + subs
  const buildActiveLineup = () => {
    if (!match.tacticSnapshot) return [];
    let slots = match.tacticSnapshot.slots.map(s => ({ ...s }));
    (match.subs || []).forEach(sub => {
      const idx = slots.findIndex(s => s.playerId === sub.outId);
      if (idx >= 0) slots[idx] = { ...slots[idx], playerId: sub.inId };
    });
    return slots;
  };

  const activeSlots = buildActiveLineup();
  const activePIds = activeSlots.map(s => s.playerId).filter(Boolean);
  const benchPlayers = team.players.filter(p => !activePIds.includes(p.id));

  // Timer tick
  useEffect(() => {
    if (!timerRunning) return;
    lastTickRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;
      setTimerMs(ms => ms + delta);
    }, 500);
    return () => clearInterval(timerRef.current);
  }, [timerRunning]);

  const displayMinute = Math.floor(timerMs / 60000);

  const saveMatch = async (patch) => {
    const updated = { ...match, ...patch };
    const next = {
      ...db,
      teams: db.teams.map(t => t.id === team.id
        ? { ...t, matches: (t.matches || []).map(m => m.id === match.id ? updated : m) }
        : t)
    };
    setDB(next);
    await storage.set(DB_KEY, next);
  };

  const toggleTimer = () => {
    if (!write) return;
    if (timerRunning) {
      saveMatch({ timerElapsed: timerMs });
    }
    setTimerRunning(r => !r);
  };

  const addGoal = (isHome) => {
    if (!write) return;
    if (isHome) {
      setShowGoalModal(true);
      return;
    }
    saveMatch({ awayScore: match.awayScore + 1, events: [...match.events, { id: uid(), type: "goal", minute: displayMinute, isOpponent: true }] });
  };

  const confirmGoal = () => {
    const ev = { id: uid(), type: "goal", minute: displayMinute, isOpponent: false };
    if (goalScorer) ev.playerId = goalScorer;
    if (goalAssist) ev.assistId = goalAssist;
    saveMatch({ homeScore: match.homeScore + 1, events: [...match.events, ev] });
    setShowGoalModal(false); setGoalScorer(""); setGoalAssist("");
  };

  const removeGoal = (isHome) => {
    if (!write) return;
    const patch = isHome
      ? { homeScore: Math.max(0, match.homeScore - 1) }
      : { awayScore: Math.max(0, match.awayScore - 1) };
    saveMatch(patch);
  };

  const addEvent = (playerId, type) => {
    if (!write || !playerId) return;
    saveMatch({ events: [...match.events, { id: uid(), type, playerId, minute: displayMinute }] });
  };

  const makeSub = (inId) => {
    if (!subOutPlayer || !inId) return;
    const newSub = { id: uid(), outId: subOutPlayer, inId, minute: displayMinute };
    saveMatch({ subs: [...(match.subs || []), newSub] });
    setSubOutPlayer(null);
    setSubMode(false);
  };

  const endMatch = () => {
    if (!write) return;
    // Calculate player minutes
    const allPlayers = match.tacticSnapshot?.slots.map(s => s.playerId).filter(Boolean) || [];
    const totalMinutes = Math.floor(timerMs / 60000);
    const playerMins = {};
    allPlayers.forEach(pid => { playerMins[pid] = 0; });
    // entry times: starters enter at 0
    const entryTimes = {};
    allPlayers.forEach(pid => { entryTimes[pid] = 0; });
    // subs: out player exits, in player enters
    (match.subs || []).forEach(sub => {
      if (entryTimes[sub.outId] !== undefined) {
        playerMins[sub.outId] = (playerMins[sub.outId] || 0) + (sub.minute - entryTimes[sub.outId]);
        delete entryTimes[sub.outId];
      }
      entryTimes[sub.inId] = sub.minute;
      playerMins[sub.inId] = 0;
    });
    // remaining players who are still on pitch
    Object.keys(entryTimes).forEach(pid => {
      playerMins[pid] = (playerMins[pid] || 0) + (totalMinutes - entryTimes[pid]);
    });
    saveMatch({ status: "finished", timerElapsed: timerMs, playerMinutes: playerMins });
    setTimerRunning(false);
    setShowPostMatch(true);
  };

  const saveRatings = () => {
    saveMatch({ playerRatings: ratings });
    setShowPostMatch(false);
    onBack();
  };

  const playerById = (id) => team.players.find(p => p.id === id);

  return (
    <div className="min-h-screen" style={{ background: "#020617" }}>
      <div className="px-3 pt-3 pb-8 max-w-lg mx-auto">
        {/* Back + title */}
        <div className="flex items-center gap-2 mb-4">
          <button onClick={onBack} className="p-2 rounded-lg" style={{ color: "rgba(255,255,255,0.5)" }}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="text-xs text-slate-500">vs {match.opponent}</div>
            <div className="text-sm font-semibold text-white">{new Date(match.date).toLocaleDateString("nb-NO", { day: "numeric", month: "short" })}</div>
          </div>
          {match.status === "live" && write && (
            <button onClick={endMatch}
              className="px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", color: "#f87171" }}>
              Avslutt kamp
            </button>
          )}
        </div>

        {/* Score + timer */}
        <div className="rounded-2xl p-4 mb-4 text-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div className="flex items-center justify-center gap-4 mb-3">
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs text-slate-400 font-semibold">{team.name}</span>
              <div className="flex items-center gap-2">
                {write && match.status === "live" && (
                  <button onClick={() => removeGoal(true)} className="w-7 h-7 rounded-full text-slate-400 text-lg font-bold flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.07)" }}>−</button>
                )}
                <span className="font-display text-5xl text-white">{match.homeScore}</span>
                {write && match.status === "live" && (
                  <button onClick={() => addGoal(true)} className="w-7 h-7 rounded-full text-lime-400 text-lg font-bold flex items-center justify-center"
                    style={{ background: "rgba(132,204,22,0.15)", border: "1px solid rgba(132,204,22,0.3)" }}>+</button>
                )}
              </div>
            </div>
            <div className="font-display text-3xl text-slate-500">—</div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs text-slate-400 font-semibold">{match.opponent}</span>
              <div className="flex items-center gap-2">
                {write && match.status === "live" && (
                  <button onClick={() => removeGoal(false)} className="w-7 h-7 rounded-full text-slate-400 text-lg font-bold flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.07)" }}>−</button>
                )}
                <span className="font-display text-5xl text-white">{match.awayScore}</span>
                {write && match.status === "live" && (
                  <button onClick={() => addGoal(false)} className="w-7 h-7 rounded-full text-lime-400 text-lg font-bold flex items-center justify-center"
                    style={{ background: "rgba(132,204,22,0.15)", border: "1px solid rgba(132,204,22,0.3)" }}>+</button>
                )}
              </div>
            </div>
          </div>

          {match.status === "live" ? (
            <div className="flex items-center justify-center gap-3">
              <button onClick={toggleTimer}
                className="px-4 py-1.5 rounded-lg text-sm font-bold"
                style={{
                  background: timerRunning ? "rgba(239,68,68,0.15)" : "rgba(132,204,22,0.15)",
                  border: `1px solid ${timerRunning ? "rgba(239,68,68,0.4)" : "rgba(132,204,22,0.4)"}`,
                  color: timerRunning ? "#f87171" : "#84cc16",
                }}>
                {timerRunning ? "⏸ Stopp" : "▶ Start"}
              </button>
              <span className="font-mono text-white text-lg">{displayMinute}&apos;</span>
              {timerRunning && <span className="w-2 h-2 rounded-full bg-lime-400 pulse-dot" />}
            </div>
          ) : (
            <div className="text-sm text-slate-400">Slutt · {Math.floor((match.timerElapsed || 0) / 60000)}&apos;</div>
          )}
        </div>

        {/* Lineup pitch (compact) */}
        {activeSlots.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-bold tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
              {subMode && subOutPlayer ? "TRYKK PÅ INNBYTTER" : subMode ? "TRYKK PÅ SPILLER SOM GÅR UT" : "OPPSTILLING"}
            </div>
            <div className="relative w-full pitch-grad rounded-xl overflow-hidden no-select" style={{ aspectRatio: "68/80", touchAction: "none" }}>
              {activeSlots.map(slot => {
                const player = playerById(slot.playerId);
                const posMeta = POSITION_BY_CODE[slot.role];
                if (!player) return null;
                const isSubOut = subMode && !subOutPlayer;
                return (
                  <div key={slot.id}
                    onClick={() => {
                      if (!write || match.status !== "live") return;
                      if (subMode && !subOutPlayer) { setSubOutPlayer(slot.playerId); return; }
                    }}
                    className="absolute flex flex-col items-center"
                    style={{ left: `${slot.x}%`, top: `${slot.y * 0.8}%`, transform: "translate(-50%,-50%)", cursor: isSubOut ? "pointer" : "default" }}>
                    <div className="rounded-full flex items-center justify-center font-bold shadow-lg"
                      style={{
                        width: 28, height: 28,
                        background: subOutPlayer === slot.playerId ? "#84cc16" : "linear-gradient(160deg,#c0392b 0%,#96281b 100%)",
                        border: isSubOut ? "2px solid rgba(132,204,22,0.8)" : "2px solid rgba(255,255,255,0.55)",
                        color: "#fff", fontSize: 9, fontWeight: "800",
                      }}>
                      {player.number || ""}
                    </div>
                    <div style={{ fontSize: 8, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,1)", maxWidth: 44, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {player.name.split(" ").slice(-1)[0]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bench / subs */}
        {match.status === "live" && write && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-bold tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>BENK</div>
              <button
                onClick={() => { setSubMode(s => !s); setSubOutPlayer(null); }}
                className="text-xs px-2.5 py-1 rounded-lg font-semibold"
                style={{
                  background: subMode ? "rgba(132,204,22,0.15)" : "rgba(255,255,255,0.07)",
                  border: `1px solid ${subMode ? "rgba(132,204,22,0.5)" : "rgba(255,255,255,0.15)"}`,
                  color: subMode ? "#84cc16" : "rgba(255,255,255,0.6)",
                }}>
                {subMode ? "Avbryt bytte" : "Bytt spiller"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {benchPlayers.map(p => {
                const posMeta = POSITION_BY_CODE[p.positions[0]];
                return (
                  <button key={p.id}
                    onClick={() => {
                      if (subMode && subOutPlayer) { makeSub(p.id); return; }
                      // Long press for yellow/red — just tap to add event
                    }}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold"
                    style={{
                      background: subMode && subOutPlayer ? "rgba(132,204,22,0.1)" : "rgba(255,255,255,0.07)",
                      border: `1px solid ${subMode && subOutPlayer ? "rgba(132,204,22,0.4)" : "rgba(255,255,255,0.12)"}`,
                      color: "#fff",
                    }}>
                    <span style={{ color: posMeta?.color || "#64748b", fontSize: 9, fontWeight: "700" }}>{p.number || "—"}</span>
                    {p.name.split(" ").slice(-1)[0]}
                  </button>
                );
              })}
              {benchPlayers.length === 0 && (
                <div className="text-xs text-slate-600 italic">Ingen innbyttere</div>
              )}
            </div>
          </div>
        )}

        {/* Substitutions log */}
        {(match.subs || []).length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-bold tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>BYTTER</div>
            <div className="space-y-1.5">
              {(match.subs || []).map(sub => {
                const outP = playerById(sub.outId);
                const inP = playerById(sub.inId);
                return (
                  <div key={sub.id} className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
                    <span className="text-slate-500 font-mono text-xs w-8">{sub.minute}&apos;</span>
                    <span style={{ color: "#f87171" }}>↑ {outP?.name || "?"}</span>
                    <span style={{ color: "#84cc16" }}>↓ {inP?.name || "?"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Events log */}
        {match.events.filter(e => !e.isOpponent).length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-bold tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>HENDELSER</div>
            <div className="space-y-1">
              {match.events.filter(e => !e.isOpponent).map(ev => {
                const scorer = ev.playerId ? playerById(ev.playerId) : null;
                const assist = ev.assistId ? playerById(ev.assistId) : null;
                const icon = ev.type === "goal" ? "⚽" : ev.type === "yellow" ? "🟨" : "🟥";
                return (
                  <div key={ev.id} className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
                    <span className="text-slate-500 font-mono text-xs w-8">{ev.minute}&apos;</span>
                    <span>{icon}</span>
                    <span>{scorer?.name || (ev.type === "goal" ? "Ukjent" : "")}</span>
                    {assist && <span className="text-slate-500 text-xs">↪ {assist.name}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Ratings (finished match) */}
        {match.status === "finished" && Object.keys(match.playerRatings || {}).some(pid => match.playerRatings[pid]?.rating > 0) && (
          <div className="mb-4">
            <div className="text-xs font-bold tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>SPILLERVURDERINGER</div>
            <div className="space-y-2">
              {Object.entries(match.playerRatings).map(([pid, r]) => {
                if (!r?.rating) return null;
                const p = playerById(pid);
                if (!p) return null;
                const mins = (match.playerMinutes || {})[pid] || 0;
                return (
                  <div key={pid} className="rounded-xl px-3 py-2 flex items-center gap-3"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white">{p.name}</div>
                      {r.comment && <div className="text-xs text-slate-500 truncate">{r.comment}</div>}
                    </div>
                    <div className="text-xs text-slate-500 flex-shrink-0">{mins}min</div>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0"
                      style={{ background: "rgba(132,204,22,0.2)", color: "#84cc16" }}>
                      {r.rating}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Goal modal */}
        {showGoalModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: "rgba(0,0,0,0.6)" }}
            onClick={() => { setShowGoalModal(false); setGoalScorer(""); setGoalAssist(""); }}>
            <div className="w-full rounded-t-2xl px-4 pt-4 pb-8 space-y-4"
              style={{ background: "#0d2340", border: "1px solid rgba(255,255,255,0.12)", maxWidth: 480 }}
              onClick={e => e.stopPropagation()}>
              <div className="font-bold text-white">⚽ Mål — {displayMinute}&apos;</div>

              <div>
                <div className="text-[10px] font-semibold mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>SCORER</div>
                <div className="flex flex-wrap gap-2">
                  {activePIds.map(pid => {
                    const p = playerById(pid);
                    if (!p) return null;
                    return (
                      <button key={pid} onClick={() => setGoalScorer(id => id === pid ? "" : pid)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                        style={{
                          background: goalScorer === pid ? "#84cc16" : "rgba(255,255,255,0.08)",
                          color: goalScorer === pid ? "#0f172a" : "#fff",
                          border: `1px solid ${goalScorer === pid ? "#84cc16" : "rgba(255,255,255,0.12)"}`,
                        }}>
                        {p.number ? `${p.number} ` : ""}{p.name.split(" ").slice(-1)[0]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-semibold mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>ASSIST (valgfritt)</div>
                <div className="flex flex-wrap gap-2">
                  {activePIds.filter(pid => pid !== goalScorer).map(pid => {
                    const p = playerById(pid);
                    if (!p) return null;
                    return (
                      <button key={pid} onClick={() => setGoalAssist(id => id === pid ? "" : pid)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                        style={{
                          background: goalAssist === pid ? "rgba(132,204,22,0.3)" : "rgba(255,255,255,0.06)",
                          color: goalAssist === pid ? "#84cc16" : "rgba(255,255,255,0.6)",
                          border: `1px solid ${goalAssist === pid ? "rgba(132,204,22,0.5)" : "rgba(255,255,255,0.1)"}`,
                        }}>
                        {p.number ? `${p.number} ` : ""}{p.name.split(" ").slice(-1)[0]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => { setShowGoalModal(false); setGoalScorer(""); setGoalAssist(""); }}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold"
                  style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.55)" }}>
                  Avbryt
                </button>
                <button onClick={confirmGoal}
                  className="flex-1 py-2 rounded-lg text-sm font-bold bg-lime-400 text-slate-950">
                  Bekreft mål
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Post match ratings modal */}
        {showPostMatch && (
          <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: "rgba(0,0,0,0.8)" }}>
            <div className="min-h-screen flex items-end justify-center">
              <div className="w-full rounded-t-2xl px-4 pt-4 pb-8"
                style={{ background: "#0d2340", border: "1px solid rgba(255,255,255,0.12)", maxWidth: 480 }}>
                <div className="font-bold text-white mb-4">Kampvurdering</div>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  {Object.keys(match.playerMinutes || {}).map(pid => {
                    const p = playerById(pid);
                    if (!p) return null;
                    const mins = match.playerMinutes[pid];
                    const r = ratings[pid] || { rating: 0, comment: "" };
                    return (
                      <div key={pid} className="rounded-xl p-3 space-y-2" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-white text-sm font-semibold">{p.name}</div>
                            <div className="text-xs text-slate-500">{mins} min</div>
                          </div>
                          <div className="flex gap-1">
                            {[1,2,3,4,5,6,7,8,9,10].map(n => (
                              <button key={n} onClick={() => setRatings(prev => ({ ...prev, [pid]: { ...r, rating: n } }))}
                                className="w-6 h-6 rounded text-xs font-bold"
                                style={{
                                  background: r.rating >= n ? "rgba(132,204,22,0.8)" : "rgba(255,255,255,0.07)",
                                  color: r.rating >= n ? "#0f172a" : "rgba(255,255,255,0.4)",
                                }}>
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>
                        <input value={r.comment || ""} onChange={e => setRatings(prev => ({ ...prev, [pid]: { ...r, comment: e.target.value } }))}
                          placeholder="Kommentar (valgfritt)"
                          className="w-full rounded-lg px-3 py-2 text-white text-sm outline-none"
                          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", fontSize: 16 }} />
                      </div>
                    );
                  })}
                </div>
                <button onClick={saveRatings}
                  className="w-full mt-4 py-3 rounded-xl bg-lime-400 text-slate-950 font-bold text-sm">
                  Lagre og avslutt
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ModeBtn({ active, onClick, icon, children }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${
        active ? "bg-lime-400 text-slate-950" : "text-slate-400 hover:text-white"
      }`}>
      {icon} {children}
    </button>
  );
}

function FormationPreview({ formation }) {
  return (
    <div className="relative w-full pitch-grad border border-slate-700/50 rounded-md overflow-hidden" style={{ aspectRatio: "68 / 100" }}>
      {formation.map((s, i) => (
        <div key={i} className="absolute w-2 h-2 rounded-full bg-lime-400 shadow"
          style={{ left: `${s.x}%`, top: `${s.y}%`, transform: "translate(-50%,-50%)" }} />
      ))}
    </div>
  );
}

function PitchMarkings() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 150" preserveAspectRatio="none">
      <rect x="1.5" y="1.5" width="97" height="147" fill="none" stroke="white" strokeOpacity="0.9" strokeWidth="0.5" />
      <line x1="1.5" y1="75" x2="98.5" y2="75" stroke="white" strokeOpacity="0.9" strokeWidth="0.5" />
      <circle cx="50" cy="75" r="9" fill="none" stroke="white" strokeOpacity="0.9" strokeWidth="0.5" />
      <circle cx="50" cy="75" r="0.6" fill="white" fillOpacity="0.8" />
      <rect x="22" y="1.5" width="56" height="20" fill="none" stroke="white" strokeOpacity="0.9" strokeWidth="0.5" />
      <rect x="35" y="1.5" width="30" height="7" fill="none" stroke="white" strokeOpacity="0.9" strokeWidth="0.5" />
      <circle cx="50" cy="14" r="0.6" fill="white" fillOpacity="0.8" />
      <path d="M 40 21.5 A 9 9 0 0 0 60 21.5" fill="none" stroke="white" strokeOpacity="0.9" strokeWidth="0.5" />
      <rect x="22" y="128.5" width="56" height="20" fill="none" stroke="white" strokeOpacity="0.9" strokeWidth="0.5" />
      <rect x="35" y="141.5" width="30" height="7" fill="none" stroke="white" strokeOpacity="0.9" strokeWidth="0.5" />
      <circle cx="50" cy="136" r="0.6" fill="white" fillOpacity="0.8" />
      <path d="M 40 128.5 A 9 9 0 0 1 60 128.5" fill="none" stroke="white" strokeOpacity="0.9" strokeWidth="0.5" />
      {[[1.5,1.5],[98.5,1.5],[1.5,148.5],[98.5,148.5]].map(([cx,cy],i)=>(
        <circle key={i} cx={cx} cy={cy} r="1.5" fill="none" stroke="white" strokeOpacity="0.9" strokeWidth="0.5" />
      ))}
    </svg>
  );
}

function AssignPlayerModal({ slot, players, currentPlayerId, usedPlayerIds, onAssign, onClose }) {
  const used = new Set(usedPlayerIds);
  const roleMatch = (p) => p.positions.includes(slot.role) || p.positions.some(c => roleGroup(c) === roleGroup(slot.role));
  const sorted = [...players].sort((a,b) => {
    const am = roleMatch(a) ? 0 : 1, bm = roleMatch(b) ? 0 : 1;
    if (am !== bm) return am - bm;
    return (a.number||999) - (b.number||999);
  });
  return (
    <Modal title={`Tilordne · ${POSITION_BY_CODE[slot.role]?.label || slot.role}`} onClose={onClose}>
      <div className="space-y-1.5 max-h-[60vh] overflow-y-auto scrollbar-thin">
        <button onClick={() => onAssign(null)}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-950/50 border border-slate-800 hover:border-red-500/40 text-slate-400 hover:text-red-400 text-sm">
          <X className="w-4 h-4" /> Fjern spiller fra denne posisjonen
        </button>
        {sorted.map(p => {
          const isUsed = used.has(p.id);
          const isCurrent = p.id === currentPlayerId;
          const matches = roleMatch(p);
          return (
            <button key={p.id} onClick={() => onAssign(p.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm ${
                isCurrent ? "bg-lime-400/10 border-lime-400/40" :
                isUsed ? "bg-slate-950/30 border-slate-800 opacity-50" :
                "bg-slate-950/50 border-slate-800 hover:border-lime-400/40"
              }`}>
              <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center font-mono text-xs text-lime-400">
                {p.number || ""}
              </div>
              <div className="flex-1 text-left">
                <div className="text-white">{p.name}</div>
                <div className="text-[10px] text-slate-500 font-mono">{p.positions.join(" · ")}</div>
              </div>
              {matches && <span className="text-[10px] font-semibold text-lime-400">PASSER</span>}
              {isUsed && !isCurrent && <span className="text-[10px] text-slate-500">PÅ BANEN</span>}
              {isCurrent && <Check className="w-4 h-4 text-lime-400" />}
            </button>
          );
        })}
        {players.length === 0 && (
          <div className="text-sm text-slate-500 text-center py-6">Ingen spillere i stallen.</div>
        )}
      </div>
    </Modal>
  );
}

// ==================================================================
// ============ ADMIN VIEW (Users / Teams / Players) ===============
// ==================================================================
function AdminView({ user, db, setDB, onOpenTeam }) {
  const [tab, setTab] = useState("users");
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <div className="text-xs font-semibold text-lime-400 tracking-widest mb-2 flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5" /> ADMIN-PANEL
        </div>
        <h1 className="font-display text-4xl sm:text-5xl text-white">SYSTEMSTYRING</h1>
        <p className="text-slate-400 mt-2">Brukere, lag, spillere og tilganger</p>
      </div>

      <div className="flex gap-1 mb-6 p-1 bg-slate-900/60 border border-slate-800 rounded-xl w-fit overflow-x-auto">
        <AdminTab active={tab === "users"} onClick={() => setTab("users")} icon={<UserCog className="w-4 h-4" />} count={db.users.length}>Brukere</AdminTab>
        <AdminTab active={tab === "teams"} onClick={() => setTab("teams")} icon={<Shield className="w-4 h-4" />} count={db.teams.length}>Lag</AdminTab>
        <AdminTab active={tab === "players"} onClick={() => setTab("players")} icon={<Users className="w-4 h-4" />} count={db.teams.reduce((s,t) => s + t.players.length, 0)}>Spillere</AdminTab>
        <AdminTab active={tab === "club"} onClick={() => setTab("club")} icon={<Trophy className="w-4 h-4" />}>Klubb</AdminTab>
      </div>

      {tab === "users" && <AdminUsers user={user} db={db} setDB={setDB} />}
      {tab === "teams" && <AdminTeams db={db} setDB={setDB} onOpenTeam={onOpenTeam} />}
      {tab === "players" && <AdminPlayers db={db} setDB={setDB} />}
      {tab === "club" && <AdminClub db={db} setDB={setDB} />}
    </div>
  );
}

function AdminTab({ active, onClick, icon, count, children }) {
  return (
    <button onClick={onClick}
      className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
        active ? "bg-lime-400 text-slate-950" : "text-slate-400 hover:text-white"
      }`}>
      {icon} {children}
      {count !== undefined && (
        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${active ? "bg-slate-950/20 text-slate-950" : "bg-slate-800 text-slate-500"}`}>
          {count}
        </span>
      )}
    </button>
  );
}

// ----- Admin: Users -----
function AdminUsers({ user, db, setDB }) {
  const [editingId, setEditingId] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const remove = async (uid_) => {
    if (uid_ === user.id) return alert("Du kan ikke slette deg selv");
    const u = db.users.find(x => x.id === uid_);
    if (!confirm(`Slette brukeren "${u.username}"?`)) return;
    const next = { ...db, users: db.users.filter(x => x.id !== uid_) };
    setDB(next); await storage.set(DB_KEY, next);
  };

  const save = async (data) => {
    const isEdit = !!editingId;
    let nextUsers;
    if (isEdit) {
      nextUsers = db.users.map(u => u.id === editingId ? { ...u, ...data } : u);
    } else {
      if (db.users.find(u => u.username === data.username)) {
        return alert("Brukernavnet er opptatt");
      }
      nextUsers = [...db.users, { id: uid(), ...data }];
    }
    const next = { ...db, users: nextUsers };
    setDB(next); await storage.set(DB_KEY, next);
    setEditingId(null); setShowNew(false);
  };

  const editingUser = db.users.find(u => u.id === editingId);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl text-white">BRUKERE</h2>
        <button onClick={() => setShowNew(true)}
          className="px-3 py-2 rounded-lg bg-lime-400 hover:bg-lime-300 text-slate-950 font-semibold text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Ny bruker
        </button>
      </div>

      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-slate-950/60 border-b border-slate-800 text-xs font-semibold text-slate-400 tracking-wider">
          <div className="col-span-3">BRUKERNAVN</div>
          <div className="col-span-2">ROLLE</div>
          <div className="col-span-6">TILGANG</div>
          <div className="col-span-1 text-right"></div>
        </div>
        {db.users.map(u => (
          <div key={u.id} className="grid grid-cols-12 gap-3 px-5 py-3.5 border-b border-slate-800/50 last:border-0 hover:bg-slate-900/60 items-center">
            <div className="col-span-3 flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-mono text-lime-400 flex-shrink-0">
                {u.username[0]?.toUpperCase()}
              </div>
              <div className="text-white text-sm truncate">{u.username}</div>
              {u.id === user.id && <span className="text-[10px] text-lime-400 font-bold">DEG</span>}
            </div>
            <div className="col-span-2"><RoleBadge role={u.role} /></div>
            <div className="col-span-6 flex flex-wrap gap-1.5">
              {u.role === "admin" ? (
                <span className="text-xs text-slate-400 italic">Full tilgang til alle lag</span>
              ) : (u.teamAccess?.length || 0) === 0 ? (
                <span className="text-xs text-slate-500 italic">Ingen tilgang</span>
              ) : (
                u.teamAccess.map(a => {
                  const team = db.teams.find(t => t.id === a.teamId);
                  if (!team) return null;
                  return (
                    <span key={a.teamId} className="text-xs px-2 py-0.5 rounded-md bg-slate-800/60 border border-slate-700 text-slate-200 flex items-center gap-1.5">
                      {team.name}{team.variant ? ` ${team.variant}` : ""}
                      <PermBadge permission={a.permission} />
                    </span>
                  );
                })
              )}
            </div>
            <div className="col-span-1 flex justify-end gap-1">
              <button onClick={() => setEditingId(u.id)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
                <Edit3 className="w-4 h-4" />
              </button>
              <button onClick={() => remove(u.id)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {(showNew || editingUser) && (
        <UserEditor
          user={editingUser}
          teams={db.teams}
          onSave={save}
          onClose={() => { setShowNew(false); setEditingId(null); }}
        />
      )}
    </div>
  );
}

function UserEditor({ user: u, teams, onSave, onClose }) {
  const [username, setUsername] = useState(u?.username || "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(u?.role || "lagleder");
  const [teamAccess, setTeamAccess] = useState(u?.teamAccess || []);
  const isEdit = !!u;

  const getAccess = (tid) => teamAccess.find(a => a.teamId === tid)?.permission || "none";
  const setAccess = (tid, perm) => {
    setTeamAccess(prev => {
      const without = prev.filter(a => a.teamId !== tid);
      if (perm === "none") return without;
      return [...without, { teamId: tid, permission: perm }];
    });
  };

  const submit = () => {
    if (!username.trim()) return alert("Skriv inn brukernavn");
    if (!isEdit && !password.trim()) return alert("Skriv inn passord");
    const data = { username: username.trim(), role, teamAccess: role === "admin" ? [] : teamAccess };
    if (password.trim()) data.password = password;
    onSave(data);
  };

  return (
    <Modal title={isEdit ? `Rediger bruker · ${u.username}` : "Ny bruker"} onClose={onClose} size="lg">
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field icon={<User className="w-4 h-4" />} label="Brukernavn">
            <input value={username} onChange={e => setUsername(e.target.value)} disabled={isEdit}
              className="bg-transparent w-full outline-none text-white placeholder:text-slate-600 disabled:opacity-60"
              placeholder="lagleder1" />
          </Field>
          <Field icon={<KeyRound className="w-4 h-4" />} label={isEdit ? "Nytt passord (valgfritt)" : "Passord"}>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="bg-transparent w-full outline-none text-white placeholder:text-slate-600"
              placeholder={isEdit ? "La stå tom for å beholde" : "••••••••"} />
          </Field>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-400 tracking-wider mb-2 block">ROLLE</label>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setRole("admin")}
              className={`p-3 rounded-xl border text-left transition-all ${
                role === "admin" ? "border-lime-400 bg-lime-400/10" : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
              }`}>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className={`w-4 h-4 ${role === "admin" ? "text-lime-400" : "text-slate-500"}`} />
                <span className="font-semibold text-white text-sm">Admin</span>
              </div>
              <div className="text-xs text-slate-400">Full tilgang til alt</div>
            </button>
            <button onClick={() => setRole("lagleder")}
              className={`p-3 rounded-xl border text-left transition-all ${
                role === "lagleder" ? "border-lime-400 bg-lime-400/10" : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
              }`}>
              <div className="flex items-center gap-2 mb-1">
                <User className={`w-4 h-4 ${role === "lagleder" ? "text-lime-400" : "text-slate-500"}`} />
                <span className="font-semibold text-white text-sm">Lagleder</span>
              </div>
              <div className="text-xs text-slate-400">Tilgang per lag</div>
            </button>
          </div>
        </div>

        {role === "lagleder" && (
          <div>
            <label className="text-xs font-semibold text-slate-400 tracking-wider mb-2 block">LAGTILGANG</label>
            {teams.length === 0 ? (
              <div className="text-sm text-slate-500 italic bg-slate-950/40 border border-slate-800 rounded-lg p-3">
                Ingen lag opprettet ennå
              </div>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto scrollbar-thin pr-1">
                {teams.map(t => {
                  const perm = getAccess(t.id);
                  return (
                    <div key={t.id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-slate-950/50 border border-slate-800">
                      <div className="min-w-0">
                        <div className="text-white text-sm truncate">{t.name}{t.variant ? ` ${t.variant}` : ""}</div>
                        <div className="text-[10px] text-slate-500">Årskull {t.ageYear}</div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {["none", "read", "write"].map(p => (
                          <button key={p} onClick={() => setAccess(t.id, p)}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider border transition-all ${
                              perm === p
                                ? p === "write" ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                                : p === "read"  ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                                                : "bg-slate-700/40 border-slate-600 text-slate-300"
                                : "border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700"
                            }`}>
                            {p === "none" ? "INGEN" : p === "read" ? "LESE" : "SKRIVE"}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <button onClick={submit} className="w-full py-3 bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold rounded-xl">
          {isEdit ? "Lagre endringer" : "Opprett bruker"}
        </button>
      </div>
    </Modal>
  );
}

// ----- Admin: Teams -----
function AdminTeams({ db, setDB, onOpenTeam }) {
  const remove = async (tid) => {
    const t = db.teams.find(x => x.id === tid);
    if (!confirm(`Slette laget "${t.name}"? Alle spillere og taktikker forsvinner.`)) return;
    // also clean up teamAccess refs
    const nextUsers = db.users.map(u => ({
      ...u, teamAccess: (u.teamAccess || []).filter(a => a.teamId !== tid),
    }));
    const next = { ...db, teams: db.teams.filter(x => x.id !== tid), users: nextUsers };
    setDB(next); await storage.set(DB_KEY, next);
  };

  return (
    <div>
      <h2 className="font-display text-xl text-white mb-4">LAG</h2>
      {db.teams.length === 0 ? (
        <div className="text-slate-500 text-sm italic bg-slate-900/40 border border-slate-800 rounded-xl p-6 text-center">
          Ingen lag opprettet ennå
        </div>
      ) : (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-slate-950/60 border-b border-slate-800 text-xs font-semibold text-slate-400 tracking-wider">
            <div className="col-span-5">LAG</div>
            <div className="col-span-2">ÅRSKULL</div>
            <div className="col-span-2">SPILLERE</div>
            <div className="col-span-2">TAKTIKKER</div>
            <div className="col-span-1 text-right"></div>
          </div>
          {db.teams.map(t => (
            <div key={t.id} className="grid grid-cols-12 gap-3 px-5 py-3.5 border-b border-slate-800/50 last:border-0 hover:bg-slate-900/60 items-center">
              <div className="col-span-5">
                <button onClick={() => onOpenTeam(t.id)} className="text-white hover:text-lime-400 font-medium text-left">
                  {t.name}{t.variant ? ` ${t.variant}` : ""}
                </button>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">{t.format}</div>
              </div>
              <div className="col-span-2 text-slate-300 text-sm">{t.ageYear}</div>
              <div className="col-span-2 text-white font-mono">{t.players.length}</div>
              <div className="col-span-2 text-white font-mono">{t.tactics?.length || 0}</div>
              <div className="col-span-1 flex justify-end">
                <button onClick={() => remove(t.id)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ----- Admin: Players (across all teams) -----
function AdminPlayers({ db, setDB }) {
  const [filterTeam, setFilterTeam] = useState("all");

  const allPlayers = useMemo(() => {
    const list = [];
    db.teams.forEach(t => {
      t.players.forEach(p => list.push({ ...p, teamId: t.id, teamName: `${t.name}${t.variant ? ` ${t.variant}` : ""}` }));
    });
    return list.sort((a,b) => a.teamName.localeCompare(b.teamName) || (a.number||999) - (b.number||999));
  }, [db]);

  const shown = filterTeam === "all" ? allPlayers : allPlayers.filter(p => p.teamId === filterTeam);

  const remove = async (teamId, playerId) => {
    if (!confirm("Slette spilleren?")) return;
    const next = {
      ...db,
      teams: db.teams.map(t => t.id === teamId ? { ...t, players: t.players.filter(p => p.id !== playerId) } : t),
    };
    setDB(next); await storage.set(DB_KEY, next);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="font-display text-xl text-white">ALLE SPILLERE</h2>
        <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-lime-400/50">
          <option value="all">Alle lag ({allPlayers.length})</option>
          {db.teams.map(t => (
            <option key={t.id} value={t.id}>{t.name}{t.variant ? ` ${t.variant}` : ""} ({t.players.length})</option>
          ))}
        </select>
      </div>

      {shown.length === 0 ? (
        <div className="text-slate-500 text-sm italic bg-slate-900/40 border border-slate-800 rounded-xl p-6 text-center">
          Ingen spillere
        </div>
      ) : (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-slate-950/60 border-b border-slate-800 text-xs font-semibold text-slate-400 tracking-wider">
            <div className="col-span-1">NR</div>
            <div className="col-span-3">NAVN</div>
            <div className="col-span-3">LAG</div>
            <div className="col-span-4">POSISJONER</div>
            <div className="col-span-1 text-right"></div>
          </div>
          {shown.map(p => (
            <div key={p.teamId + p.id} className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-slate-800/50 last:border-0 hover:bg-slate-900/60 items-center">
              <div className="col-span-1 font-mono font-bold text-lime-400">{p.number || "—"}</div>
              <div className="col-span-3 text-white text-sm truncate">{p.name}</div>
              <div className="col-span-3 text-slate-300 text-sm truncate">{p.teamName}</div>
              <div className="col-span-4 flex flex-wrap gap-1">
                {p.positions.map(c => {
                  const pos = POSITION_BY_CODE[c];
                  if (!pos) return null;
                  return (
                    <span key={c} className="text-[10px] font-semibold px-1.5 py-0.5 rounded border"
                      style={{ color: pos.color, borderColor: pos.color + "50", backgroundColor: pos.color + "15" }}>
                      {pos.code}
                    </span>
                  );
                })}
              </div>
              <div className="col-span-1 flex justify-end">
                <button onClick={() => remove(p.teamId, p.id)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ----- Admin: Club -----
function AdminClub({ db, setDB }) {
  const updateName = async (name) => {
    const next = { ...db, club: { ...db.club, name } };
    setDB(next); await storage.set(DB_KEY, next);
  };
  const resetAll = async () => {
    if (!confirm("Nullstille hele systemet? Alle data slettes permanent.")) return;
    if (!confirm("Helt sikker? Dette kan ikke angres.")) return;
    const fresh = defaultDB();
    setDB(fresh); await storage.set(DB_KEY, fresh);
    alert("Systemet er nullstilt. Logger deg ut.");
    window.location.reload();
  };
  return (
    <div>
      <h2 className="font-display text-xl text-white mb-4">KLUBBINNSTILLINGER</h2>
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 max-w-lg space-y-4">
        <Field icon={<Trophy className="w-4 h-4" />} label="Klubbnavn">
          <input value={db.club.name} onChange={e => updateName(e.target.value)}
            className="bg-transparent w-full outline-none text-white" />
        </Field>
        <div className="text-xs text-slate-500 pt-3 border-t border-slate-800">
          Data lagres lokalt (per enhet/økt). For deling mellom enheter trengs ekstern database.
        </div>
        <button onClick={resetAll}
          className="text-xs text-red-400 hover:text-red-300 flex items-center gap-2">
          <Trash2 className="w-3.5 h-3.5" /> Nullstill alle data
        </button>
      </div>
    </div>
  );
}

// ==================================================================
// =================== ROOT APP ====================================
// ==================================================================
export default function App() {
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [db, setDB] = useState(defaultDB());
  const [view, setView] = useState({ name: "club" });

  useEffect(() => {
    (async () => {
      let stored = await storage.get(DB_KEY);
      if (!stored) {
        stored = defaultDB();
        await storage.set(DB_KEY, stored);
      } else if (!stored.users?.[0]?.role) {
        // migrate older versions
        stored.users = stored.users.map((u, i) => ({
          id: u.id || uid(),
          role: i === 0 ? "admin" : "lagleder",
          teamAccess: [],
          ...u,
        }));
        await storage.set(DB_KEY, stored);
      }
      setDB(stored);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <GlobalStyles />
        <div className="text-lime-400 font-display tracking-widest">LASTER...</div>
      </div>
    );
  }

  const user = db.users.find(u => u.id === currentUserId);

  if (!user) {
    return (
      <>
        <GlobalStyles />
        <AuthScreen onLogin={setCurrentUserId} db={db} />
      </>
    );
  }

  const currentTeam = view.name === "team"
    ? db.teams.find(t => t.id === view.teamId)
    : null;

  // Permission guard: if user lost read access, kick back to club
  if (currentTeam && !canRead(user, currentTeam.id)) {
    setTimeout(() => setView({ name: "club" }), 0);
  }

  const breadcrumbs = view.name === "club" ? "Klubbside"
    : view.name === "team" ? `Klubbside · ${currentTeam?.name || ""}`
    : view.name === "admin" ? "Admin-panel"
    : "";

  const onBack = view.name === "club" || view.name === "admin" ? null
    : view.name === "team" ? () => setView({ name: "club" })
    : null;

  return (
    <div className="min-h-screen font-body" style={{ background: "#020617" }}>
      <GlobalStyles />
      <Header
        user={user}
        club={db.club}
        breadcrumbs={breadcrumbs}
        onBack={onBack}
        currentView={view.name}
        teamName={view.name === "team" ? (currentTeam ? `${currentTeam.name}${currentTeam.variant ? ` ${currentTeam.variant}` : ""}` : "") : undefined}
        onAdmin={() => setView(v => v.name === "admin" ? { name: "club" } : { name: "admin" })}
        onLogout={() => { setCurrentUserId(null); setView({ name: "club" }); }}
      />

      <div className="anim-in">
        {view.name === "club" && (
          <ClubView user={user} db={db} setDB={setDB}
            onOpenTeam={(id) => setView({ name: "team", teamId: id })} />
        )}
        {view.name === "team" && currentTeam && (
          <TeamView team={currentTeam} user={user} db={db} setDB={setDB} onBack={onBack} />
        )}
        {view.name === "admin" && isAdmin(user) && (
          <AdminView user={user} db={db} setDB={setDB}
            onOpenTeam={(id) => setView({ name: "team", teamId: id })} />
        )}
      </div>
    </div>
  );
}
