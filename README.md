# neosdconv

A tool to convert homebrew Neo Geo ROMs into TerraOnion's NeoSD `.neo` format. This allows the program to run on real hardware via a NeoSD as well as on the MiSTer.

# Homebrew/dev only

This tool is only intended to be used by those doing Neo Geo related development. For commercial roms please use TerraOnion's NeoBuilder. Issues, support, etc, around commercial games will not be considered. 

## How to Use

You need NodeJS installed, I am using version 8.9.4

1. `npm install -g neosdconv`
2. `neosdconv -i <directory with your ROM files> -o <output file> -n <game name> -g <genre> -y <year> -m <manufacturer> -# <NGH number> -s <screenshot number>`

The input directory is a directory containing your game's raw P, S, M, V and C ROMs

The output path is something like `./mygame.neo`.

For example: `neosdconv -i ./romFiles -o ./mygame.neo -n 'My Cool Game' -g BeatEmUp -y 2018 -m city41`

## NGH and Screenshot

These are both optional, screenshot should not be used for homebrew ROMs.

You can set a ROM's NGH number with `-# <ngh number>` (such as `-# 95` for Real Bout Fatal Fury) and also the screenshot with `-s <screenshot number>`. NGH numbers can be found here: http://www.neo-geo.com/snk/master_list-ngh.htm. Screenshot numbers are proprietary to TerraOnion, and I don't know of an easy way to get them. The screenshot option was added for completeness.

If NGH or screenshot are provided and are invalid, they will default to zero and a warning will be emitted.

## Setting the Genre

the `-g` flag is used to set the genre. It must be one of the values found here: https://github.com/city41/neosdconv/blob/master/src/genres.ts

If it is an invalid value or left out entirely, the genre will default to `Other`.
