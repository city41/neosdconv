# neosdconv

A tool to convert a Neo Geo ROM into TerraOnion's NeoSD `.neo` format.

## Status

This tool should successfully convert any commercial game now. There are some more exotic games out there that don't convert properly, such as [Bad Apple](https://github.com/city41/neosdconv/issues/2) and possibly [SS5 Perfect](https://github.com/city41/neosdconv/issues/3) as well.

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

## Bulk conversion using scripts/convert.sh

Kris Bahnsen (@kbembedded) has contributed a shell script that can bulk convert a directory of roms. To use it:

1. Grab it from the scripts directory (you can clone this repo or download a zip from the main github page), you will need both `convert.sh` and the accompanying `neosd_romset.csv` file.
2. `scripts/convert.sh <directory to convert>`

Your system needs neosdconv installed (see above), as well as sh or bash, unzip, sed and awk

The script is flexible on the locations of the input roms, output folder and the location of the csv file. For more information, run `convert.sh` without any arguments for help.


