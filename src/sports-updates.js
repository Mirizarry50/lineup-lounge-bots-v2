// Filter publisher metadata; never turn a headline into an inferred medical status.
export function updateCategory(title, description = '') {
  const text = `${title ?? ''} ${description ?? ''}`.replace(/<[^>]*>/g, ' ');
  if (/\b(injur\w*|questionable|doubtful|ruled out|concussion\w*|hamstring|sprain\w*|fractur\w*|torn|surgery|surgeries|injured list|disabled list|limited practice|practice participation|did not practice|full participant|game[- ]time decision|cleared to play|return to (?:practice|lineup)|will miss|sidelined)\b/i.test(text)) return 'Injury / availability';
  if (/\b(?:\d+(?:\.\d+)?\s*(?:%|percent|yards?|points?|rebounds?|assists?|strikeouts?|home runs?|touchdowns?|hits?|innings?|sacks?)|(?:ERA|OPS|WHIP|batting average|completion percentage|passer rating|shooting percentage)\s*(?:of\s*)?\d*\.\d+)\b/i.test(text)) return 'Published stats';
  return null;
}
