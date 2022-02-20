const { Discord, Client, MessageEmbed } = require('discord.js');
const client = global.client = new Client({fetchAllMembers: true});
const ayarlar = require('./ayarlar.json');
const fs = require('fs');
const korumalar = require('./Etkinlik/korumalar.json')
const mongoose = require('mongoose');

mongoose.connect(ayarlar.mongoDB, {useNewUrlParser: true, useUnifiedTopology: true});
const Database = require("./Schema/RoleBackup.js");

  client.on("ready", async () => {
    client.user.setPresence({ activity: { name: ayarlar.BotStatus}, status: "dnd" });});

///--------------------------------- Eval ---------------------------------///

client.on("message", async message => {
  if (message.author.bot || !message.guild || !message.content.toLowerCase().startsWith(ayarlar.Prefix)) return;
  if (message.author.id !== ayarlar.Developer && message.author.id !== message.guild.owner.id) return;
  let args = message.content.split(' ').slice(1);
  let command = message.content.split(' ')[0].slice(ayarlar.Prefix.length);
  let embed = new MessageEmbed()
  .setColor(ayarlar.EmbedColor)
  .setAuthor(message.member.displayName, message.author.avatarURL({ dynamic: true, }))
  .setTimestamp();
  
  if (command === "eval" && message.author.id === ayarlar.Developer) {
    if (!args[0]) return message.channel.send(`Kodu belirt.`);
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

if (command === "güvenli") {
    let hedef;
    let rol = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]) || message.guild.roles.cache.find(r => r.name === args.join(" "));
    let uye = message.mentions.users.first() || message.guild.members.cache.get(args[0]);
    if (rol) hedef = rol;
    if (uye) hedef = uye;
    let guvenliler = ayarlar.whitelist || [];
    if (!hedef) return message.channel.send(embed.setDescription(`Güvenli Listeye Eklemek/Kaldırmak İçin \`@snow/ID\` Belirtmelisin.`)
    .addField("Güvenli Liste", guvenliler.length > 0 ? guvenliler.map(g => (message.guild.roles.cache.has(g.slice(1)) || message.guild.members.cache.has(g.slice(1))) ? (message.guild.roles.cache.get(g.slice(1)) || message.guild.members.cache.get(g.slice(1))) : g).join(', ')+"." : "Burası Çok Issız..  "));
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
      message.channel.send(embed.setDescription(`${hedef}, ${message.author} Tarafından Güvenli Listeden \`Eklendi.\``));
    };
  };

  if(command === "restart") {
    message.channel.send("Bot yeniden başlatılıyor").then(msg => {
        console.log("[BOT] Yeniden başlatılıyor");
        process.exit(0);
    });
  };


function guvenli(kisiID) {
  let uye = client.guilds.cache.get(ayarlar.guildID).members.cache.get(kisiID);
  let guvenliler = ayarlar.whitelist || [];
  if (!uye || uye.id === client.user.id || uye.id === ayarlar.Developer || uye.id === uye.guild.owner.id || guvenliler.some(g => uye.id === g.slice(1) || uye.roles.cache.has(g.slice(1)))) return true
  else return false;
};

const yetkiPermleri = ["ADMINISTRATOR", "MANAGE_ROLES", "MANAGE_CHANNELS", "MANAGE_GUILD", "BAN_MEMBERS", "KICK_MEMBERS", "MANAGE_NICKNAMES", "MANAGE_EMOJIS", "MANAGE_WEBHOOKS"];
function cezalandir(kisiID, tur) {
  let uye = client.guilds.cache.get(ayarlar.guildID).members.cache.get(kisiID);
  if (!uye) return;
  if (tur == "jail") return uye.roles.cache.has(ayarlar.boosterRole) ? uye.roles.set([ayarlar.boosterRole, ayarlar.jailRole]) : uye.roles.set([ayarlar.jailRole]);
  if (tur == "ban") return uye.ban({ reason: "snow Koruma" }).catch();
};

///--------------------------------- Rol ---------------------------------///

client.on("guildMemberUpdate", async (oldMember, newMember) => {
  if (newMember.roles.cache.size > oldMember.roles.cache.size) {
    let entry = await newMember.guild.fetchAuditLogs({type: 'MEMBER_ROLE_UPDATE'}).then(audit => audit.entries.first());
    if (!entry || !entry.executor || Date.now()-entry.createdTimestamp > 5000 || guvenli(entry.executor.id) || !korumalar.roleMemberUpdate) return;
    if (yetkiPermleri.some(p => !oldMember.hasPermission(p) && newMember.hasPermission(p))) {
      cezalandir(entry.executor.id, "ban");
      newMember.roles.set(oldMember.roles.cache.map(r => r.id));
      let logKanali = client.channels.cache.find(a => a.name == "guard-log")
      if (logKanali) { logKanali.send(`🛡️ ${newMember} (\`${newMember.id}\`) Adlı kullanıcıya ${entry.executor} (\`${entry.executor.id}\`) Tarafından \`Sağ Tık Rol\` verildi, yetkileri çekildi, @everyone`).catch(); } 
      else { newMember.guild.owner.send(`🛡️ ${newMember} (\`${newMember.id}\`) Adlı kullanıcıya ${entry.executor} (\`${entry.executor.id}\`) Tarafından \`Sağ Tık Rol\` verildi, yetkileri çekildi, @everyone`).catch(err => {}); };
    };
  };
});

