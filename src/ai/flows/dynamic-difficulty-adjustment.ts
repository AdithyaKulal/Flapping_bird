'use server';

/**
 * @fileOverview Adjusts the game difficulty dynamically based on player performance.
 *
 * - adjustDifficulty - A function that adjusts the game difficulty.
 * - AdjustDifficultyInput - The input type for the adjustDifficulty function.
 * - AdjustDifficultyOutput - The return type for the adjustDifficulty function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AdjustDifficultyInputSchema = z.object({
  score: z.number().describe("The player's current score."),
  pipesPassed: z.number().describe('The number of pipes the player has successfully passed.'),
  gamesPlayed: z.number().describe('The total number of games the player has played.'),
  highScore: z.number().describe("The player's current high score."),
});

export type AdjustDifficultyInput = z.infer<typeof AdjustDifficultyInputSchema>;

const AdjustDifficultyOutputSchema = z.object({
  gameSpeedMultiplier: z.number().min(1.0).max(3.0).describe('The multiplier for the game speed (e.g., 1.0 for normal, 1.5 for faster).'),
  pipeGapSize: z.number().min(150).max(250).describe('The size of the gap between the pipes (in pixels).'),
  pipeSpawnRate: z.number().min(1200).max(2200).describe('The rate at which new pipes are spawned (in milliseconds).'),
  difficultyLevel: z.enum(['easy', 'medium', 'hard']).describe("The current difficulty level (e.g., easy, medium, hard)."),
});

export type AdjustDifficultyOutput = z.infer<typeof AdjustDifficultyOutputSchema>;

export async function adjustDifficulty(input: AdjustDifficultyInput): Promise<AdjustDifficultyOutput> {
  return adjustDifficultyFlow(input);
}

const adjustDifficultyPrompt = ai.definePrompt({
  name: 'adjustDifficultyPrompt',
  input: {schema: AdjustDifficultyInputSchema},
  output: {schema: AdjustDifficultyOutputSchema},
  prompt: `You are an AI game difficulty adjuster for the Sky Flap game. Your goal is to create a challenging but fair experience. Based on the player's performance, you will suggest new game parameters.

Player Performance:
- Score: {{{score}}}
- Pipes Passed: {{{pipesPassed}}}
- Games Played: {{{gamesPlayed}}}
- High Score: {{{highScore}}}

Game Parameters to Adjust:
- gameSpeedMultiplier: Controls how fast pipes move. Range: 1.0 (slow) to 3.0 (very fast).
- pipeGapSize: The vertical space between pipes. Range: 150 (hard) to 250 (easy).
- pipeSpawnRate: How often new pipes appear. Range: 1200ms (hard) to 2200ms (easy).
- difficultyLevel: A label for the current difficulty ('easy', 'medium', 'hard').

Rules for Adjustment:
1.  **New Players (gamesPlayed < 5):** Keep it 'easy'. Set gameSpeedMultiplier around 1.5, pipeGapSize around 220, and pipeSpawnRate around 1800.
2.  **Good Performance (score is near or above highScore):** Increase the challenge. Slightly increase gameSpeedMultiplier, and slightly decrease pipeGapSize and pipeSpawnRate.
3.  **Struggling (score is very low, e.g., < 5):** Decrease the challenge. Slightly decrease gameSpeedMultiplier, and slightly increase pipeGapSize and pipeSpawnRate.
4.  **Incremental Changes:** Make small, gradual changes. Avoid drastic jumps in difficulty. For example, change gameSpeedMultiplier by 0.1 or 0.2 at a time.
5.  **Correlate Parameters:** Ensure the parameters make sense together. A 'hard' level should have a high speed, small gap, and fast spawn rate.

Based on the rules and the player's performance, provide the new set of game parameters as a valid JSON object.
`,config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
  },
});

const adjustDifficultyFlow = ai.defineFlow(
  {
    name: 'adjustDifficultyFlow',
    inputSchema: AdjustDifficultyInputSchema,
    outputSchema: AdjustDifficultyOutputSchema,
  },
  async input => {
    const {output} = await adjustDifficultyPrompt(input);
    return output!;
  }
);
