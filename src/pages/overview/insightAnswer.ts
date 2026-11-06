import type { Insight } from './insights'

export const SUGGESTIONS = [
  'Summarise this page in 3 points',
  'What needs attention, and why?',
  'Which questions should I take to the teams?',
]

const COACHING = /\b(teams?|questions?|ask|coach\w*|conversations?)\b/i

/** Example answer built from the insight rules. Never calls a model. */
export function answerFor(question: string, insights: Insight[], scope: string, period: number): string {
  if (COACHING.test(question)) {
    if (!insights.length) return `For ${scope} over the last ${period} days there are no coaching prompts to suggest.`
    return insights.slice(0, 5).map((i) => `• ${i.title.split(':')[0]}: ${i.prompt}`).join('\n')
  }
  const needAttention = insights.filter((i) => i.tone === 'attention').length
  const head = `For ${scope} over the last ${period} days, ${needAttention} ${needAttention === 1 ? 'signal needs' : 'signals need'} attention.`
  if (!insights.length) return `${head} No other signals this period.`
  return [`${head} The main points:`, ...insights.slice(0, 3).map((i) => `• ${i.title}. ${i.body}`)].join('\n')
}
