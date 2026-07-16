/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BoardTheme {
  id: string;
  name: string;
  icon: string;
  boardBg: string;           // main board container styling
  boardBorder: string;       // border around the board container
  boardShadow: string;       // shadows for the main board
  gridBg: string;            // background for the cells container
  yardBg: {                 // Home yard backgrounds
    red: string;
    green: string;
    yellow: string;
    blue: string;
  };
  yardBorder: {
    red: string;
    green: string;
    yellow: string;
    blue: string;
  };
  pathBg: {                 // Home paths colors
    red: string;
    green: string;
    yellow: string;
    blue: string;
  };
  cellBg: {                 // normal track cell background
    standard: string;
    safe: string;
    start: {
      red: string;
      green: string;
      yellow: string;
      blue: string;
    };
  };
  centerGrads: {            // Center triangle SVG gradients or fills
    red: string;
    green: string;
    yellow: string;
    blue: string;
  };
  gridBorderClass: string;   // grid lines border color/style
  centerBorderClass: string; // center home star divider border color/style
  centerMedallionBg: string; // background fill for the circular crown seal
  isPhysical: boolean;       // flag to apply realistic shadows, borders, wood texture
}

export const THEMES: BoardTheme[] = [
  {
    id: 'classic',
    name: 'Classic Physical Ludo',
    icon: '🎨',
    // Realistic wood board texture using layered gradients
    boardBg: 'bg-gradient-to-br from-[#8d5830] via-[#ab6e3f] to-[#764824] dark:from-[#5c3519] dark:via-[#724524] dark:to-[#4c2912]',
    boardBorder: 'border-[#5a361a] dark:border-[#3d220e]',
    boardShadow: 'shadow-[0_24px_55px_rgba(0,0,0,0.38),inset_0_4px_10px_rgba(255,255,255,0.18)]',
    gridBg: 'bg-[#f5ebd7] dark:bg-[#161311]',
    yardBg: {
      red: 'bg-gradient-to-br from-[#ff3b5c] via-[#e11d48] to-[#9f1239] dark:from-[#be123c] dark:to-[#64071e]',
      green: 'bg-gradient-to-br from-[#10b981] via-[#059669] to-[#045f43] dark:from-[#047857] dark:to-[#023f2e]',
      yellow: 'bg-gradient-to-br from-[#f59e0b] via-[#d97706] to-[#92400e] dark:from-[#b45309] dark:to-[#5d2105]',
      blue: 'bg-gradient-to-br from-[#0ea5e9] via-[#0284c7] to-[#075985] dark:from-[#0369a1] dark:to-[#043d5c]'
    },
    yardBorder: {
      red: 'border-[#d01c3e]/30 dark:border-[#9f1239]/40',
      green: 'border-[#0d9488]/30 dark:border-[#065f46]/40',
      yellow: 'border-[#d97706]/30 dark:border-[#92400e]/40',
      blue: 'border-[#0284c7]/30 dark:border-[#075985]/40'
    },
    pathBg: {
      red: 'bg-gradient-to-br from-[#ff5372] to-[#cb1a3a] dark:from-[#be123c] dark:to-[#700b21] border-[0.5px] border-[#ff3b5c]/40 shadow-[inset_0_1.5px_3px_rgba(255,255,255,0.35),inset_0_-1.5px_3px_rgba(0,0,0,0.2)]',
      green: 'bg-gradient-to-br from-[#1cdb99] to-[#07855d] dark:from-[#047857] dark:to-[#024431] border-[0.5px] border-[#10b981]/40 shadow-[inset_0_1.5px_3px_rgba(255,255,255,0.35),inset_0_-1.5px_3px_rgba(0,0,0,0.2)]',
      yellow: 'bg-gradient-to-br from-[#fbbf24] to-[#c26b00] dark:from-[#b45309] dark:to-[#692c02] border-[0.5px] border-[#f59e0b]/40 shadow-[inset_0_1.5px_3px_rgba(255,255,255,0.35),inset_0_-1.5px_3px_rgba(0,0,0,0.2)]',
      blue: 'bg-gradient-to-br from-[#38bdf8] to-[#0275b0] dark:from-[#0369a1] dark:to-[#044a70] border-[0.5px] border-[#0ea5e9]/40 shadow-[inset_0_1.5px_3px_rgba(255,255,255,0.35),inset_0_-1.5px_3px_rgba(0,0,0,0.2)]'
    },
    cellBg: {
      standard: 'bg-gradient-to-br from-[#fafbf9] via-[#f5ecd8] to-[#eddca8] dark:from-[#211f1c] dark:via-[#181614] dark:to-[#100e0d] border-[0.5px] border-stone-400/35 dark:border-stone-800/40 shadow-[inset_0.5px_0.5px_1.5px_rgba(255,255,255,0.95),inset_-0.5px_-0.5px_1.5px_rgba(0,0,0,0.15),0_1.5px_3px_rgba(0,0,0,0.08)]',
      safe: 'bg-gradient-to-br from-[#fef08a] to-[#eab308] dark:from-amber-950/40 dark:to-amber-900/10 border-[0.5px] border-amber-400/40 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.5),0_1px_2px_rgba(0,0,0,0.05)]',
      start: {
        red: 'bg-gradient-to-br from-[#ff5372] to-[#cb1a3a] dark:from-[#be123c] dark:to-[#700b21] border-[0.5px] border-[#ff3b5c]/50 shadow-[inset_0_1.5px_3px_rgba(255,255,255,0.35),inset_0_-1.5px_3px_rgba(0,0,0,0.15)]',
        green: 'bg-gradient-to-br from-[#1cdb99] to-[#07855d] dark:from-[#047857] dark:to-[#024431] border-[0.5px] border-[#10b981]/50 shadow-[inset_0_1.5px_3px_rgba(255,255,255,0.35),inset_0_-1.5px_3px_rgba(0,0,0,0.15)]',
        yellow: 'bg-gradient-to-br from-[#fbbf24] to-[#c26b00] dark:from-[#b45309] dark:to-[#692c02] border-[0.5px] border-[#f59e0b]/50 shadow-[inset_0_1.5px_3px_rgba(255,255,255,0.35),inset_0_-1.5px_3px_rgba(0,0,0,0.15)]',
        blue: 'bg-gradient-to-br from-[#38bdf8] to-[#0275b0] dark:from-[#0369a1] dark:to-[#044a70] border-[0.5px] border-[#0ea5e9]/50 shadow-[inset_0_1.5px_3px_rgba(255,255,255,0.35),inset_0_-1.5px_3px_rgba(0,0,0,0.15)]'
      }
    },
    centerGrads: {
      red: '#ff3b5c',
      green: '#10b981',
      yellow: '#f59e0b',
      blue: '#0ea5e9'
    },
    gridBorderClass: 'border-[#8d5830]/40 dark:border-stone-800/40',
    centerBorderClass: 'stroke-[#8d5830] dark:stroke-stone-800',
    centerMedallionBg: 'bg-[#fef08a]',
    isPhysical: true
  },
  {
    id: 'cosmic',
    name: 'Cosmic Slate',
    icon: '🌌',
    // Original premium futuristic slate theme
    boardBg: 'bg-gradient-to-br from-[#eae3d8] via-[#f4ebd9] to-[#eae3d8] dark:from-[#1b1918] dark:via-[#262220] dark:to-[#1b1918]',
    boardBorder: 'border-[#ebe5da] dark:border-[#2b2725]',
    boardShadow: 'shadow-[0_20px_50px_rgba(0,0,0,0.22),inset_0_1.5px_3px_rgba(255,255,255,0.9)] dark:shadow-[0_24px_55px_rgba(0,0,0,0.65),inset_0_1px_1.5px_rgba(255,255,255,0.05)]',
    gridBg: 'bg-[#e6dfd3] dark:bg-[#1d1a19]',
    yardBg: {
      red: 'bg-gradient-to-br from-[#ffe1e5] to-[#fecdd3] dark:from-[#201012] dark:to-[#311116]',
      green: 'bg-gradient-to-br from-[#e3f7ed] to-[#d1fae5] dark:from-[#0a1b12] dark:to-[#0e271a]',
      yellow: 'bg-gradient-to-br from-[#fef6dc] to-[#fef3c7] dark:from-[#201c10] dark:to-[#302715]',
      blue: 'bg-gradient-to-br from-[#e3f0ff] to-[#bae6fd] dark:from-[#0b1620] dark:to-[#112334]'
    },
    yardBorder: {
      red: 'border-[#ff4d6d]/30 dark:border-[#ff4d6d]/20',
      green: 'border-[#34d399]/30 dark:border-[#34d399]/20',
      yellow: 'border-[#fbbf24]/30 dark:border-[#fbbf24]/20',
      blue: 'border-[#38bdf8]/30 dark:border-[#38bdf8]/20'
    },
    pathBg: {
      red: 'bg-gradient-to-br from-[#ff6b85] to-[#e11d48] border-[0.5px] border-rose-300/40 dark:border-rose-950/40 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),inset_0_-1px_2px_rgba(0,0,0,0.15)]',
      green: 'bg-gradient-to-br from-[#52e2ad] to-[#059669] border-[0.5px] border-emerald-300/40 dark:border-emerald-950/40 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),inset_0_-1px_2px_rgba(0,0,0,0.15)]',
      yellow: 'bg-gradient-to-br from-[#fcd34d] to-[#d97706] border-[0.5px] border-amber-300/40 dark:border-amber-950/40 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),inset_0_-1px_2px_rgba(0,0,0,0.15)]',
      blue: 'bg-gradient-to-br from-[#5eceff] to-[#0284c7] border-[0.5px] border-sky-300/40 dark:border-sky-950/40 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),inset_0_-1px_2px_rgba(0,0,0,0.15)]'
    },
    cellBg: {
      standard: 'bg-gradient-to-br from-[#ffffff] to-[#faf8f5] dark:from-[#181615] dark:to-[#121110] border-[0.5px] border-stone-250/40 dark:border-stone-850/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.55),0_1.5px_2px_rgba(0,0,0,0.04)]',
      safe: 'bg-gradient-to-br from-[#fffbeb] to-[#fef08a] dark:from-amber-950/30 dark:to-amber-950/10 border-[0.5px] border-[#f59e0b]/30 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.4),0_1px_2px_rgba(0,0,0,0.04)]',
      start: {
        red: 'bg-gradient-to-br from-[#ff6b85] to-[#e11d48] border-[0.5px] border-rose-400/50 dark:border-rose-950/50 shadow-[inset_0_1px_2.5px_rgba(255,255,255,0.45)]',
        green: 'bg-gradient-to-br from-[#52e2ad] to-[#059669] border-[0.5px] border-emerald-400/50 dark:border-emerald-950/50 shadow-[inset_0_1px_2.5px_rgba(255,255,255,0.45)]',
        yellow: 'bg-gradient-to-br from-[#fcd34d] to-[#d97706] border-[0.5px] border-amber-400/50 dark:border-amber-950/50 shadow-[inset_0_1px_2.5px_rgba(255,255,255,0.45)]',
        blue: 'bg-gradient-to-br from-[#5eceff] to-[#0284c7] border-[0.5px] border-sky-400/50 dark:border-sky-950/50 shadow-[inset_0_1px_2.5px_rgba(255,255,255,0.45)]'
      }
    },
    centerGrads: {
      red: 'url(#redHomeGrad)',
      green: 'url(#greenHomeGrad)',
      yellow: 'url(#yellowHomeGrad)',
      blue: 'url(#blueHomeGrad)'
    },
    gridBorderClass: 'border-[#ebe5da] dark:border-[#2b2725]',
    centerBorderClass: 'stroke-[#ebe5da] dark:stroke-[#2b2725]',
    centerMedallionBg: 'url(#centerGold)',
    isPhysical: false
  }
];
