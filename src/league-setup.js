import { ChannelType, PermissionFlagsBits as P } from 'discord.js';

export async function setupLeagues(guild, store) {
  await guild.channels.fetch();
  await guild.roles.fetch();
  const bot = await guild.members.fetchMe();
  const commissioner = store.get('adminRole');
  if (!commissioner) throw new Error('Commissioner role is not configured');
  const result = [];
  for (const [key, name, roleName] of [
    ['moustache', 'MOUSTACHE BETS', 'Stache'],
    ['flea', 'F.L.E.A MEMBERS', 'F.L.E.A']
  ]) {
    const role = guild.roles.cache.get(store.get(`league:${key}:role`))
      ?? guild.roles.cache.find(r => r.name === roleName)
      ?? await guild.roles.create({name: roleName, reason: 'Private fantasy league access'});
    store.set(`league:${key}:role`, role.id);
    const allow = [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.AttachFiles, P.EmbedLinks, P.AddReactions, P.UseApplicationCommands];
    const overwrites = [
      {id: guild.id, deny: [P.ViewChannel]},
      ...[role.id, commissioner, bot.id].map(id => ({id, allow}))
    ];
    let category = guild.channels.cache.get(store.get(`league:${key}:category`))
      ?? guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === name);
    if (!category) category = await guild.channels.create({name, type: ChannelType.GuildCategory, permissionOverwrites: overwrites});
    else await category.permissionOverwrites.set(overwrites);
    store.set(`league:${key}:category`, category.id);
    for (const [channelName, topic] of [
      ['parlay-picks', 'Share proposed picks and supporting research for your fantasy league.'],
      ['group-parlay-upload', 'Upload the league suggested parlay ticket or screenshot. Each member independently decides whether to place their own wager; no pooled funds. Hide personal account details.'],
      ['general-discussion', 'Private fantasy league discussion, matchups, planning, and results.']
    ]) {
      let channel = guild.channels.cache.find(c => c.parentId === category.id && c.name === channelName);
      if (!channel) channel = await guild.channels.create({name: channelName, type: ChannelType.GuildText, parent: category.id, topic, permissionOverwrites: overwrites});
      else { await channel.permissionOverwrites.set(overwrites); await channel.setTopic(topic); }
      store.set(`league:${key}:${channelName}`, channel.id);
    }
    result.push({key, category: category.id, role: role.id});
  }
  // Keep both league sections together, before commissioner controls.
  const categories = [...guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).values()]
    .sort((a,b) => a.position-b.position).filter(c => !result.some(r => r.category === c.id));
  const adminIndex = categories.findIndex(c => ['COMMISSIONER', 'F.L.E.A COMMISSIONER'].includes(c.name));
  categories.splice(adminIndex < 0 ? categories.length : adminIndex, 0, ...result.map(r => guild.channels.cache.get(r.category)));
  await guild.channels.setPositions(categories.map((c, position) => ({channel: c.id, position})));
  return result;
}
