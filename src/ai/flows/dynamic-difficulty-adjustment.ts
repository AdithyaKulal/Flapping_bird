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
  score: z.number().describe('The player\'s current score.'),
  pipesPassed: z.number().describe('The number of pipes the player has successfully passed.'),
  gamesPlayed: z.number().describe('The total number of games the player has played.'),
  highScore: z.number().describe('The player\'s current high score.'),
});

export type AdjustDifficultyInput = z.infer<typeof AdjustDifficultyInputSchema>;

const AdjustDifficultyOutputSchema = z.object({
  gameSpeedMultiplier: z.number().describe('The multiplier for the game speed (e.g., 1.0 for normal, 1.2 for faster).'),
  pipeGapSize: z.number().describe('The size of the gap between the pipes (in pixels).'),
  pipeSpawnRate: z.number().describe('The rate at which new pipes are spawned (in milliseconds).'),
  difficultyLevel: z.string().describe('The current difficulty level (e.g., easy, medium, hard).'),
});

export type AdjustDifficultyOutput = z.infer<typeof AdjustDifficultyOutputSchema>;

export async function adjustDifficulty(input: AdjustDifficultyInput): Promise<AdjustDifficultyOutput> {
  return adjustDifficultyFlow(input);
}

const adjustDifficultyPrompt = ai.definePrompt({
  name: 'adjustDifficultyPrompt',
  input: {schema: AdjustDifficultyInputSchema},
  output: {schema: AdjustDifficultyOutputSchema},
  prompt: `You are an AI game difficulty adjuster for the Sky Flap game.  Based on the player's performance, you will suggest new game parameters to make the game more or less challenging.

Here's the player's current performance:

Score: {{{score}}}
Pipes Passed: {{{pipesPassed}}}
Games Played: {{{gamesPlayed}}}
High Score: {{{highScore}}}

Based on this information, suggest the following game parameters to dynamically adjust the difficulty:

*   gameSpeedMultiplier: A number representing the multiplier for the game speed. Higher values make the game faster.
*   pipeGapSize: A number representing the size of the gap between the pipes. Smaller values make the game harder.
*   pipeSpawnRate: A number representing the rate at which new pipes are spawned. Lower values make the game harder.
*   difficultyLevel: A string describing the difficulty level ('easy', 'medium', or 'hard').

Consider the following:

*   If the player's score is close to their high score, increase the gameSpeedMultiplier and decrease the pipeGapSize.
*   If the player is consistently passing many pipes, decrease the pipeSpawnRate.
*   If the player is new to the game (low gamesPlayed), keep the difficulty at an easier level.

Output the parameters as a valid JSON object.
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
