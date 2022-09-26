# neosdconv

A tool to convert a Neo Geo ROM into TerraOnion's NeoSD `.neo` format.

# Unsupported

This tool is no longer supported. I will not accept pull requests or look into issues. The reason is TerraOnion's own NeoBuilder runs just fine with Wine, and has a command line mode. That makes neosdconv obsolete.

Original README follows...

## Status

This tool should successfully convert any commercial game now. It should also convert any homebrew ROM, originally homebrew dev was the main purpose of this tool.

### A note on Cabal

As of this writing, Cabal does not convert correctly. However, this is true of TerraOnion's own NeoBuilder as well. So for now, assuming Cabal does something odd the NeoSD isn't expecting. As more is learned, I'll update neosdconv accordingly.

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

## If it fails to convert your homebrew ROM

Please file an issue. I definitely want to make sure this tool works well for homebrew

## Bulk conversion using scripts/convert.sh

Kris Bahnsen (@kbembedded) has contributed a shell script that can bulk convert a directory of roms. To use it:

1. Grab it from the scripts directory (you can clone this repo or download a zip from the main github page), you will need both `convert.sh` and the accompanying `neosd_romset.csv` file.
2. `scripts/convert.sh <directory to convert>`

Your system needs neosdconv installed (see above), as well as sh or bash, unzip, sed and awk

The script is flexible on the locations of the input roms, output folder and the location of the csv file. For more information, run `convert.sh` without any arguments for help.

## Dump a .neo file's header

Added in version 0.3.0

`neosdconv -d <neo file>`

for example

`neosdconv -d mslug.neo`

It will print out a listing like this

```bash
Metal Slug - Super Vehicle-001
----------------------
manufacturer: Nazca
        year: 1996
       genre: Action
         NGH: 21
  screenshot: 99

---- ROM sizes -------
            p: 2097152      0x200000
            s: 131072       0x20000
            m: 131072       0x20000
           v1: 8388608      0x800000
           v2: 0            0x0
            c: 16777216     0x1000000
```
