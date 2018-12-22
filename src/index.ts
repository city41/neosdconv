#!/usr/bin/env node

import program from "commander";
import path from "path";
import fs from "fs";
import { convertOneRom } from "./convertOneRom";

const packageJson = require("../package.json");

program
    .version(packageJson.version)
    .option("-i, --input <A single ROM file>", "A single ROM file to convert")
    .option(
        "-d, --dir <source directory of ROMs to batch convert>",
        "The source directory to read the ROMs from to do a batch conversion"
    )
    .option(
        "-o, --dest <dest directory>",
        "The dest directory to write the result(s) to"
    )
    .parse(process.argv);

if (!program.input && !program.dir) {
    program.help();
}

if (program.input) {
    const srcPath = path.join(process.cwd(), program.input);
    const destDir = path.join(process.cwd(), program.dest || "");

    if (!fs.existsSync(srcPath)) {
        console.error(`No file found at ${srcPath}`);
        process.exit(1);
    }

    if (!fs.existsSync(destDir)) {
        console.error(`No directory found at ${destDir}`);
        process.exit(1);
    }

    if (!fs.lstatSync(destDir).isDirectory()) {
        console.error(`${destDir} is not a directory`);
        process.exit(1);
    }

    convertOneRom(srcPath, destDir, (err, resultingPath) => {
        if (err) {
            console.error("error: ", err);
        } else {
            console.log(`${srcPath} converted to ${resultingPath}`);
        }
    });
}
