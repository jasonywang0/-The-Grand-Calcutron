import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { CommandClass } from '../../structures/command.js';
import User from '../../db/models/user.model.js';
import getCubeMeta from '../../misc/helpers/dom-parser.js';

export default new CommandClass({
    data: new SlashCommandBuilder()
        .setName('cube')
        .setDescription('Level Info')
        .addSubcommand(subcommand => 
          subcommand
            .setName('get')
            .setDescription('Get a user\'s cubes')
            .addUserOption(option =>
              option
                .setName('user')
                .setDescription('Discord user')
                .setRequired(true)
              )
        ) 
        .addSubcommand(subcommand => 
          subcommand
            .setName('add')
            .setDescription('Add cubes')
            .addStringOption(option =>
              option
                .setName('url')
                .setDescription('Cube URL')
                .setRequired(true)
              )
        )
        .addSubcommand(subcommand => 
          subcommand
            .setName('delete')
            .setDescription('Delete cubes')
            .addStringOption(option =>
              option
                .setName('url')
                .setDescription('Cube URL')
                .setRequired(true)
              )
         ) as SlashCommandBuilder,
    opt: {
        userPermissions: ['SendMessages'],
        botPermissions: ['SendMessages'],
        category: 'General',
        cooldown: 5,
        visible: true,
        guildOnly: true,
    },
    async execute(interaction: ChatInputCommandInteraction<'cached'>) {
      let content = 'Something went wrong!';
      try {
        const subcommand = interaction.options.getSubcommand();
        if (subcommand === 'get') {
          let dsUser = interaction.options.getUser('user');
          if (!dsUser) throw new Error('User could not found be in guild!');
          let user = await User.findUser(dsUser.id);
          const cubes = user?.getCubes() || [];
          if (!cubes.length) throw new Error('The user has no cubes set.');
          const metas = await Promise.all(cubes.map((cube) => getCubeMeta(cube.link)));
          content = '';
          metas.forEach((meta, index) => {
            content += `**${index + 1}. ${meta?.title || 'Title Not Found'}** \n ${meta?.url || ' URL Not Found'} \n`;
          })
        } else {
          let user = await User.findUser(interaction.user.id);
          if (!user) user = new User({discordId: interaction.user.id});
          let option = interaction.options.getString('url');
          if (subcommand === 'add') {
            user.addCube(option);
            await user.save();
            content = `${option} has been added!`;
          } else if (subcommand === 'delete') {
            const cube = user.findCube(option);
            if (!cube) throw new Error('Cube could not be found!');
            user.deleteCube(option);
            await user.save();
            content = `${option} has been deleted!`;
          }
        }
      } catch (error) {
        if (error.code === 'ERR_INVALID_URL') {
          content = `URL must be a complete link from cube cobra. Here's an example: https://cubecobra.com/cube/list/thunderwang`
        }
        content = error.message;
      }
      await interaction.reply({
        content,
        ephemeral: true,
        fetchReply: true,
        flags: 'SuppressEmbeds'
      });
    },
})