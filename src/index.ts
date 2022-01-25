#!/usr/bin/env node

import { Command } from "commander";
import path from "path";
import fs from "fs";
import { Genre, GenreKey } from "./genres";
import { dumpHeader } from "./dumpHeader";
import { convertRomNode as convertRom } from "./convertRomNode";

const packageJson = require("../package.json");

const program = new Command();

program
    .version(packageJson.version)
    .option(
        "-i, --input <input directory>",
        "A directory containing Neo Geo ROM files (ie p1, m1, c1, etc)"
    )
    .option("-o, --dest <dest path>", "The dest path to write the .neo file to")
    .option("-n, --game-name <name of the game>", "The name of the game")
    .option(
        "-g, --genre <genre>",
        "The genre as taken from TerraOnion's readme"
    )
    .option("-y, --year <year>", "year the game was released")
    .option("-m, --manufacturer <manufacturer>", "manufacturer of the game")
    .option("-#, --ngh <ngh>", "The game's NGH number")
    .option(
        "-s, --screenshot <screenshot>",
        "The game's NeoSD screenshot number"
    )
    .option("-d, --dump <.neo file>", "Prints metadata for the given .neo file")
    .parse(process.argv);

const programOptions = program.opts();

if ((!programOptions.input || !programOptions.dest) && !programOptions.dump) {
    program.help();
}

if (programOptions.dump) {
    const neoPath = path.resolve(process.cwd(), programOptions.dump);
    dumpHeader(neoPath);
    process.exit(0);
}

const srcDir = path.resolve(process.cwd(), programOptions.input);
const destPath = path.resolve(process.cwd(), programOptions.dest || "");

if (!fs.existsSync(srcDir)) {
    console.error(`No directory found at ${srcDir}`);
    process.exit(1);
}

if (!fs.lstatSync(srcDir).isDirectory()) {
    console.error(`${srcDir} is not a directory`);
    process.exit(1);
}

if (!fs.existsSync(path.dirname(destPath))) {
    console.error(`No directory found at ${path.dirname(destPath)}`);
    process.exit(1);
}

const options = {
    name:
        programOptions.gameName ||
        path.basename(destPath, path.extname(destPath)),
    year: parseInt(programOptions.year || new Date().getFullYear(), 10),
    manufacturer: programOptions.manufacturer || "SNK",
    genre: Genre[(programOptions.genre as GenreKey) || "Other"],
    ngh: programOptions.ngh,
    screenshot: programOptions.screenshot
};

if (options.genre === undefined) {
    console.error("Genre must be one of: ", Object.keys(Genre).join(", "));
    process.exit(1);
}

const MAX_NAME_LENGTH = 33;
if (options.name.length > MAX_NAME_LENGTH) {
    console.error(
        `Game name can not be longer than ${MAX_NAME_LENGTH} characters`
    );
    process.exit(1);
}

const MAX_MANUFACTURER_LENGTH = 17;
if (options.manufacturer.length > MAX_MANUFACTURER_LENGTH) {
    console.error(
        `Manufacturer name can not be longer than ${MAX_MANUFACTURER_LENGTH} characters`
    );
    process.exit(1);
}

convertRom(srcDir, destPath, options, (err, resultingPath) => {
    if (err) {
        console.error("error: ", err);
    } else {
        console.log(`${srcDir} built to ${resultingPath}`);
    }
});
