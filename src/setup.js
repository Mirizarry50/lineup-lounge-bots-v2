import { setupLeagues } from './league-setup.js';
import { ChannelType, PermissionFlagsBits as P } from 'discord.js';
import { SPORTS } from './core.js';
export async function setup(guild, store) {
  await guild.channels.fetch(); await guild.roles.fetch();
  const role = async name => guild.roles.cache.find(r=>r.name===name) ?? await guild.roles.create({name,reason:'F.L.E.A setup'});
  const member = guild.roles.cache.get(store.get('memberRole')) ?? await role('Member');
  const commissioner = guild.roles.cache.get(store.get('adminRole')) ?? await role('Commissioner');
  store.set('memberRole',member.id); store.set('adminRole',commissioner.id);
  const bot = await guild.members.fetchMe();
  const permissions = (privateRoom=false, readonly=false) => [
    {id:guild.id,...(privateRoom?{deny:[P.ViewChannel]}:{allow:[P.ViewChannel,P.ReadMessageHistory,...(!readonly?[P.SendMessages,P.AttachFiles,P.EmbedLinks,P.AddReactions,P.CreatePublicThreads,P.SendMessagesInThreads,P.UseApplicationCommands]:[])],deny:readonly?[P.SendMessages,P.CreatePublicThreads,P.CreatePrivateThreads,P.SendMessagesInThreads,P.UseApplicationCommands]:[]})},
    {id:commissioner.id,allow:[P.ViewChannel,P.SendMessages,P.ReadMessageHistory,P.UseApplicationCommands]},
    {id:bot.id,allow:[P.ViewChannel,P.SendMessages,P.EmbedLinks,P.ReadMessageHistory,P.CreatePublicThreads,P.SendMessagesInThreads]},
    ...(!privateRoom?[{id:member.id,allow:[P.ViewChannel,P.ReadMessageHistory,...(!readonly?[P.SendMessages,P.CreatePublicThreads,P.SendMessagesInThreads,P.UseApplicationCommands]:[])],deny:readonly?[P.SendMessages,P.CreatePublicThreads,P.UseApplicationCommands]:[]}]:[])
  ];
  async function channel(name,type,parent=null,privateRoom=false,readonly=false) {
    const existing = guild.channels.cache.find(c=>(c.name===name || c.name===`F.L.E.A ${name}`) && c.type===type && c.parentId===parent);
    if (existing) { await existing.permissionOverwrites.set(permissions(privateRoom,readonly)); return existing; }
    return guild.channels.create({name,type,parent,permissionOverwrites:permissions(privateRoom,readonly),reason:'F.L.E.A setup'});
  }
  const community = await channel('COMMUNITY',ChannelType.GuildCategory);
  await channel('welcome-and-rules',ChannelType.GuildText,community.id,false,true);
  await channel('announcements',ChannelType.GuildText,community.id,false,true);
  await channel('general-chat',ChannelType.GuildText,community.id);
  const winnings = await channel('winning-tickets',ChannelType.GuildText,community.id);
  for (const roleId of [member.id,commissioner.id]) {
    await winnings.permissionOverwrites.edit(roleId, { AttachFiles: true, EmbedLinks: true, AddReactions: true });
  }
  await winnings.setTopic('Share your winning tickets, screenshots, and celebrations across all sports.');
  for (const category of ['NFL','NCAA','MLB']) {
    const parent = await channel(category,ChannelType.GuildCategory);
    for (const [sport,s] of Object.entries(SPORTS).filter(([,s])=>s.category===category)) {
      const feed = await channel(`${sport}-news-and-analysis`,ChannelType.GuildText,parent.id,false,true);
      const chat = await channel(`${sport}-bet-discussion`,ChannelType.GuildText,parent.id);
      store.set(`channels:${sport}`,{feed:feed.id,chat:chat.id});
    }
  }
  const admin = await channel('COMMISSIONER',ChannelType.GuildCategory,null,true);
  const alerts = await channel('bot-controls-and-alerts',ChannelType.GuildText,admin.id,true);
  store.set('alerts',alerts.id);
  await setupLeagues(guild,store);
  return 'Channels and roles are ready. Assign Member for general access; Stache or F.L.E.A for private league access; Commissioner for trusted admins. /feed enables scheduled posts per sport.';
}
