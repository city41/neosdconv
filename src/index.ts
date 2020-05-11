#!/usr/bin/env node

import program from "commander";
import path from "path";
import fs from "fs";
import { Genre } from "./genres";
import { convertRom } from "./convertRom";

const packageJson = require("../package.json");

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
    .parse(process.argv);

if (!program.input || !program.dest) {
    program.help();
}

const srcDir = path.join(process.cwd(), program.input);
const destPath = path.join(process.cwd(), program.dest || "");

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
    name: program.gameName || path.basename(destPath, path.extname(destPath)),
    year: parseInt(program.year || new Date().getFullYear(), 10),
    manufacturer: program.manufacturer || "SNK",
    genre: Genre[program.genre || "Other"]
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
