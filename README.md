# neosdconv

A tool to convert a Neo Geo ROM into TerraOnion's NeoSD `.neo` format.

## Status

I have this working on my tiny little demo rom, but I doubt this tool is working in general. My tiny test rom has no audio and just a single C ROM pair.

## How to Use

You need NodeJS installed, I am using version 8.9.4

1. `npm install -g neosdconv`
2. `neosdconv -i <directory with your ROM files> -o <output file> -n <game name> -y <year> -m <manufacturer>`

The input directory is a directory containing your game's raw P, S, M, V and C ROMs

The output path is something like `./mygame.neo`.

For example: `neosdconv -i ./romFiles -u ./mygame.neo -n 'My Cool Game' -y 2018 -m city41`


