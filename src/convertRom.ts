import fs from "fs";
import path from "path";

type ConvertOptions = {
    name: string;
    year: number;
    manufacturer: string;
};
type ConvertCallback = (err: Error | null, resultingPath?: string) => void;
type FilesInMemory = { [key: string]: Buffer };
type FileTypes = "p" | "s" | "m" | "v" | "c";

function loadFilesIntoMemory(dir: string): FilesInMemory {
    return fs.readdirSync(dir).reduce(
        (building, file) => {
            // lots of roms have an html file inside
            if (file.indexOf(".html") > -1) {
                return building;
            }

            const fullPath = path.join(dir, file);
            const fileData = fs.readFileSync(fullPath);

            building[file] = fileData;

            return building;
        },
        {} as FilesInMemory
    );
}

function isFileOfType(fileName: string, fileType: FileTypes): boolean {
    const lowerName = fileName.toLowerCase();

    return !!lowerName.match(new RegExp(`\.${fileType}\\d$`));
}

function getSize(files: FilesInMemory, fileType: FileTypes): number {
    return Object.keys(files).reduce((buildingSize, fileName) => {
        if (isFileOfType(fileName, fileType)) {
            return buildingSize + files[fileName].length;
        } else {
            return buildingSize;
        }
    }, 0);
}

function getData(files: FilesInMemory, fileType: FileTypes): Buffer {
    let size = 0;

    const buffers = Object.keys(files)
        .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
        .reduce(
            (buildingBuffers, fileName) => {
                const lowerName = fileName.toLowerCase();

                if (isFileOfType(lowerName, fileType)) {
                    console.log("getData, file", fileName);
                    size += files[fileName].length;
                    return buildingBuffers.concat(files[fileName]);
                } else {
                    return buildingBuffers;
                }
            },
            [] as Buffer[]
        );

    return Buffer.concat(buffers, size);
}

function buildNeoFile(options: ConvertOptions, files: FilesInMemory): Buffer {
    // NEO1 : uint8_t header1, header2, header3, version;
    const tag = Buffer.from([
        "N".charCodeAt(0),
        "E".charCodeAt(0),
        "O".charCodeAt(0),
        1
    ]);

    // PSize, SSize, MSize, V1Size, V2Size, CSize
    const sizes = Buffer.from(
        Uint32Array.from([
            getSize(files, "p"),
            getSize(files, "s"),
            getSize(files, "m"),
            getSize(files, "v"),
            0, // v2 size
            getSize(files, "c")
        ]).buffer
    );

    // year, genre, screenshot, NGH, all dummy data for now
    const Puzzle = 10;
    const metadata = Buffer.from(
        Uint32Array.from([options.year, Puzzle, 0, 0]).buffer
    );

    const name = Buffer.from(options.name);
    const namePadding = Buffer.from(
        new Array(33 - options.name.length).fill(0, 0, 33 - options.name.length)
    );

    const manufacturer = Buffer.from(options.manufacturer);
    const manLength = options.manufacturer.length;
    const manufacturerPadding = Buffer.from(
        new Array(manLength).fill(0, 0, manLength)
    );

    const fillerLength = 128 + 290 + 4096 - 512;
    const filler = Buffer.from(
        new Array(fillerLength).fill(0, 0, fillerLength)
    );

    const header = Buffer.concat(
        [
            tag,
            sizes,
            metadata,
            name,
            namePadding,
            manufacturer,
            manufacturerPadding,
            filler
        ],
        4096
    );

    const pData = getData(files, "p");
    const sData = getData(files, "s");
    const mData = getData(files, "m");
    const vData = getData(files, "v");
    const cData = getData(files, "c");

    const neoFile = Buffer.concat(
        [header, pData, sData, mData, vData, cData],
        header.length +
            pData.length +
            sData.length +
            mData.length +
            vData.length +
            cData.length
    );

    console.log("neoFile.length", neoFile.length);

    return neoFile;
}

export function convertRom(
    srcDir: string,
    outPath: string,
    options: ConvertOptions,
    callback: ConvertCallback
): void {
    const romName = path.basename(outPath, path.extname(outPath));

    const files = loadFilesIntoMemory(srcDir);

    Object.keys(files).forEach(key => console.log(key, files[key].length));

    const neoFile = buildNeoFile(options, files);

    fs.writeFile(outPath, neoFile, (err?: Error) => {
        if (err) {
            callback(err);
        } else {
            callback(null, outPath);
        }
    });
}
