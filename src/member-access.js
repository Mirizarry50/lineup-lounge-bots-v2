import { Routes } from 'discord.js';

export function memberAccess(client, store, guildId) {
  let syncing = false;
  async function assign(member) {
    if (member.user?.bot || member.pending) return;
    const role = store.get('memberRole');
    if (!role) throw new Error('Member role is missing');
    const roles = Array.isArray(member.roles) ? member.roles : [...member.roles.cache.keys()];
    if (!roles.includes(role)) await client.rest.put(Routes.guildMemberRole(guildId, member.user.id, role), {reason: 'Automatic community Member access'});
  }
  const onMember = member => {
    if (member.guild.id === guildId) assign(member).catch(() => console.error('Automatic Member assignment failed; reconciliation will retry.'));
  };
  client.on('guildMemberAdd', onMember);
  client.on('guildMemberUpdate', (_old, member) => onMember(member));
  async function reconcile() {
    if (syncing || !client.isReady()) return;
    syncing = true;
    try {
      let after;
      do {
        const query = new URLSearchParams({limit: '1000', ...(after ? {after} : {})});
        const members = await client.rest.get(Routes.guildMembers(guildId), {query});
        for (const member of members) await assign(member);
        after = members.length === 1000 ? members.at(-1).user.id : null;
      } while (after);
      console.log('Community Member roles reconciled.');
    } catch { console.error('Member role reconciliation failed; check member intent and role permissions.'); }
    finally { syncing = false; }
  }
  client.once('clientReady', reconcile);
  const timer = setInterval(reconcile, 5 * 60_000);
  timer.unref();
  return () => clearInterval(timer);
}
