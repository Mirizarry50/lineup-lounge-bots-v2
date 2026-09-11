export const PROP_CATEGORIES={nfl:{passing:'Passing',rushing:'Rushing',receiving:'Receiving',touchdowns:'Anytime touchdowns'},cfb:{passing:'Passing',rushing:'Rushing',receiving:'Receiving',touchdowns:'Anytime touchdowns'},nba:{points:'Points',rebounds:'Rebounds',assists:'Assists'},cbb:{points:'Points',rebounds:'Rebounds',assists:'Assists'},mlb:{hits:'Hits',home_runs:'Home runs',strikeouts:'Pitcher strikeouts'},nhl:{shots:'Shots on goal',points:'Points',assists:'Assists'}};
export async function mixedPool(slate,sport,categories,filter={}){
 const allowed=PROP_CATEGORIES[sport];const selected=[...new Set(categories)];
 if(!allowed||!selected.length||selected.some(c=>!Object.hasOwn(allowed,c)))throw Error('Choose supported categories for this sport.');
 const rows=[],coverage=[];
 for(const category of selected){const r=await slate(sport,category,filter);const candidates=r.rows.filter(q=>category!=='touchdowns'||q.name.toLowerCase()==='yes');rows.push(...candidates.map(q=>({...q,category})));coverage.push({category,games:r.games,covered:r.covered,failures:r.failures.length,selections:candidates.length});}
 return {rows:[...new Map(rows.map(q=>[q.id,q])).values()],categories:selected,coverage};
}
