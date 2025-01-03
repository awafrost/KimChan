import { EventLogConfig } from '@models';
import { DiscordEventBuilder } from '@modules/events';
import { channelField, scheduleField, userField } from '@modules/fields';
import { createAttachment, getSendableChannel } from '@modules/util';
import {
  AuditLogEvent,
  Collection,
  Colors,
  EmbedBuilder,
  Events,
} from 'discord.js';
import type { GuildAuditLogsEntry, Message } from 'discord.js';

const lastLogs = new Collection<
  string,
  GuildAuditLogsEntry<AuditLogEvent.MessageDelete>
>();

export default new DiscordEventBuilder({
  type: Events.MessageDelete,
  async execute(message) {
    if (!message.inGuild() || message.author.bot) return; // Check if the message author is a bot
    const log = await getAuditLog(message);
    const executor = await log?.executor?.fetch().catch(() => null);
    const beforeMsg = await message.channel.messages
      .fetch({ before: message.id, limit: 1 })
      .then((v) => v.first())
      .catch(() => null);

    const { messageDelete: setting } =
      (await EventLogConfig.findOne({ guildId: message.guild.id })) ?? {};
    if (!(setting?.enabled && setting.channel)) return;
    const channel = await getSendableChannel(
      message.guild,
      setting.channel,
    ).catch(() => {
      EventLogConfig.updateOne(
        { guildId: message.guild.id },
        { $set: { messageDelete: { enabled: false, channel: null } } },
      );
    });
    if (!channel) return;
    const embed = new EmbedBuilder()
      .setTitle('`💬` Message Deleted')
      .setURL(beforeMsg?.url ?? null)
      .setDescription(
        [
          channelField(message.channel),
          userField(message.author, { label: 'Sender' }),
          userField(executor ?? message.author, { label: 'Deleter' }),
          scheduleField(message.createdAt, { label: 'Sent Time' }),
        ].join('\n'),
      )
      .setFields({
        name: 'Message',
        value: message.content || 'None',
      })
      .setColor(Colors.White)
      .setThumbnail(message.author.displayAvatarURL())
      .setTimestamp();

    if (message.stickers.size) {
      embed.addFields({
        name: 'Stickers',
        value: message.stickers.map((v) => v.name).join('\n'),
      });
    }
    const attachment = await createAttachment(message.attachments);
    if (attachment) {
      channel.send({ embeds: [embed], files: [attachment] });
    } else {
      channel.send({ embeds: [embed] });
    }
  },
});

async function getAuditLog(message: Message<true>) {
  if (!message.inGuild()) return;
  const entry = await message.guild
    .fetchAuditLogs({
      type: AuditLogEvent.MessageDelete,
      limit: 3,
    })
    .then((v) =>
      v.entries.find(
        (e) =>
          e.target.equals(message.author) &&
          e.extra.channel.id === message.channel.id,
      ),
    );
  const lastLog = lastLogs.get(message.guild.id);
  if (
    entry &&
    !(lastLog?.id === entry.id && lastLog.extra.count >= entry.extra.count)
  ) {
    lastLogs.set(message.guild.id, entry);
    return entry;
  }
}