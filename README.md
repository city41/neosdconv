# neosdconv

A tool to convert a Neo Geo ROM into TerraOnion's NeoSD `.neo` format.

## Status

This tool has successfully converted:

* King of Fighters 94
* Kizuna Encounter
* League Bowling
* My tiny little demo ROM
* Neo Bomberman
* Pulstar

and many other games. At this point, most (and possibly all?) commercial ROMs convert successfully.

## How to Use

You need NodeJS installed, I am using version 8.9.4

1. `npm install -g neosdconv`
2. `neosdconv -i <directory with your ROM files> -o <output file> -n <game name> -g <genre> -y <year> -m <manufacturer> -# <NGH number> -s <screenshot number>`

The input directory is a directory containing your game's raw P, S, M, V and C ROMs

The output path is something like `./mygame.neo`.

For example: `neosdconv -i ./romFiles -o ./mygame.neo -n 'My Cool Game' -g BeatEmUp -y 2018 -m city41`

## NGH and Screenshot

These are both optional, and should not be used for homebrew ROMs.

You can set a commercial ROM's NGH number with `-# <ngh number>` (such as `-# 95` for Real Bout Fatal Fury) and also the screenshot with `-s <screenshot number>`. NGH numbers can be found here: http://www.neo-geo.com/snk/master_list-ngh.htm. Screenshot numbers are proprietary to TerraOnion, and I don't know of an easy way to get them. The screenshot option was added for completeness.

If NGH or screenshot are provided and are invalid, they will default to zero and a warning will be emitted.

## Setting the Genre

the `-g` flag is used to set the genre. It must be one of the values found here: https://github.com/city41/neosdconv/blob/master/src/genres.ts

If it is an invalid value or left out entirely, the genre will default to `Other`.

## How to Convert a Commercial ROM

Just unzip the ROM into a directory, then use that directory as the input

## If a conversion fails

If a game fails to convert and load properly on the NeoSD, it might be this tool's fault. Feel free to file an issue. But also many ROMs out on the internet do not convert properly. You need to use Neo Geo ROMs that were meant to be used with MAME. If a ROM fails to convert properly, it possibly also fails to convert on TerraOnion's official tool.

## Goals

The main purpose of this tool is for Neo Geo development.

It has gradually added the needed features and bug fixes to support commercial ROMs, as gradualy more and more people have been using it to for that.

