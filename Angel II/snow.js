const { Discord, Client, MessageEmbed } = require('discord.js');
const client = global.client = new Client({fetchAllMembers: true});
const korumalar = require('./Etkinlik/korumalar.json')
const ayarlar = require('./ayarlar.json');
const fs = require('fs');
const { type } = require('os');

client.on("ready", async () => {
  client.user.setPresence({ activity: { name: ayarlar.BotStatus}, status: "dnd" });});
  

client.on("message", async message => {
  if (message.author.bot || !message.guild || !message.content.toLowerCase().startsWith(ayarlar.Prefix)) return;
  if (message.author.id !== ayarlar.Developer && message.author.id !== message.guild.owner.id) return;
  let args = message.content.split(' ').slice(1);
  let command = message.content.split(' ')[0].slice(ayarlar.Prefix.length);
  let embed = new MessageEmbed().setColor(ayarlar.EmbedRenk).setAuthor(message.member.displayName, message.author.avatarURL({ dynamic: true, })).setTimestamp();

///--------------------------------- Eval ---------------------------------///

  if (command === "eval" && message.author.id === ayarlar.Developer) {
    if (!args[0]) return message.channel.send(`Kodu Belirtmelisin!`);
      let code = args.join(' ');
      function clean(text) {
      if (typeof text !== 'string') text = require('util').inspect(text, { depth: 0 })
      text = text.replace(/`/g, '`' + String.fromCharCode(8203)).replace(/@/g, '@' + String.fromCharCode(8203))
      return text;
    };
    try { 
      var evaled = clean(await eval(code));
      if(evaled.match(new RegExp(`${client.token}`, 'g'))) evaled.replace(client.token, "Yasaklı komut");
      message.channel.send(`${evaled.replace(client.token, "Yasaklı komut")}`, {code: "js", split: true});
    } catch(err) { message.channel.send(err, {code: "js", split: true}) };
  };
///--------------------------------- Eval ---------------------------------///

  if(command === "restart") {
    message.channel.send("Bot yeniden başlatılıyor").then(msg => {
        console.log("[BOT] Yeniden başlatılıyor");
        process.exit(0);
    });
  
  };

    if(command === "güvenli") {
    let hedef;
    let rol = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]) || message.guild.roles.cache.find(r => r.name === args.join(" "));
    let uye = message.mentions.users.first() || message.guild.members.cache.get(args[0]);
    if (rol) hedef = rol;
    if (uye) hedef = uye;
    let guvenliler = ayarlar.whitelist || [];
    if (!hedef) return message.channel.send(embed
    .setDescription(`Güvenli Listeye Eklemek/Kaldırmak İçin \`@snow/ID\` Belirtmelisin.`));
    if (guvenliler.some(g => g.includes(hedef.id))) {
      guvenliler = guvenliler.filter(g => !g.includes(hedef.id));
      ayarlar.whitelist = guvenliler;
      fs.writeFile("./ayarlar.json", JSON.stringify(ayarlar), (err) => {
        if (err) console.log(err);
      });
      message.channel.send(embed.setDescription(`${hedef}, ${message.author} Tarafından Güvenli Listeden \`Çıkarıldı.\``));
    } else {
      ayarlar.whitelist.push(`y${hedef.id}`);
      fs.writeFile("./ayarlar.json", JSON.stringify(ayarlar), (err) => {
        if (err) console.log(err);
      });
      message.channel.send(embed.setDescription(`${hedef}, ${message.author} Tarafından Güvenli Listeye \`Eklendi.\``));
    };
  };
});

function guvenli(kisiID) {
    let uye = client.guilds.cache.get(ayarlar.guildID).members.cache.get(kisiID);
  let guvenliler = ayarlar.whitelist || [];
  if (!uye || uye.id === client.user.id || uye.id === ayarlar.Developer || uye.id === uye.guild.owner.id || guvenliler.some(g => uye.id === g.slice(1) || uye.roles.cache.has(g.slice(1)))) return true
  else return false;
};

function cezalandir(kisiID, tur) {
  let uye = client.guilds.cache.get(ayarlar.guildID).members.cache.get(kisiID);
  if (!uye) return;
  if (tur == "jail") return uye.roles.cache.has(ayarlar.boosterRole) ? uye.roles.set([ayarlar.boosterRole, ayarlar.jailRole]) : uye.roles.set([ayarlar.jailRole]);
  if (tur == "ban") return uye.ban({ reason: "snow Koruma Sistemi" }).catch();
};

///--------------------------------- Kanal ---------------------------------///

client.on("channelCreate", async channel => {
  let entry = await channel.guild.fetchAuditLogs({type: 'CHANNEL_CREATE'}).then(audit => audit.entries.first());
  if (!entry || !entry.executor || Date.now()-entry.createdTimestamp > 3000 || guvenli(entry.executor.id) || !korumalar.channelCreate) return;
  channel.delete({reason: "Kanal Açma Koruması"});
  cezalandir(entry.executor.id, "jail");
  let logKanali = client.channels.cache.find(a => a.name == "guard-log")
  if (logKanali) { logKanali.send(`🛡️ ${entry.executor} (\`${entry.executor.id}\`) adlı kullanıcı tarafından yeni bir \`Kanal\` oluşturuldu, @everyone`).catch(); } 
  else { channel.guild.owner.send(`🛡️ ${entry.executor} (\`${entry.executor.id}\`) adlı kullanıcı tarafından yeni bir \`Kanal\` oluşturuldu, @everyone `).catch(err => {}); };
});

