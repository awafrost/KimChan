import { SelectMenu, SelectMenuType } from '@akki256/discord-interaction';
import { PermissionFlagsBits } from 'discord.js';

const select = new SelectMenu(
  {
    customId: 'kaori-js:manageComponents-delete',
    type: SelectMenuType.String,
  },
  async (interaction) => {
    if (!interaction.inCachedGuild() || !interaction.channel) return;

    if (
      !interaction.guild.members.me?.permissions.has(
        PermissionFlagsBits.ManageWebhooks,
      )
    )
      return interaction.reply({
        content:
          '`❌` You need to give the bot `Manage Webhooks` permission to use this feature.',
        ephemeral: true,
      });

    const targetId =
      interaction.message.embeds[0].footer?.text.match(/[0-9]{18,19}/)?.[0];
    if (!targetId) return;
    const targetMessage = await (await interaction.channel.fetch()).messages
      .fetch(targetId)
      .catch(() => undefined);

    if (!targetMessage)
      return interaction.reply({
        content: '`❌` There was an issue fetching the message.',
        ephemeral: true,
      });

    const webhook = await targetMessage.fetchWebhook().catch(() => null);
    if (!webhook || interaction.client.user.id !== webhook.owner?.id)
      return interaction.reply({
        content: '`❌` This message cannot be updated.',
        ephemeral: true,
      });

    await interaction.update({
      content: '`⌛` Deleting components...',
      embeds: [],
      components: [],
    });

    const deleteIndex = interaction.values;
    const components = targetMessage.components;

    webhook
      .editMessage(targetMessage, {
        components: components.filter(
          (v, index) => !deleteIndex.includes(String(index)),
        ),
      })
      .then(() => interaction.editReply('`✅` Components have been deleted.'))
      .catch(() =>
        interaction.editReply('`❌` Failed to delete components.'),
      );
  },
);

module.exports = [select];