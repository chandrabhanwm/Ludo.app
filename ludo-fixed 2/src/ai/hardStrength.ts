/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * TournamentHardStrength is the master balancing control for tournament difficulty.
 * 100 = Current Hard AI (Standard performance)
 * 105 = Slightly stronger
 * 110 = Stronger
 * 115 = Very strong
 * 120 = Maximum recommended strength
 * 
 * Future balancing after launch is as simple as adjusting this single number.
 */
export let TournamentHardStrength = 100;

export function setTournamentHardStrength(strength: number) {
  TournamentHardStrength = strength;
}
