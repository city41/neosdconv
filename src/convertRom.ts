import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { buildNeoFile } from "./buildNeoFile";
import type { ConvertOptions, FilesInMemory } from "./buildNeoFile";

/**
 * Takes the various ROM files (p, m, c, etc) found in the specified directory
 * and loads them into memory. The return result is an object with keys being the
 * file names and the values being Buffers containing the binary data for that file
 *
 * @param {string} dir The directory to load the ROM files from
 * @returns {FilesInMemory} an object containing the binary data of each file
 */
function loadFilesIntoMemory(dir: string): FilesInMemory {
    return fs.readdirSync(dir).reduce<FilesInMemory>((building, file) => {
        // lots of roms have an html file inside
        if (file.trim().toLowerCase().endsWith(".html")) {
            return building;
        }

        // extracting a zipped rom into the same directory is common
        if (file.trim().toLowerCase().endsWith(".zip")) {
            return building;
        }

        const fullPath = path.join(dir, file);

        // ignore any directories
        if (fs.lstatSync(fullPath).isDirectory()) {
            return building;
        }

        const fileData = new Uint8Array(fs.readFileSync(fullPath));

        building[file] = fileData;

        return building;
    }, {});
}

/**
 * External API entry point for converting a ROM from standard format
 * to the .neo format
 *
 * @param {string} srcDir the directory to read the ROM files from
 * @param {string} outPath the file to write the result to
 * @param {ConvertOptions} options settings such as game name and year
 */
export async function convertRom(
    srcDir: string,
    outPath: string,
    options: ConvertOptions
): Promise<string> {
    const files = loadFilesIntoMemory(srcDir);

    const neoFile = await buildNeoFile(options, files);

    await fsp.writeFile(outPath, neoFile);

    return outPath;
}
