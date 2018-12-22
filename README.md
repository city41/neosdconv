# neosdconv

A tool to convert a Neo Geo ROM into TerraOnion's NeoSD `.neo` format.

## Status

This tool has successfully converted:

* League Bowling
* Pulstar
* My tiny little demo ROM
* King of Fighters 94
* Kizuna Encounter

No other games have been attempted yet, and many games will likely not work.

## How to Use

You need NodeJS installed, I am using version 8.9.4

1. `npm install -g neosdconv`
2. `neosdconv -i <directory with your ROM files> -o <output file> -n <game name> -g <genre> -y <year> -m <manufacturer>`

The input directory is a directory containing your game's raw P, S, M, V and C ROMs

The output path is something like `./mygame.neo`.

For example: `neosdconv -i ./romFiles -o ./mygame.neo -n 'My Cool Game' -g BeatEmUp -y 2018 -m city41`

## How to Convert a Commercial ROM

Beware, most commercial ROMs won't convert correctly, see status above.

Just unzip the ROM into a directory, then use that directory as the input

## Goals

The main purpose of this tool is for Neo Geo development.

I might expand the tool to also be able to batch convert a set of commercial ROMs, but that is low priority right now.
