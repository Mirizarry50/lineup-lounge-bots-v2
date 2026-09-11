export function easternDay(value=Date.now()){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));}
export function exactDay(input,now=Date.now()){
 let day=String(input||'today').trim().toLowerCase();if(day==='today')return easternDay(now);
 const us=day.match(/^(\d{2})[-/](\d{2})[-/](\d{2}|\d{4})$/);if(us)day=`${us[3].length===2?'20'+us[3]:us[3]}-${us[1]}-${us[2]}`;
 const t=Date.parse(day+'T12:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(t)||new Date(t).toISOString().slice(0,10)!==day)throw Error('Use today or a valid YYYY-MM-DD date (Eastern time).');return day;
}
