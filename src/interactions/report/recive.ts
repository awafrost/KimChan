import { Button, Modal } from '@akki256/discord-interaction';
import { blurple } from '@const/emojis';
import { userField } from '@modules/fields';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  ComponentType,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  formatEmoji,
} from 'discord.js';

const considerButton = new Button(
  { customId: 'kaori:report-consider' },
  (interaction) => {
    const embed = interaction.message.embeds[0];
    interaction.update({
      embeds: [
        EmbedBuilder.from(embed)
          .setDescription(
            [
              `${embed.description}`,
              userField(interaction.user, {
                color: 'blurple',
                label: 'Handler',
              }),
            ].join('\n'),
          )
          .setColor('Yellow'),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>().setComponents(
          new ButtonBuilder()
            .setCustomId('kaori:report-completed')
            .setLabel('Mark as Resolved')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('kaori:report-ignore')
            .setLabel('Ignore')
            .setStyle(ButtonStyle.Danger),
        ),
      ],
    });
  },
);

const actionButton = new Button(
  { customId: /^kaori:report-(completed|ignore)$/ },
  (interaction): void => {
    const isCompleteButton =
      interaction.customId.replace('kaori:report-', '') === 'completed';

    interaction.showModal(
      new ModalBuilder()
        .setCustomId('kaori:report-actionModal')
        .setTitle(`${isCompleteButton ? 'Mark as Resolved' : 'Mark as Ignored'}`)
        .setComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId(isCompleteButton ? 'action' : 'reason')
              .setLabel(
                isCompleteButton
                  ? 'Actions Taken / Punishment'
                  : 'Reason for No Action',
              )
              .setMaxLength(100)
              .setStyle(TextInputStyle.Short),
          ),
        ),
    );
  },
);

const actionModal = new Modal(
  { customId: 'kaori:report-actionModal' },
  async (interaction) => {
    if (
      !interaction.isFromMessage() ||
      interaction.components[0].components[0].type !== ComponentType.TextInput
    )
      return;

    const embed = interaction.message.embeds[0];
    const isAction =
      interaction.components[0].components[0].customId === 'action';
    const categoryValue = interaction.components[0].components[0].value;

    await interaction.update({
      embeds: [
        EmbedBuilder.from(interaction.message.embeds[0])
          .setTitle(`${embed.title} ${isAction ? '[Resolved]' : '[No Action]'}`)
          .setDescription(
            [
              `${embed.description}`,
              `${formatEmoji(blurple.admin)} **${
                isAction ? 'Actions Taken' : 'Reason for No Action'
              }:** ${categoryValue}`,
            ].join('\n'),
          )
          .setColor(isAction ? Colors.Green : Colors.Red),
      ],
      components: [],
    });

    if (interaction.message.hasThread)
      await interaction.message.thread?.setLocked(true).catch(() => {});
  },
);

export default [actionButton, actionModal, considerButton];