client.on("roleCreate", async role => {
  let entry = await role.guild.fetchAuditLogs({type: 'ROLE_CREATE'}).then(audit => audit.entries.first());
  if (!entry || !entry.executor || Date.now()-entry.createdTimestamp > 5000 || guvenli(entry.executor.id) || !korumalar.roleCreate) return;
  role.delete({ reason: "Rol açma koruması." });
  cezalandir(entry.executor.id, "jail");
  let logKanali = client.channels.cache.find(a => a.name == "guard-log");
  if (logKanali) { logKanali.send(`🛡️ ${entry.executor} (\`${entry.executor.id}\`) Adlı kullanıcı tarafından \`Rol\` oluşturuldu, @everyone`).catch(); }
 else { role.guild.owner.send(`🛡️ ${entry.executor} (\`${entry.executor.id}\`) Adlı kullanıcı tarafından \`Rol\` oluşturuldu, @everyone`).catch(err => {}); };
});

client.on("roleUpdate", async (oldRole, newRole) => {
  let entry = await newRole.guild.fetchAuditLogs({type: 'ROLE_UPDATE'}).then(audit => audit.entries.first());
  if (!entry || !entry.executor || !newRole.guild.roles.cache.has(newRole.id) || Date.now()-entry.createdTimestamp > 3000 || guvenli(entry.executor.id) || !korumalar.roleUpdate) return;
  cezalandir(entry.executor.id, "jail");
  if (yetkiPermleri.some(p => !oldRole.permissions.has(p) && newRole.permissions.has(p))) {
    newRole.setPermissions(oldRole.permissions);
    newRole.guild.roles.cache.filter(r => !r.managed && (r.permissions.has("ADMINISTRATOR") || r.permissions.has("MANAGE_ROLES") || r.permissions.has("MANAGE_GUILD"))).forEach(r => r.setPermissions(36818497));
  };
  newRole.edit({
    name: oldRole.name,
    color: oldRole.hexColor,
    hoist: oldRole.hoist,
    permissions: oldRole.permissions,
    mentionable: oldRole.mentionable
  });
  let logKanali = client.channels.cache.find(a => a.name == "guard-log");
  if (logKanali) { logKanali.send(`🛡️ ${entry.executor} (\`${entry.executor.id}\`) adlı kullanıcı \`${oldRole.name}\` adlı rolü \`Güncelledi\`, @everyone`).catch(); } 
  else { newRole.guild.owner.send(`🛡️ ${entry.executor} (\`${entry.executor.id}\`) adlı kullanıcı \`${oldRole.name}\` adlı rolü \`Güncelledi\`, @everyone`).catch(err => {}); };
});


client.on("roleDelete", async role => {
  let entry = await role.guild.fetchAuditLogs({type: 'ROLE_DELETE'}).then(audit => audit.entries.first());
  if (!entry || !entry.executor || Date.now()-entry.createdTimestamp > 5000 || guvenli(entry.executor.id) || !korumalar.roleDelete) return;
  cezalandir(entry.executor.id, "ban");
  let yeniRol = await role.guild.roles.create({
    data: {
      name: role.name,
      color: role.hexColor,
      hoist: role.hoist,
      position: role.position,
      permissions: role.permissions,
      mentionable: role.mentionable
    },
    reason: "Rol Silindiği İçin Tekrar Oluşturuldu!"
  });

  Database.findOne({guildID: role.guild.id, roleID: role.id}, async (err, roleData) => {
    if (!roleData) return;
    setTimeout(() => {
      let kanalPermVeri = roleData.channelOverwrites;
      if (kanalPermVeri) kanalPermVeri.forEach((perm, index) => {
        let kanal = role.guild.channels.cache.get(perm.id);
        if (!kanal) return;
        setTimeout(() => {
          let yeniKanalPermVeri = {};
          perm.allow.forEach(p => {
            yeniKanalPermVeri[p] = true;
          });
          perm.deny.forEach(p => {
            yeniKanalPermVeri[p] = false;
          });
          kanal.createOverwrite(yeniRol, yeniKanalPermVeri).catch(console.error);
        }, index*5000);
      });
    }, 5000);

    let roleMembers = roleData.members;
    roleMembers.forEach((member, index) => {
      let uye = role.guild.members.cache.get(member);
      if (!uye || uye.roles.cache.has(yeniRol.id)) return;
      setTimeout(() => {
        uye.roles.add(yeniRol.id).catch();
      }, index*3000);
    });
  });

  let logKanali = client.channels.cache.find(a => a.name == "guard-log");
  if (logKanali) { logKanali.send(`🛡️ ${entry.executor} (\`${entry.executor.id}\`) Adlı kullanıcı tarafından \`${role.name}\` (\`${role.id}\`) adlı rol \`Silindi\`, @everyone`).catch(); } 
else { role.guild.owner.send(`🛡️ ${entry.executor} (\`${entry.executor.id}\`) Adlı kullanıcı tarafından \`${role.name}\` (\`${role.id}\`) adlı rol \`Silindi\, @everyone\``).catch(err => {}); };
})}),

///--------------------------------- Rol ---------------------------------///

client.on("disconnect", () => console.log("Bot bağlantısı kesildi"))
client.on("reconnecting", () => console.log("Bot tekrar bağlanıyor..."))
client.login(ayarlar.Token).then(x => console.log(`${client.user.tag} Bot Aktif`)).catch(err => console.error(`Bota Giriş Yapılamadı.!\n ∞ Hata : ${err}`))