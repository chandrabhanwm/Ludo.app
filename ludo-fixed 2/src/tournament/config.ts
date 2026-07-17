/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ProductionOpponent {
  name: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  rating: number;
  avatar: string;
  isBot: true; // All tournament opponents are AI bots
}

// NOTE: All opponents are AI bots. isBot must remain true until
// real human matchmaking is implemented.
export const PRODUCTION_OPPONENTS: ProductionOpponent[] = [
  { name: 'AI Bot · Falcon', difficulty: 'Medium', rating: 1450, avatar: '🦅', isBot: true },
  { name: 'AI Bot · Tiger', difficulty: 'Hard', rating: 1680, avatar: '🐯', isBot: true },
  { name: 'AI Bot · Unicorn', difficulty: 'Medium', rating: 1420, avatar: '🦄', isBot: true },
  { name: 'AI Bot · Panda', difficulty: 'Easy', rating: 1150, avatar: '🐼', isBot: true },
  { name: 'AI Bot · Fox', difficulty: 'Medium', rating: 1380, avatar: '🦊', isBot: true },
  { name: 'AI Bot · Dragon', difficulty: 'Hard', rating: 1720, avatar: '🐉', isBot: true },
  { name: 'AI Bot · Hamster', difficulty: 'Medium', rating: 1510, avatar: '🐹', isBot: true },
  { name: 'AI Bot · Koala', difficulty: 'Easy', rating: 1200, avatar: '🐨', isBot: true },
  { name: 'AI Bot · Frog', difficulty: 'Hard', rating: 1650, avatar: '🐸', isBot: true },
  { name: 'AI Bot · Octopus', difficulty: 'Medium', rating: 1480, avatar: '🐙', isBot: true },
  { name: 'AI Bot · Bull', difficulty: 'Hard', rating: 1590, avatar: '🐮', isBot: true },
  { name: 'AI Bot · Wolf', difficulty: 'Medium', rating: 1410, avatar: '🐺', isBot: true },
];

export const TOURNAMENT_TOTAL_MATCHES = 15;
export const TOURNAMENT_QUALIFICATION_TARGET = 12;
export const PRODUCTION_TOURNAMENT_ID = 'weekly_championship_v1';
export const TOURNAMENT_VERSION = '1.0.0';
export const CONFIGURATION_HASH = '9AF31C';