client.on("channelUpdate", async (oldChannel, newChannel) => {
  let entry = await newChannel.guild.fetchAuditLogs({type: 'CHANNEL_UPDATE'}).then(audit => audit.entries.first());
  if (!entry || !entry.executor || !newChannel.guild.channels.cache.has(newChannel.id) || Date.now()-entry.createdTimestamp > 3000 || guvenli(entry.executor.id) || !korumalar.channelUpdate) return;
  cezalandir(entry.executor.id, "jail");
  if (newChannel.type !== "category" && newChannel.parentID !== oldChannel.parentID) newChannel.setParent(oldChannel.parentID);
  if (newChannel.type === "category") {
    newChannel.edit({
      name: oldChannel.name,
    });
  } else if (newChannel.type === "text") {
    newChannel.edit({
      name: oldChannel.name,
      topic: oldChannel.topic,
      nsfw: oldChannel.nsfw,
      rateLimitPerUser: oldChannel.rateLimitPerUser
    });
  } else if (newChannel.type === "voice") {
    newChannel.edit({
      name: oldChannel.name,
      bitrate: oldChannel.bitrate,
      userLimit: oldChannel.userLimit,
    });
  };
  oldChannel.permissionOverwrites.forEach(perm => {
    let thisPermOverwrites = {};
    perm.allow.toArray().forEach(p => {
      thisPermOverwrites[p] = true;
    });
    perm.deny.toArray().forEach(p => {
      thisPermOverwrites[p] = false;
    });
    newChannel.createOverwrite(perm.id, thisPermOverwrites);
  });
  let logKanali = client.channels.cache.find(a => a.name == "guard-log");
  if (!logKanali) return console.log('Guard Logu Bulunamadı.');
  if (logKanali) { logKanali.send(`🛡️ ${entry.executor} (\`${entry.executor.id}\`) adlı kullanıcı \`${oldChannel.name}\` adlı kanalı \`Güncelledi\, @everyone`).catch(); } 
 else { newChannel.guild.owner.send(`🛡️ ${entry.executor} (\`${entry.executor.id}\`) adlı kullanıcı \`${oldChannel.name}\` adlı kanalı \`Güncelledi\`, @everyone`).catch(err => {}); };
});

client.on("channelDelete", async channel => {
  let entry = await channel.guild.fetchAuditLogs({type: 'CHANNEL_DELETE'}).then(audit => audit.entries.first());
  if (!entry || !entry.executor || Date.now()-entry.createdTimestamp > 3000 || guvenli(entry.executor.id) || !korumalar.channelDelete) return;
  cezalandir(entry.executor.id, "ban");
  await channel.clone({ reason: "snow Kanal Silme Koruması" }).then(async kanal => {
    if (channel.parentID != null) await kanal.setParent(channel.parentID);
    await kanal.setPosition(channel.position);
    if (channel.type == "category") await channel.guild.channels.cache.filter(k => k.parentID == channel.id).forEach(x => x.setParent(kanal.id));});
    let logKanali = client.channels.cache.find(a => a.name == "guard-log");
    if (!logKanali) return console.log('Guard Logu Bulunamadı.');
  if (logKanali) { logKanali.send(`🛡️ ${entry.executor} (\`${entry.executor.id}\`) adlı kullanıcı tarafından \`${channel.name}\` adlı kanalı \`Sildi\`, @everyone`).catch()} 
  else { channel.guild.owner.send(`🛡️ ${entry.executor} (\`${entry.executor.id}\`) adlı kullanıcı tarafından \`${channel.name}\` adlı kanalı \`Sildi\`, @everyone`).catch(err => {}); };
});

///--------------------------------- Kanal ---------------------------------///

///--------------------------------- Url ---------------------------------///

client.on('guildUpdate', async (oldGuild, newGuild) => {
  if (oldGuild.vanityURLCode === newGuild.vanityURLCode) return;
  let entry = await newGuild.fetchAuditLogs({
      type: 'GUILD_UPDATE'
  }).then(audit => audit.entries.first());
  if (!entry || !entry.executor || guvenli(entry.executor.id) || !korumalar.Vanity_Guard) return;
  let channel = client.channels.cache.find(a => a.name == "guard-log");
  if (channel) channel.send(`️ ${entry.executor} ${entry.executor.id} Sunucunun Özel URL'sini değişti, @everyone`)
  if (!channel) newGuild.owner.send(`🛡️ ${entry.executor} ${entry.executor.id} Sunucunun Özel URL'sini değişti, @everyone`)
  newGuild.members.ban(entry.executor.id, {
      reason: `Url Guard | snow.`
  });
  const settings = {
      url: `https://discord.com/api/v6/guilds/${newGuild.id}/vanity-url`,
      body: {
          code: ayarlar.Vanity_URL
      },
      json: true,
      method: 'PATCH',
      headers: {
          "Authorization": `Bot ${ayarlar.Token}`
      }
  };
  request(settings, (err, res, body) => {
      if (err) {
          return console.log(err);
      }
  });
});

///--------------------------------- Url ---------------------------------///


client.on("disconnect", () => console.log("Bot bağlantısı kesildi"))
client.on("reconnecting", () => console.log("Bot tekrar bağlanıyor..."))
client.login(ayarlar.Token).then(x => console.log(`${client.user.tag} Bot Aktif`)).catch(err => console.error(`Bota Giriş Yapılamadı.!\n ∞ Hata : ${err}`))